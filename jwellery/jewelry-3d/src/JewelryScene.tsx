import "@react-three/fiber";
import { useEffect, useState } from "react";
import PolygonMesh from "./PolygonMesh";
import type { ComponentShape, Placement } from "./types.ts";

export default function JewelryScene() {

  const [components, setComponents] =
    useState<Record<string, ComponentShape>>({});

  const [placements, setPlacements] =
    useState<Placement[]>([]);

  useEffect(() => {

    // load components
    fetch("/components.json")
      .then(r => r.json())
      .then(data => {
        const map: Record<string, ComponentShape> = {};

        data.components.forEach((c: ComponentShape) => {
          map[c.id] = c;
        });

        setComponents(map);
      });

    // load layout
    fetch("/layout.json")
      .then(r => r.json())
      .then(data => setPlacements(data.placements));

  }, []);

  return (
    <group>
      {placements.map((p, i) => {
        const comp = components[p.component];
        if (!comp) return null;

        return (
          <PolygonMesh
            key={i}
            component={comp}
            position={p.centroid}
          />
        );
      })}
    </group>
  );
}