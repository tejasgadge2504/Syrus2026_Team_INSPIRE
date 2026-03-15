import React, { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import * as THREE from "three";

const diamondMat = new THREE.MeshPhysicalMaterial({
  color: "#ffffff",
  transmission: 1,
  ior: 2.4,
  thickness: 2.5,
  roughness: 0,
});

const goldMat = new THREE.MeshStandardMaterial({
  color: "#ffdd00",
  metalness: 1,
  roughness: 0.2,
});

export default function DynamicModel({
  path,
  position,
  rotation,
  scale,
  isGem,
  materialOverrides,
}) {
  const obj = useLoader(OBJLoader, path);

  const scene = useMemo(() => {
    const clone = obj.clone();

    clone.traverse((child) => {
      if (child.isMesh) {
        if (isGem) {
          child.material = diamondMat.clone();
        } else {
          child.material = goldMat.clone();
        }

        if (materialOverrides?.color) {
          child.material.color = new THREE.Color(materialOverrides.color);
        }
      }
    });

    return clone;
  }, [obj, isGem, materialOverrides]);

  return (
    <primitive
      object={scene}
      position={position || [0, 0, 0]}
      rotation={rotation || [0, 0, 0]}
      scale={scale || 1}
    />
  );
}