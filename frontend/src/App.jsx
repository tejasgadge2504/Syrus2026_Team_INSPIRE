import React from "react";
import JewelryViewer from "./components/JewelryViewer";

export default function App() {

  const jewelryJSON = {
  "components": [
    {
      "geometry": {
        "radialSegments": 24,
        "radius": 1.3,
        "tube": 0.12,
        "tubularSegments": 64,
        "type": "torus"
      },
      "id": "ring_band_01",
      "materialOverrides": {
        "metal": "silver"
      },
      "name": "ring_band",
      "render_type": "geometry",
      "transform": {
        "position": [
          0,
          -1.3,
          0
        ],
        "rotation": [
          0,
          0,
          0
        ],
        "scale": 1
      }
    },
    {
      "id": "diamond_01",
      "materialOverrides": {
        "color": "#b52f2f",
        "gem_type": "diamond"
      },
      "name": "diamond",
      "placement": {
        "attach_to": "ring_band_01",
        "mount_point": "top",
        "offset": [
          0,
          0,
          0
        ],
        "overlap_depth": 0
      },
      "render_type": "model",
      "transform": {
        "rotation": [
          0,
          0,
          0
        ],
        "scale": 0.6
      }
    },
    {
      "geometry": {
        "height": 0.5,
        "heightSegments": 1,
        "radialSegments": 8,
        "radius": 0.04,
        "type": "cylinder"
      },
      "id": "prong_01",
      "materialOverrides": {
        "metal": "silver"
      },
      "name": "prong",
      "placement": {
        "attach_to": "ring_band_01",
        "mount_point": "top",
        "offset": [
          0.45,
          0.5,
          0
        ],
        "overlap_depth": 0.05
      },
      "render_type": "geometry",
      "transform": {
        "rotation": [
          0,
          0,
          0
        ],
        "scale": 1
      }
    },
    {
      "geometry": {
        "height": 0.5,
        "heightSegments": 1,
        "radialSegments": 8,
        "radius": 0.04,
        "type": "cylinder"
      },
      "id": "prong_02",
      "materialOverrides": {
        "metal": "silver"
      },
      "name": "prong",
      "placement": {
        "attach_to": "ring_band_01",
        "mount_point": "top",
        "offset": [
          -0.45,
          0.5,
          0
        ],
        "overlap_depth": 0.05
      },
      "render_type": "geometry",
      "transform": {
        "rotation": [
          0,
          0,
          0
        ],
        "scale": 1
      }
    },
    {
      "geometry": {
        "height": 0.5,
        "heightSegments": 1,
        "radialSegments": 8,
        "radius": 0.04,
        "type": "cylinder"
      },
      "id": "prong_03",
      "materialOverrides": {
        "metal": "silver"
      },
      "name": "prong",
      "placement": {
        "attach_to": "ring_band_01",
        "mount_point": "top",
        "offset": [
          0,
          0.5,
          0.45
        ],
        "overlap_depth": 0.05
      },
      "render_type": "geometry",
      "transform": {
        "rotation": [
          0,
          0,
          0
        ],
        "scale": 1
      }
    },
    {
      "geometry": {
        "height": 0.5,
        "heightSegments": 1,
        "radialSegments": 8,
        "radius": 0.04,
        "type": "cylinder"
      },
      "id": "prong_04",
      "materialOverrides": {
        "metal": "silver"
      },
      "name": "prong",
      "placement": {
        "attach_to": "ring_band_01",
        "mount_point": "top",
        "offset": [
          0,
          0.5,
          -0.45
        ],
        "overlap_depth": 0.05
      },
      "render_type": "geometry",
      "transform": {
        "rotation": [
          0,
          0,
          0
        ],
        "scale": 1
      }
    }
  ],
  "scene": {
    "jewelry_type": "ring",
    "units": "normalized",
    "version": "1.0"
  }
};

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#111",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <JewelryViewer jsonData={jewelryJSON} />
    </div>
  );
}