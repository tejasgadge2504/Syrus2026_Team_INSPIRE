import React from "react";
import DynamicModel from "./DynamicModel";
import ProceduralGeometry from "./ProceduralGeometry";
import { MODEL_DATABASE } from "./modelDatabase";

export default function SceneRenderer({ components }) {

  const componentMap = {};
  const rendered = [];

  components.forEach((component) => {

    let position = component.transform?.position || [0,0,0];

    // -------- ATTACHMENT LOGIC --------
    if(component.placement){

      const parent = componentMap[component.placement.attach_to];

      if(parent){

        let basePos = parent.position;

        if(component.placement.mount_point === "top"){
          basePos = [
            basePos[0],
            basePos[1] + 1,
            basePos[2]
          ];
        }

        const overlap = component.placement.overlap_depth || 0;

        const offset = component.placement.offset || [0,0,0];

        position = [
          basePos[0] + offset[0],
          basePos[1] - overlap + offset[1],
          basePos[2] + offset[2]
        ];
      }
    }

    // store computed transform
    componentMap[component.id] = {
      position
    };

    // ---------- GEOMETRY ----------
    if(component.render_type === "geometry"){

      rendered.push(
        <ProceduralGeometry
          key={component.id}
          geometry={component.geometry}
          position={position}
          rotation={component.transform?.rotation}
          scale={component.transform?.scale}
          materialOverrides={component.materialOverrides}
        />
      );

      return;
    }

    // ---------- MODEL ----------
    if(component.render_type === "model"){

      const modelInfo = MODEL_DATABASE[component.name];

      if(!modelInfo) return;

      rendered.push(
        <DynamicModel
          key={component.id}
          path={modelInfo.path}
          isGem={modelInfo.isGem}
          position={position}
          rotation={component.transform?.rotation}
          scale={component.transform?.scale}
          materialOverrides={component.materialOverrides}
        />
      );

      return;
    }

  });

  return <>{rendered}</>;
}