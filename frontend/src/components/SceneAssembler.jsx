import React from 'react';
import { useGLTF } from '@react-three/drei';

const AssetInstance = ({ url, instance }) => {
  const { scene } = useGLTF(url);
  // Clone the scene so multiple instances don't fight for the same object
  const clone = useMemo(() => scene.clone(), [scene]);

  return (
    <primitive 
      object={clone} 
      position={instance.position} 
      rotation={instance.rotation} 
      scale={instance.scale} 
    />
  );
};

const NecklaceAssembler = ({ assemblyData }) => {
  // Map asset IDs to your local file paths
  const assetMap = {
    "Dynamic_3D_Component": "/models/Dynamic_3D_Component.glb",
    "Pendant_Component": "/models/Pendant_Component.glb"
  };

  return (
    <group>
      {assemblyData.layout.map((group) => (
        <group key={group.assetId}>
          {group.instances.map((ins, idx) => (
            <AssetInstance 
              key={`${group.assetId}-${idx}`} 
              url={assetMap[group.assetId]} 
              instance={ins} 
            />
          ))}
        </group>
      ))}
    </group>
  );
};

export default NecklaceAssembler;