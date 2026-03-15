import React, { useMemo } from "react";
import * as THREE from "three";

function buildMaterial(materialOverrides, isSelected) {
  const mat = new THREE.MeshStandardMaterial({
    color: materialOverrides?.color || "#c0c0c0",
    metalness: materialOverrides?.metal ? 0.9 : 0.3,
    roughness: 0.2,
    emissive: isSelected ? "#334" : "#000",
    emissiveIntensity: isSelected ? 0.4 : 0,
  });
  return mat;
}

export default function ProceduralGeometry({ geometry, position, rotation, scale, materialOverrides, isSelected }) {
  const material = useMemo(
    () => buildMaterial(materialOverrides, isSelected),
    [materialOverrides?.color, materialOverrides?.metal, isSelected]
  );

  let geoElement = null;

  if (geometry.type === "torus") {
    geoElement = (
      <torusGeometry args={[geometry.radius, geometry.tube, geometry.radialSegments, geometry.tubularSegments]} />
    );
  } else if (geometry.type === "sphere") {
    geoElement = (
      <sphereGeometry args={[geometry.radius, geometry.widthSegments || 32, geometry.heightSegments || 32]} />
    );
  } else if (geometry.type === "cylinder") {
    const r = geometry.radius ?? geometry.radiusTop ?? 0.04;
    geoElement = (
      <cylinderGeometry args={[r, r, geometry.height, geometry.radialSegments || 8]} />
    );
  }

  return (
    <mesh position={position} rotation={rotation} scale={scale} material={material}>
      {geoElement}
    </mesh>
  );
}