import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

const componentManifest = {
  metadata: { name: "Dynamic 3D Component", version: "2.0" },
  scene: [
    {
      id: "main_body",
      type: "path", 
      path: [
        { type: "moveTo", x: 0, y: 0.3 },
        { type: "bezier", cp1: [0.2, 0.3], cp2: [0.3, 0], to: [0, -0.4] },
        { type: "bezier", cp1: [-0.3, 0], cp2: [-0.2, 0.3], to: [0, 0.3] }
      ],
      params: { depth: 0.2, bevelEnabled: true },
      material: { color: "#3b82f6", metalness: 0.7, roughness: 0.2 }
    },
    {
      id: "radial_array",
      type: "instanced_radial",
      count: 8,
      radius: 0.6,
      child_geometry: { type: "circle", args: [0.2, 32] },
      params: { depth: 0.05 },
      material: { color: "#60a5fa", metalness: 0.5, roughness: 0.1 }
    }
  ]
};

const DynamicRenderer = React.forwardRef(({ sceneData }, ref) => {
  return (
    <group ref={ref}>
      {sceneData.map((node) => {
        const shape = useMemo(() => {
          const s = new THREE.Shape();
          if (node.type === 'path') {
            node.path.forEach(step => {
              if (step.type === 'moveTo') s.moveTo(step.x, step.y);
              if (step.type === 'bezier') s.bezierCurveTo(...step.cp1, ...step.cp2, ...step.to);
            });
          }
          return s;
        }, [node]);

        return (
          <mesh key={node.id} position={node.position || [0, 0, 0]}>
            <extrudeGeometry args={[shape, { 
              depth: node.params?.depth || 0.1, 
              bevelEnabled: true, 
              bevelThickness: 0.02 
            }]} />
            <meshStandardMaterial {...node.material} />
          </mesh>
        );
      })}
    </group>
  );
});

const SceneWindow = ({ data }) => {
  const modelRef = useRef();

  const handleExport = () => {
    if (!modelRef.current) return;

    const exporter = new GLTFExporter();
    exporter.parse(
      modelRef.current,
      (gltf) => {
        const blob = new Blob([JSON.stringify(gltf)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${data.metadata.name.replace(/\s+/g, '_')}.glb`;
        link.click();
      },
      { binary: false } // Set to true for .glb binary, false for .gltf JSON
    );
  };

  return (
    <div className="w-full h-[600px] bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <span className="text-slate-500 font-mono text-xs uppercase tracking-widest">{data.metadata.name}</span>
        <button 
          onClick={handleExport}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export 3D Asset
        </button>
      </div>
      
      <div className="flex-grow">
        <Canvas shadows>
          <color attach="background" args={['#020617']} />
          <PerspectiveCamera makeDefault position={[0, 1, 4]} fov={40} />
          <ambientLight intensity={0.5} />
          <Environment preset="city" />
          <Center top>
            <DynamicRenderer ref={modelRef} sceneData={data.scene} />
          </Center>
          <OrbitControls makeDefault />
        </Canvas>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <SceneWindow data={componentManifest} />
      </div>
    </div>
  );
}