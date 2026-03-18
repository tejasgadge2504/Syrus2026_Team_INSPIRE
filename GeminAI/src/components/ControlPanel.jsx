import React, { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  Flask API endpoint
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE     = (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE) || "http://localhost:5000";
const ESTIMATE_URL = `${API_BASE}/api/price/estimate`;

// ─────────────────────────────────────────────────────────────────────────────
//  Brand tokens
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg0:"#09090f", bg1:"#11111c", bg2:"#18182a", bg3:"#1f1f32", bg4:"#27273e",
  accent:"#7B5CE5", accentLight:"#9d80f0",
  text:"#e8e4f4", textSub:"#9490b0", textDim:"#55526a",
  success:"#2ecc71", danger:"#e74c3c",
  grad:"linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB)",
};

// ─────────────────────────────────────────────────────────────────────────────
//  GEM MODEL DATABASE
// ─────────────────────────────────────────────────────────────────────────────
const GEM_MODELS = [
  { id:"diamond",          label:"Round",    path:"database/models/diamond.obj",          mapsToCut:"round_brilliant", gemType:"diamond", color:"#d6eaf8", icon:"◯", note:"Classic round brilliant cut" },
  { id:"CushionCut_Diamond",label:"Cushion", path:"database/models/CushionCutDiamond.obj",mapsToCut:"cushion",         gemType:"diamond", color:"#c8dff5", icon:"⬜", note:"Soft rounded corners, vintage charm" },
  { id:"Emerald_Diamond",  label:"Emerald",  path:"database/models/EmeraldDiamond.obj",   mapsToCut:"emerald_cut",     gemType:"diamond", color:"#b8d4f0", icon:"▬", note:"Step cut, hall-of-mirrors effect" },
  { id:"Oval_Diamond",     label:"Oval",     path:"database/models/OvalDiamond.obj",      mapsToCut:"oval",            gemType:"diamond", color:"#cce8ff", icon:"⬭", note:"Appears larger per carat" },
  { id:"Princess_Dimond",  label:"Princess", path:"database/models/PrincessDimond.obj",   mapsToCut:"princess",        gemType:"diamond", color:"#d8eeff", icon:"◻", note:"Square shape, brilliant facets" },
  { id:"pearl_Sphere",     label:"Pearl",    path:"database/models/pearlSphere.obj",      mapsToCut:null,              gemType:"pearl",   color:"#f5f0e8", icon:"◉", note:"Lustrous pearl sphere" },
];

// ─────────────────────────────────────────────────────────────────────────────
//  DIAMOND COLOURS
// ─────────────────────────────────────────────────────────────────────────────
const DIAMOND_COLORS = [
  { id:"diamond_yellow", label:"Yellow", color:"#FFD700", gradient:"radial-gradient(circle at 35% 35%,#fff176,#f9a825)", mult:1.15, note:"Fancy Yellow · natural colour" },
  { id:"diamond_white",  label:"White",  color:"#ddeeff", gradient:"radial-gradient(circle at 35% 35%,#ffffff,#cfd8dc)", mult:1.00, note:"Colourless D–F range (base)" },
  { id:"diamond_rose",   label:"Rose",   color:"#f48fb1", gradient:"radial-gradient(circle at 35% 35%,#fce4ec,#e91e63)", mult:2.40, note:"Fancy Pink · Argyle-style" },
  { id:"diamond_red",    label:"Red",    color:"#e53935", gradient:"radial-gradient(circle at 35% 35%,#ef9a9a,#b71c1c)", mult:5.00, note:"Fancy Red · extremely rare" },
];
const DCOLOR_MULT = Object.fromEntries(DIAMOND_COLORS.map(d => [d.id, d.mult]));

// ─────────────────────────────────────────────────────────────────────────────
//  METALS
// ─────────────────────────────────────────────────────────────────────────────
const METALS = [
  { id:"gold",     label:"Gold",     color:"#c9a84c", gradient:"radial-gradient(circle at 35% 35%,#f0d060,#8a6d2a)",
    karats:[ { id:"gold_24k", karat:"24K", purity:1.000, color:"#FFD700" }, { id:"gold_22k", karat:"22K", purity:0.917, color:"#e8c84a" }, { id:"gold_18k", karat:"18K", purity:0.750, color:"#c9a84c" }, { id:"gold_14k", karat:"14K", purity:0.585, color:"#b8932a" } ] },
  { id:"silver",   label:"Silver",   color:"#c0c0c0", gradient:"radial-gradient(circle at 35% 35%,#e8e8e8,#808080)",
    karats:[ { id:"silver_999", karat:"999", purity:0.999, color:"#e8e8e8" }, { id:"silver_925", karat:"Sterling 925", purity:0.925, color:"#c0c0c0" }, { id:"silver_800", karat:"800", purity:0.800, color:"#a8a8a8" } ] },
  { id:"copper",   label:"Copper",   color:"#b87333", gradient:"radial-gradient(circle at 35% 35%,#d4936a,#7a4520)",
    karats:[ { id:"copper_pure", karat:"Pure", purity:0.999, color:"#b87333" }, { id:"copper_rose", karat:"Rose Alloy", purity:0.750, color:"#c5745a" } ] },
  { id:"platinum", label:"Platinum", color:"#9fa8b0", gradient:"radial-gradient(circle at 35% 35%,#d0dce4,#5a6870)",
    karats:[ { id:"platinum_950", karat:"Pt 950", purity:0.950, color:"#c0ccd4" }, { id:"platinum_900", karat:"Pt 900", purity:0.900, color:"#b0bcc4" } ] },
];
const KARAT_LOOKUP = {};
METALS.forEach(fam => fam.karats.forEach(k => {
  KARAT_LOOKUP[k.id] = { ...k, family:fam.id, familyLabel:fam.label, gradient:fam.gradient };
}));
Object.assign(KARAT_LOOKUP, {
  yellow_gold: { ...KARAT_LOOKUP.gold_22k },
  rose_gold:   { ...KARAT_LOOKUP.gold_22k, color:"#c5745a", karat:"22K Rose" },
  white_gold:  { ...KARAT_LOOKUP.gold_18k, color:"#e0e0e0", karat:"18K White" },
  platinum:    { ...KARAT_LOOKUP.platinum_950 },
});
const REF_PPG     = { gold:9770, silver:105, copper:0.9, platinum:3200 };
const REF_DENSITY = { gold:19.32, silver:10.49, copper:8.96, platinum:21.45 };

