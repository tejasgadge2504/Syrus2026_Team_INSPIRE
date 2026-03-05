export type ComponentShape = {
  id: string;
  type: "polygon";
  points: number[][];
  depth: number;
  material: string;
};

export type Placement = {
  component: string;
  centroid: [number, number, number];
};