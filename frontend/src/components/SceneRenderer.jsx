import React from "react";
import DynamicModel from "./DynamicModel";
import ProceduralGeometry from "./ProceduralGeometry";
import { MODEL_DATABASE } from "./modelDatabase";

// Resolve base anchor positions for placement system
function resolvePositions(components) {
  const anchorMap = {}; // id -> anchor [x,y,z] (placement math only, no user offset)

  components.forEach((comp) => {
    if (!comp.placement) {
      // Standalone: anchor is just the json transform.position
      anchorMap[comp.id] = [...(comp.transform?.position || [0, 0, 0])];
    } else {
      const parent = anchorMap[comp.placement.attach_to] || [0, 0, 0];
      let base = [...parent];

      if (comp.placement.mount_point === "top") {
        base[1] = base[1] + 1;
      }

      const overlap = comp.placement.overlap_depth || 0;
      const offset = comp.placement.offset || [0, 0, 0];

      anchorMap[comp.id] = [
        base[0] + offset[0],
        base[1] - overlap + offset[1],
        base[2] + offset[2],
      ];
    }
  });

  return anchorMap;
}

export default function SceneRenderer({ components, setSelectedId, selectedId }) {
  const anchorMap = resolvePositions(components);

  return (
    <>
      {components.map((component) => {
        // User-controlled offset from sliders (always a clean [x,y,z])
        const userOffset = [
          component.transform?.position?.[0] ?? 0,
          component.transform?.position?.[1] ?? 0,
          component.transform?.position?.[2] ?? 0,
        ];

        let finalPosition;

        if (component.placement) {
          // Placement components: anchor + user offset
          const anchor = anchorMap[component.id] || [0, 0, 0];
          finalPosition = [
            anchor[0] + userOffset[0],
            anchor[1] + userOffset[1],
            anchor[2] + userOffset[2],
          ];
        } else {
          // Standalone components: position IS the transform.position (set in JSON)
          // User offset acts as delta on top
          const base = anchorMap[component.id] || [0, 0, 0];
          finalPosition = [
            base[0],
            base[1],
            base[2],
          ];
        }

        const rotation = [
          component.transform?.rotation?.[0] ?? 0,
          component.transform?.rotation?.[1] ?? 0,
          component.transform?.rotation?.[2] ?? 0,
        ];
        const scale = component.transform?.scale ?? 1;
        const isSelected = selectedId === component.id;

        const handleClick = (e) => {
          e.stopPropagation();
          setSelectedId(component.id);
        };

        if (component.render_type === "geometry") {
          return (
            <group key={component.id} onClick={handleClick}>
              <ProceduralGeometry
                geometry={component.geometry}
                position={finalPosition}
                rotation={rotation}
                scale={scale}
                materialOverrides={component.materialOverrides}
                isSelected={isSelected}
              />
            </group>
          );
        }

        if (component.render_type === "model") {
          const modelInfo = MODEL_DATABASE[component.name];
          if (!modelInfo) return null;

          return (
            <group key={component.id} onClick={handleClick}>
              <DynamicModel
                path={modelInfo.path}
                isGem={modelInfo.isGem}
                position={finalPosition}
                rotation={rotation}
                scale={scale}
                materialOverrides={component.materialOverrides}
                isSelected={isSelected}
              />
            </group>
          );
        }

        return null;
      })}
    </>
  );
}