// ─────────────────────────────────────────────────────────────────────────────
//  GEMS
// ─────────────────────────────────────────────────────────────────────────────
const GEMS = [
  { id:"diamond",  label:"Diamond",  color:"#d6eaf8" },
  { id:"ruby",     label:"Ruby",     color:"#c0392b" },
  { id:"sapphire", label:"Sapphire", color:"#2471a3" },
  { id:"emerald",  label:"Emerald",  color:"#1e8449" },
  { id:"amethyst", label:"Amethyst", color:"#7d3c98" },
  { id:"topaz",    label:"Topaz",    color:"#e67e22" },
  { id:"opal",     label:"Opal",     color:"#a8d8ea" },
  { id:"pearl",    label:"Pearl",    color:"#f5f0e8" },
];
const REF_PPC = { diamond:475000, ruby:95000, sapphire:65000, emerald:72000, amethyst:1200, topaz:1600, opal:12000, pearl:10000 };
const CUT_MULT = { round_brilliant:1.000, princess:0.863, oval:0.884, emerald_cut:0.811, cushion:0.821, pear:0.853 };
const CUTS = [
  { id:"round_brilliant", label:"Round",   icon:"◯" }, { id:"princess",   label:"Princess", icon:"◻" },
  { id:"oval",            label:"Oval",    icon:"⬭" }, { id:"emerald_cut",label:"Emerald",  icon:"▬" },
  { id:"pear",            label:"Pear",    icon:"⬟" }, { id:"cushion",    label:"Cushion",  icon:"⬜" },
];
const SETTING_STYLES = [
  { id:"prong",  label:"Prong",   icon:"⋮" }, { id:"bezel",  label:"Bezel",   icon:"⬜" },
  { id:"pave",   label:"Pavé",    icon:"⁙" }, { id:"channel",label:"Channel", icon:"⊟" },
  { id:"tension",label:"Tension", icon:"⊏" }, { id:"flush",  label:"Flush",   icon:"▣" },
];
const BAND_PROFILES = ["Round","Flat","Knife Edge","Comfort Fit"];
const RING_SIZES    = ["5","5.5","6","6.5","7","7.5","8","8.5","9"];
const CARAT_SIZES   = ["0.25ct","0.5ct","0.75ct","1ct","1.5ct","2ct","3ct"];
const CARAT_MAP     = { "0.25ct":0.25,"0.5ct":0.5,"0.75ct":0.75,"1ct":1,"1.5ct":1.5,"2ct":2,"3ct":3 };
const MAKING_REF    = {
  band:3500, ring:3500, shank:3500, prong:1500, prongs:1500, setting:1800, basket:1800, bezel:1800, halo:2500,
  gem:2200, gemstone:2200, stone:2200, center_stone:2200, "center stone":2200,
  diamond:2200, ruby:2200, sapphire:2200, emerald:2200, amethyst:2200, topaz:2200, opal:2200, pearl:2200,
};
const GEM_CTYPES   = new Set(["gem","gemstone","stone","center_stone","center stone","diamond","ruby","sapphire","emerald","amethyst","topaz","opal","pearl"]);
const METAL_CTYPES = new Set(["band","ring","shank","prong","prongs","setting","basket","bezel","halo"]);
function isGemComp(type)   { return GEM_CTYPES.has((type||"").toLowerCase().trim()); }
function isMetalComp(type) { return METAL_CTYPES.has((type||"").toLowerCase().trim()); }
function fmtINR(n) {
  if (!n||isNaN(n)) return "₹0";
  n = Math.round(n);
  if (n>=10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n>=100000)   return `₹${(n/100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOCAL reference estimate
// ─────────────────────────────────────────────────────────────────────────────
function localEstimate(comp) {
  if (!comp) return 0;
  const ctype = (comp.type||"").toLowerCase().trim();
  const ov = comp.materialOverrides || {};
  const geo = comp.geometry || {};
  const karatId  = ov.metalType    || "gold_22k";
  const gemType  = ov.gemType      || "diamond";
  const dColor   = ov.diamondColor || "diamond_white";
  const caratStr = geo.caratSize   || "1ct";
  const cutId    = geo.cut         || "round_brilliant";
  const bandW    = parseFloat(geo.bandWidth || 2.5);
  let total = 0;
  if (isMetalComp(ctype)) {
    const k = KARAT_LOOKUP[karatId] || KARAT_LOOKUP["gold_22k"];
    const fam = k.family || "gold";
    const ppg = Math.round((REF_PPG[fam]||9770) * k.purity);
    const density = REF_DENSITY[fam] || 19.32;
    const ringR = 9.5, tubeR = (bandW/2)*0.85;
    const grams = parseFloat(((2*Math.PI**2*ringR*tubeR**2/1000)*density).toFixed(2));
    total += grams * ppg;
  }
  if (isGemComp(ctype)) {
    const rg = (REF_PPC[gemType] ? gemType : (REF_PPC[ctype] ? ctype : "diamond"));
    const cts = CARAT_MAP[caratStr] || 1;
    let ppc = REF_PPC[rg] || REF_PPC.diamond;
    if (rg==="diamond") ppc = Math.round(ppc*(CUT_MULT[cutId]||1)*(DCOLOR_MULT[dColor]||1));
    total += cts * ppc;
  }
  total += MAKING_REF[ctype] || 1200;
  return Math.round(total);
}

// ─────────────────────────────────────────────────────────────────────────────
//  usePriceAPI
// ─────────────────────────────────────────────────────────────────────────────
function usePriceAPI(jewelryJSON) {
  const [state, setState] = useState({ data:null,loading:false,error:null,lastFetched:null,isBackend:false });
  const timerRef = useRef(null);
  const abortRef = useRef(null);
  useEffect(() => {
    const comps = jewelryJSON?.components;
    if (!comps||comps.length===0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController(); abortRef.current = ctrl;
      setState(p=>({...p,loading:true,error:null}));
      try {
        const payload = {
          model_id: jewelryJSON?.id || "jewelry_model",
          components: comps.map(c=>({
            id:c.id, name:c.name||c.id, type:c.type,
            materialOverrides:{ metalType:c.materialOverrides?.metalType||"gold_22k", gemType:c.materialOverrides?.gemType||"diamond", diamondColor:c.materialOverrides?.diamondColor||"diamond_white", color:c.materialOverrides?.color||"" },
            geometry:{ bandWidth:c.geometry?.bandWidth||2.5, caratSize:c.geometry?.caratSize||"1ct", cut:c.geometry?.cut||"round_brilliant", ringSize:c.geometry?.ringSize||"7", profile:c.geometry?.profile||"Round" },
          })),
        };
        const res = await fetch(ESTIMATE_URL,{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setState({ data,loading:false,error:null,lastFetched:new Date(),isBackend:true });
      } catch (err) {
        if (err.name==="AbortError") return;
        setState(p=>({...p,loading:false,error:err.message,isBackend:false}));
      }
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [jewelryJSON]);
  return state;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Animated number
// ─────────────────────────────────────────────────────────────────────────────
function useAnimNum(target) {
  const [disp,setDisp] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const s=prev.current, e=target; if(s===e) return;
    let f=0;
    const tick=()=>{ f++; const ease=1-Math.pow(1-f/20,3); setDisp(f>=20?e:Math.round(s+(e-s)*ease)); if(f<20) requestAnimationFrame(tick); else prev.current=e; };
    requestAnimationFrame(tick);
  }, [target]);
  return disp;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PriceSummary  (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
function PriceSummary({ comp, jewelryJSON, apiState }) {
  const { data,loading,error,lastFetched,isBackend } = apiState;
  const comps = jewelryJSON?.components || [];
  const rows = isBackend && data
    ? data.components.map(c=>({ id:c.id,name:c.name,isGem:c.is_gem,total:c.total_inr,fmt:c.total_formatted,weight:c.weight_grams,ppg:c.price_per_gram,matLabel:c.material_label,breakdown:c.breakdown }))
    : comps.map(c=>({ id:c.id,name:c.name||c.id,isGem:isGemComp(c.type),total:localEstimate(c),fmt:"",weight:0,ppg:0,matLabel:"",breakdown:[] }));
  const totalINR    = isBackend&&data ? data.grand_total_inr        : rows.reduce((s,r)=>s+r.total,0);
  const totalWeight = isBackend&&data ? data.total_weight_grams     : 0;
  const blendedPPG  = isBackend&&data ? data.blended_price_per_gram : 0;
  const selRow   = comp ? rows.find(r=>r.id===comp.id) : null;
  const selTotal = selRow?.total || (comp ? localEstimate(comp) : 0);
  const selPPG   = selRow?.ppg || 0;
  const aTot = useAnimNum(totalINR);
  const aPPG = useAnimNum(blendedPPG);
  const aWt  = useAnimNum(Math.round(totalWeight*100));
  const aSPG = useAnimNum(selPPG);
  return (
    <div style={{ flexShrink:0,background:"linear-gradient(135deg,rgba(75,108,247,0.07),rgba(224,64,251,0.03))",borderBottom:"1px solid rgba(123,92,229,0.15)" }}>
      <div style={{ padding:"12px 14px 6px",display:"flex",alignItems:"flex-start",gap:10 }}>
        <div style={{ width:36,height:36,borderRadius:10,flexShrink:0,background:T.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginTop:1 }}>₹</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
            <span style={{ fontSize:10,color:T.textDim,letterSpacing:"0.8px",textTransform:"uppercase" }}>Total Estimate · INR</span>
            {loading ? <div style={{ width:10,height:10,borderRadius:"50%",border:"1.5px solid rgba(123,92,229,0.3)",borderTopColor:T.accentLight,animation:"spin 0.8s linear infinite" }} />
              : <div style={{ width:5,height:5,borderRadius:"50%",background:error?T.danger:T.success,boxShadow:`0 0 5px ${error?T.danger:T.success}` }} />}
          </div>
          <div style={{ fontSize:24,fontWeight:800,fontFamily:"'Nunito',sans-serif",background:"linear-gradient(90deg,#4B6CF7,#9B59E8,#E040FB)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",lineHeight:1.1 }}>
            {isBackend&&data ? data.grand_total_formatted : fmtINR(aTot)}
          </div>
          <div style={{ fontSize:9,color:T.textDim,marginTop:2 }}>
            {loading?"Calling price API…":error?`⚠ Local estimate (${error})`:isBackend?`Flask API · ${lastFetched?.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})||""}`:"Local reference estimate"}
          </div>
        </div>
        <div style={{ padding:"3px 7px",borderRadius:5,fontSize:8,fontFamily:"monospace",flexShrink:0,background:isBackend?"rgba(46,204,113,0.12)":"rgba(255,152,0,0.12)",border:`1px solid ${isBackend?"rgba(46,204,113,0.3)":"rgba(255,152,0,0.3)"}`,color:isBackend?T.success:"#FFA500" }}>
          {isBackend?"⬤ API":"⬤ LOCAL"}
        </div>
      </div>
      <div style={{ margin:"0 12px 8px",background:"rgba(123,92,229,0.06)",border:"1px solid rgba(123,92,229,0.18)",borderRadius:10,padding:"8px 12px",display:"grid",gridTemplateColumns:"1fr 1px 1fr 1px 1fr",alignItems:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:9,color:T.textDim,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:3 }}>Total Weight</div>
          <div style={{ fontSize:15,fontWeight:700,fontFamily:"'Nunito',sans-serif",color:T.accentLight }}>{(aWt/100).toFixed(2)}g</div>
          <div style={{ fontSize:8,color:T.textDim }}>metal only</div>
        </div>
        <div style={{ width:1,height:36,background:"rgba(123,92,229,0.2)",margin:"0 auto" }} />
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:9,color:T.textDim,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:3 }}>Blended ₹/g</div>
          <div style={{ fontSize:15,fontWeight:700,fontFamily:"'Nunito',sans-serif",background:"linear-gradient(90deg,#4B6CF7,#E040FB)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>{fmtINR(aPPG)}</div>
          <div style={{ fontSize:8,color:T.textDim }}>weighted avg</div>
        </div>
        <div style={{ width:1,height:36,background:"rgba(123,92,229,0.2)",margin:"0 auto" }} />
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:9,color:T.textDim,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:3 }}>{comp&&!isGemComp(comp.type)?"Selected ₹/g":"Selected Cost"}</div>
          <div style={{ fontSize:15,fontWeight:700,fontFamily:"'Nunito',sans-serif",color:selTotal>0?"#9d80f0":T.textDim }}>
            {comp&&!isGemComp(comp.type)&&selPPG>0?fmtINR(aSPG):comp?fmtINR(selTotal):"—"}
          </div>
          <div style={{ fontSize:8,color:T.textDim }}>{selRow&&!isGemComp(comp?.type)&&selRow.weight>0?`${selRow.weight.toFixed(2)}g`:comp?"est.":"select part"}</div>
        </div>
      </div>
      {rows.length>0&&(
        <div style={{ padding:"0 12px 6px",display:"flex",gap:4,flexWrap:"wrap" }}>
          {rows.map(r=>(
            <div key={r.id} style={{ padding:"2px 8px",borderRadius:10,fontSize:9,fontFamily:"monospace",background:r.isGem?"rgba(75,108,247,0.14)":"rgba(155,89,232,0.14)",border:`1px solid ${r.isGem?"rgba(75,108,247,0.3)":"rgba(155,89,232,0.3)"}`,color:r.isGem?"#7b9ff9":T.accentLight }}>
              {(r.name||"").split("_")[0]} · {r.fmt||fmtINR(r.total)}
              {!r.isGem&&r.weight>0&&<span style={{ color:T.textDim,marginLeft:3 }}>({r.weight.toFixed(1)}g)</span>}
            </div>
          ))}
        </div>
      )}
      {totalINR>0&&(
        <div style={{ padding:"0 12px 8px",display:"flex",gap:2,height:5 }}>
          {rows.map(r=>(
            <div key={r.id} title={`${r.name}: ${fmtINR(r.total)}`}
              style={{ height:5,borderRadius:3,minWidth:4,width:`${(r.total/totalINR)*100}%`,background:r.isGem?"linear-gradient(90deg,#4B6CF7,#9B59E8)":"linear-gradient(90deg,#9B59E8,#E040FB)",transition:"width 0.5s ease" }} />
          ))}
        </div>
      )}
      {selRow&&selRow.breakdown?.length>0&&comp&&(
        <div style={{ margin:"0 10px 10px",background:T.bg2,borderRadius:10,border:"1px solid rgba(123,92,229,0.16)",overflow:"hidden" }}>
          <div style={{ padding:"8px 12px",background:"linear-gradient(90deg,rgba(123,92,229,0.12),transparent)",borderBottom:"1px solid rgba(123,92,229,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ fontSize:11,color:T.accentLight,fontWeight:600 }}>
              {comp.name||comp.id}
              <span style={{ fontWeight:400,color:T.textDim,marginLeft:5 }}>{selRow.matLabel}</span>
              {!isGemComp(comp.type)&&selRow.weight>0&&<span style={{ marginLeft:6,fontSize:9,fontFamily:"monospace",background:"rgba(123,92,229,0.15)",padding:"1px 5px",borderRadius:4,color:T.textSub }}>{selRow.weight.toFixed(2)}g · {fmtINR(selRow.ppg)}/g</span>}
            </div>
            <div style={{ fontSize:15,fontWeight:800,fontFamily:"'Nunito',sans-serif",background:"linear-gradient(90deg,#4B6CF7,#E040FB)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>
              {selRow.fmt||fmtINR(selRow.total)}
            </div>
          </div>
          {selRow.breakdown.map((ln,i)=>(
            <div key={i} style={{ padding:"8px 12px",background:ln.line_type==="metal"?"rgba(201,168,76,0.08)":ln.line_type==="gem"?"rgba(75,108,247,0.07)":"transparent",borderBottom:i<selRow.breakdown.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:2 }}>
                    <div style={{ width:6,height:6,borderRadius:"50%",flexShrink:0,background:ln.line_type==="metal"?"#c9a84c":ln.line_type==="gem"?"#7b9ff9":T.textDim }} />
                    <div style={{ fontSize:12,color:T.text,fontWeight:500 }}>{ln.label}</div>
                  </div>
                  {ln.sub   && <div style={{ fontSize:10,color:T.textDim,paddingLeft:11 }}>{ln.sub}</div>}
                  {ln.range && <div style={{ fontSize:9,color:T.accentLight,paddingLeft:11,marginTop:2 }}>{ln.range}</div>}
                </div>
                <div style={{ fontSize:13,fontWeight:700,color:T.text,background:"rgba(123,92,229,0.12)",padding:"3px 10px",borderRadius:6,whiteSpace:"nowrap" }}>
                  {ln.formatted||fmtINR(ln.amount_inr)}
                </div>
              </div>
              {ln.source&&<div style={{ marginTop:5,fontSize:"8.5px",color:T.textDim,background:"rgba(75,108,247,0.06)",border:"1px solid rgba(75,108,247,0.12)",borderRadius:4,padding:"1px 7px",display:"inline-block" }}>{ln.source}</div>}
            </div>
          ))}
        </div>
      )}
      {(!selRow||!selRow.breakdown?.length)&&comp&&(
        <div style={{ margin:"0 10px 10px",background:T.bg2,borderRadius:10,border:"1px solid rgba(123,92,229,0.12)",overflow:"hidden" }}>
          <div style={{ padding:"8px 12px",background:"rgba(255,152,0,0.05)",borderBottom:"1px solid rgba(123,92,229,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ fontSize:11,color:"#FFA500",fontWeight:500 }}>{comp.name||comp.id}<span style={{ marginLeft:6,fontSize:9,color:T.textDim }}>(local estimate)</span></div>
            <div style={{ fontSize:14,fontWeight:700,color:"#FFA500" }}>{fmtINR(localEstimate(comp))}</div>
          </div>
          <div style={{ padding:"8px 12px" }}>
            <div style={{ fontSize:10,color:T.textDim }}>Waiting for Flask API…<br/><span style={{ fontSize:9 }}>Make sure <code>python app.py</code> is running on port 5000.</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  panel:{ width:290,background:T.bg1,color:T.text,display:"flex",flexDirection:"column",fontFamily:"'DM Sans',sans-serif",borderLeft:"1px solid rgba(123,92,229,0.12)",overflow:"hidden",flexShrink:0 },
  tabRow:{ display:"flex",borderBottom:"1px solid rgba(123,92,229,0.1)",flexShrink:0 },
  tabBtn:a=>({ flex:1,padding:"10px 4px",fontSize:11,cursor:"pointer",border:"none",fontFamily:"'DM Sans',sans-serif",color:a?T.accentLight:T.textDim,background:a?"rgba(75,108,247,0.05)":"none",borderBottom:a?`2px solid ${T.accent}`:"2px solid transparent",transition:"all 0.2s" }),
  selBanner:{ padding:"7px 14px",background:"linear-gradient(90deg,rgba(75,108,247,0.1),rgba(224,64,251,0.05))",borderBottom:"1px solid rgba(123,92,229,0.15)",display:"flex",alignItems:"center",gap:8,flexShrink:0 },
  selDot:{ width:7,height:7,borderRadius:"50%",background:T.accent,boxShadow:`0 0 7px ${T.accent}`,animation:"pulse 2s infinite" },
  selName:{ fontSize:12,color:T.accentLight,fontWeight:500 },
  selType:{ fontSize:10,color:T.textDim,marginLeft:"auto" },
  body:{ flex:1,overflowY:"auto",padding:"10px 12px 20px",scrollbarWidth:"thin",scrollbarColor:`${T.bg4} transparent` },
  sec:{ fontSize:9,letterSpacing:"1.3px",color:T.textDim,textTransform:"uppercase",margin:"12px 0 8px",display:"flex",alignItems:"center",gap:8 },
  secLine:{ flex:1,height:1,background:"rgba(123,92,229,0.1)" },
  xyzCard:{ background:T.bg2,borderRadius:10,border:"1px solid rgba(123,92,229,0.15)",padding:"10px 12px",marginBottom:4 },
  xyzRow:{ display:"flex",alignItems:"center",gap:8,marginBottom:8 },
  xyzBadge:c=>({ width:20,height:20,borderRadius:5,background:c+"22",border:`1px solid ${c}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:c,flexShrink:0 }),
  xyzSlider:(c,p)=>({ flex:1,WebkitAppearance:"none",appearance:"none",height:3,borderRadius:2,outline:"none",cursor:"pointer",background:`linear-gradient(to right,${c} ${p}%,#1f1f32 ${p}%)` }),
  xyzInput:{ width:52,background:T.bg0,border:`1px solid rgba(123,92,229,0.3)`,borderRadius:5,padding:"3px 6px",color:T.accentLight,fontSize:10,fontFamily:"monospace",outline:"none",textAlign:"right",flexShrink:0 },
  xyzReset:{ fontSize:9,color:T.textDim,cursor:"pointer",padding:"3px 7px",borderRadius:4,border:"1px solid rgba(123,92,229,0.15)",background:"none",fontFamily:"'DM Sans',sans-serif",marginTop:4 },
  mGrid:{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:6 },
  mOpt:a=>({ padding:"8px 4px",borderRadius:9,cursor:"pointer",border:a?`1px solid ${T.accent}`:"1px solid rgba(123,92,229,0.1)",background:a?"rgba(75,108,247,0.1)":T.bg2,display:"flex",flexDirection:"column",alignItems:"center",gap:5,transition:"all 0.2s",boxShadow:a?"0 0 8px rgba(123,92,229,0.25)":"none" }),
  mSwatch:g=>({ width:28,height:28,borderRadius:"50%",background:g,border:"2px solid rgba(255,255,255,0.12)",boxShadow:"0 2px 6px rgba(0,0,0,0.4)" }),
  mLabel:a=>({ fontSize:9,color:a?T.accentLight:T.textDim,textAlign:"center",fontWeight:a?600:400 }),
  kRow:{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:6 },
  kTag:(a,col)=>({ padding:"4px 9px",borderRadius:5,cursor:"pointer",border:a?`1px solid ${col||T.accent}`:"1px solid rgba(123,92,229,0.12)",background:a?"rgba(75,108,247,0.12)":T.bg2,fontSize:10,fontWeight:a?600:400,color:a?(col||T.accentLight):T.textDim,transition:"all 0.2s" }),
  kPrice:{ fontSize:8,color:T.textDim,marginTop:1 },
  dGrid:{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:8 },
  dOpt:(a,col)=>({ padding:"10px 4px 8px",borderRadius:10,cursor:"pointer",border:a?`2px solid ${col}`:"1px solid rgba(123,92,229,0.12)",background:a?`${col}18`:T.bg2,display:"flex",flexDirection:"column",alignItems:"center",gap:5,transition:"all 0.2s",boxShadow:a?`0 0 12px ${col}44`:"none" }),
  dSwatch:(g,col,a)=>({ width:28,height:28,borderRadius:"50%",background:g,border:a?`2.5px solid ${col}`:"2px solid rgba(255,255,255,0.1)",boxShadow:a?`0 0 10px ${col}99,inset 0 0 6px rgba(255,255,255,0.3)`:"0 2px 6px rgba(0,0,0,0.4)",transition:"all 0.2s" }),
  gGrid:{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:4 },
  gOpt:a=>({ padding:"7px 3px",borderRadius:9,cursor:"pointer",border:a?`1px solid ${T.accent}`:"1px solid rgba(123,92,229,0.1)",background:a?"rgba(75,108,247,0.1)":T.bg2,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all 0.2s",boxShadow:a?"0 0 8px rgba(123,92,229,0.2)":"none" }),
  gem:col=>({ width:24,height:24,clipPath:"polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)",background:col,boxShadow:`0 0 8px ${col}66` }),
  gLabel:a=>({ fontSize:8,color:a?T.accentLight:T.textDim,textAlign:"center" }),
  cGrid:{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:4 },
  cOpt:a=>({ padding:"7px 4px",borderRadius:7,cursor:"pointer",border:a?`1px solid ${T.accent}`:"1px solid rgba(123,92,229,0.1)",background:a?"rgba(75,108,247,0.1)":T.bg2,display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all 0.2s" }),
  slRow:{ display:"flex",alignItems:"center",gap:8,marginBottom:10 },
  slLbl:{ fontSize:11,color:T.textSub,width:68,flexShrink:0 },
  slVal:{ fontSize:11,color:T.accentLight,width:40,textAlign:"right",flexShrink:0,fontWeight:500 },
  tagRow:{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:6 },
  tag:a=>({ padding:"4px 10px",borderRadius:5,cursor:"pointer",border:a?`1px solid ${T.accent}`:"1px solid rgba(123,92,229,0.1)",background:a?"rgba(75,108,247,0.1)":T.bg2,fontSize:11,color:a?T.accentLight:T.textDim,transition:"all 0.2s" }),
  bOpts:{ display:"flex",gap:5,marginBottom:8 },
  bOpt:a=>({ flex:1,padding:"7px 4px",borderRadius:7,cursor:"pointer",border:a?`1px solid ${T.accent}`:"1px solid rgba(123,92,229,0.1)",background:a?"rgba(75,108,247,0.1)":T.bg2,textAlign:"center",fontSize:10,color:a?T.accentLight:T.textDim,transition:"all 0.2s" }),
  pCtr:{ display:"flex",alignItems:"center",gap:10,marginBottom:12 },
  pcBtn:{ width:26,height:26,borderRadius:7,background:T.bg2,border:"1px solid rgba(123,92,229,0.2)",color:T.textSub,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" },
  pCnt:{ fontSize:18,fontWeight:600,color:T.text,minWidth:20,textAlign:"center" },
  pDots:{ display:"flex",gap:4 },
  pDot:a=>({ width:8,height:8,borderRadius:"50%",background:a?T.accent:T.bg4,boxShadow:a?`0 0 5px ${T.accent}88`:"none",transition:"background 0.2s" }),
  actRow:{ display:"flex",gap:6,marginTop:18 },
  del:{ flex:1,padding:9,borderRadius:8,background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.25)",color:"#e74c3c",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif" },
  save:{ flex:2,padding:9,borderRadius:8,background:"linear-gradient(135deg,rgba(75,108,247,0.2),rgba(155,89,232,0.2))",border:`1px solid rgba(123,92,229,0.4)`,color:T.accentLight,cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:600 },
  noSel:{ padding:"30px 16px",textAlign:"center",color:T.textDim,fontSize:12,lineHeight:1.7 },
  aiH:{ padding:"10px 14px",borderBottom:"1px solid rgba(123,92,229,0.1)",display:"flex",alignItems:"center",gap:8,flexShrink:0,background:"linear-gradient(90deg,rgba(75,108,247,0.06),transparent)" },
  aiI:{ padding:"10px 14px",fontSize:12,color:T.textSub,lineHeight:1.6,borderBottom:"1px solid rgba(123,92,229,0.08)" },
  eRow:{ display:"flex",gap:6,marginBottom:8 },
  eIn:{ flex:1,background:T.bg0,border:"1px solid rgba(123,92,229,0.2)",borderRadius:7,padding:"7px 10px",color:T.text,fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none" },
  eAdd:{ padding:"7px 12px",background:"linear-gradient(135deg,rgba(75,108,247,0.15),rgba(155,89,232,0.15))",border:`1px solid rgba(123,92,229,0.35)`,borderRadius:7,color:T.accentLight,fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap" },
  chatArea:{ padding:"10px 14px",borderTop:"1px solid rgba(123,92,229,0.1)",display:"flex",gap:6,alignItems:"flex-end",flexShrink:0 },
  chatIn:{ flex:1,background:T.bg2,border:"1px solid rgba(123,92,229,0.2)",borderRadius:9,padding:"8px 10px",color:T.text,fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none",resize:"none",minHeight:36,maxHeight:80 },
  sendBtn:{ width:34,height:34,background:"linear-gradient(135deg,#4B6CF7,#9B59E8)",border:"none",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0,boxShadow:"0 2px 10px rgba(75,108,247,0.4)" },
  fontTag:a=>({ padding:"4px 10px",borderRadius:5,cursor:"pointer",border:a?`1px solid ${T.accent}`:"1px solid rgba(123,92,229,0.1)",background:a?"rgba(75,108,247,0.1)":T.bg2,fontSize:11,color:a?T.accentLight:T.textDim,fontFamily:"'DM Sans',sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
//  Atoms
// ─────────────────────────────────────────────────────────────────────────────
function Sec({ children }) {
  return <div style={S.sec}>{children}<div style={S.secLine} /></div>;
}
function Slider({ label,min,max,step,value,onChange,display }) {
  const p = Math.max(0,Math.min(100,((value-min)/(max-min))*100));
  return (
    <div style={S.slRow}>
      <div style={S.slLbl}>{label}</div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))}
        style={{ flex:1,WebkitAppearance:"none",appearance:"none",height:3,borderRadius:2,outline:"none",cursor:"pointer",background:`linear-gradient(to right,${T.accent} ${p}%,${T.bg4} ${p}%)` }} />
      <div style={S.slVal}>{display??value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DiamondColorPicker  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function DiamondColorPicker({ value, cut, onChange }) {
  return (
    <div>
      <div style={S.dGrid}>
        {DIAMOND_COLORS.map(dc => {
          const basePPC = REF_PPC.diamond * (CUT_MULT[cut||"round_brilliant"]||1);
          const ppc = Math.round(basePPC * dc.mult);
          const isAct = value === dc.id;
          return (
            <div key={dc.id} style={S.dOpt(isAct, dc.color)} onClick={()=>onChange(dc.id, dc.color)}>
              <div style={S.dSwatch(dc.gradient, dc.color, isAct)} />
              <div style={{ fontSize:9,color:isAct?dc.color:T.textDim,textAlign:"center",fontWeight:isAct?700:400 }}>{dc.label}</div>
              <div style={{ fontSize:7,color:T.textDim,fontFamily:"monospace",textAlign:"center" }}>{dc.mult===1?"base":`×${dc.mult}`}</div>
              <div style={{ fontSize:7,color:isAct?dc.color+"bb":T.textDim,fontFamily:"monospace",textAlign:"center" }}>{fmtINR(ppc)}/ct</div>
            </div>
          );
        })}
      </div>
      {DIAMOND_COLORS.find(d=>d.id===value) && (
        <div style={{ fontSize:"8.5px",color:T.textDim,background:"rgba(75,108,247,0.06)",border:"1px solid rgba(75,108,247,0.1)",borderRadius:6,padding:"4px 8px",marginBottom:4 }}>
          ✦ {DIAMOND_COLORS.find(d=>d.id===value).note}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MetalPicker  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function MetalPicker({ value, onChange }) {
  const k = KARAT_LOOKUP[value] || KARAT_LOOKUP["gold_22k"];
  const family = k.family || "gold";
  const famObj = METALS.find(m=>m.id===family) || METALS[0];
  const sel = karat => onChange({ id:karat.id, color:karat.color, label:`${famObj.label} ${karat.karat}` });
  return (
    <div>
      <div style={S.mGrid}>
        {METALS.map(fam => (
          <div key={fam.id} style={S.mOpt(family===fam.id)} onClick={()=>sel(fam.karats[1]||fam.karats[0])}>
            <div style={S.mSwatch(fam.gradient)} />
            <div style={S.mLabel(family===fam.id)}>{fam.label}</div>
            <div style={{ fontSize:"7.5px",color:T.textDim,fontFamily:"monospace" }}>{fmtINR(REF_PPG[fam.id]||0)}/g</div>
          </div>
        ))}
      </div>
      <div style={S.kRow}>
        {famObj.karats.map(karat => {
          const ep = Math.round((REF_PPG[famObj.id]||0) * karat.purity);
          const act = (KARAT_LOOKUP[value]?.id || value) === karat.id;
          return (
            <div key={karat.id} style={S.kTag(act, karat.color)} onClick={()=>sel(karat)}>
              {karat.karat}
              <div style={S.kPrice}>{fmtINR(ep)}/g</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TransformControls  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const AXES = [
  { key:"x",label:"X",color:"#e74c3c",min:-5,max:5 },
  { key:"y",label:"Y",color:"#2ecc71",min:-5,max:5 },
  { key:"z",label:"Z",color:"#3498db",min:-5,max:5 },
];
function TransformControls({ comp, onUpdate }) {
  const pos   = comp.transform?.position || [0,0,0];
  const scale = comp.transform?.scale    ?? 1;
  const sPct  = Math.max(0,Math.min(100,((scale-0.1)/4.9)*100));
  const setAx = (i,v) => { const np=[...pos]; np[i]=v; onUpdate("_position",np); };
  return (
    <div style={S.xyzCard}>
      {AXES.map(({key,color,label,min,max},i) => {
        const v = parseFloat((pos[i]??0).toFixed(2));
        const p = Math.max(0,Math.min(100,((v-min)/(max-min))*100));
        return (
          <div key={key} style={S.xyzRow}>
            <div style={S.xyzBadge(color)}>{label}</div>
            <input type="range" min={min} max={max} step={0.05} value={v}
              onChange={e=>setAx(i,parseFloat(e.target.value))} style={S.xyzSlider(color,p)} />
            <input type="number" value={v} step={0.05} min={min} max={max}
              onChange={e=>setAx(i,parseFloat(e.target.value)||0)} style={S.xyzInput} />
          </div>
        );
      })}
      <div style={{ ...S.xyzRow,marginBottom:0 }}>
        <div style={{ ...S.xyzBadge(T.accent),fontSize:8 }}>SZ</div>
        <input type="range" min={0.1} max={5} step={0.05} value={parseFloat(scale.toFixed(2))}
          onChange={e=>onUpdate("scale",parseFloat(e.target.value))} style={S.xyzSlider(T.accent,sPct)} />
        <input type="number" value={parseFloat(scale.toFixed(2))} step={0.05} min={0.1} max={5}
          onChange={e=>onUpdate("scale",parseFloat(e.target.value)||1)} style={S.xyzInput} />
      </div>
      <div style={{ display:"flex",justifyContent:"flex-end",marginTop:8 }}>
        <button style={S.xyzReset} onClick={()=>{onUpdate("_position",[0,0,0]);onUpdate("scale",1);}}>↺ Reset</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BandControls  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function BandControls({ comp, onUpdate, onDelete, onSave }) {
  const [metal,   setMetal]   = useState(comp.materialOverrides?.metalType || "gold_22k");
  const [width,   setWidth]   = useState(parseFloat(comp.geometry?.bandWidth) || 2.5);
  const [profile, setProfile] = useState(comp.geometry?.profile || "Round");
  const [size,    setSize]    = useState(comp.geometry?.ringSize || "7");
  useEffect(()=>{
    setMetal(comp.materialOverrides?.metalType||"gold_22k");
    setWidth(parseFloat(comp.geometry?.bandWidth)||2.5);
    setProfile(comp.geometry?.profile||"Round");
    setSize(comp.geometry?.ringSize||"7");
  },[comp.id]); // eslint-disable-line
  return (
    <>
      <Sec>Transform</Sec><TransformControls comp={comp} onUpdate={onUpdate} />
      <Sec>Metal · Karat</Sec>
      <MetalPicker value={metal} onChange={m=>{setMetal(m.id);onUpdate("color",m.color);onUpdate("metalType",m.id);}} />
      <Sec>Band Width</Sec>
      <Slider label="Width" min={1} max={8} step={0.5} value={width} display={`${width.toFixed(1)}mm`} onChange={v=>{setWidth(v);onUpdate("bandWidth",v);}} />
      <Sec>Profile</Sec>
      <div style={S.bOpts}>{BAND_PROFILES.map(p=><div key={p} style={S.bOpt(profile===p)} onClick={()=>{setProfile(p);onUpdate("profile",p);}}>{p.split(" ")[0]}</div>)}</div>
      <Sec>Ring Size</Sec>
      <div style={S.tagRow}>{RING_SIZES.map(s=><div key={s} style={S.tag(size===s)} onClick={()=>{setSize(s);onUpdate("ringSize",s);}}>{s}</div>)}</div>
      <div style={S.actRow}><button style={S.del} onClick={onDelete}>Delete</button><button style={S.save} onClick={onSave}>✓ Save</button></div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ── NEW ── ExchangeGemButton
//  Shown at the top of GemControls. Calls onOpenGemSwap when clicked.
// ─────────────────────────────────────────────────────────────────────────────
function ExchangeGemButton({ modelUrl, onOpenGemSwap }) {
  const [hov, setHov] = useState(false);
  const fileName = modelUrl ? modelUrl.split("/").pop() : null;
  return (
    <button
      onClick={() => onOpenGemSwap && onOpenGemSwap()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        padding: "11px 14px",
        borderRadius: 11,
        cursor: "pointer",
        border: `1.5px solid ${hov ? "rgba(75,108,247,0.65)" : "rgba(75,108,247,0.38)"}`,
        background: hov
          ? "linear-gradient(135deg,rgba(75,108,247,0.22),rgba(155,89,232,0.16))"
          : "linear-gradient(135deg,rgba(75,108,247,0.12),rgba(155,89,232,0.08))",
        display: "flex",
        alignItems: "center",
        gap: 11,
        transition: "all 0.18s ease",
        fontFamily: "'DM Sans',sans-serif",
        marginBottom: 10,
        boxShadow: hov ? "0 0 20px rgba(75,108,247,0.22)" : "none",
      }}
    >
      {/* gem icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: "linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, boxShadow: "0 2px 10px rgba(75,108,247,0.45)",
        transition: "transform 0.18s",
        transform: hov ? "scale(1.08)" : "scale(1)",
      }}>◈</div>

      {/* labels */}
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#9dc4ff", letterSpacing: "0.2px" }}>
          Exchange Gem
        </div>
        <div style={{ fontSize: 9, color: T.textDim, marginTop: 2 }}>
          {fileName ? fileName : "Swap cut · shape · stone type"}
        </div>
      </div>

      {/* arrow */}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
        stroke={hov ? "#9dc4ff" : "#55526a"} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, transition: "stroke 0.18s, transform 0.18s", transform: hov ? "translateX(2px)" : "translateX(0)" }}>
        <path d="M6 3l5 5-5 5"/>
      </svg>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  GemControls  ← UPDATED: removed old GemSwapCard inline, uses ExchangeGemButton
// ─────────────────────────────────────────────────────────────────────────────
function GemControls({ comp, onUpdate, onDelete, onSave, onOpenGemSwap }) {
  const initGemType = comp.materialOverrides?.gemType ||
    (isGemComp(comp.type) && REF_PPC[(comp.type||"").toLowerCase()]
      ? (comp.type||"").toLowerCase() : "diamond");

  const [gem,      setGem]      = useState(initGemType);
  const [cut,      setCut]      = useState(comp.geometry?.cut       || "round_brilliant");
  const [carat,    setCarat]    = useState(comp.geometry?.caratSize || "1ct");
  const [dColor,   setDColor]   = useState(comp.materialOverrides?.diamondColor || "diamond_white");
  const [modelUrl, setModelUrl] = useState(comp.model_path || "");

  useEffect(() => {
    const g = comp.materialOverrides?.gemType ||
      (isGemComp(comp.type) && REF_PPC[(comp.type||"").toLowerCase()]
        ? (comp.type||"").toLowerCase() : "diamond");
    setGem(g);
    setCut(comp.geometry?.cut       || "round_brilliant");
    setCarat(comp.geometry?.caratSize || "1ct");
    setDColor(comp.materialOverrides?.diamondColor || "diamond_white");
    setModelUrl(comp.model_path || "");
  }, [comp.id]); // eslint-disable-line

  const isDiamond = gem === "diamond";
  const livePPC   = () => {
    const base = REF_PPC[gem] || REF_PPC.diamond;
    return isDiamond ? Math.round(base * (CUT_MULT[cut]||1) * (DCOLOR_MULT[dColor]||1)) : base;
  };

  return (
    <>
      {/* ── EXCHANGE GEM BUTTON ── top of panel, always visible ── */}
      <ExchangeGemButton modelUrl={modelUrl} onOpenGemSwap={onOpenGemSwap} />

      {/* ── STONE TYPE ── */}
      <Sec>Stone Type</Sec>
      <div style={S.gGrid}>
        {GEMS.map(g => (
          <div key={g.id} style={S.gOpt(gem===g.id)} onClick={() => {
            setGem(g.id);
            onUpdate("color",   g.color);
            onUpdate("gemType", g.id);
            if (g.id !== "diamond") onUpdate("diamondColor", null);
          }}>
            <div style={S.gem(g.color)} />
            <div style={S.gLabel(gem===g.id)}>{g.label}</div>
            <div style={{ fontSize:"7.5px", color:T.textDim, fontFamily:"monospace", textAlign:"center" }}>
              {fmtINR(REF_PPC[g.id]||0)}/ct
            </div>
          </div>
        ))}
      </div>

      {/* ── DIAMOND COLOUR ── */}
      {isDiamond && (
        <>
          <Sec>Diamond Colour</Sec>
          <DiamondColorPicker value={dColor} cut={cut} onChange={(id, col) => {
            setDColor(id); onUpdate("diamondColor", id); onUpdate("color", col);
          }} />
        </>
      )}

      {/* ── CUT STYLE ── */}
      <Sec>Cut Style</Sec>
      <div style={S.cGrid}>
        {CUTS.map(c => {
          const ppc = isDiamond
            ? Math.round(REF_PPC.diamond * (CUT_MULT[c.id]||1) * (DCOLOR_MULT[dColor]||1))
            : REF_PPC[gem] || 0;
          return (
            <div key={c.id} style={S.cOpt(cut===c.id)} onClick={() => {
              setCut(c.id);
              onUpdate("cut", c.id);
              if (isDiamond) {
                const matchId = {
                  round_brilliant:"diamond", cushion:"CushionCut_Diamond",
                  emerald_cut:"Emerald_Diamond", oval:"Oval_Diamond",
                  princess:"Princess_Dimond", pear:null,
                }[c.id];
                if (matchId) {
                  const url = `${API_BASE}/api/gems/model/${matchId}`;
                  if (url !== modelUrl) { setModelUrl(url); onUpdate("model_path", url); }
                }
              }
            }}>
              <div style={{ fontSize:14, color:T.textSub }}>{c.icon}</div>
              <div style={{ fontSize:"8.5px", color:cut===c.id?T.accentLight:T.textDim }}>{c.label}</div>
              <div style={{ fontSize:"7.5px", color:T.textDim, fontFamily:"monospace" }}>{fmtINR(ppc)}/ct</div>
            </div>
          );
        })}
      </div>

      {/* ── CARAT SIZE ── */}
      <Sec>Carat Size</Sec>
      <div style={S.tagRow}>
        {CARAT_SIZES.map(s => {
          const ct = CARAT_MAP[s] || 1;
          return (
            <div key={s}
              style={{ ...S.tag(carat===s), display:"flex", flexDirection:"column", alignItems:"center", minWidth:46 }}
              onClick={() => { setCarat(s); onUpdate("caratSize", s); }}>
              <span>{s}</span>
              <span style={{ fontSize:"7.5px", color:T.textDim, fontFamily:"monospace" }}>
                {fmtINR(livePPC() * ct)}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── TRANSFORM ── */}
      <Sec>Transform</Sec>
      <TransformControls comp={comp} onUpdate={onUpdate} />

      <div style={S.actRow}>
        <button style={S.del}  onClick={onDelete}>Delete</button>
        <button style={S.save} onClick={onSave}>✓ Save</button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ProngControls  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function ProngControls({ comp, onUpdate, onDelete, onSave }) {
  const [cnt,setCnt]=useState(comp.geometry?.prongCount||4);
  const [h,  setH]  =useState(parseFloat(comp.geometry?.prongHeight)||1.2);
  const [th, setTh] =useState(parseFloat(comp.geometry?.prongThickness)||0.9);
  const [m,  setM]  =useState(comp.materialOverrides?.metalType||"gold_22k");
  useEffect(()=>{setCnt(comp.geometry?.prongCount||4);setH(parseFloat(comp.geometry?.prongHeight)||1.2);setTh(parseFloat(comp.geometry?.prongThickness)||0.9);setM(comp.materialOverrides?.metalType||"gold_22k");},[comp.id]); // eslint-disable-line
  const chg=d=>{const n=Math.max(2,Math.min(6,cnt+d));setCnt(n);onUpdate("prongCount",n);};
  return (
    <>
      <Sec>Transform</Sec><TransformControls comp={comp} onUpdate={onUpdate} />
      <Sec>Prong Count</Sec>
      <div style={S.pCtr}>
        <button style={S.pcBtn} onClick={()=>chg(-1)}>−</button>
        <div style={S.pCnt}>{cnt}</div>
        <button style={S.pcBtn} onClick={()=>chg(+1)}>+</button>
        <div style={S.pDots}>{[1,2,3,4,5,6].map(i=><div key={i} style={S.pDot(i<=cnt)} />)}</div>
      </div>
      <Sec>Dimensions</Sec>
      <Slider label="Height" min={0.5} max={2.5} step={0.1} value={h} display={`${h.toFixed(1)}mm`} onChange={v=>{setH(v);onUpdate("prongHeight",v);}} />
      <Slider label="Thickness" min={0.3} max={1.5} step={0.1} value={th} display={`${th.toFixed(1)}mm`} onChange={v=>{setTh(v);onUpdate("prongThickness",v);}} />
      <Sec>Metal · Karat</Sec>
      <MetalPicker value={m} onChange={mk=>{setM(mk.id);onUpdate("color",mk.color);onUpdate("metalType",mk.id);}} />
      <div style={S.actRow}><button style={S.del} onClick={onDelete}>Delete</button><button style={S.save} onClick={onSave}>✓ Save</button></div>
    </>
  );
}

function SettingControls({ comp, onUpdate, onDelete, onSave }) {
  const [st,setSt]=useState(comp.geometry?.settingStyle||"prong");
  const [m, setM] =useState(comp.materialOverrides?.metalType||"gold_22k");
  useEffect(()=>{setSt(comp.geometry?.settingStyle||"prong");setM(comp.materialOverrides?.metalType||"gold_22k");},[comp.id]); // eslint-disable-line
  return (
    <>
      <Sec>Transform</Sec><TransformControls comp={comp} onUpdate={onUpdate} />
      <Sec>Setting Style</Sec>
      <div style={S.cGrid}>{SETTING_STYLES.map(s=><div key={s.id} style={S.cOpt(st===s.id)} onClick={()=>{setSt(s.id);onUpdate("settingStyle",s.id);}}><div style={{ fontSize:14,color:T.textSub }}>{s.icon}</div><div style={{ fontSize:"8.5px",color:st===s.id?T.accentLight:T.textDim }}>{s.label}</div></div>)}</div>
      <Sec>Metal · Karat</Sec>
      <MetalPicker value={m} onChange={mk=>{setM(mk.id);onUpdate("color",mk.color);onUpdate("metalType",mk.id);}} />
      <div style={S.actRow}><button style={S.del} onClick={onDelete}>Delete</button><button style={S.save} onClick={onSave}>✓ Save</button></div>
    </>
  );
}

function GenericControls({ comp, onUpdate, onDelete, onSave }) {
  const [m,setM]=useState(comp.materialOverrides?.metalType||"gold_22k");
  useEffect(()=>{setM(comp.materialOverrides?.metalType||"gold_22k");},[comp.id]); // eslint-disable-line
  return (
    <>
      <Sec>Transform</Sec><TransformControls comp={comp} onUpdate={onUpdate} />
      <Sec>Metal · Karat</Sec>
      <MetalPicker value={m} onChange={mk=>{setM(mk.id);onUpdate("color",mk.color);onUpdate("metalType",mk.id);}} />
      <div style={S.actRow}><button style={S.del} onClick={onDelete}>Delete</button><button style={S.save} onClick={onSave}>✓ Save</button></div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  AIAgentPanel  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function AIAgentPanel({ onQuickAction }) {
  const [msg,setMsg]=useState("");const [eng,setEng]=useState("");const [font,setFont]=useState("Script");
  const qas=[{l:"🌸 Rose gold",a:"rose gold"},{l:"◆ Sapphire",a:"sapphire"},{l:"◻ Minimal",a:"minimal"},{l:"✦ Add halo",a:"add halo"},{l:"⬡ Art Deco",a:"art deco"},{l:"$ Budget",a:"budget"}];
  const send=()=>{if(!msg.trim())return;onQuickAction(msg.trim());setMsg("");};
  return (
    <>
      <div style={S.aiH}>
        <div style={{ width:7,height:7,borderRadius:"50%",background:T.success,boxShadow:`0 0 6px ${T.success}` }} />
        <div><div style={{ fontSize:12,fontWeight:600,color:T.text }}>AI AGENT</div><div style={{ fontSize:10,color:T.textDim }}>GPT-4o connected</div></div>
        <button style={{ marginLeft:"auto",background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:14 }}>↺</button>
      </div>
      <div style={S.aiI}>I'm your <strong style={{ color:T.accentLight }}>AI jewelry design assistant</strong>. Describe any change in plain English.</div>
      <div style={S.body}>
        <Sec>Inner Band Engraving</Sec>
        <div style={S.eRow}><input style={S.eIn} placeholder='"Forever mine"' value={eng} onChange={e=>setEng(e.target.value)} /><button style={S.eAdd} onClick={()=>{if(eng.trim()){onQuickAction("engrave: "+eng);setEng("");}}}>ADD</button></div>
        <div style={{ display:"flex",gap:5,marginBottom:12 }}>{["Script","Block","Italic"].map(f=><div key={f} style={S.fontTag(font===f)} onClick={()=>setFont(f)}>{f}</div>)}</div>
        <Sec>Quick Actions</Sec>
        <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:12 }}>
          {qas.map(q=><button key={q.a} onClick={()=>onQuickAction(q.a)} style={{ padding:"5px 10px",borderRadius:7,fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",border:"1px solid rgba(123,92,229,0.2)",background:"rgba(123,92,229,0.05)",color:T.textSub }}>{q.l}</button>)}
        </div>
      </div>
      <div style={S.chatArea}>
        <textarea style={S.chatIn} placeholder="Describe a change…" value={msg} rows={1} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} />
        <button style={S.sendBtn} onClick={send}><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2L2 8l5 2 2 5 5-13z"/></svg></button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  AnalyticsPanel  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsPanel({ jewelryJSON, apiState }) {
  const { data,isBackend } = apiState;
  const comps = jewelryJSON?.components || [];
  const rows = isBackend&&data
    ? data.components
    : comps.map(c=>({ id:c.id,name:c.name||c.id,type:c.type,is_gem:isGemComp(c.type),total_inr:localEstimate(c),total_formatted:"",weight_grams:0,material_label:"" }));
  const grand = isBackend&&data ? data.grand_total_inr        : rows.reduce((s,r)=>s+r.total_inr,0);
  const wt    = isBackend&&data ? data.total_weight_grams     : 0;
  const bppg  = isBackend&&data ? data.blended_price_per_gram : 0;
  return (
    <div style={S.body}>
      <Sec>Design Overview</Sec>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
        {[{l:"Components",v:rows.length},{l:"Gems",v:rows.filter(r=>r.is_gem).length},{l:"Metal",v:rows.filter(r=>!r.is_gem).length},{l:"Version",v:"v1"}].map(i=>(
          <div key={i.l} style={{ background:T.bg2,borderRadius:9,padding:10,border:"1px solid rgba(123,92,229,0.12)" }}>
            <div style={{ fontSize:10,color:T.textDim,marginBottom:4 }}>{i.l}</div>
            <div style={{ fontSize:18,fontWeight:600,color:T.accentLight }}>{i.v}</div>
          </div>
        ))}
      </div>
      <div style={{ background:"linear-gradient(135deg,rgba(75,108,247,0.12),rgba(224,64,251,0.07))",border:"1px solid rgba(123,92,229,0.22)",borderRadius:12,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:10,color:T.textDim,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:4 }}>Estimated Cost</div>
          <div style={{ fontSize:26,fontWeight:800,fontFamily:"'Nunito',sans-serif",background:T.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>
            {isBackend&&data ? data.grand_total_formatted : fmtINR(grand)}
          </div>
          <div style={{ fontSize:10,color:T.textDim,marginTop:3 }}>{isBackend?"Flask API · INR":"Local estimate · INR"}</div>
        </div>
        <div style={{ width:48,height:48,borderRadius:12,background:T.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>₹</div>
      </div>
      <div style={{ background:"rgba(123,92,229,0.06)",border:"1px solid rgba(123,92,229,0.18)",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",gap:12,alignItems:"center" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9,color:T.textDim,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:3 }}>Blended ₹/gram</div>
          <div style={{ fontSize:18,fontWeight:700,fontFamily:"'Nunito',sans-serif",background:"linear-gradient(90deg,#4B6CF7,#E040FB)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>{fmtINR(bppg)}/g</div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9,color:T.textDim,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:3 }}>Total Weight</div>
          <div style={{ fontSize:18,fontWeight:700,fontFamily:"'Nunito',sans-serif",color:T.accentLight }}>{wt.toFixed(2)}g</div>
        </div>
      </div>
      <Sec>Components</Sec>
      <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
        {rows.map(r=>(
          <div key={r.id} style={{ background:T.bg2,borderRadius:7,padding:"8px 10px",border:"1px solid rgba(123,92,229,0.1)",display:"flex",alignItems:"center",gap:8 }}>
            <div style={{ width:8,height:8,borderRadius:"50%",flexShrink:0,background:r.is_gem?"linear-gradient(135deg,#4B6CF7,#9B59E8)":"linear-gradient(135deg,#9B59E8,#E040FB)" }} />
            <div style={{ fontSize:11,color:T.text,flex:1 }}>{r.name}</div>
            <div style={{ fontSize:9,color:T.textDim }}>{r.weight_grams>0?`${r.weight_grams.toFixed(2)}g`:r.material_label||r.type}</div>
            <div style={{ fontSize:11,fontWeight:600,color:T.accentLight,fontFamily:"monospace",background:"rgba(123,92,229,0.1)",padding:"1px 7px",borderRadius:5 }}>
              {r.total_formatted||fmtINR(r.total_inr)}
            </div>
          </div>
        ))}
      </div>
      <Sec>Production Ready?</Sec>
      <div style={{ background:"rgba(46,204,113,0.08)",border:"1px solid rgba(46,204,113,0.2)",borderRadius:9,padding:10,display:"flex",alignItems:"center",gap:10 }}>
        <div style={{ fontSize:24,fontWeight:700,color:T.success,fontFamily:"'Nunito',sans-serif" }}>93</div>
        <div style={{ fontSize:11,color:T.success,lineHeight:1.4 }}><strong>High Precision</strong><br/>Ready for production</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main export  ← UPDATED: accepts onOpenGemSwap, threads it to GemControls
// ─────────────────────────────────────────────────────────────────────────────
export default function ControlPanel({
  selectedId, jewelryJSON, setJewelryJSON, setSelectedId,
  designId, onQuickAction,
  onOpenGemSwap,   // ← NEW: called when user clicks "Exchange Gem"
}) {
  const [activeTab, setActiveTab] = useState("agent");
  useEffect(()=>{ if(selectedId) setActiveTab("controls"); },[selectedId]);

  const apiState = usePriceAPI(jewelryJSON);
  const comp     = jewelryJSON?.components?.find(c=>c.id===selectedId);

  const updateComp = useCallback((path, val) => {
    setJewelryJSON(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        components: prev.components.map(c => {
          if (c.id !== selectedId) return c;
          const cp = {
            ...c,
            transform:         { ...(c.transform         || { position:[0,0,0],scale:1,rotation:[0,0,0] }) },
            materialOverrides: { ...(c.materialOverrides || {}) },
            geometry:          { ...(c.geometry          || {}) },
          };
          if (path === "model_path")   { return { ...cp, model_path: val }; }
          if (path === "_position")    { cp.transform={...cp.transform,position:val}; return cp; }
          if (path === "scale")        { cp.transform={...cp.transform,scale:val};    return cp; }
          if (path === "color")        { cp.materialOverrides.color=val;         return cp; }
          if (path === "metalType")    { cp.materialOverrides.metalType=val;     return cp; }
          if (path === "gemType")      { cp.materialOverrides.gemType=val;       return cp; }
          if (path === "diamondColor") { cp.materialOverrides.diamondColor=val;  return cp; }
          const GEO = ["bandWidth","profile","ringSize","cut","caratSize","prongCount","prongHeight","prongThickness","settingStyle","count"];
          if (GEO.includes(path))      { cp.geometry[path]=val; return cp; }
          return cp;
        }),
      };
    });
  }, [selectedId, setJewelryJSON]);

  const deleteComp = () => {
    setJewelryJSON(p=>({...p,components:p.components.filter(c=>c.id!==selectedId)}));
    setSelectedId(null);
  };

  const saveToStorage = () => {
    setJewelryJSON(p=>{
      if(!p||!designId) return p;
      const s=JSON.stringify(p);
      localStorage.setItem(`design_${designId}_level2`,s);
      localStorage.setItem(`design_${designId}_level1`,s);
      return p;
    });
  };

  const renderControls = () => {
    if (!comp) return (
      <div style={S.noSel}>
        <div style={{ fontSize:28,marginBottom:10,opacity:0.4 }}>◎</div>
        Click any component<br/>in the 3D view to edit it
      </div>
    );
    const ctype  = (comp.type||"").toLowerCase().trim();
    const common = { comp, onUpdate:updateComp, onDelete:deleteComp, onSave:saveToStorage };

    // ← pass onOpenGemSwap only to GemControls
    if (isGemComp(ctype))                             return <GemControls     key={comp.id} {...common} onOpenGemSwap={onOpenGemSwap} />;
    if (["prong","prongs"].includes(ctype))           return <ProngControls   key={comp.id} {...common} />;
    if (["setting","basket","bezel"].includes(ctype)) return <SettingControls key={comp.id} {...common} />;
    if (isMetalComp(ctype))                           return <BandControls    key={comp.id} {...common} />;
    return <GenericControls key={comp.id} {...common} />;
  };

  return (
    <div style={S.panel}>
      <style>{`
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <div style={S.tabRow}>
        {[{id:"agent",label:"AI Agent"},{id:"controls",label:"Controls"},{id:"analytics",label:"Analytics"}].map(t=>(
          <button key={t.id} style={S.tabBtn(activeTab===t.id)} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {activeTab==="agent" && (
        <div style={{ display:"flex",flexDirection:"column",flex:1,overflow:"hidden" }}>
          <AIAgentPanel onQuickAction={onQuickAction||(()=>{})} />
        </div>
      )}
      {activeTab==="controls" && (
        <div style={{ display:"flex",flexDirection:"column",flex:1,overflow:"hidden" }}>
          <PriceSummary comp={comp} jewelryJSON={jewelryJSON} apiState={apiState} />
          {comp && (
            <div style={S.selBanner}>
              <div style={S.selDot}/>
              <div style={S.selName}>{comp.name||comp.id}</div>
              <div style={S.selType}>{comp.type}</div>
            </div>
          )}
          <div style={S.body}>{renderControls()}</div>
        </div>
      )}
      {activeTab==="analytics" && <AnalyticsPanel jewelryJSON={jewelryJSON} apiState={apiState} />}
    </div>
  );
}