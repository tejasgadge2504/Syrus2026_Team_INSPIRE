import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import JewelryScene from "./JewelryScene";

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 5, 20], fov: 50 }}
      style={{ width: "100vw", height: "100vh", background: "#111" }}
    >
      {/* lights */}
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 10]} intensity={2} />

      {/* reflections */}
      <Environment preset="studio" />

      <JewelryScene />

      <OrbitControls />
    </Canvas>
  );
}