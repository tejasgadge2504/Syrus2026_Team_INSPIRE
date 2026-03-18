import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls }  from "three/examples/jsm/controls/OrbitControls";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { OBJLoader }      from "three/examples/jsm/loaders/OBJLoader";
import { GLTFExporter }   from "three/examples/jsm/exporters/GLTFExporter";
import { STLExporter }    from "three/examples/jsm/exporters/STLExporter";

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
//  Material builder
// ─────────────────────────────────────────────────────────────────────────────

function buildMaterial(comp, viewMode, envMap) {
  const isGem    = isGemType(comp.type);
  const colorHex = comp.materialOverrides?.color || (isGem ? "#d6eaf8" : "#c9a84c");

  if (viewMode === "Wireframe") {
    return new THREE.MeshBasicMaterial({ color: colorHex, wireframe: true });
  }

  if (viewMode === "Clay") {
    return new THREE.MeshStandardMaterial({
      color: isGem ? "#c8c0b0" : "#b8b0a0", metalness: 0, roughness: 0.9,
    });
  }

  if (isGem) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: colorHex, metalness: 0, roughness: 0.0,
      transmission: 0.85, ior: 2.4, thickness: 0.5,
      reflectivity: 1.0, clearcoat: 1.0, clearcoatRoughness: 0.0,
      transparent: true, opacity: 1.0, envMapIntensity: 3.0,
    });
    if (envMap) mat.envMap = envMap;
    return mat;
  }

  const mat = new THREE.MeshPhysicalMaterial({
    color: colorHex, metalness: 1.0, roughness: 0.15,
    clearcoat: 0.3, clearcoatRoughness: 0.1,
    reflectivity: 1.0, envMapIntensity: 2.5,
  });
  if (envMap) mat.envMap = envMap;
  return mat;
}

// ─────────────────────────────────────────────────────────────────────────────
//  hotUpdateMaterial
// ─────────────────────────────────────────────────────────────────────────────

