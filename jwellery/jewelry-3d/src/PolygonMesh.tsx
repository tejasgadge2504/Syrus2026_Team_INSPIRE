import "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { ComponentShape } from "./types";

type Props = {
  component: ComponentShape;
  position: [number, number, number];
};

export default function PolygonMesh({ component, position }: Props) {

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();

    const pts = component.points;

    shape.moveTo(pts[0][0], pts[0][1]);

    pts.slice(1).forEach(p => {
      shape.lineTo(p[0], p[1]);
    });

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: component.depth ?? 0.3,
      bevelEnabled: false
    });

    geo.center(); // ⭐ important for clean placement

    return geo;
  }, [component]);

  const material =
    component.material === "metal"
      ? new THREE.MeshStandardMaterial({
          color: "#D4AF37",
          metalness: 1,
          roughness: 0.2
        })
      : new THREE.MeshPhysicalMaterial({
          color: "white",
          transmission: 1,
          roughness: 0,
          thickness: 1,
          ior: 2.4
        });

  return (
    <mesh geometry={geometry} material={material} position={position} />
  );
}