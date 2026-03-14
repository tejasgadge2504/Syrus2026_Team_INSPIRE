import React, { useMemo } from 'react';
import * as THREE from 'three';

const DynamicRenderer = ({ sceneData }) => {
  return (
    <group>
      {sceneData.map((node) => {
        // 1. Create the base Shape or Geometry
        const shape = useMemo(() => {
          const s = new THREE.Shape();
          if (node.type === 'path') {
            node.path.forEach(step => {
              if (step.type === 'moveTo') s.moveTo(step.x, step.y);
              if (step.type === 'bezier') s.bezierCurveTo(...step.cp1, ...step.cp2, ...step.to);
            });
          } else if (node.type === 'circle') {
            s.absarc(0, 0, node.args[0], 0, Math.PI * 2, false);
          }
          return s;
        }, [node]);

        const extrudeSettings = {
          depth: node.params?.depth || 0.1,
          bevelEnabled: node.params?.bevelEnabled ?? true,
          bevelThickness: 0.02,
          bevelSize: 0.02,
        };

        // 2. Handle Individual vs Radial Instancing
        if (node.type === 'instanced_radial') {
          return Array.from({ length: node.count }).map((_, i) => {
            const angle = (i / node.count) * Math.PI * 2;
            const x = Math.cos(angle) * node.radius;
            const y = Math.sin(angle) * node.radius;
            
            return (
              <mesh key={`${node.id}-${i}`} position={[x, y, 0]} rotation={[0, 0, angle]}>
                <extrudeGeometry args={[
                  new THREE.Shape().absarc(0, 0, node.child_geometry.args[0], 0, Math.PI * 2), 
                  extrudeSettings
                ]} />
                <meshStandardMaterial {...node.material} />
              </mesh>
            );
          });
        }

        // 3. Default Mesh Rendering
        return (
          <mesh key={node.id} position={node.position || [0, 0, 0]}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
            <meshStandardMaterial {...node.material} />
          </mesh>
        );
      })}
    </group>
  );
};

export default DynamicRenderer;