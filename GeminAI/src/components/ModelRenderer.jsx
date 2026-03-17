import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isGemType(type) {
  return ["gem", "diamond", "stone", "gemstone", "center_stone", "center stone"]
    .includes((type || "").toLowerCase().trim());
}

function getMeshes(obj) {
  const out = [];
  obj.traverse((c) => { if (c.isMesh) out.push(c); });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  buildMaterial
//
//  PBR mode:
//   • Metals  → MeshPhysicalMaterial, metalness 1, roughness 0.15
//               With envMap this gives full mirror-like gold/silver shine
//               while still showing the base color tint.
//   • Gems    → MeshPhysicalMaterial, transmission 0.85, clearcoat 1
//               Gives glass-like refraction + sparkle.
//
//  Clay mode: flat MeshStandardMaterial, no metalness.
//  Wireframe: MeshBasicMaterial edges.
// ─────────────────────────────────────────────────────────────────────────────

function buildMaterial(comp, viewMode, envMap) {
  const isGem    = isGemType(comp.type);
  const colorHex = comp.materialOverrides?.color || (isGem ? "#d6eaf8" : "#c9a84c");

  if (viewMode === "Wireframe") {
    return new THREE.MeshBasicMaterial({ color: colorHex, wireframe: true });
  }

  if (viewMode === "Clay") {
    return new THREE.MeshStandardMaterial({
      color:     isGem ? "#c8c0b0" : "#b8b0a0",
      metalness: 0,
      roughness: 0.9,
    });
  }

  // ── PBR ──────────────────────────────────────────────────────────────────

  if (isGem) {
    const mat = new THREE.MeshPhysicalMaterial({
      color:              colorHex,
      metalness:          0,
      roughness:          0.0,
      transmission:       0.85,      // glass-like
      ior:                2.4,       // diamond refractive index
      thickness:          0.5,
      reflectivity:       1.0,
      clearcoat:          1.0,
      clearcoatRoughness: 0.0,
      transparent:        true,
      opacity:            1.0,
      envMapIntensity:    3.0,
    });
    if (envMap) mat.envMap = envMap;
    return mat;
  }

  // Metal / structural
  const mat = new THREE.MeshPhysicalMaterial({
    color:              colorHex,
    metalness:          1.0,       // fully metallic → picks up envMap reflections
    roughness:          0.15,      // low roughness → mirror-like shine
    clearcoat:          0.3,
    clearcoatRoughness: 0.1,
    reflectivity:       1.0,
    envMapIntensity:    2.5,
  });
  if (envMap) mat.envMap = envMap;
  return mat;
}

// ─────────────────────────────────────────────────────────────────────────────
//  hotUpdateMaterial
//  Color-only change: just call mat.color.set() — no rebuild needed.
//  viewMode change:   full dispose + rebuild with new envMap.
// ─────────────────────────────────────────────────────────────────────────────

function hotUpdateMaterial(mesh, comp, viewMode, envMap) {
  const mat = mesh.material;
  if (!mat) return;

  const isGem    = isGemType(comp.type);
  const colorHex = comp.materialOverrides?.color || (isGem ? "#d6eaf8" : "#c9a84c");

  const isPbr  = viewMode === "Pbr" || viewMode === "Pbr";
  const isWire = viewMode === "Wireframe";
  const isClay = viewMode === "Clay";

  const wrongType =
    (isWire && mat.type !== "MeshBasicMaterial") ||
    (isClay && !(mat.type === "MeshStandardMaterial" && !mat.metalness)) ||
    (isPbr  && (mat.type === "MeshBasicMaterial" ||
                (isGem  && !mat.transmission) ||
                (!isGem && mat.roughness > 0.5)));

  if (wrongType) {
    mat.dispose();
    mesh.material = buildMaterial(comp, viewMode, envMap);
    return;
  }

  // Fast path — just set color and ensure envMap is attached
  if (!isClay && mat.color) {
    mat.color.set(colorHex);
  }
  if (isPbr && envMap && mat.envMap !== envMap) {
    mat.envMap = envMap;
  }
  mat.needsUpdate = true;
}

// ─────────────────────────────────────────────────────────────────────────────
//  buildGeometry
// ─────────────────────────────────────────────────────────────────────────────

function buildGeometry(comp) {
  const g     = comp.geometry || {};
  const gtype = (g.type || "").toLowerCase().trim();
  const ctype = (comp.type  || "").toLowerCase().trim();

  if (gtype === "torus")      return new THREE.TorusGeometry(g.radius || 1, g.tube || 0.12, 64, 256);
  if (gtype === "sphere")     return new THREE.SphereGeometry(g.radius || 0.3, 64, 64);
  if (gtype === "cylinder") {
    const rT = g.radiusTop    ?? g.radius ?? 0.05;
    const rB = g.radiusBottom ?? g.radius ?? 0.05;
    return new THREE.CylinderGeometry(rT, rB, g.height || 0.2, 32);
  }
  if (gtype === "box")        return new THREE.BoxGeometry(g.width || 0.2, g.height || 0.2, g.depth || 0.2);
  if (gtype === "octahedron") return new THREE.OctahedronGeometry(g.radius || 0.25, 2);
  if (gtype === "cone")       return new THREE.ConeGeometry(g.radius || 0.06, g.height || 0.18, 32);

  if (["band","ring","shank"].includes(ctype)) {
    const r    = g.radius || 1;
    const tube = g.tube   || (g.bandWidth ? g.bandWidth / 20 : 0.12);
    return new THREE.TorusGeometry(r, tube, 64, 256);
  }
  if (isGemType(ctype)) {
    return new THREE.OctahedronGeometry(g.size || g.radius || 0.28, 2);
  }
  if (["prong","prongs"].includes(ctype)) {
    return new THREE.TorusGeometry(g.radius || 0.38, g.tube || 0.032, 16, 64);
  }
  if (["setting","basket","bezel"].includes(ctype)) {
    return new THREE.CylinderGeometry(0.35, 0.28, 0.16, 32, 1, true);
  }
  if (ctype === "halo") {
    return new THREE.TorusGeometry(g.radius || 0.42, g.tube || 0.045, 32, 128);
  }
  return new THREE.SphereGeometry(0.15, 32, 32);
}

// ─────────────────────────────────────────────────────────────────────────────
//  applyTransform
// ─────────────────────────────────────────────────────────────────────────────

function applyTransform(obj, comp) {
  const pos = comp.transform?.position || [0, 0, 0];
  const rot = comp.transform?.rotation || [0, 0, 0];
  const s   = comp.transform?.scale    ?? 1;
  obj.position.set(pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0);
  obj.rotation.set(rot[0] ?? 0, rot[1] ?? 0, rot[2] ?? 0);
  if (Array.isArray(s)) obj.scale.set(s[0], s[1], s[2]);
  else obj.scale.setScalar(typeof s === "number" ? s : 1);
}

// ─────────────────────────────────────────────────────────────────────────────
//  setupLighting
//  Keep lights moderate — the envMap handles most of the reflective look.
//  Too-strong direct lights wash out the metallic reflections.
// ─────────────────────────────────────────────────────────────────────────────

function setupLighting(scene, envMode) {
  // Low ambient — envMap already fills ambient
  const ambient = new THREE.AmbientLight(0xffffff, envMode === "Dramatic" ? 0.1 : 0.3);
  scene.add(ambient);

  // Key light — moderately strong, warm
  const key = new THREE.DirectionalLight(0xfff5e0, envMode === "Dramatic" ? 3.0 : 1.8);
  key.position.set(5, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far  = 50;
  key.shadow.bias = -0.001;
  scene.add(key);

  // Fill light — cool/neutral from opposite side
  const fill = new THREE.DirectionalLight(0xddeeff, 0.6);
  fill.position.set(-6, 4, -4);
  scene.add(fill);

  // Rim light — warm gold from behind/below
  const rim = new THREE.DirectionalLight(0xffcc44, envMode === "Dramatic" ? 2.5 : 1.0);
  rim.position.set(0, -2, -6);
  scene.add(rim);

  // Top accent — pure white from above
  const top = new THREE.DirectionalLight(0xffffff, 0.8);
  top.position.set(0, 15, 0);
  scene.add(top);

  if (envMode === "Showroom") {
    const spot = new THREE.SpotLight(0xffffff, 3.0);
    spot.position.set(0, 12, 0);
    spot.angle      = Math.PI / 5;
    spot.penumbra   = 0.25;
    spot.castShadow = true;
    scene.add(spot);

    // Side accent for showroom
    const side = new THREE.SpotLight(0xffeedd, 1.5);
    side.position.set(8, 5, 2);
    side.angle    = Math.PI / 4;
    side.penumbra = 0.5;
    scene.add(side);
  }

  if (envMode === "Dramatic") {
    const spot = new THREE.SpotLight(0xc9a84c, 5.0);
    spot.position.set(-2, 8, 2);
    spot.angle      = Math.PI / 10;
    spot.penumbra   = 0.4;
    spot.castShadow = true;
    scene.add(spot);

    const spot2 = new THREE.SpotLight(0xffffff, 2.0);
    spot2.position.set(4, 6, -3);
    spot2.angle    = Math.PI / 8;
    spot2.penumbra = 0.6;
    scene.add(spot2);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ModelRenderer
// ─────────────────────────────────────────────────────────────────────────────

export default function ModelRenderer({
  jewelryJSON,
  selectedId,
  setSelectedId,
  viewMode = "Pbr",
  envMode  = "Studio",
}) {
  const mountRef    = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);
  const controlsRef = useRef(null);
  const animRef     = useRef(null);
  const envMapRef   = useRef(null);   // ← PMREMGenerator output stored here
  const objectMap   = useRef({});

  // ─── SCENE BOOTSTRAP ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;

    cancelAnimationFrame(animRef.current);
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current.domElement.remove();
    }
    objectMap.current = {};

    const W = mountRef.current.clientWidth  || 800;
    const H = mountRef.current.clientHeight || 600;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    // outputEncoding is deprecated in r152+ but harmless otherwise
    if (renderer.outputColorSpace !== undefined) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // ── Scene ─────────────────────────────────────────────────────────────
    const BG = { Studio: "#0d0d10", Showroom: "#12100a", Dramatic: "#060608" };
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG[envMode] || "#0d0d10");
    sceneRef.current = scene;

    // ── PMREMGenerator — creates the envMap used by all PBR materials ─────
    //    RoomEnvironment simulates a softbox studio with warm/cool bounces.
    //    This is what makes metals look truly shiny and reflective.
    const pmrem   = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    envMapRef.current = envTexture;

    // Attach to scene so all materials with envMapIntensity pick it up
    scene.environment = envTexture;
    // Do NOT set scene.background to envTexture — we want our dark BG
    pmrem.dispose();

    // ── Camera ────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);
    camera.position.set(0, 1.5, 5);
    cameraRef.current = camera;

    // ── Controls ──────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.07;
    controls.enableZoom      = true;
    controls.zoomSpeed       = 0.5;
    controls.minDistance     = 0.3;
    controls.maxDistance     = 30;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    // ── Lighting ──────────────────────────────────────────────────────────
    setupLighting(scene, envMode);

    // ── Ground shadow ─────────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.ShadowMaterial({ opacity: 0.15 })
    );
    ground.rotation.x    = -Math.PI / 2;
    ground.position.y    = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Click-to-select raycaster ─────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();
    const onCanvasClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const allMeshes = [];
      Object.values(objectMap.current).forEach(({ meshes }) => allMeshes.push(...meshes));
      const hits = raycaster.intersectObjects(allMeshes, false);
      if (hits.length > 0) {
        const id = hits[0].object.userData.componentId;
        if (id) { setSelectedId(id); controls.autoRotate = false; }
      }
    };
    renderer.domElement.addEventListener("click", onCanvasClick);

    // ── Render loop ───────────────────────────────────────────────────────
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      cancelAnimationFrame(animRef.current);
      controls.dispose();
      envTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [envMode]); // eslint-disable-line

  // ─── SYNC OBJECTS when jewelryJSON or viewMode changes ────────────────────
  useEffect(() => {
    const scene  = sceneRef.current;
    const envMap = envMapRef.current;
    if (!scene) return;

    const components = jewelryJSON?.components || [];

    // Remove stale
    const incomingIds = new Set(components.map((c) => c.id));
    Object.keys(objectMap.current).forEach((id) => {
      if (!incomingIds.has(id)) {
        scene.remove(objectMap.current[id].group);
        objectMap.current[id].meshes.forEach((m) => {
          m.geometry?.dispose();
          m.material?.dispose();
        });
        delete objectMap.current[id];
      }
    });

    const objLoader = new OBJLoader();

    components.forEach((comp) => {
      const existing = objectMap.current[comp.id];

      if (comp.model_path) {
        if (!existing) {
          const url = `http://localhost:5000/${comp.model_path}`;
          objLoader.load(url, (obj) => {
            const ms = getMeshes(obj);
            ms.forEach((m) => {
              m.material = buildMaterial(comp, viewMode, envMap);
              m.userData.componentId = comp.id;
              m.castShadow = m.receiveShadow = true;
            });
            applyTransform(obj, comp);
            scene.add(obj);
            objectMap.current[comp.id] = { group: obj, meshes: ms };
            fitCamera();
          }, undefined, (err) => console.warn("OBJ load failed:", err));
        } else {
          existing.meshes.forEach((m) => hotUpdateMaterial(m, comp, viewMode, envMap));
          applyTransform(existing.group, comp);
        }
      } else {
        if (!existing) {
          const mesh = new THREE.Mesh(
            buildGeometry(comp),
            buildMaterial(comp, viewMode, envMap)
          );
          mesh.userData.componentId = comp.id;
          mesh.castShadow = mesh.receiveShadow = true;
          const group = new THREE.Group();
          group.add(mesh);
          applyTransform(group, comp);
          scene.add(group);
          objectMap.current[comp.id] = { group, meshes: [mesh] };
          fitCamera();
        } else {
          existing.meshes.forEach((m) => hotUpdateMaterial(m, comp, viewMode, envMap));
          applyTransform(existing.group, comp);

          // Rebuild band geometry if tube changed
          const ctype = (comp.type || "").toLowerCase();
          if (["band","ring","shank"].includes(ctype) && existing.meshes[0]) {
            const oldMesh = existing.meshes[0];
            const oldTube = oldMesh.geometry?.parameters?.tube;
            const newTube = comp.geometry?.tube || (comp.geometry?.bandWidth ? comp.geometry.bandWidth / 20 : 0.12);
            if (oldTube !== undefined && Math.abs(oldTube - newTube) > 0.001) {
              oldMesh.geometry.dispose();
              oldMesh.geometry = buildGeometry(comp);
            }
          }
        }
      }
    });
  }, [jewelryJSON, viewMode]); // eslint-disable-line

  // ─── SELECTION highlight ──────────────────────────────────────────────────
  useEffect(() => {
    Object.entries(objectMap.current).forEach(([id, { meshes }]) => {
      meshes.forEach((m) => {
        if (!m.material) return;
        const sel = id === selectedId;
        if (m.material.emissive !== undefined) {
          m.material.emissive.set(sel ? 0x4a3000 : 0x000000);
          m.material.emissiveIntensity = sel ? 0.5 : 0;
          m.material.needsUpdate = true;
        }
      });
    });
    if (controlsRef.current) controlsRef.current.autoRotate = !selectedId;
  }, [selectedId]);

  // ─── Camera fit ───────────────────────────────────────────────────────────
  const fitCamera = useCallback(() => {
    const scene  = sceneRef.current;
    const camera = cameraRef.current;
    const ctrl   = controlsRef.current;
    if (!scene || !camera) return;
    const box = new THREE.Box3();
    scene.traverse((child) => { if (child.isMesh) box.expandByObject(child); });
    if (box.isEmpty()) return;
    const size   = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(center.x, center.y + maxDim * 0.6, center.z + maxDim * 1.8);
    camera.lookAt(center);
    if (ctrl) ctrl.target.copy(center);
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0d0d10" }}
    />
  );
}