import React, { useState, useEffect, useCallback, useRef } from "react";
import ModelRenderer from "./ModelRenderer";
import ControlPanel  from "./ControlPanel";

// ─────────────────────────────────────────────────────────────────────────────
//  Brand tokens  (extracted from GeminAI logo)
//   Primary:  blue  #4B6CF7  →  purple #9B59E8  →  pink #E040FB
//   Dark bg:  #09090f  (near-black, cooler than warm gold theme)
//   Surface:  #11111c  /  #18182a  /  #1f1f32
//   Text:     #e8e4f4  (slightly purple-tinted white)
//   Muted:    #6b6880  /  #45425a
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  // backgrounds
  bg0:   "#09090f",
  bg1:   "#11111c",
  bg2:   "#18182a",
  bg3:   "#1f1f32",
  bg4:   "#27273e",

  // brand gradient stops
  blue:  "#4B6CF7",
  purple:"#9B59E8",
  pink:  "#E040FB",

  // derived solids
  accent:      "#7B5CE5",   // mid-purple — primary interactive accent
  accentLight: "#9d80f0",
  accentDim:   "#3d2e8a",

  // text
  text:    "#e8e4f4",
  textSub: "#9490b0",
  textDim: "#55526a",

  // semantic
  success: "#2ecc71",
  danger:  "#e74c3c",

  // gradients (CSS strings)
  grad:         "linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB)",
  gradH:        "linear-gradient(90deg,#4B6CF7,#9B59E8,#E040FB)",
  gradBorder:   "linear-gradient(135deg,rgba(75,108,247,0.5),rgba(155,89,232,0.5),rgba(224,64,251,0.5))",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Jewelry color maps (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const METAL_COLORS = {
  yellow_gold: "#c9a84c", white_gold: "#c8c8c8",
  rose_gold:   "#b5634d", platinum:   "#9fa8b0",
};

const GEM_COLORS = {
  diamond: "#d6eaf8", ruby:  "#c0392b", sapphire: "#2471a3",
  emerald: "#1e8449", amethyst: "#7d3c98", topaz: "#e67e22",
  opal:    "#a8d8ea", pearl: "#f5f0e8",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Global CSS
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
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

  .geminal-logo-text {
    font-family: 'Nunito', sans-serif;
    font-weight: 700;
    font-size: 15px;
    background: linear-gradient(90deg,#4B6CF7,#9B59E8,#E040FB);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.3px;
    line-height: 1.2;
  }
  .geminal-logo-sub {
    font-family: 'DM Sans', sans-serif;
    font-size: 8px;
    color: #6b6880;
    letter-spacing: 1.5px;
    font-weight: 400;
  }
  .nav-btn-active {
    background: linear-gradient(135deg,rgba(75,108,247,0.15),rgba(224,64,251,0.1)) !important;
    border: 1px solid rgba(123,92,229,0.4) !important;
    color: #9d80f0 !important;
  }
  .grad-border-btn {
    position: relative;
    background: #18182a;
    border: 1px solid rgba(123,92,229,0.3);
    color: #9490b0;
    transition: all 0.2s;
  }
  .grad-border-btn:hover {
    border-color: rgba(123,92,229,0.7);
    color: #9d80f0;
    background: rgba(123,92,229,0.08);
  }
  .accent-btn {
    background: linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB) !important;
    background-size: 200% 200% !important;
    border: none !important;
    color: #fff !important;
    font-weight: 600 !important;
    animation: gradShift 3s ease infinite;
  }
  .accent-btn:hover { opacity: 0.9; transform: scale(1.02); }

  .tree-item-active {
    border-left: 2px solid #7B5CE5 !important;
    background: linear-gradient(90deg,rgba(75,108,247,0.08),transparent) !important;
  }
  .vctrl-btn:hover { border-color: rgba(123,92,229,0.7) !important; color: #9d80f0 !important; }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Styles object
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  app: {
    display: "flex", flexDirection: "column",
    height: "100vh", width: "100vw",
    background: T.bg0, color: T.text,
    fontFamily: "'DM Sans',sans-serif", overflow: "hidden",
  },

  // ── NAV ──
  nav: {
    height: "54px", background: T.bg1,
    borderBottom: `1px solid rgba(123,92,229,0.15)`,
    display: "flex", alignItems: "center",
    padding: "0 16px", gap: "6px", flexShrink: 0, zIndex: 10,
  },
  logo: { display: "flex", alignItems: "center", gap: "9px", marginRight: "12px" },
  logoImg: { height: "30px", width: "auto", objectFit: "contain", flexShrink: 0 },
  navDiv:  { width: "1px", height: "22px", background: "rgba(123,92,229,0.2)", margin: "0 4px" },
  navTab: (a) => ({
    padding: "6px 13px", borderRadius: "7px", cursor: "pointer",
    fontSize: "12px", fontFamily: "'DM Sans',sans-serif",
    fontWeight: a ? 500 : 400,
    color:      a ? "#9d80f0" : T.textSub,
    background: a ? "rgba(75,108,247,0.1)" : "none",
    border:     a ? "1px solid rgba(123,92,229,0.35)" : "1px solid transparent",
    transition: "all 0.2s",
  }),
  navRight: { marginLeft: "auto", display: "flex", gap: "7px", alignItems: "center" },
  btnGhost: {
    padding: "5px 12px", borderRadius: "7px", fontSize: "11px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
    border: "1px solid rgba(123,92,229,0.25)",
    background: T.bg2, color: T.textSub, transition: "all 0.2s",
  },
  btnAccent: {
    padding: "5px 16px", borderRadius: "7px", fontSize: "11px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
    background: "linear-gradient(135deg,#4B6CF7,#9B59E8)",
    border: "none", color: "#fff", fontWeight: 600, transition: "all 0.2s",
    boxShadow: "0 2px 12px rgba(75,108,247,0.35)",
  },
  avatar: {
    width: "30px", height: "30px", borderRadius: "50%",
    background: "linear-gradient(135deg,#4B6CF7,#E040FB)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: 700, color: "#fff", cursor: "pointer",
    boxShadow: "0 2px 8px rgba(75,108,247,0.4)",
  },

  // ── TOOLBAR ──
  toolbar: {
    height: "42px", background: T.bg1,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    display: "flex", alignItems: "center",
    padding: "0 12px", gap: "6px", flexShrink: 0,
  },
  viewPill: { display: "flex", background: T.bg3, borderRadius: "7px", padding: "2px", gap: "1px" },
  viewBtn: (a) => ({
    padding: "4px 11px", borderRadius: "5px", fontSize: "11px", cursor: "pointer",
    color:      a ? "#fff" : T.textDim,
    background: a ? "linear-gradient(135deg,#4B6CF7,#9B59E8)" : "none",
    border:     "none",
    fontFamily: "'DM Sans',sans-serif",
    fontWeight: a ? 600 : 400, transition: "all 0.2s",
    boxShadow:  a ? "0 1px 6px rgba(75,108,247,0.4)" : "none",
  }),
  envBtn: (a) => ({
    padding: "4px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer",
    color:      a ? "#9d80f0" : T.textDim,
    border:     a ? "1px solid rgba(123,92,229,0.4)" : "1px solid transparent",
    background: a ? "rgba(75,108,247,0.1)" : "none",
    fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
  }),
  qualBadge: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "4px 10px", borderRadius: "7px",
    background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.25)",
  },
  qualNum:  { fontFamily: "'Nunito',sans-serif", fontSize: "16px", fontWeight: 700, color: T.success },
  qualText: { fontSize: "9px", color: T.success, lineHeight: 1.3 },

  // ── MAIN ──
  main: { display: "flex", flex: 1, overflow: "hidden" },

  // ── LEFT PANEL ──
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
    display: "flex", alignItems: "center", gap: "7px",
    transition: "all 0.15s",
    borderLeft: active ? `2px solid ${T.accent}` : "2px solid transparent",
    background:  active ? "linear-gradient(90deg,rgba(75,108,247,0.1),transparent)" : "transparent",
  }),
  treeIcon: (kind) => ({
    width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px",
    background:
      kind === "gem"     ? "rgba(75,108,247,0.2)" :
      kind === "prong"   ? "rgba(155,89,232,0.15)" :
      kind === "setting" ? "rgba(224,64,251,0.12)" :
                           "rgba(123,92,229,0.15)",
    color:
      kind === "gem"     ? "#7b9ff9" :
      kind === "prong"   ? "#b38ef0" :
      kind === "setting" ? "#d97af5" :
                           "#9d80f0",
  }),
  treeLabel: { fontSize: "12px", fontWeight: 500, color: T.text },
  treeMeta:  { marginLeft: "auto", fontSize: "10px", color: T.textDim },
  treeProp:  {
    display: "flex", justifyContent: "space-between",
    padding: "2px 12px 2px 30px", fontSize: "10px",
  },

  // ── VIEWPORT ──
  viewport: {
    flex: 1, background: T.bg0,
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column",
  },
  vpInner: { flex: 1, position: "relative", overflow: "hidden" },
  vpCtrls: {
    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
    display: "flex", flexDirection: "column", gap: "6px", zIndex: 5,
  },
  vpCtrl: {
    width: "30px", height: "30px",
    background: "rgba(9,9,15,0.85)",
    border: "1px solid rgba(123,92,229,0.2)",
    borderRadius: "7px",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: T.textSub, fontSize: "14px", transition: "all 0.2s",
  },
  toast: {
    position: "absolute", bottom: "90px", left: "50%", transform: "translateX(-50%)",
    background: "rgba(75,108,247,0.12)",
    border: "1px solid rgba(123,92,229,0.4)",
    color: "#9d80f0",
    padding: "7px 16px", borderRadius: "8px",
    fontSize: "12px", pointerEvents: "none", zIndex: 20, whiteSpace: "nowrap",
    animation: "fadeIn 0.2s ease",
    backdropFilter: "blur(6px)",
  },
  versionBar: {
    height: "72px",
    background: `linear-gradient(to top,${T.bg1},transparent)`,
    padding: "0 14px 10px",
    display: "flex", alignItems: "flex-end", gap: "10px", flexShrink: 0,
  },
  vhLabel: {
    fontSize: "9px", color: T.textDim, letterSpacing: "1px",
    display: "flex", alignItems: "center", gap: "5px", marginRight: "4px",
  },
  vThumb: (a) => ({
    width: "50px", height: "50px", borderRadius: "8px",
    background: T.bg3,
    border: a ? `1px solid ${T.accent}` : "1px solid rgba(123,92,229,0.15)",
    boxShadow: a ? "0 0 8px rgba(123,92,229,0.3)" : "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden",
  }),
};

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
    ["Type", comp.materialOverrides?.gemType  || comp.type || "diamond"],
    ["Cut",  comp.geometry?.cut               || "round"],
    ["Size", comp.geometry?.caratSize         || "1ct"],
  ];
  if (["prong","prongs"].includes(t)) return [
    ["Count",  comp.geometry?.prongCount  || 4],
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
  const comps = jewelryJSON?.components || [];
  const isExp = (id) => expanded[id] !== false;

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
                style={{
                  fontSize: "8px", color: T.textDim, cursor: "pointer",
                  width: "8px", flexShrink: 0, display: "inline-block",
                  transition: "transform 0.2s",
                  transform: isExp(comp.id) ? "rotate(90deg)" : "none",
                }}
                onClick={(e) => { e.stopPropagation(); setExpanded(p => ({ ...p, [comp.id]: !p[comp.id] })); }}
              >▶</span>
              <div style={S.treeIcon(kind)}>{getIconChar(comp.type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.treeLabel}>{comp.name || comp.id}</div>
              </div>
              <div style={S.treeMeta}>{meta}</div>
            </div>
            {isExp(comp.id) && props.map(([k, v]) => (
              <div key={k} style={S.treeProp}>
                <span style={{ color: T.textDim }}>{k}</span>
                <span style={{ color: T.textSub }}>{String(v)}</span>
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
  const [jewelryJSON, setJewelryJSON] = useState(null);
  const [selectedId,  setSelectedId]  = useState(null);
  const [navTab,      setNavTab]      = useState("Designer");
  const [viewMode,    setViewMode]    = useState("Pbr");
  const [envMode,     setEnvMode]     = useState("Studio");
  const [toast,       setToast]       = useState(null);
  const [versionList, setVersionList] = useState([]);
  const toastTimer = useRef(null);
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

  const showToast = useCallback((msg, ms = 2200) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  const handleSave = useCallback(() => {
    if (!jewelryJSON || !designId) return;
    const str = JSON.stringify(jewelryJSON);
    localStorage.setItem(`design_${designId}_level2`, str);
    localStorage.setItem(`design_${designId}_level1`, str);
    showToast("✓ Design saved");
  }, [jewelryJSON, designId, showToast]);

  const handleQuickAction = useCallback((action) => {
    const a = action.toLowerCase();
    setJewelryJSON((prev) => {
      if (!prev) return prev;
      const components = prev.components.map((comp) => {
        const copy = {
          ...comp,
          materialOverrides: { ...(comp.materialOverrides || {}) },
          geometry:          { ...(comp.geometry          || {}) },
        };
        const ctype  = (comp.type||"").toLowerCase();
        const isGem  = ["gem","diamond","stone","gemstone","center_stone"].includes(ctype);
        const isMetal = ["band","ring","shank","prong","prongs","setting","basket"].includes(ctype);

        if (isMetal) {
          if (a.includes("rose gold"))   { copy.materialOverrides.color = METAL_COLORS.rose_gold;   copy.materialOverrides.metalType = "rose_gold";   }
          if (a.includes("white gold"))  { copy.materialOverrides.color = METAL_COLORS.white_gold;  copy.materialOverrides.metalType = "white_gold";  }
          if (a.includes("platinum"))    { copy.materialOverrides.color = METAL_COLORS.platinum;    copy.materialOverrides.metalType = "platinum";    }
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
    showToast("✓ " + action);
  }, [showToast]);

  // ── No design loaded ────────────────────────────────────────────────────
  if (!jewelryJSON) {
    return (
      <div style={{ ...S.app, alignItems: "center", justifyContent: "center" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ textAlign: "center" }}>
          {/* Logo centered */}
          <img src="assets/logo.png" alt="GeminAI" style={{ height: "70px", marginBottom: "10px", opacity: 0.9 }} />
          <div style={{ fontSize: "13px", color: T.textSub, marginBottom: "8px" }}>No design loaded</div>
          <div style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.7 }}>
            Use the Upload modal to detect &amp; create a model,<br />
            or set <code style={{ color: T.accentLight }}>currentDesignId</code> in localStorage.
          </div>
        </div>
      </div>
    );
  }

  const VIEW_MODES = ["Pbr", "Clay", "Wireframe"];
  const ENV_MODES  = ["Studio"];
  const NAV_TABS   = ["Designer Studio"];

  return (
    <div style={S.app}>
      <style>{GLOBAL_CSS}</style>

      {/* ── TOP NAV ── */}
      <nav style={S.nav}>
        {/* Logo — real PNG from assets */}
        <div style={S.logo}>
          <img src="/assets/logo.png" alt="GeminAI" style={S.logoImg} />
        </div>

        <div style={S.navDiv} />

        {NAV_TABS.map((t) => (
          <button key={t} style={S.navTab(navTab === t)} onClick={() => setNavTab(t)}>{t}</button>
        ))}

        <div style={S.navRight}>
          {["AR Try‑On", "Capture", "Export", "Package"].map((b) => (
            <button key={b} style={S.btnGhost}>{b}</button>
          ))}
          <button style={S.btnAccent} onClick={handleSave}>Save</button>
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
        <div style={{ display: "flex", gap: "3px" }}>
          {ENV_MODES.map((m) => (
            <button key={m} style={S.envBtn(envMode === m)} onClick={() => setEnvMode(m)}>{m}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <div style={S.qualBadge}>
            <div style={S.qualNum}>93</div>
            <div style={S.qualText}>READY FOR PRODUCTION?<br /><strong>High Precision</strong></div>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={S.main}>

        {/* LEFT: Component Tree */}
        <div style={S.leftPanel}>
          <div style={S.panelHdr}>Component Tree</div>
          <ComponentTree
            jewelryJSON={jewelryJSON}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              const comp = jewelryJSON.components.find((c) => c.id === id);
              if (comp) showToast(`Selected: ${comp.name || id}`);
            }}
          />
        </div>

        {/* CENTER: Viewport */}
        <div style={S.viewport}>
          <div style={S.vpInner}>
            <ModelRenderer
              jewelryJSON={jewelryJSON}
              selectedId={selectedId}
              setSelectedId={(id) => {
                setSelectedId(id);
                if (id) {
                  const comp = jewelryJSON.components.find((c) => c.id === id);
                  showToast(`Selected: ${comp?.name || id}`);
                }
              }}
              viewMode={viewMode}
              envMode={envMode}
            />

            <div style={S.vpCtrls}>
              {[{ icon: "+", title: "Zoom in" }, { icon: "−", title: "Zoom out" }, { icon: "⟳", title: "Reset" }, { icon: "⊞", title: "Fit" }].map((c) => (
                <div key={c.icon} className="vctrl-btn" style={S.vpCtrl} title={c.title}>{c.icon}</div>
              ))}
            </div>

            {toast && <div style={S.toast}>{toast}</div>}
          </div>

          {/* Version bar */}
          <div style={S.versionBar}>
            <div style={S.vhLabel}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" />
              </svg>
              Version History
              <span style={{ background: "rgba(123,92,229,0.2)", color: "#9d80f0", fontSize: "9px", padding: "1px 7px", borderRadius: "4px" }}>
                {versionList.length} version{versionList.length !== 1 ? "s" : ""}
              </span>
            </div>
            {versionList.map((v, i) => (
              <div key={i} style={S.vThumb(i === versionList.length - 1)}
                onClick={() => { setJewelryJSON(v.data); showToast(`Restored ${v.label}`); }}>
                <svg width="30" height="30" viewBox="0 0 32 32">
                  <ellipse cx="16" cy="22" rx="11" ry="3.5" fill="none" stroke="#7B5CE5" strokeWidth="3" />
                  <polygon points="16,8 20,14 16,18 12,14" fill="#9d80f0" opacity="0.9" />
                </svg>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", fontSize: "8px", textAlign: "center", padding: "1px", color: T.textSub }}>{v.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Control Panel */}
        <ControlPanel
          selectedId={selectedId}
          jewelryJSON={jewelryJSON}
          setJewelryJSON={setJewelryJSON}
          setSelectedId={setSelectedId}
          designId={designId}
          onQuickAction={handleQuickAction}
        />
      </div>
    </div>
  );
}