function hotUpdateMaterial(mesh, comp, viewMode, envMap) {
  const mat = mesh.material;
  if (!mat) return;

  const isGem    = isGemType(comp.type);
  const colorHex = comp.materialOverrides?.color || (isGem ? "#d6eaf8" : "#c9a84c");
  const isWire   = viewMode === "Wireframe";
  const isClay   = viewMode === "Clay";
  const isPbr    = !isWire && !isClay;

  const wrongType =
    (isWire && mat.type !== "MeshBasicMaterial") ||
    (isClay && !(mat.type === "MeshStandardMaterial" && mat.roughness > 0.5)) ||
    (isPbr  && (mat.type === "MeshBasicMaterial" ||
               (isGem  && !mat.transmission) ||
               (!isGem && mat.roughness > 0.5)));

  if (wrongType) {
    mat.dispose();
    mesh.material = buildMaterial(comp, viewMode, envMap);
    return;
  }

  if (!isClay && mat.color) { mat.color.set(colorHex); }
  if (isPbr && envMap && mat.envMap !== envMap) { mat.envMap = envMap; }
  mat.needsUpdate = true;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Geometry builder
// ─────────────────────────────────────────────────────────────────────────────

function buildGeometry(comp) {
  const g     = comp.geometry || {};
  const gtype = (g.type   || "").toLowerCase().trim();
  const ctype = (comp.type || "").toLowerCase().trim();

  if (gtype === "torus")      return new THREE.TorusGeometry(g.radius || 1, g.tube || 0.12, 64, 256);
  if (gtype === "sphere")     return new THREE.SphereGeometry(g.radius || 0.3, 64, 64);
  if (gtype === "cylinder")   return new THREE.CylinderGeometry(g.radiusTop ?? g.radius ?? 0.05, g.radiusBottom ?? g.radius ?? 0.05, g.height || 0.2, 32);
  if (gtype === "box")        return new THREE.BoxGeometry(g.width || 0.2, g.height || 0.2, g.depth || 0.2);
  if (gtype === "octahedron") return new THREE.OctahedronGeometry(g.radius || 0.25, 2);
  if (gtype === "cone")       return new THREE.ConeGeometry(g.radius || 0.06, g.height || 0.18, 32);

  if (["band","ring","shank"].includes(ctype))      return new THREE.TorusGeometry(g.radius || 1, g.tube || (g.bandWidth ? g.bandWidth / 20 : 0.12), 64, 256);
  if (isGemType(ctype))                             return new THREE.OctahedronGeometry(g.size || g.radius || 0.28, 2);
  if (["prong","prongs"].includes(ctype))           return new THREE.TorusGeometry(g.radius || 0.38, g.tube || 0.032, 16, 64);
  if (["setting","basket","bezel"].includes(ctype)) return new THREE.CylinderGeometry(0.35, 0.28, 0.16, 32, 1, true);
  if (ctype === "halo")                             return new THREE.TorusGeometry(g.radius || 0.42, g.tube || 0.045, 32, 128);
  return new THREE.SphereGeometry(0.15, 32, 32);
}

function applyTransform(obj, comp) {
  const pos = comp.transform?.position || [0, 0, 0];
  const rot = comp.transform?.rotation || [0, 0, 0];
  const s   = comp.transform?.scale    ?? 1;
  obj.position.set(pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0);
  obj.rotation.set(rot[0] ?? 0, rot[1] ?? 0, rot[2] ?? 0);
  if (Array.isArray(s)) obj.scale.set(s[0], s[1], s[2]);
  else obj.scale.setScalar(typeof s === "number" ? s : 1);
}

function setupLighting(scene, envMode) {
  const ambient = new THREE.AmbientLight(0xffffff, envMode === "Dramatic" ? 0.1 : 0.3);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff5e0, envMode === "Dramatic" ? 3.0 : 1.8);
  key.position.set(5, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.1; key.shadow.camera.far = 50; key.shadow.bias = -0.001;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xddeeff, 0.6); fill.position.set(-6, 4, -4); scene.add(fill);
  const rim  = new THREE.DirectionalLight(0xffcc44, envMode === "Dramatic" ? 2.5 : 1.0); rim.position.set(0, -2, -6); scene.add(rim);
  const top  = new THREE.DirectionalLight(0xffffff, 0.8); top.position.set(0, 15, 0); scene.add(top);

  if (envMode === "Showroom") {
    const s1 = new THREE.SpotLight(0xffffff, 3.0); s1.position.set(0,12,0); s1.angle = Math.PI/5; s1.penumbra = 0.25; s1.castShadow = true; scene.add(s1);
    const s2 = new THREE.SpotLight(0xffeedd, 1.5); s2.position.set(8,5,2);  s2.angle = Math.PI/4; s2.penumbra = 0.5;  scene.add(s2);
  }
  if (envMode === "Dramatic") {
    const s1 = new THREE.SpotLight(0xc9a84c, 5.0); s1.position.set(-2,8,2); s1.angle = Math.PI/10; s1.penumbra = 0.4; s1.castShadow = true; scene.add(s1);
    const s2 = new THREE.SpotLight(0xffffff, 2.0); s2.position.set(4,6,-3); s2.angle = Math.PI/8;  s2.penumbra = 0.6; scene.add(s2);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  URL normaliser
//  model_path can be either:
//    • a full URL  → "http://localhost:5000/api/gems/model/CushionCut_Diamond"
//    • a rel path  → "database/models/diamond.obj"
//  We always want a full URL for OBJLoader.
// ─────────────────────────────────────────────────────────────────────────────
function resolveModelUrl(modelPath) {
  if (!modelPath) return null;
  // Already a full URL — use as-is
  if (modelPath.startsWith("http://") || modelPath.startsWith("https://")) {
    return modelPath;
  }
  // Relative path — prepend Flask base
  return `http://localhost:5000/${modelPath}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ModelRenderer  —  forwardRef exposes captureImage / exportGLB / exportSTL
// ─────────────────────────────────────────────────────────────────────────────

const ModelRenderer = forwardRef(function ModelRenderer(
  { jewelryJSON, selectedId, setSelectedId, viewMode = "Pbr", envMode = "Studio" },
  ref
) {
  const mountRef    = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);
  const controlsRef = useRef(null);
  const animRef     = useRef(null);
  const envMapRef   = useRef(null);
  const objectMap   = useRef({});

  // ── fitCamera — defined FIRST so it can be called anywhere below ──────────
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

  // ── Expose export methods ─────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    captureImage(multiplier = 3) {
      const renderer = rendererRef.current;
      const scene    = sceneRef.current;
      const camera   = cameraRef.current;
      if (!renderer || !scene || !camera) return null;
      const origW = renderer.domElement.width;
      const origH = renderer.domElement.height;
      renderer.setSize(origW * multiplier, origH * multiplier, false);
      renderer.render(scene, camera);
      const dataURL = renderer.domElement.toDataURL("image/png");
      renderer.setSize(origW, origH, false);
      renderer.render(scene, camera);
      return dataURL;
    },
    exportGLB() {
      return new Promise((resolve, reject) => {
        const scene = sceneRef.current;
        if (!scene) return reject(new Error("Scene not ready"));
        const exporter = new GLTFExporter();
        exporter.parse(
          scene,
          (result) => resolve(new Blob([result], { type: "model/gltf-binary" })),
          (err)    => reject(err),
          { binary: true, includeCustomExtensions: false }
        );
      });
    },
    exportSTL() {
      const scene = sceneRef.current;
      if (!scene) throw new Error("Scene not ready");
      const result = new STLExporter().parse(scene, { binary: false });
      return new Blob([result], { type: "model/stl" });
    },
  }), []);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFShadowMap;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const BG = { Studio: "#0d0d10", Showroom: "#12100a", Dramatic: "#060608" };
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG[envMode] || "#0d0d10");
    sceneRef.current = scene;

    const pmrem      = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    envMapRef.current  = envTexture;
    scene.environment  = envTexture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);
    camera.position.set(0, 1.5, 5);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true; controls.dampingFactor  = 0.07;
    controls.enableZoom     = true; controls.zoomSpeed      = 0.5;
    controls.minDistance    = 0.3;  controls.maxDistance    = 30;
    controls.autoRotate     = true; controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    setupLighting(scene, envMode);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.ShadowMaterial({ opacity: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -2; ground.receiveShadow = true;
    scene.add(ground);

    // Click-to-select
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

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
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

  // ─── SYNC OBJECTS ─────────────────────────────────────────────────────────
  useEffect(() => {
    const scene  = sceneRef.current;
    const envMap = envMapRef.current;
    if (!scene) return;

    const components  = jewelryJSON?.components || [];
    const incomingIds = new Set(components.map((c) => c.id));

    // Remove deleted components
    Object.keys(objectMap.current).forEach((id) => {
      if (!incomingIds.has(id)) {
        scene.remove(objectMap.current[id].group);
        objectMap.current[id].meshes.forEach((m) => { m.geometry?.dispose(); m.material?.dispose(); });
        delete objectMap.current[id];
      }
    });

    const objLoader = new OBJLoader();

    components.forEach((comp) => {
      const existing = objectMap.current[comp.id];

      if (comp.model_path) {
        // ── OBJ model path set (either full URL or relative) ───────────────
        // FIX: resolve to a proper full URL — never double-prefix
        const resolvedUrl = resolveModelUrl(comp.model_path);
        const pathChanged = existing && existing.loadedPath !== resolvedUrl;

        if (!existing || pathChanged) {
          // Tear down old mesh first
          if (existing) {
            scene.remove(existing.group);
            existing.meshes.forEach((m) => { m.geometry?.dispose(); m.material?.dispose(); });
            delete objectMap.current[comp.id];
          }

          // Store a placeholder so rapid re-renders don't kick off duplicate loads
          objectMap.current[comp.id] = { group: null, meshes: [], loadedPath: resolvedUrl };

          objLoader.load(
            resolvedUrl,
            (obj) => {
              // Guard: component may have been removed while we were loading
              if (!objectMap.current[comp.id]) return;

              const ms = getMeshes(obj);
              ms.forEach((m) => {
                m.material = buildMaterial(comp, viewMode, envMap);
                m.userData.componentId = comp.id;
                m.castShadow = m.receiveShadow = true;
              });
              applyTransform(obj, comp);
              scene.add(obj);
              objectMap.current[comp.id] = { group: obj, meshes: ms, loadedPath: resolvedUrl };
              fitCamera();
            },
            undefined,
            (err) => {
              console.warn("OBJ load failed:", resolvedUrl, err);
              // Remove placeholder on failure so next render retries
              delete objectMap.current[comp.id];
            }
          );
        } else if (existing.group) {
          // Model already loaded — just update material / transform
          existing.meshes.forEach((m) => hotUpdateMaterial(m, comp, viewMode, envMap));
          applyTransform(existing.group, comp);
        }

      } else {
        // ── Procedural geometry (no model_path) ───────────────────────────
        if (!existing) {
          const mesh = new THREE.Mesh(buildGeometry(comp), buildMaterial(comp, viewMode, envMap));
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

          // Rebuild band geometry if width changed
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
  }, [jewelryJSON, viewMode, fitCamera]); // fitCamera is stable (useCallback + no deps)

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

  return (
    <div
      ref={mountRef}
      style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0d0d10" }}
    />
  );
});

export default ModelRenderer;