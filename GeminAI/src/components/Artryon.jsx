/**
 * ARTryOn.jsx
 *
 * Fixed rendering for all jewelry types:
 *  Ring     — flat torus perpendicular to finger, diamond facing camera
 *  Bracelet — flat around wrist cross-section
 *  Earring  — hangs below ear, gem faces forward
 *  Necklace — pendant centered on collar, front-facing
 *
 * npm install @mediapipe/hands @mediapipe/face_mesh @mediapipe/pose
 *             @mediapipe/camera_utils @mediapipe/drawing_utils
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { OBJLoader }       from "three/examples/jsm/loaders/OBJLoader";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";

import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { FaceMesh }                from "@mediapipe/face_mesh";
import { Pose }                    from "@mediapipe/pose";
import { Camera }                  from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const T = {
  accent: "#7B5CE5", accentLight: "#9d80f0",
  text: "#e8e4f4", textSub: "#9490b0",
  success: "#2ecc71", danger: "#e74c3c",
  grad: "linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB)",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Model-building helpers (identical to ModelRenderer.jsx)
// ─────────────────────────────────────────────────────────────────────────────

function isGemType(type) {
  return ["gem","diamond","stone","gemstone","center_stone","center stone"]
    .includes((type || "").toLowerCase().trim());
}

function getMeshes(obj) {
  const out = [];
  obj.traverse((c) => { if (c.isMesh) out.push(c); });
  return out;
}

function buildMaterial(comp, envMap) {
  const isGem    = isGemType(comp.type);
  const colorHex = comp.materialOverrides?.color || (isGem ? "#d6eaf8" : "#c9a84c");

  if (isGem) {
    const m = new THREE.MeshPhysicalMaterial({
      color: colorHex, metalness: 0, roughness: 0.0,
      transmission: 0.85, ior: 2.4, thickness: 0.5,
      reflectivity: 1.0, clearcoat: 1.0, clearcoatRoughness: 0.0,
      transparent: true, opacity: 1.0, envMapIntensity: 3.0,
    });
    if (envMap) m.envMap = envMap;
    return m;
  }
  const m = new THREE.MeshPhysicalMaterial({
    color: colorHex, metalness: 1.0, roughness: 0.15,
    clearcoat: 0.3, clearcoatRoughness: 0.1,
    reflectivity: 1.0, envMapIntensity: 2.5,
  });
  if (envMap) m.envMap = envMap;
  return m;
}

function buildGeometry(comp) {
  const g     = comp.geometry || {};
  const gtype = (g.type || "").toLowerCase().trim();
  const ctype = (comp.type  || "").toLowerCase().trim();

  if (gtype === "torus")      return new THREE.TorusGeometry(g.radius || 1, g.tube || 0.12, 64, 256);
  if (gtype === "sphere")     return new THREE.SphereGeometry(g.radius || 0.3, 64, 64);
  if (gtype === "cylinder")   return new THREE.CylinderGeometry(g.radiusTop ?? g.radius ?? 0.05, g.radiusBottom ?? g.radius ?? 0.05, g.height || 0.2, 32);
  if (gtype === "box")        return new THREE.BoxGeometry(g.width || 0.2, g.height || 0.2, g.depth || 0.2);
  if (gtype === "octahedron") return new THREE.OctahedronGeometry(g.radius || 0.25, 2);
  if (gtype === "cone")       return new THREE.ConeGeometry(g.radius || 0.06, g.height || 0.18, 32);

  if (["band","ring","shank"].includes(ctype))
    return new THREE.TorusGeometry(g.radius || 1, g.tube || (g.bandWidth ? g.bandWidth / 20 : 0.12), 64, 256);
  if (isGemType(ctype))
    return new THREE.OctahedronGeometry(g.size || g.radius || 0.28, 2);
  if (["prong","prongs"].includes(ctype))
    return new THREE.TorusGeometry(g.radius || 0.38, g.tube || 0.032, 16, 64);
  if (["setting","basket","bezel"].includes(ctype))
    return new THREE.CylinderGeometry(0.35, 0.28, 0.16, 32, 1, true);
  if (ctype === "halo")
    return new THREE.TorusGeometry(g.radius || 0.42, g.tube || 0.045, 32, 128);
  return new THREE.SphereGeometry(0.15, 32, 32);
}

function applyCompTransform(obj, comp) {
  const pos = comp.transform?.position || [0, 0, 0];
  const rot = comp.transform?.rotation || [0, 0, 0];
  const s   = comp.transform?.scale    ?? 1;
  obj.position.set(pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0);
  obj.rotation.set(rot[0] ?? 0, rot[1] ?? 0, rot[2] ?? 0);
  if (Array.isArray(s)) obj.scale.set(s[0], s[1], s[2]);
  else obj.scale.setScalar(typeof s === "number" ? s : 1);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Build jewelry group from level2_json
//  Returns Promise<{ pivot: THREE.Group, naturalSize: number }>
//  pivot is centred at its bounding-box centre so position = landmark position
// ─────────────────────────────────────────────────────────────────────────────
function buildJewelryGroup(level2, envMap) {
  return new Promise((resolve) => {
    const components = level2?.components || [];
    const inner      = new THREE.Group();   // raw scene-space group
    const objLoader  = new OBJLoader();
    let   pending    = 0;

    const finish = () => {
      if (pending > 0) return;

      // Centre the inner group so pivot.position == bounding-box centre
      const box    = new THREE.Box3().setFromObject(inner);
      const centre = box.getCenter(new THREE.Vector3());
      inner.position.sub(centre);

      // Measure natural size AFTER centering so scale ratio works correctly
      const box2       = new THREE.Box3().setFromObject(inner);
      const size       = box2.getSize(new THREE.Vector3());
      const naturalSize = Math.max(size.x, size.y, size.z) || 1;

      const pivot = new THREE.Group();
      pivot.add(inner);
      resolve({ pivot, naturalSize });
    };

    if (components.length === 0) {
      const pivot = new THREE.Group();
      pivot.add(inner);
      resolve({ pivot, naturalSize: 1 });
      return;
    }

    components.forEach((comp) => {
      pending++;
      const mat = buildMaterial(comp, envMap);

      if (comp.model_path) {
        const url = `http://localhost:5000/${comp.model_path}`;
        objLoader.load(url,
          (obj) => {
            getMeshes(obj).forEach((m) => { m.material = mat; m.castShadow = m.receiveShadow = true; });
            applyCompTransform(obj, comp);
            inner.add(obj);
            if (--pending <= 0) finish();
          },
          undefined,
          () => {
            const mesh = new THREE.Mesh(buildGeometry(comp), mat);
            mesh.castShadow = mesh.receiveShadow = true;
            applyCompTransform(mesh, comp);
            inner.add(mesh);
            if (--pending <= 0) finish();
          }
        );
      } else {
        const mesh = new THREE.Mesh(buildGeometry(comp), mat);
        mesh.castShadow = mesh.receiveShadow = true;
        applyCompTransform(mesh, comp);
        inner.add(mesh);
        if (--pending <= 0) finish();
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Jewelry type detection
// ─────────────────────────────────────────────────────────────────────────────
function detectJewelryType(level2) {
  const override = localStorage.getItem("ar_jewelry_type_override");
  if (override) { localStorage.removeItem("ar_jewelry_type_override"); return override; }
  if (!level2) return "ring";

  const comps   = level2.components || [];
  const glbPath = (level2.output?.final_glb || "").toLowerCase();
  const names   = comps.map(c => `${c.name||""} ${c.type||""} ${c.render_type||""}`.toLowerCase()).join(" ");

  if (glbPath.includes("necklace")||glbPath.includes("pendant")||names.includes("necklace")||names.includes("pendant")||names.includes("chain")) return "necklace";
  if (glbPath.includes("earring")||names.includes("earring")) return "earring";
  if (glbPath.includes("bracelet")||names.includes("bracelet")||names.includes("bangle")) return "bracelet";
  return "ring";
}

// ─────────────────────────────────────────────────────────────────────────────
//  Placement configs
// ─────────────────────────────────────────────────────────────────────────────
const PLACEMENT = {
  ring:     { label: "Hold your hand up, palm facing camera",     icon: "💍", trackWith: "hands" },
  bracelet: { label: "Hold your wrist up, palm facing camera",    icon: "⌚", trackWith: "hands" },
  earring:  { label: "Look straight into the camera",            icon: "💎", trackWith: "face"  },
  necklace: { label: "Stand back so your shoulders are visible", icon: "📿", trackWith: "pose"  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Landmark → Three.js orthographic world
// ─────────────────────────────────────────────────────────────────────────────
function lmToWorld(lm, aspect) {
  return new THREE.Vector3(
    ( (1 - lm.x) - 0.5) * 2 * aspect,
    (-(lm.y      - 0.5)) * 2,
    -(lm.z || 0)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ARTryOn
// ─────────────────────────────────────────────────────────────────────────────
export default function ARTryOn() {
  const navigate    = useNavigate();
  const wrapRef     = useRef(null);
  const videoRef    = useRef(null);
  const canvas2D    = useRef(null);
  const canvas3D    = useRef(null);

  // Three.js
  const rendererRef   = useRef(null);
  const sceneRef      = useRef(null);
  const cameraRef     = useRef(null);
  const rafRef        = useRef(null);
  const envMapRef     = useRef(null);
  const pivotRef      = useRef(null);     // the repositioned group
  const naturalSzRef  = useRef(1);        // bounding-sphere size at rest scale

  // Smooth targets
  const sPos  = useRef(new THREE.Vector3());
  const sQuat = useRef(new THREE.Quaternion());
  const sSc   = useRef(0.1);

  // MediaPipe
  const mpRef = useRef(null);

  // State
  const [jType,       setJType]       = useState("ring");
  const [status,      setStatus]      = useState("loading");
  const [statusMsg,   setStatusMsg]   = useState("Starting…");
  const [trackingOK,  setTrackingOK]  = useState(false);
  const [mirrored,    setMirrored]    = useState(true);
  const [showDebug,   setShowDebug]   = useState(false);
  const [fps,         setFps]         = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);

  const trackRef   = useRef(false);
  const showDbgRef = useRef(false);
  const jTypeRef   = useRef("ring");    // always-current jType for callbacks
  const fpsRef     = useRef({ n: 0, t: Date.now() });

  useEffect(() => { showDbgRef.current = showDebug; }, [showDebug]);
  useEffect(() => { jTypeRef.current   = jType;     }, [jType]);

  const designId = localStorage.getItem("currentDesignId");
  const raw2     = localStorage.getItem(`design_${designId}_level2`);
  const level2   = raw2 ? JSON.parse(raw2) : null;

  // ── Three.js init ──────────────────────────────────────────────────────────
  const initThree = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const W = wrap.clientWidth  || window.innerWidth;
    const H = wrap.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas:    canvas3D.current,
      alpha:     true, antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFShadowMap;
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const pmrem  = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    envMapRef.current = envTex;
    scene.environment = envTex;
    pmrem.dispose();

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xfff5e0, 2.2);
    key.position.set(5, 10, 7); key.castShadow = true; scene.add(key);
    const fill = new THREE.DirectionalLight(0xddeeff, 0.6);
    fill.position.set(-5, 3, -5); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe0a0, 0.9);
    rim.position.set(0, -2, -6); scene.add(rim);
    // Extra front light so gems sparkle toward camera
    const front = new THREE.DirectionalLight(0xffffff, 0.5);
    front.position.set(0, 0, 10); scene.add(front);

    const aspect = W / H;
    const cam    = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, -20, 20);
    cam.position.set(0, 0, 5); cameraRef.current = cam;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      renderer.render(scene, cam);
      fpsRef.current.n++;
      const now = Date.now();
      if (now - fpsRef.current.t >= 1000) {
        setFps(fpsRef.current.n);
        fpsRef.current = { n: 0, t: now };
      }
    };
    loop();

    const onResize = () => {
      const w = wrap.clientWidth || window.innerWidth;
      const h = wrap.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      cam.left = -(w/h); cam.right = (w/h);
      cam.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Load jewelry ───────────────────────────────────────────────────────────
  const loadJewelry = useCallback(async (type) => {
    const scene  = sceneRef.current;
    const envMap = envMapRef.current;
    if (!scene) return;

    setStatusMsg("Building your model…");
    setModelLoaded(false);

    if (pivotRef.current) { scene.remove(pivotRef.current); pivotRef.current = null; }

    const { pivot, naturalSize } = await buildJewelryGroup(level2, envMap);
    naturalSzRef.current = naturalSize;

    // ── Canonical orientation per jewelry type ──────────────────────────────
    // Three.js default:
    //   Torus (ring) created in XY plane — opening faces +Z (toward camera) ✓
    //   OctahedronGeometry (gem) points up along Y axis ✓
    //   After buildJewelryGroup the group is centred at origin
    //
    // For RING: we want the ring flat on the finger (XZ plane), gem on top.
    //   → Rotate ring band by -90° around X so its hole aligns with finger axis (Y).
    //   → The gem already sticks up on Y — correct.
    // For BRACELET: same as ring but wider.
    // For EARRING: gem should hang below ear and face camera (+Z).
    //   → No base rotation needed (OctahedronGeometry already Y-up, faces camera).
    // For NECKLACE: pendant lies flat in XY, must face camera (+Z).
    //   → Torus is already in XY plane, so it faces camera. Good.

    const inner = pivot.children[0]; // the inner group
    inner.rotation.set(0, 0, 0);

    if (type === "ring" || type === "bracelet") {
      // Ring torus is in XY plane by default (open toward +Z).
      // We need the hole to align with the finger direction (Y in world space after placement).
      // Rotate -90° around X so the torus plane becomes the XZ plane, hole along Y.
      inner.rotation.x = Math.PI / 2;
    }
    // earring: default orientation is fine — gem faces +Z (camera)
    // necklace: pendant torus in XY plane faces camera — fine

    scene.add(pivot);
    pivotRef.current = pivot;

    // Start smooth targets at off-screen so first frame doesn't flash at origin
    sPos.current.set(0, -5, 0);
    sQuat.current.identity();
    sSc.current = 0.001;

    setModelLoaded(true);
    setStatus("tracking");
    setStatusMsg(`${PLACEMENT[type]?.icon}  ${PLACEMENT[type]?.label}`);
  }, [level2]);

  // ── Place jewelry each frame ───────────────────────────────────────────────
  // targetPos   — world position of the anchor landmark
  // targetQuat  — orientation quaternion (aligns model to body part axis)
  // targetScale — desired world-space size (bounding sphere diameter)
  const placeJewel = useCallback((targetPos, targetQuat, targetScale) => {
    const pivot = pivotRef.current;
    if (!pivot) return;

    // Smooth
    sPos.current.lerp(targetPos, 0.25);
    sQuat.current.slerp(targetQuat, 0.20);
    sSc.current  += (targetScale - sSc.current) * 0.18;

    pivot.position.copy(sPos.current);
    pivot.quaternion.copy(sQuat.current);

    // Scale so bounding sphere == targetScale
    const s = sPos.current.x !== 0 || sPos.current.y !== 0
      ? (sPos.current, Math.max(0.0001, sPos.current, sSc.current / naturalSzRef.current))
      : sSc.current / naturalSzRef.current;
    pivot.scale.setScalar(sSc.current / naturalSzRef.current);

    if (!trackRef.current) { trackRef.current = true; setTrackingOK(true); }
  }, []);

  // ── Hands callback ─────────────────────────────────────────────────────────
  // Ring orientation goal:
  //   - pivot.position = midpoint of ring-finger MCP(13)→PIP(14)
  //   - pivot.quaternion rotates the model so its Y-axis aligns with the finger direction
  //     (inner.rotation.x = -π/2 makes the hole along Y, so this is correct)
  //   - The diamond (on +Y of inner group) therefore points toward the fingertip = away from palm ✓

  const onHandResults = useCallback((results) => {
    const c2 = canvas2D.current;
    if (c2) { const ctx = c2.getContext("2d"); ctx.clearRect(0, 0, c2.width, c2.height); }

    if (!results.multiHandLandmarks?.length) {
      trackRef.current = false; setTrackingOK(false); return;
    }

    const lms    = results.multiHandLandmarks[0];
    const aspect = (wrapRef.current?.clientWidth || 640) / (wrapRef.current?.clientHeight || 480);
    const type   = jTypeRef.current;

    if (showDbgRef.current && c2) {
      const ctx = c2.getContext("2d");
      drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: "rgba(123,92,229,0.7)", lineWidth: 2 });
      drawLandmarks(ctx, lms, { color: "rgba(75,108,247,0.9)", lineWidth: 1, radius: 3 });
    }

    // Anchor landmarks
    // Ring:     MCP of ring finger = 13, PIP = 14  (mid-proximal phalanx)
    // Bracelet: wrist = 0, pinky MCP = 17  (across wrist width)
    const isRing    = type === "ring";
    const isBrace   = type === "bracelet";
    const baseLm    = lms[isRing ? 13 : 0];
    const tipLm     = lms[isRing ? 14 : (isBrace ? 17 : 5)];

    const basePos   = lmToWorld(baseLm, aspect);
    const tipPos    = lmToWorld(tipLm,  aspect);

    // Finger/wrist direction vector
    const dir  = new THREE.Vector3().subVectors(tipPos, basePos).normalize();

    // Build quaternion: rotate model Y-axis → finger direction
    // (inner.rotation.x = -π/2 means hole is along model-Y, so this maps hole to finger)
    const up   = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

    // For ring: sit on the middle of the proximal phalanx segment
    const pos  = new THREE.Vector3().lerpVectors(basePos, tipPos, 0.5);

    // Scale: ring should be ~30% of hand span, bracelet ~60%
    const wrist  = lmToWorld(lms[0],  aspect);
    const mfTip  = lmToWorld(lms[12], aspect);
    const span   = wrist.distanceTo(mfTip);
    const scale  = span * (isRing ? 0.28 : 0.55);

    placeJewel(pos, quat, scale);
  }, [placeJewel]);

  // ── Face callback ──────────────────────────────────────────────────────────
  // Earring orientation goal:
  //   - pivot.position = just below the ear tragus landmark
  //   - No rotation needed: gem default (OctahedronGeometry Y-up) faces camera ✓
  //   - For OBJ earrings: they should already face +Z from the artist, no correction needed
  //   - Scale: 14% of face width per earring

  const onFaceResults = useCallback((results) => {
    const c2 = canvas2D.current;
    if (c2) { const ctx = c2.getContext("2d"); ctx.clearRect(0, 0, c2.width, c2.height); }

    if (!results.multiFaceLandmarks?.length) {
      trackRef.current = false; setTrackingOK(false); return;
    }

    const lms    = results.multiFaceLandmarks[0];
    const aspect = (wrapRef.current?.clientWidth || 640) / (wrapRef.current?.clientHeight || 480);

    if (showDbgRef.current && c2) {
      const ctx = c2.getContext("2d");
      [234, 454, 152].forEach((idx) => {
        if (!lms[idx]) return;
        ctx.beginPath();
        ctx.arc((1 - lms[idx].x) * c2.width, lms[idx].y * c2.height, 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(224,64,251,0.9)"; ctx.fill();
      });
    }

    // FaceMesh landmark 454 = right ear tragus (mirrored → appears on left in video)
    // 234 = left ear tragus
    // Use right ear (454) as primary anchor; hang earring BELOW it
    const earLm  = lms[454] || lms[234] || lms[0];
    const pos    = lmToWorld(earLm, aspect);

    // Face width = distance between ear tragi → used for scale
    const lEar = lms[234] ? lmToWorld(lms[234], aspect) : pos.clone();
    const rEar = lms[454] ? lmToWorld(lms[454], aspect) : pos.clone();
    const faceW = lEar.distanceTo(rEar);

    // Earring hangs BELOW the tragus: offset downward by half the earring size
    const earringSize = faceW * 0.18;
    pos.y -= earringSize * 0.6;   // hang below tragus

    // Earring faces camera — identity quaternion is correct (no rotation)
    placeJewel(pos, new THREE.Quaternion(), earringSize);
  }, [placeJewel]);

  // ── Pose callback ──────────────────────────────────────────────────────────
  // Necklace orientation goal:
  //   - pivot.position = collar bone centre (between shoulder midpoint and chin)
  //   - Necklace lies in XY plane by default → faces camera (+Z) ✓
  //   - Should be roughly horizontal, following neckline
  //   - Tilt to match shoulder angle for a natural fit

  const onPoseResults = useCallback((results) => {
    const c2 = canvas2D.current;
    if (c2) { const ctx = c2.getContext("2d"); ctx.clearRect(0, 0, c2.width, c2.height); }

    if (!results.poseLandmarks) { trackRef.current = false; setTrackingOK(false); return; }

    const lms    = results.poseLandmarks;
    const aspect = (wrapRef.current?.clientWidth || 640) / (wrapRef.current?.clientHeight || 480);

    if (showDbgRef.current && c2) {
      const ctx = c2.getContext("2d");
      [0, 11, 12].forEach((idx) => {
        const lm = lms[idx]; if (!lm) return;
        ctx.beginPath();
        ctx.arc((1 - lm.x) * c2.width, lm.y * c2.height, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(46,204,113,0.9)"; ctx.fill();
      });
    }

    const lSh  = lms[11]; const rSh = lms[12]; const nose = lms[0];
    if (!lSh || !rSh || !nose) { trackRef.current = false; setTrackingOK(false); return; }

    const lPos   = lmToWorld(lSh,  aspect);
    const rPos   = lmToWorld(rSh,  aspect);
    const nPos   = lmToWorld(nose, aspect);

    // Collar position = 65% of the way from nose to shoulder midpoint
    const shoulderMid = new THREE.Vector3().addVectors(lPos, rPos).multiplyScalar(0.5);
    const collarPos   = new THREE.Vector3().lerpVectors(nPos, shoulderMid, 0.65);

    // Shoulder angle (tilt necklace to follow shoulder line)
    const shoulderDir   = new THREE.Vector3().subVectors(rPos, lPos).normalize();
    const shoulderAngle = Math.atan2(shoulderDir.y, shoulderDir.x);

    // Rotate necklace around Z to follow shoulder tilt, keep facing camera (+Z)
    const quat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, shoulderAngle)
    );

    // Scale = 65% of shoulder span (fills the neckline)
    const shoulderSpan = lPos.distanceTo(rPos);
    const scale = shoulderSpan * 0.65;

    placeJewel(collarPos, quat, scale);
  }, [placeJewel]);

  // ── Start tracker ──────────────────────────────────────────────────────────
  const startTracker = useCallback(async (type) => {
    if (mpRef.current?.mpCamera) { try { await mpRef.current.mpCamera.stop(); } catch {} }
    if (mpRef.current?.tracker?.close) { try { await mpRef.current.tracker.close(); } catch {} }
    trackRef.current = false; setTrackingOK(false);
    setStatus("loading"); setStatusMsg("Initialising camera tracking…");

    const video = videoRef.current;
    const track = PLACEMENT[type]?.trackWith || "hands";
    const CDN   = (pkg, ver) => `https://cdn.jsdelivr.net/npm/@mediapipe/${pkg}@${ver}`;

    try {
      let tracker;

      if (track === "hands") {
        tracker = new Hands({ locateFile: f => `${CDN("hands","0.4.1646424915")}/${f}` });
        tracker.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.6 });
        tracker.onResults(onHandResults);

      } else if (track === "face") {
        tracker = new FaceMesh({ locateFile: f => `${CDN("face_mesh","0.4.1633559619")}/${f}` });
        tracker.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
        tracker.onResults(onFaceResults);

      } else {
        tracker = new Pose({ locateFile: f => `${CDN("pose","0.5.1675469404")}/${f}` });
        tracker.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
        tracker.onResults(onPoseResults);
      }

      await tracker.initialize();

      const mpCamera = new Camera(video, {
        onFrame: async () => { try { await tracker.send({ image: video }); } catch {} },
        width: 1280, height: 720,
      });
      await mpCamera.start();
      mpRef.current = { tracker, mpCamera };

      video.addEventListener("loadedmetadata", () => {
        if (canvas2D.current) {
          canvas2D.current.width  = video.videoWidth  || 1280;
          canvas2D.current.height = video.videoHeight || 720;
        }
      }, { once: true });

    } catch (err) {
      console.error("Tracker failed:", err);
      setStatus("error");
      setStatusMsg(`Tracking failed: ${err.message || err}`);
    }
  }, [onHandResults, onFaceResults, onPoseResults]);

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const type = detectJewelryType(level2);
    setJType(type); jTypeRef.current = type;

    const cleanupThree = initThree();
    const t = setTimeout(async () => {
      await loadJewelry(type);
      await startTracker(type);
    }, 250);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
      if (mpRef.current?.mpCamera)       { try { mpRef.current.mpCamera.stop();  } catch {} }
      if (mpRef.current?.tracker?.close) { try { mpRef.current.tracker.close();  } catch {} }
      if (rendererRef.current)           { rendererRef.current.dispose(); }
      if (cleanupThree) cleanupThree();
    };
  }, []); // eslint-disable-line

  // ── Switch type ────────────────────────────────────────────────────────────
  const switchType = useCallback(async (newType) => {
    setJType(newType); jTypeRef.current = newType;
    trackRef.current = false; setTrackingOK(false);
    await loadJewelry(newType);
    await startTracker(newType);
  }, [loadJewelry, startTracker]);

  // ── Capture ────────────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const c3d   = canvas3D.current;
    if (!video || !c3d) return;
    const out = document.createElement("canvas");
    out.width  = video.videoWidth  || 1280;
    out.height = video.videoHeight || 720;
    const ctx  = out.getContext("2d");
    ctx.save();
    if (mirrored) { ctx.translate(out.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, out.width, out.height);
    ctx.restore();
    ctx.drawImage(c3d, 0, 0, out.width, out.height);
    const a = document.createElement("a");
    a.download = `geminal_ar_${Date.now()}.png`;
    a.href = out.toDataURL("image/png");
    a.click();
  }, [mirrored]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const ICONS = { ring: "💍", earring: "💎", necklace: "📿", bracelet: "⌚" };

  return (
    <div ref={wrapRef} style={{
      width: "100vw", height: "100vh", background: "#000",
      display: "flex", flexDirection: "column",
      fontFamily: "'DM Sans',sans-serif",
      overflow: "hidden", position: "relative", userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp2  { from{opacity:0;transform:translateY(10px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes gradShift{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        .ar-tap { transition:all 0.18s; cursor:pointer; }
        .ar-tap:hover  { opacity:0.85; transform:scale(1.06); }
        .ar-tap:active { transform:scale(0.94); }
      `}</style>

      {/* Video */}
      <video ref={videoRef} autoPlay playsInline muted style={{
        position:"absolute", inset:0, width:"100%", height:"100%",
        objectFit:"cover", transform: mirrored ? "scaleX(-1)" : "none",
      }} />

      {/* 2D debug canvas */}
      <canvas ref={canvas2D} style={{
        position:"absolute", inset:0, width:"100%", height:"100%",
        objectFit:"cover", transform: mirrored ? "scaleX(-1)" : "none",
        pointerEvents:"none", display: showDebug ? "block" : "none",
      }} />

      {/* Three.js canvas */}
      <canvas ref={canvas3D} style={{
        position:"absolute", inset:0, width:"100%", height:"100%",
        pointerEvents:"none",
      }} />

      {/* ── TOP BAR ── */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, zIndex:10,
        padding:"14px 18px",
        background:"linear-gradient(to bottom,rgba(0,0,0,0.72),transparent)",
        display:"flex", alignItems:"center", gap:"10px",
        animation:"fadeDown 0.4s ease",
      }}>
        <button className="ar-tap" onClick={() => navigate(-1)} style={{
          padding:"8px 14px", borderRadius:"10px",
          background:"rgba(255,255,255,0.12)", backdropFilter:"blur(10px)",
          border:"1px solid rgba(255,255,255,0.2)",
          color:"#fff", fontSize:"13px", fontFamily:"'DM Sans',sans-serif",
          display:"flex", alignItems:"center", gap:"5px",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          Back
        </button>

        <img src="/assets/logo.png" alt="GeminAI" style={{ height:"26px", objectFit:"contain", opacity:0.92 }} />

        <div style={{ flex:1 }}>
          <div style={{ fontSize:"14px", fontWeight:700, color:"#fff", fontFamily:"'Nunito',sans-serif" }}>
            AR Try‑On  {ICONS[jType] || "💍"}
          </div>
          <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.55)", marginTop:"1px" }}>
            {jType.charAt(0).toUpperCase() + jType.slice(1)} mode
            {modelLoaded && <span style={{ color: T.success, marginLeft:"8px" }}>● model loaded</span>}
          </div>
        </div>

        <div style={{
          padding:"4px 10px", borderRadius:"20px",
          backgroundColor: fps >= 18 ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)",
          border:`1px solid ${fps >= 18 ? "rgba(46,204,113,0.4)" : "rgba(231,76,60,0.4)"}`,
          fontSize:"11px", color: fps >= 18 ? T.success : T.danger, fontFamily:"monospace",
        }}>{fps} fps</div>

        <div style={{
          display:"flex", alignItems:"center", gap:"6px",
          padding:"4px 12px", borderRadius:"20px",
          backgroundColor: trackingOK ? "rgba(46,204,113,0.15)" : "rgba(255,165,0,0.15)",
          border:`1px solid ${trackingOK ? "rgba(46,204,113,0.4)" : "rgba(255,165,0,0.4)"}`,
          fontSize:"11px", color: trackingOK ? T.success : "#ffa500",
        }}>
          <div style={{
            width:"6px", height:"6px", borderRadius:"50%",
            background: trackingOK ? T.success : "#ffa500",
            animation:"pulse 1.4s infinite",
          }} />
          {trackingOK ? "Tracking" : status === "loading" ? "Loading…" : "Searching…"}
        </div>
      </div>

      {/* ── INSTRUCTION CHIP ── */}
      {status !== "error" && (
        <div style={{
          position:"absolute", top:"76px", left:"50%", transform:"translateX(-50%)",
          zIndex:10, padding:"8px 18px", borderRadius:"20px",
          backgroundColor:"rgba(0,0,0,0.55)", backdropFilter:"blur(10px)",
          border:"1px solid rgba(255,255,255,0.12)",
          fontSize:"12px", color:"rgba(255,255,255,0.85)",
          display:"flex", alignItems:"center", gap:"8px",
          maxWidth:"90vw", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          animation:"fadeDown 0.3s ease",
        }}>
          {status === "loading" && (
            <div style={{ width:"11px", height:"11px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.25)", borderTopColor:"#fff", animation:"spin 0.7s linear infinite", flexShrink:0 }} />
          )}
          {statusMsg}
        </div>
      )}

      {/* ── PLACEMENT GUIDE ── */}
      {status === "tracking" && !trackingOK && (
        <div style={{
          position:"absolute", inset:0, zIndex:5,
          display:"flex", alignItems:"center", justifyContent:"center",
          pointerEvents:"none",
        }}>
          <div style={{
            border:"2.5px dashed rgba(123,92,229,0.55)",
            borderRadius: jType === "necklace" ? "50%" : "50% 50% 35% 35% / 60% 60% 40% 40%",
            width:  jType === "necklace" ? "220px" : jType === "earring" ? "90px" : "130px",
            height: jType === "necklace" ? "110px" : jType === "earring" ? "90px"  : "170px",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"44px",
            backgroundColor:"rgba(75,108,247,0.05)",
            boxShadow:"0 0 50px rgba(75,108,247,0.12)",
          }}>
            {ICONS[jType]}
          </div>
        </div>
      )}

      {/* ── BOTTOM BAR ── */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, zIndex:10,
        padding:"16px 22px 32px",
        background:"linear-gradient(to top,rgba(0,0,0,0.78),transparent)",
        display:"flex", alignItems:"flex-end",
        justifyContent:"space-between", gap:"12px",
        animation:"fadeUp2 0.4s ease",
      }}>
        {/* Type switcher */}
        <div style={{ display:"flex", gap:"8px" }}>
          {Object.entries(ICONS).map(([type, icon]) => (
            <button key={type} className="ar-tap"
              onClick={() => switchType(type)}
              title={type.charAt(0).toUpperCase() + type.slice(1)}
              style={{
                width:"46px", height:"46px", borderRadius:"13px",
                backgroundColor: jType === type ? "rgba(123,92,229,0.5)" : "rgba(255,255,255,0.1)",
                backdropFilter:"blur(10px)",
                border: jType === type ? "2px solid rgba(155,89,232,0.85)" : "1px solid rgba(255,255,255,0.2)",
                fontSize:"20px",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow: jType === type ? "0 0 16px rgba(123,92,229,0.5)" : "none",
              }}
            >{icon}</button>
          ))}
        </div>

        {/* Shutter */}
        <button className="ar-tap" onClick={capturePhoto} title="Take photo" style={{
          width:"68px", height:"68px", borderRadius:"50%",
          backgroundImage:"linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB)",
          backgroundSize:"200% 200%",
          animation:"gradShift 3s ease infinite",
          border:"4px solid rgba(255,255,255,0.3)",
          boxShadow:"0 0 28px rgba(75,108,247,0.55),0 4px 18px rgba(0,0,0,0.5)",
          fontSize:"26px",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>📸</button>

        {/* Toggles */}
        <div style={{ display:"flex", gap:"8px" }}>
          {[
            { label:"Mirror", icon:"⟺", state:mirrored,  toggle:() => setMirrored(m => !m) },
            { label:"Debug",  icon:"🔍", state:showDebug, toggle:() => setShowDebug(d => !d) },
          ].map(({ label, icon, state, toggle }) => (
            <button key={label} className="ar-tap" onClick={toggle} style={{
              padding:"10px 14px", borderRadius:"13px",
              backgroundColor: state ? "rgba(123,92,229,0.4)" : "rgba(255,255,255,0.1)",
              backdropFilter:"blur(10px)",
              border: state ? "1px solid rgba(155,89,232,0.7)" : "1px solid rgba(255,255,255,0.2)",
              color:"#fff", fontSize:"11px", fontFamily:"'DM Sans',sans-serif",
              display:"flex", flexDirection:"column", alignItems:"center", gap:"3px",
            }}>
              <span style={{ fontSize:"17px" }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ERROR ── */}
      {status === "error" && (
        <div style={{
          position:"absolute", inset:0, zIndex:20,
          backgroundColor:"rgba(0,0,0,0.88)",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          gap:"16px", padding:"28px",
          animation:"fadeDown 0.3s ease",
        }}>
          <div style={{ fontSize:"44px" }}>⚠️</div>
          <div style={{ fontSize:"17px", fontWeight:700, color:"#fff", fontFamily:"'Nunito',sans-serif", textAlign:"center" }}>
            AR Unavailable
          </div>
          <div style={{
            fontSize:"13px", color:"rgba(255,255,255,0.6)",
            textAlign:"center", maxWidth:"320px", lineHeight:1.65,
            backgroundColor:"rgba(231,76,60,0.1)", border:"1px solid rgba(231,76,60,0.25)",
            borderRadius:"10px", padding:"12px 16px",
          }}>{statusMsg}</div>
          <div style={{ display:"flex", gap:"10px" }}>
            <button className="ar-tap" onClick={() => startTracker(jType)} style={{
              padding:"10px 24px", borderRadius:"10px",
              backgroundImage:"linear-gradient(135deg,#4B6CF7,#9B59E8)",
              border:"none", color:"#fff", fontSize:"13px",
              fontFamily:"'DM Sans',sans-serif", fontWeight:600,
            }}>Retry</button>
            <button className="ar-tap" onClick={() => navigate(-1)} style={{
              padding:"10px 24px", borderRadius:"10px",
              backgroundColor:"rgba(255,255,255,0.1)", backdropFilter:"blur(8px)",
              border:"1px solid rgba(255,255,255,0.2)",
              color:"#fff", fontSize:"13px", fontFamily:"'DM Sans',sans-serif",
            }}>Go Back</button>
          </div>
        </div>
      )}
    </div>
  );
}