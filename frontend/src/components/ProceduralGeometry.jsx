import React from "react";
import * as THREE from "three";

const goldMaterial = new THREE.MeshStandardMaterial({
  color: "#ffdd00",
  metalness: 1,
  roughness: 0.2,
});

export default function ProceduralGeometry({
  geometry,
  position,
  rotation,
  scale,
  materialOverrides,
}) {

  let geo = null;

  if (geometry.type === "torus") {
    geo = (
      <torusGeometry
        args={[
          geometry.radius,
          geometry.tube,
          geometry.radialSegments,
          geometry.tubularSegments,
        ]}
      />
    );
  }

  if (geometry.type === "sphere") {
    geo = (
      <sphereGeometry
        args={[
          geometry.radius,
          geometry.widthSegments,
          geometry.heightSegments,
        ]}
      />
    );
  }

  if (geometry.type === "cylinder") {
    geo = (
      <cylinderGeometry
        args={[
          geometry.radiusTop,
          geometry.radiusBottom,
          geometry.height,
          geometry.radialSegments,
        ]}
      />
    );
  }

  return (
    <mesh
      position={position || [0, 0, 0]}
      rotation={rotation || [0, 0, 0]}
      scale={scale || 1}
    >
      {geo}
      <meshStandardMaterial {...goldMaterial} />
    </mesh>
  );
}