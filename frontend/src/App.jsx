import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Environment, Float, ContactShadows, PerspectiveCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

// --- ASSEMBLY DATA ---
const necklaceAssembly = {
  "metadata": { "name": "High-Fidelity Necklace Assembly" },
  "layers": [
    {
      "id": "main_flower_chain",
      "asset": "Dynamic_3D_Component",
      "instances": [
        { "pos": [0, 0, 0], "rot": [0, 0, 0], "scale": 0.45 },
        { "pos": [0.45, 0.05, 0], "rot": [0, 0, -0.25], "scale": 0.4 },
        { "pos": [-0.45, 0.05, 0], "rot": [0, 0, 0.25], "scale": 0.4 },
        { "pos": [0.85, 0.25, 0], "rot": [0, 0, -0.55], "scale": 0.38 },
        { "pos": [-0.85, 0.25, 0], "rot": [0, 0, 0.55], "scale": 0.38 },
        { "pos": [1.2, 0.6, 0], "rot": [0, 0, -0.85], "scale": 0.35 },
        { "pos": [-1.2, 0.6, 0], "rot": [0, 0, 0.85], "scale": 0.35 },
        { "pos": [1.5, 1.1, 0], "rot": [0, 0, -1.1], "scale": 0.32 },
        { "pos": [-1.5, 1.1, 0], "rot": [0, 0, 1.1], "scale": 0.32 }
      ]
    },
    {
      "id": "fringe_pendant_layer",
      "asset": "Pendant_Component",
      "instances": [
        { "pos": [0, -0.9, 0], "rot": [0, 0, 0], "scale": 1.1 },
        { "pos": [0.35, -0.75, -0.1], "rot": [0, 0, -0.2], "scale": 0.5 },
        { "pos": [-0.35, -0.75, -0.1], "rot": [0, 0, 0.2], "scale": 0.5 },
        { "pos": [0.7, -0.55, -0.1], "rot": [0, 0, -0.4], "scale": 0.5 },
        { "pos": [-0.7, -0.55, -0.1], "rot": [0, 0, 0.4], "scale": 0.5 }
      ]
    }
  ]
};

const NecklaceAsset = ({ url, instance }) => {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <primitive 
      object={clone} 
      position={instance.pos} 
      rotation={instance.rot} 
      scale={instance.scale} 
    />
  );
};

const NecklaceAssembler = ({ assemblyData }) => {
  const assetMap = {
    "Dynamic_3D_Component": "/models/Dynamic_3D_Component.glb",
    "Pendant_Component": "/models/Pendant_Component.glb"
  };

  // Fixed: Added safety check
  if (!assemblyData || !assemblyData.layers) return null;

  return (
    <group>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        {assemblyData.layers.map((layer) => (
          <group key={layer.id}>
            {layer.instances.map((ins, idx) => (
              <NecklaceAsset 
                key={`${layer.id}-${idx}`} 
                url={assetMap[layer.asset]} 
                instance={ins} 
              />
            ))}
          </group>
        ))}
      </Float>
    </group>
  );
};

const DynamicRenderer = React.forwardRef(({ sceneData }, ref) => {
  if (!sceneData) return null;
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
            <extrudeGeometry args={[shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02 }]} />
            <meshStandardMaterial {...node.material} />
          </mesh>
        );
      })}
    </group>
  );
});

const SceneWindow = ({ data, mode = "preview" }) => {
  const modelRef = useRef();

  return (
    <div className="w-full h-[800px] lg:h-[900px] bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <span className="text-slate-500 font-mono text-xs uppercase tracking-widest">
          {mode === "assembly" ? "Full Necklace Assembly" : data?.metadata?.name}
        </span>
      </div>
      
      <div className="flex-grow">
        <Canvas shadows>
          <color attach="background" args={['#020617']} />
          <PerspectiveCamera makeDefault position={[0, 0, 7]} fov={40} />
          <ambientLight intensity={0.5} />
          <Environment preset="city" />
          <Center>
            {/* Fixed: Passing necklaceAssembly to the assembler */}
            {mode === "assembly" ? (
              <NecklaceAssembler assemblyData={necklaceAssembly} />
            ) : (
              <DynamicRenderer ref={modelRef} sceneData={data?.scene} />
            )}
          </Center>
          <OrbitControls makeDefault />
        </Canvas>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 gap-8">
      <div className="w-full max-w-6xl">
        <h1 className="text-white text-xl font-bold mb-4 text-center">Final Necklace Assembly</h1>
        <SceneWindow mode="assembly" />
      </div>
    </div>
  );
}