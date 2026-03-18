import React, { useState, useEffect, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import ModelRenderer   from "./ModelRenderer";
import ControlPanel    from "./ControlPanel";
import GemSwapOverlay  from "./GemSwapOverlay"; // ← NEW

// ─────────────────────────────────────────────────────────────────────────────
//  Brand tokens
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  bg0: "#09090f", bg1: "#11111c", bg2: "#18182a", bg3: "#1f1f32", bg4: "#27273e",
  blue: "#4B6CF7", purple: "#9B59E8", pink: "#E040FB",
  accent: "#7B5CE5", accentLight: "#9d80f0", accentDim: "#3d2e8a",
  text: "#e8e4f4", textSub: "#9490b0", textDim: "#55526a",
  success: "#2ecc71", danger: "#e74c3c",
  grad:  "linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB)",
  gradH: "linear-gradient(90deg,#4B6CF7,#9B59E8,#E040FB)",
};

const METAL_COLORS = {
  yellow_gold: "#c9a84c", white_gold: "#c8c8c8", rose_gold: "#b5634d", platinum: "#9fa8b0",
};
const GEM_COLORS = {
  diamond: "#d6eaf8", ruby: "#c0392b", sapphire: "#2471a3", emerald: "#1e8449",
  amethyst: "#7d3c98", topaz: "#e67e22", opal: "#a8d8ea", pearl: "#f5f0e8",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Global CSS
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: #27273e; border-radius: 2px; }
  input[type=range] { -webkit-appearance:none; appearance:none; height:3px; border-radius:2px; outline:none; cursor:pointer; }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance:none; width:13px; height:13px; border-radius:50%;
    background: linear-gradient(135deg,#4B6CF7,#E040FB);
    cursor:pointer; box-shadow:0 0 6px rgba(155,89,232,0.6);
  }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes fadeIn  { from{opacity:0;transform:translate(-50%,6px)} to{opacity:1;transform:translate(-50%,0)} }
  @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }

  .vctrl-btn:hover { border-color:rgba(123,92,229,0.7)!important; color:#9d80f0!important; }
  .export-item { transition: all 0.18s; }
  .export-item:hover { background: rgba(75,108,247,0.12) !important; border-color: rgba(123,92,229,0.5) !important; transform: translateX(3px); }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  app: {
    display: "flex", flexDirection: "column",
    height: "100vh", width: "100vw",
    background: T.bg0, color: T.text,
    fontFamily: "'DM Sans',sans-serif", overflow: "hidden",
  },
  nav: {
    height: "54px", background: T.bg1,
    borderBottom: `1px solid rgba(123,92,229,0.15)`,
    display: "flex", alignItems: "center",
    padding: "0 16px", gap: "6px", flexShrink: 0, zIndex: 10,
  },
  logo:    { display: "flex", alignItems: "center", gap: "9px", marginRight: "12px" },
  logoImg: { height: "30px", width: "auto", objectFit: "contain", flexShrink: 0 },
  navDiv:  { width: "1px", height: "22px", background: "rgba(123,92,229,0.2)", margin: "0 4px" },
  navTab: (a) => ({
    padding: "6px 13px", borderRadius: "7px", cursor: "pointer",
    fontSize: "12px", fontFamily: "'DM Sans',sans-serif", fontWeight: a ? 500 : 400,
    color: a ? "#9d80f0" : T.textSub,
    background: a ? "rgba(75,108,247,0.1)" : "none",
    border: a ? "1px solid rgba(123,92,229,0.35)" : "1px solid transparent",
    transition: "all 0.2s",
  }),
  navRight: { marginLeft: "auto", display: "flex", gap: "7px", alignItems: "center" },
  btnGhost: {
    padding: "5px 12px", borderRadius: "7px", fontSize: "11px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif", border: "1px solid rgba(123,92,229,0.25)",
    background: T.bg2, color: T.textSub, transition: "all 0.2s",
  },
  btnAccent: (saving) => ({
    padding: "5px 16px", borderRadius: "7px", fontSize: "11px", cursor: saving ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans',sans-serif",
    backgroundImage:  saving ? "none"                              : "linear-gradient(135deg,#4B6CF7,#9B59E8)",
    backgroundColor:  saving ? "rgba(75,108,247,0.4)"             : "transparent",
    backgroundSize:   "200% 200%",
    animation: saving ? "none" : "gradShift 3.5s ease infinite",
    border: "none", color: "#fff", fontWeight: 600, transition: "all 0.2s",
    boxShadow: saving ? "none" : "0 2px 12px rgba(75,108,247,0.35)",
    display: "flex", alignItems: "center", gap: "6px",
    opacity: saving ? 0.7 : 1,
  }),
  btnExport: {
    padding: "5px 12px", borderRadius: "7px", fontSize: "11px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
    background: "rgba(155,89,232,0.1)", border: "1px solid rgba(155,89,232,0.3)",
    color: "#b38ef0", transition: "all 0.2s",
    display: "flex", alignItems: "center", gap: "5px",
  },
  avatar: {
    width: "30px", height: "30px", borderRadius: "50%",
    background: "linear-gradient(135deg,#4B6CF7,#E040FB)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: 700, color: "#fff", cursor: "pointer",
    boxShadow: "0 2px 8px rgba(75,108,247,0.4)",
  },
  toolbar: {
    height: "42px", background: T.bg1,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    display: "flex", alignItems: "center",
    padding: "0 12px", gap: "6px", flexShrink: 0,
  },
  viewPill: { display: "flex", background: T.bg3, borderRadius: "7px", padding: "2px", gap: "1px" },
  viewBtn: (a) => ({
    padding: "4px 11px", borderRadius: "5px", fontSize: "11px", cursor: "pointer",
    color: a ? "#fff" : T.textDim, background: a ? "linear-gradient(135deg,#4B6CF7,#9B59E8)" : "none",
    border: "none", fontFamily: "'DM Sans',sans-serif", fontWeight: a ? 600 : 400, transition: "all 0.2s",
    boxShadow: a ? "0 1px 6px rgba(75,108,247,0.4)" : "none",
  }),
  envBtn: (a) => ({
    padding: "4px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer",
    color: a ? "#9d80f0" : T.textDim,
    border: a ? "1px solid rgba(123,92,229,0.4)" : "1px solid transparent",
    background: a ? "rgba(75,108,247,0.1)" : "none",
    fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
  }),
  qualBadge: {
    display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px",
    borderRadius: "7px", background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.25)",
  },
  qualNum:  { fontFamily: "'Nunito',sans-serif", fontSize: "16px", fontWeight: 700, color: T.success },
  qualText: { fontSize: "9px", color: T.success, lineHeight: 1.3 },
  main:     { display: "flex", flex: 1, overflow: "hidden" },
  leftPanel: {
    width: "205px", background: T.bg1,
    borderRight: "1px solid rgba(123,92,229,0.1)",
    display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden",
  },
  panelHdr: {
    padding: "9px 12px", borderBottom: "1px solid rgba(123,92,229,0.1)",
    fontSize: "9px", letterSpacing: "1.8px", color: T.textDim,
    textTransform: "uppercase", fontWeight: 600, flexShrink: 0,
    background: `linear-gradient(90deg,rgba(75,108,247,0.05),transparent)`,
  },
  treeScroll: { flex: 1, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: `${T.bg4} transparent` },
  treeChildItem: (active) => ({
    padding: "6px 12px 6px 20px", cursor: "pointer",
    display: "flex", alignItems: "center", gap: "7px", transition: "all 0.15s",
    borderLeft: active ? `2px solid ${T.accent}` : "2px solid transparent",
    background: active ? "linear-gradient(90deg,rgba(75,108,247,0.1),transparent)" : "transparent",
  }),
  treeIcon: (kind) => ({
    width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px",
    background: kind === "gem"     ? "rgba(75,108,247,0.2)"   :
                kind === "prong"   ? "rgba(155,89,232,0.15)"  :
                kind === "setting" ? "rgba(224,64,251,0.12)"  : "rgba(123,92,229,0.15)",
    color:      kind === "gem"     ? "#7b9ff9"  :
                kind === "prong"   ? "#b38ef0"  :
                kind === "setting" ? "#d97af5"  : "#9d80f0",
  }),
  treeLabel: { fontSize: "12px", fontWeight: 500, color: T.text },
  treeMeta:  { marginLeft: "auto", fontSize: "10px", color: T.textDim },
  treeProp:  { display: "flex", justifyContent: "space-between", padding: "2px 12px 2px 30px", fontSize: "10px" },
  viewport:  { flex: 1, background: T.bg0, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" },
  // ↓ position:relative is critical — GemSwapOverlay is absolutely positioned inside here
  vpInner:   { flex: 1, position: "relative", overflow: "hidden" },
  vpCtrls:   { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "6px", zIndex: 5 },
  vpCtrl: {
    width: "30px", height: "30px", background: "rgba(9,9,15,0.85)",
    border: "1px solid rgba(123,92,229,0.2)", borderRadius: "7px",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: T.textSub, fontSize: "14px", transition: "all 0.2s",
  },
  toast: (type) => ({
    position: "absolute", bottom: "90px", left: "50%", transform: "translateX(-50%)",
    background: type === "error"   ? "rgba(231,76,60,0.15)"   :
                type === "success" ? "rgba(46,204,113,0.12)"  : "rgba(75,108,247,0.12)",
    border: `1px solid ${
                type === "error"   ? "rgba(231,76,60,0.4)"    :
                type === "success" ? "rgba(46,204,113,0.4)"   : "rgba(123,92,229,0.4)"}`,
    color:  type === "error"   ? "#e74c3c" :
            type === "success" ? "#2ecc71" : "#9d80f0",
    padding: "7px 16px", borderRadius: "8px",
    fontSize: "12px", pointerEvents: "none", zIndex: 20, whiteSpace: "nowrap",
    animation: "fadeIn 0.2s ease", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", gap: "7px",
  }),
  versionBar: {
    height: "72px", background: `linear-gradient(to top,${T.bg1},transparent)`,
    padding: "0 14px 10px", display: "flex", alignItems: "flex-end", gap: "10px", flexShrink: 0,
  },
  vhLabel: { fontSize: "9px", color: T.textDim, letterSpacing: "1px", display: "flex", alignItems: "center", gap: "5px", marginRight: "4px" },
  vThumb: (a) => ({
    width: "50px", height: "50px", borderRadius: "8px", background: T.bg3,
    border: a ? `1px solid ${T.accent}` : "1px solid rgba(123,92,229,0.15)",
    boxShadow: a ? "0 0 8px rgba(123,92,229,0.3)" : "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden",
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
//  Export Modal
// ─────────────────────────────────────────────────────────────────────────────

function ExportModal({ open, onClose, modelRef, designName }) {
  const [status, setStatus] = useState({});

  if (!open) return null;

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const exportPNG = async () => {
    setStatus((s) => ({ ...s, png: "loading" }));
    try {
      const dataURL = modelRef.current?.captureImage(4);
      if (!dataURL) throw new Error("Renderer not ready");
      const res  = await fetch(dataURL);
      const blob = await res.blob();
      triggerDownload(blob, `${designName || "design"}_render.png`);
      setStatus((s) => ({ ...s, png: "done" }));
    } catch (e) { console.error(e); setStatus((s) => ({ ...s, png: "error" })); }
  };

  const exportGLB = async () => {
    setStatus((s) => ({ ...s, glb: "loading" }));
    try {
      const blob = await modelRef.current?.exportGLB();
      triggerDownload(blob, `${designName || "design"}.glb`);
      setStatus((s) => ({ ...s, glb: "done" }));
    } catch (e) { console.error(e); setStatus((s) => ({ ...s, glb: "error" })); }
  };

  const exportSTL = () => {
    setStatus((s) => ({ ...s, stl: "loading" }));
    try {
      const blob = modelRef.current?.exportSTL();
      triggerDownload(blob, `${designName || "design"}.stl`);
      setStatus((s) => ({ ...s, stl: "done" }));
    } catch (e) { console.error(e); setStatus((s) => ({ ...s, stl: "error" })); }
  };

  const formats = [
    { key: "png", icon: "🖼",  label: "High-Quality PNG",  sub: "4× resolution render • transparent-ready",          color: "#4B6CF7", fn: exportPNG },
    { key: "glb", icon: "◈",   label: "GLB  (3D Model)",   sub: "GLTF binary • AR / game engine ready",               color: "#9B59E8", fn: exportGLB },
    { key: "stl", icon: "◻",   label: "STL  (3D Print)",   sub: "ASCII STL • 3D printer / CAD ready",                 color: "#E040FB", fn: exportSTL },
  ];

  const stateIcon = (k) => {
    const s = status[k];
    if (s === "loading") return <div style={{ width:"16px",height:"16px",borderRadius:"50%",border:"2px solid rgba(255,255,255,0.2)",borderTopColor:"#fff",animation:"spin 0.7s linear infinite" }} />;
    if (s === "done")    return <span style={{ color:T.success,fontSize:"14px" }}>✓</span>;
    if (s === "error")   return <span style={{ color:T.danger, fontSize:"14px" }}>✗</span>;
    return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v8M5 7l3 3 3-3M2 13h12" /></svg>;
  };

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width:"380px",background:T.bg1,borderRadius:"18px",border:"1px solid rgba(123,92,229,0.2)",boxShadow:"0 24px 80px rgba(0,0,0,0.6)",overflow:"hidden",fontFamily:"'DM Sans',sans-serif",animation:"slideUp 0.22s ease" }}>
        <div style={{ padding:"20px 22px 16px",background:"linear-gradient(135deg,rgba(75,108,247,0.1),rgba(224,64,251,0.06))",borderBottom:"1px solid rgba(123,92,229,0.12)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"15px",fontWeight:700,color:T.text,fontFamily:"'Nunito',sans-serif" }}>Export Design</div>
            <div style={{ fontSize:"11px",color:T.textDim,marginTop:"2px" }}>{designName || "Untitled design"}</div>
          </div>
          <button onClick={onClose} style={{ width:"28px",height:"28px",borderRadius:"7px",border:"1px solid rgba(123,92,229,0.2)",background:T.bg2,color:T.textSub,cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"14px 16px 20px",display:"flex",flexDirection:"column",gap:"8px" }}>
          {formats.map((f) => (
            <div key={f.key} className="export-item" onClick={status[f.key]==="loading"?undefined:f.fn}
              style={{ display:"flex",alignItems:"center",gap:"14px",padding:"12px 14px",borderRadius:"11px",cursor:"pointer",border:"1px solid rgba(123,92,229,0.12)",background:T.bg2 }}>
              <div style={{ width:"38px",height:"38px",borderRadius:"10px",flexShrink:0,background:`${f.color}18`,border:`1px solid ${f.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px" }}>{f.icon}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:"13px",fontWeight:600,color:T.text }}>{f.label}</div>
                <div style={{ fontSize:"10px",color:T.textDim,marginTop:"2px" }}>{f.sub}</div>
              </div>
              <div style={{ color:T.textSub,flexShrink:0,display:"flex",alignItems:"center" }}>{stateIcon(f.key)}</div>
            </div>
          ))}
          <button onClick={onClose} style={{ marginTop:"4px",width:"100%",padding:"9px",borderRadius:"9px",background:"rgba(123,92,229,0.07)",border:"1px solid rgba(123,92,229,0.18)",color:T.textSub,cursor:"pointer",fontSize:"12px",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ComponentTree
// ─────────────────────────────────────────────────────────────────────────────

function getIconKind(type) {
  const t = (type||"").toLowerCase();
  if (["gem","diamond","stone","gemstone","center_stone","center stone"].includes(t)) return "gem";
  if (["prong","prongs"].includes(t)) return "prong";
  if (["setting","basket","bezel"].includes(t)) return "setting";
  return "metal";
}
function getIconChar(type) {
  const t = (type||"").toLowerCase();
  if (["gem","diamond","stone","gemstone","center_stone","center stone"].includes(t)) return "◆";
  if (["prong","prongs"].includes(t)) return "⋮";
  if (["setting","basket","bezel"].includes(t)) return "⬡";
  return "◎";
}
function getCompProps(comp) {
  const t = (comp.type||"").toLowerCase();
  if (["gem","diamond","stone","gemstone"].includes(t)) return [
    ["Type", comp.materialOverrides?.gemType || comp.type || "diamond"],
    ["Cut",  comp.geometry?.cut              || "round"],
    ["Size", comp.geometry?.caratSize        || "1ct"],
  ];
  if (["prong","prongs"].includes(t)) return [
    ["Count",  comp.geometry?.prongCount || 4],
    ["Height", (comp.geometry?.prongHeight || 1.2) + "mm"],
  ];
  if (["setting","basket","bezel"].includes(t)) return [
    ["Style", comp.geometry?.settingStyle || "prong"],
  ];
  return [
    ["Width", (comp.geometry?.bandWidth || 2.5) + "mm"],
    ["Metal", (comp.materialOverrides?.metalType || "yellow_gold").replace("_"," ")],
  ];
}

function ComponentTree({ jewelryJSON, selectedId, onSelect }) {
  const [expanded, setExpanded] = useState({});
  const comps  = jewelryJSON?.components || [];
  const isExp  = (id) => expanded[id] !== false;

  return (
    <div style={S.treeScroll}>
      {comps.map((comp) => {
        const active = comp.id === selectedId;
        const kind   = getIconKind(comp.type);
        const props  = getCompProps(comp);
        const meta   = comp.materialOverrides?.metalType
          ? comp.materialOverrides.metalType.replace("_"," ").replace(/\b\w/g, c => c.toUpperCase())
          : comp.materialOverrides?.gemType || "";

        return (
          <div key={comp.id} style={{ borderTop: "1px solid rgba(123,92,229,0.06)" }}>
            <div style={S.treeChildItem(active)} onClick={() => onSelect(comp.id)}>
              <span
                style={{ fontSize:"8px",color:T.textDim,cursor:"pointer",width:"8px",flexShrink:0,display:"inline-block",transition:"transform 0.2s",transform:isExp(comp.id)?"rotate(90deg)":"none" }}
                onClick={(e) => { e.stopPropagation(); setExpanded(p=>({...p,[comp.id]:!p[comp.id]})); }}
              >▶</span>
              <div style={S.treeIcon(kind)}>{getIconChar(comp.type)}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={S.treeLabel}>{comp.name || comp.id}</div>
              </div>
              <div style={S.treeMeta}>{meta}</div>
            </div>
            {isExp(comp.id) && props.map(([k,v]) => (
              <div key={k} style={S.treeProp}>
                <span style={{ color:T.textDim }}>{k}</span>
                <span style={{ color:T.textSub }}>{String(v)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Editor
// ─────────────────────────────────────────────────────────────────────────────

export default function Editor() {
  const navigate = useNavigate();
  const [jewelryJSON, setJewelryJSON] = useState(null);
  const [selectedId,  setSelectedId]  = useState(null);
  const [navTab,      setNavTab]      = useState("Designer");
  const [viewMode,    setViewMode]    = useState("Pbr");
  const [envMode,     setEnvMode]     = useState("Studio");
  const [toast,       setToast]       = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [showExport,  setShowExport]  = useState(false);
  const [versionList, setVersionList] = useState([]);
  const [gemSwapOpen, setGemSwapOpen] = useState(false); // ← controls GemSwapOverlay

  const toastTimer = useRef(null);
  const modelRef   = useRef(null);
  const designId   = localStorage.getItem("currentDesignId");

  useEffect(() => {
    if (!designId) return;
    const raw = localStorage.getItem(`design_${designId}_level2`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setJewelryJSON(parsed);
        setVersionList([{ label: "v1", data: parsed }]);
      } catch (e) { console.error("Failed to parse design JSON:", e); }
    }
  }, [designId]);

  const showToast = useCallback((msg, type = "info", ms = 2800) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!jewelryJSON || !designId || saving) return;
    setSaving(true);
    showToast("Saving…", "info", 60000);
    const level2Str = JSON.stringify(jewelryJSON);
    const level1Str = localStorage.getItem(`design_${designId}_level1`) || level2Str;
    localStorage.setItem(`design_${designId}_level2`, level2Str);
    try {
      const token = Cookies.get("token");
      const res   = await fetch(`http://localhost:5000/designs/save-model/${designId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ level1_json: JSON.parse(level1Str), level2_json: jewelryJSON }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const vLabel = `v${versionList.length + 1}`;
        setVersionList((prev) => [...prev, { label: vLabel, data: { ...jewelryJSON } }]);
        showToast("✓ Design saved to server", "success");
      } else {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("Save failed:", err);
      showToast(`Save failed: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  }, [jewelryJSON, designId, saving, showToast, versionList]);

  // ── QUICK ACTIONS ─────────────────────────────────────────────────────────
  const handleQuickAction = useCallback((action) => {
    const a = action.toLowerCase();
    setJewelryJSON((prev) => {
      if (!prev) return prev;
      const components = prev.components.map((comp) => {
        const copy  = { ...comp, materialOverrides: { ...(comp.materialOverrides||{}) }, geometry: { ...(comp.geometry||{}) } };
        const ctype = (comp.type||"").toLowerCase();
        const isGem   = ["gem","diamond","stone","gemstone","center_stone"].includes(ctype);
        const isMetal = ["band","ring","shank","prong","prongs","setting","basket"].includes(ctype);
        if (isMetal) {
          if (a.includes("rose gold"))   { copy.materialOverrides.color = METAL_COLORS.rose_gold;   copy.materialOverrides.metalType = "rose_gold"; }
          if (a.includes("white gold"))  { copy.materialOverrides.color = METAL_COLORS.white_gold;  copy.materialOverrides.metalType = "white_gold"; }
          if (a.includes("platinum"))    { copy.materialOverrides.color = METAL_COLORS.platinum;    copy.materialOverrides.metalType = "platinum"; }
          if (a.includes("yellow gold")) { copy.materialOverrides.color = METAL_COLORS.yellow_gold; copy.materialOverrides.metalType = "yellow_gold"; }
          if (a.includes("thin band") || a.includes("minimal")) copy.geometry.bandWidth = 1.5;
          if (a.includes("thick band")) copy.geometry.bandWidth = 4.0;
        }
        if (isGem) {
          for (const [name, hex] of Object.entries(GEM_COLORS)) {
            if (a.includes(name)) { copy.materialOverrides.color = hex; copy.materialOverrides.gemType = name; break; }
          }
        }
        return copy;
      });
      return { ...prev, components };
    });
    showToast("✓ " + action, "info");
  }, [showToast]);

  // ── GEM SWAP — called by GemSwapOverlay ───────────────────────────────────
  // entry = catalog item from Flask GET /api/gems/catalog
  const handleGemSwap = useCallback((compId, entry) => {
    setJewelryJSON((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        components: prev.components.map((c) => {
          if (c.id !== compId) return c;
          return {
            ...c,
            // model_path drives OBJLoader hot-swap in ModelRenderer
            model_path: entry.model_url,
            materialOverrides: {
              ...c.materialOverrides,
              gemType: entry.gem_type,
              color:   entry.color,
            },
            geometry: {
              ...c.geometry,
              // sync cut so ControlPanel pricing stays accurate
              ...(entry.cut ? { cut: entry.cut } : {}),
            },
          };
        }),
      };
    });
    showToast(`◈ Swapped to ${entry.label}`, "success");
  }, [showToast]);

  // ── No design ─────────────────────────────────────────────────────────────
  if (!jewelryJSON) {
    return (
      <div style={{ ...S.app, alignItems:"center", justifyContent:"center" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ textAlign:"center" }}>
          <img src="/assets/logo.png" alt="GeminAI" style={{ height:"48px",marginBottom:"20px",opacity:0.9 }} />
          <div style={{ fontSize:"13px",color:T.textSub,marginBottom:"8px" }}>No design loaded</div>
          <div style={{ fontSize:"11px",color:T.textDim,lineHeight:1.7 }}>
            Use the Upload modal to detect &amp; create a model,<br/>
            or set <code style={{ color:T.accentLight }}>currentDesignId</code> in localStorage.
          </div>
        </div>
      </div>
    );
  }

  const VIEW_MODES = ["Pbr", "Clay", "Wireframe"];
  const ENV_MODES  = ["Studio", "Showroom", "Dramatic"];
  const NAV_TABS   = ["Generate", "Designer", "Catalog", "Export"];
  const designName = jewelryJSON?.name || `Design ${designId?.slice(-4) || ""}`;

  return (
    <div style={S.app}>
      <style>{GLOBAL_CSS}</style>

      {/* ── TOP NAV ── */}
      <nav style={S.nav}>
        <div style={S.logo}>
          <img src="/assets/logo.png" alt="GeminAI" style={S.logoImg} />
        </div>
        <div style={S.navDiv} />
        {NAV_TABS.map((t) => (
          <button key={t} style={S.navTab(navTab === t)} onClick={() => setNavTab(t)}>{t}</button>
        ))}

        <div style={S.navRight}>
          <button
            style={{ ...S.btnGhost, background:"linear-gradient(135deg,rgba(75,108,247,0.15),rgba(224,64,251,0.1))", border:"1px solid rgba(123,92,229,0.4)", color:"#9d80f0", fontWeight:500, display:"flex", alignItems:"center", gap:"5px" }}
            onClick={() => navigate(`/designs/${designId}/ar`)}
          >
            <span style={{ fontSize:"13px" }}>◈</span> AR Try‑On
          </button>
          {["Capture","Package"].map((b) => (
            <button key={b} style={S.btnGhost}>{b}</button>
          ))}
          <button style={S.btnExport} onClick={() => setShowExport(true)}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2v8M5 7l3 3 3-3M2 13h12" />
            </svg>
            Export
          </button>
          <button style={S.btnAccent(saving)} onClick={handleSave} disabled={saving}>
            {saving ? (
              <><div style={{ width:"11px",height:"11px",borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"spin 0.7s linear infinite" }} />Saving…</>
            ) : "Save"}
          </button>
          <div style={S.avatar}>JN</div>
        </div>
      </nav>

      {/* ── TOOLBAR ── */}
      <div style={S.toolbar}>
        <div style={S.viewPill}>
          {VIEW_MODES.map((m) => (
            <button key={m} style={S.viewBtn(viewMode === m)} onClick={() => setViewMode(m)}>{m}</button>
          ))}
        </div>
        <div style={S.navDiv} />
        <div style={{ display:"flex", gap:"3px" }}>
          {ENV_MODES.map((m) => (
            <button key={m} style={S.envBtn(envMode === m)} onClick={() => setEnvMode(m)}>{m}</button>
          ))}
        </div>
        <div style={{ marginLeft:"auto" }}>
          <div style={S.qualBadge}>
            <div style={S.qualNum}>93</div>
            <div style={S.qualText}>READY FOR PRODUCTION?<br/><strong>High Precision</strong></div>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={S.main}>

        {/* LEFT — Component Tree */}
        <div style={S.leftPanel}>
          <div style={S.panelHdr}>Component Tree</div>
          <ComponentTree
            jewelryJSON={jewelryJSON}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              const comp = jewelryJSON.components.find((c) => c.id === id);
              if (comp) showToast(`Selected: ${comp.name || id}`, "info");
            }}
          />
        </div>

        {/* CENTER — 3D Viewport */}
        <div style={S.viewport}>

          {/* vpInner has position:relative — all floating overlays anchor here */}
          <div style={S.vpInner}>

            {/* 3D renderer */}
            <ModelRenderer
              ref={modelRef}
              jewelryJSON={jewelryJSON}
              selectedId={selectedId}
              setSelectedId={(id) => {
                setSelectedId(id);
                if (id) {
                  const comp = jewelryJSON.components.find((c) => c.id === id);
                  showToast(`Selected: ${comp?.name || id}`, "info");
                }
              }}
              viewMode={viewMode}
              envMode={envMode}
            />

            {/* ── GEM SWAP OVERLAY ─────────────────────────────────────────
                Controlled by gemSwapOpen state.
                Opens when user clicks "Exchange Gem" in ControlPanel.
                Fetches /api/gems/catalog from Flask.
                Calls handleGemSwap → updates jewelryJSON → OBJLoader hot-swaps.
            ── */}
            <GemSwapOverlay
              open={gemSwapOpen}
              onClose={() => setGemSwapOpen(false)}
              selectedId={selectedId}
              jewelryJSON={jewelryJSON}
              onSwap={handleGemSwap}
              apiBase="http://localhost:5000"
            />

            {/* Zoom / reset controls — right side */}
            <div style={S.vpCtrls}>
              {[
                { icon: "+",  title: "Zoom in"  },
                { icon: "−",  title: "Zoom out" },
                { icon: "⟳",  title: "Reset"    },
                { icon: "⊞",  title: "Fit"      },
              ].map((c) => (
                <div key={c.icon} className="vctrl-btn" style={S.vpCtrl} title={c.title}>{c.icon}</div>
              ))}
            </div>

            {/* Toast notifications */}
            {toast && (
              <div style={S.toast(toast.type)}>
                {toast.type === "success" && <span>✓</span>}
                {toast.type === "error"   && <span>✗</span>}
                {toast.type === "info"    && <span>◈</span>}
                {toast.msg}
              </div>
            )}
          </div>

          {/* Version history bar */}
          <div style={S.versionBar}>
            <div style={S.vhLabel}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" />
              </svg>
              Version History
              <span style={{ background:"rgba(123,92,229,0.2)",color:"#9d80f0",fontSize:"9px",padding:"1px 7px",borderRadius:"4px" }}>
                {versionList.length} version{versionList.length !== 1 ? "s" : ""}
              </span>
            </div>
            {versionList.map((v, i) => (
              <div key={i} style={S.vThumb(i === versionList.length - 1)}
                onClick={() => { setJewelryJSON(v.data); showToast(`Restored ${v.label}`, "info"); }}>
                <svg width="30" height="30" viewBox="0 0 32 32">
                  <ellipse cx="16" cy="22" rx="11" ry="3.5" fill="none" stroke="#7B5CE5" strokeWidth="3" />
                  <polygon points="16,8 20,14 16,18 12,14" fill="#9d80f0" opacity="0.9" />
                </svg>
                <div style={{ position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.7)",fontSize:"8px",textAlign:"center",padding:"1px",color:T.textSub }}>{v.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Control Panel */}
        <ControlPanel
          selectedId={selectedId}
          jewelryJSON={jewelryJSON}
          setJewelryJSON={setJewelryJSON}
          setSelectedId={setSelectedId}
          designId={designId}
          onQuickAction={handleQuickAction}
          onOpenGemSwap={() => setGemSwapOpen(true)}
        />
      </div>

      {/* Export Modal */}
      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        modelRef={modelRef}
        designName={designName}
      />
    </div>
  );
}