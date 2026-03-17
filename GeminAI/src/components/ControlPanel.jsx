import React from "react";

export default function ControlPanel({
  selectedId,
  jewelryJSON,
  setJewelryJSON,
  setSelectedId,
  designId
}){

  if(!selectedId){
    return <div style={panelStyle}>Select a component</div>;
  }

  const comp=jewelryJSON.components.find(c=>c.id===selectedId);

  const pos=comp.transform?.position || [0,0,0];
  const scale=comp.transform?.scale || 1;
  const color=comp.materialOverrides?.color || "#bfa14a";

  const update=(path,val)=>{

    setJewelryJSON(prev=>{

      const next=prev.components.map(c=>{

        if(c.id!==selectedId) return c;

        const copy={...c};

        if(!copy.transform) copy.transform={position:[0,0,0],scale:1};

        if(path==="x") copy.transform.position[0]=val;
        if(path==="y") copy.transform.position[1]=val;
        if(path==="z") copy.transform.position[2]=val;

        if(path==="scale") copy.transform.scale=val;

        if(path==="color"){
          if(!copy.materialOverrides) copy.materialOverrides={};
          copy.materialOverrides.color=val;
        }

        return copy;
      });

      return {...prev,components:next};

    });

  };

  const deleteComponent=()=>{

    setJewelryJSON(prev=>({
      ...prev,
      components: prev.components.filter(c=>c.id!==selectedId)
    }));

    setSelectedId(null);

  };

  const save=()=>{

    localStorage.setItem(`design_${designId}_level2`,JSON.stringify(jewelryJSON));
    localStorage.setItem(`design_${designId}_level1`,JSON.stringify(jewelryJSON));

  };

  return(

    <div style={panelStyle}>

      <h3>{comp.name}</h3>

      X
      <input type="range" min="-3" max="3" step="0.05"
        value={pos[0]}
        onChange={(e)=>update("x",parseFloat(e.target.value))}
      />

      Y
      <input type="range" min="-3" max="3" step="0.05"
        value={pos[1]}
        onChange={(e)=>update("y",parseFloat(e.target.value))}
      />

      Z
      <input type="range" min="-3" max="3" step="0.05"
        value={pos[2]}
        onChange={(e)=>update("z",parseFloat(e.target.value))}
      />

      Size
      <input type="range" min="0.1" max="3" step="0.05"
        value={scale}
        onChange={(e)=>update("scale",parseFloat(e.target.value))}
      />

      Color
      <input type="color"
        value={color}
        onChange={(e)=>update("color",e.target.value)}
      />

      <button onClick={deleteComponent}>Delete</button>

      <button onClick={save}>Save</button>

    </div>
  );
}

const panelStyle={
  width:"260px",
  background:"#111",
  color:"white",
  padding:"20px",
  display:"flex",
  flexDirection:"column",
  gap:"10px"
};