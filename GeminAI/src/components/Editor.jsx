import React, { useState, useEffect } from "react";
import ModelRenderer from "./ModelRenderer";
import ControlPanel from "./ControlPanel";

export default function Editor() {

  const [jewelryJSON, setJewelryJSON] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const id = localStorage.getItem("currentDesignId");

  useEffect(() => {
    const saved = localStorage.getItem(`design_${id}_level2`);
    if (saved) setJewelryJSON(JSON.parse(saved));
  }, [id]);

  if (!jewelryJSON) return null;

  return (
    <div style={{ display:"flex", height:"100vh", width:"100vw" }}>

      <ControlPanel
        selectedId={selectedId}
        jewelryJSON={jewelryJSON}
        setJewelryJSON={setJewelryJSON}
        setSelectedId={setSelectedId}
        designId={id}
      />

      <ModelRenderer
        jewelryJSON={jewelryJSON}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
      />

    </div>
  );
}