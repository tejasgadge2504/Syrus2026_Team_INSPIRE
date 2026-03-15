import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  Center,
} from "@react-three/drei";
import SceneRenderer from "./SceneRenderer";

export default function JewelryViewer({ jsonData }) {
  return (
    <div
      style={{
        width: "800px",
        height: "500px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "2px solid #333",
        background: "#020202",
      }}
    >
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0.5, 5]} fov={35} />

        <Environment preset="city" />

        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={2} />

        <Suspense fallback={null}>
          <Center>
            <SceneRenderer components={jsonData.components} />
          </Center>
        </Suspense>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}