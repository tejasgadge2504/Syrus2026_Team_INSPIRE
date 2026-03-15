import React, { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter";
import SceneRenderer from "./SceneRenderer";

export default function JewelryViewer({ jsonData, setSelectedId, selectedId }) {
  const glRef = useRef();

  const exportGLB = () => {
    if (!glRef.current) return;
    new GLTFExporter().parse(
      glRef.current,
      (result) => triggerDownload(new Blob([result], { type: "application/octet-stream" }), "jewelry.glb"),
      (err) => console.error(err),
      { binary: true }
    );
  };

  const exportSTL = () => {
    if (!glRef.current) return;
    const result = new STLExporter().parse(glRef.current, { binary: true });
    triggerDownload(new Blob([result], { type: "application/octet-stream" }), "jewelry.stl");
  };

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      margin: 0,
      padding: 0,
    }}>
      {/* Export bar */}
      <div style={{
        display: "flex",
        gap: "10px",
        padding: "8px 14px",
        background: "rgba(0,0,0,0.4)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}>
        <button onClick={exportGLB} style={exportBtn("#0f2a1a", "#4caf50")}>⬇ Export GLB</button>
        <button onClick={exportSTL} style={exportBtn("#1a0f2a", "#bb86fc")}>⬇ Export STL</button>
      </div>

      {/* Canvas — zero margin, fills everything */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <Canvas
          shadows
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          onCreated={({ scene }) => { glRef.current = scene; }}
          camera={{ position: [0, 0.5, 6], fov: 35 }}
        >
          <Environment preset="city" />
          <ambientLight intensity={0.6} />
          <pointLight position={[5, 5, 5]} intensity={2} />
          <pointLight position={[-5, -5, -5]} intensity={0.5} />
          <Suspense fallback={null}>
            <SceneRenderer
              components={jsonData.components}
              setSelectedId={setSelectedId}
              selectedId={selectedId}
            />
          </Suspense>
          <OrbitControls makeDefault enablePan enableZoom enableRotate />
        </Canvas>
      </div>
    </div>
  );
}

function exportBtn(bg, color) {
  return {
    background: bg, color,
    border: `1px solid ${color}55`,
    borderRadius: "6px", padding: "5px 14px",
    fontSize: "11px", cursor: "pointer", fontWeight: 500,
  };
}