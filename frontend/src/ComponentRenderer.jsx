import React, { useMemo } from 'react';
import * as THREE from 'three';

const ComponentRenderer = ({ data }) => {
  const { geometry, material_defaults } = data;

  // Generate the Center Piece from Bézier Path
  const centerShape = useMemo(() => {
    const shape = new THREE.Shape();
    geometry.center_piece.path.forEach((step) => {
      if (step.type === 'moveTo') shape.moveTo(step.x, step.y);
      if (step.type === 'bezierCurveTo') {
        shape.bezierCurveTo(
          step.cp1[0], step.cp1[1], 
          step.cp2[0], step.cp2[1], 
          step.to[0], step.to[1]
        );
      }
    });
    return shape;
  }, [geometry.center_piece]);

  // Generate Petal Positions & Rotations
  const petals = useMemo(() => {
    const { count, radius_from_center, petal_size } = geometry.petals;
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return {
        position: [Math.cos(angle) * radius_from_center, Math.sin(angle) * radius_from_center, 0],
        rotation: [0, 0, angle + Math.PI / 2],
        size: petal_size
      };
    });
  }, [geometry.petals]);

  return (
    <group>
      {/* Central Piece Mesh */}
      <mesh>
        <shapeGeometry args={[centerShape]} />
        <meshStandardMaterial 
          color={material_defaults.color} 
          side={THREE.DoubleSide} 
          roughness={0.3}
        />
      </mesh>

      {/* Petal Meshes */}
      {petals.map((p, i) => (
        <mesh key={i} position={p.position} rotation={p.rotation}>
          <circleGeometry args={[p.size, 32]} />
          <meshStandardMaterial color={material_defaults.color} />
        </mesh>
      ))}
    </group>
  );
};

export default ComponentRenderer;