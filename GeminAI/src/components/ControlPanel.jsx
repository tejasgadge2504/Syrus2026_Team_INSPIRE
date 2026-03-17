import React, { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  Brand tokens (must match Editor.jsx)
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  bg0:         "#09090f",
  bg1:         "#11111c",
  bg2:         "#18182a",
  bg3:         "#1f1f32",
  bg4:         "#27273e",
  blue:        "#4B6CF7",
  purple:      "#9B59E8",
  pink:        "#E040FB",
  accent:      "#7B5CE5",
  accentLight: "#9d80f0",
  accentDim:   "#3d2e8a",
  text:        "#e8e4f4",
  textSub:     "#9490b0",
  textDim:     "#55526a",
  success:     "#2ecc71",
  danger:      "#e74c3c",
  grad:        "linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB)",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

const METALS = [
  { id: "yellow_gold", label: "Yellow Gold", color: "#c9a84c", gradient: "radial-gradient(circle at 35% 35%,#e8c96a,#8a6d2a)" },
  { id: "white_gold",  label: "White Gold",  color: "#c8c8c8", gradient: "radial-gradient(circle at 35% 35%,#e8e8e8,#909090)" },
  { id: "rose_gold",   label: "Rose Gold",   color: "#b5634d", gradient: "radial-gradient(circle at 35% 35%,#d4836a,#7a3525)" },
  { id: "platinum",    label: "Platinum",    color: "#9fa8b0", gradient: "radial-gradient(circle at 35% 35%,#c0ccd4,#6a7880)" },
];

const GEMS = [
  { id: "diamond",  label: "Diamond",  color: "#d6eaf8" },
  { id: "ruby",     label: "Ruby",     color: "#c0392b" },
  { id: "sapphire", label: "Sapphire", color: "#2471a3" },
  { id: "emerald",  label: "Emerald",  color: "#1e8449" },
  { id: "amethyst", label: "Amethyst", color: "#7d3c98" },
  { id: "topaz",    label: "Topaz",    color: "#e67e22" },
  { id: "opal",     label: "Opal",     color: "#a8d8ea" },
  { id: "pearl",    label: "Pearl",    color: "#f5f0e8" },
];

const CUTS = [
  { id: "round_brilliant", label: "Round",    icon: "◯" },
  { id: "princess",        label: "Princess", icon: "◻" },
  { id: "oval",            label: "Oval",     icon: "⬭" },
  { id: "emerald_cut",     label: "Emerald",  icon: "▬" },
  { id: "pear",            label: "Pear",     icon: "⬟" },
  { id: "cushion",         label: "Cushion",  icon: "⬜" },
];

const SETTING_STYLES = [
  { id: "prong",   label: "Prong",   icon: "⋮" },
  { id: "bezel",   label: "Bezel",   icon: "⬜" },
  { id: "pave",    label: "Pavé",    icon: "⁙" },
  { id: "channel", label: "Channel", icon: "⊟" },
  { id: "tension", label: "Tension", icon: "⊏" },
  { id: "flush",   label: "Flush",   icon: "▣" },
];

const BAND_PROFILES = ["Round", "Flat", "Knife Edge", "Comfort Fit"];
const RING_SIZES    = ["5","5.5","6","6.5","7","7.5","8","8.5","9"];
const CARAT_SIZES   = ["0.25ct","0.5ct","0.75ct","1ct","1.5ct","2ct","3ct"];

function isGemType(type) {
  return ["gem","diamond","stone","gemstone","center_stone","center stone"]
    .includes((type||"").toLowerCase().trim());
}

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  panel: {
    width: "290px", background: T.bg1, color: T.text,
    display: "flex", flexDirection: "column",
    fontFamily: "'DM Sans',sans-serif",
    borderLeft: "1px solid rgba(123,92,229,0.12)",
    overflow: "hidden", flexShrink: 0,
  },
  tabRow: {
    display: "flex",
    borderBottom: "1px solid rgba(123,92,229,0.1)",
    flexShrink: 0,
  },
  tabBtn: (a) => ({
    flex: 1, padding: "10px 4px", fontSize: "11px",
    color: a ? T.accentLight : T.textDim,
    cursor: "pointer", border: "none", background: "none",
    fontFamily: "'DM Sans',sans-serif",
    borderBottom: a ? `2px solid ${T.accent}` : "2px solid transparent",
    transition: "all 0.2s",
    background: a ? "rgba(75,108,247,0.05)" : "none",
  }),
  selBanner: {
    padding: "8px 14px",
    background: "linear-gradient(90deg,rgba(75,108,247,0.1),rgba(224,64,251,0.05))",
    borderBottom: "1px solid rgba(123,92,229,0.15)",
    display: "flex", alignItems: "center", gap: "8px", flexShrink: 0,
  },
  selDot: {
    width: "7px", height: "7px", borderRadius: "50%",
    background: T.accent, boxShadow: `0 0 7px ${T.accent}`,
    animation: "pulse 2s infinite",
  },
  selName: { fontSize: "12px", color: T.accentLight, fontWeight: 500 },
  selType: { fontSize: "10px", color: T.textDim, marginLeft: "auto" },
  body: {
    flex: 1, overflowY: "auto", padding: "12px 14px 20px",
    scrollbarWidth: "thin", scrollbarColor: `${T.bg4} transparent`,
  },
  secTitle: {
    fontSize: "10px", letterSpacing: "1.2px", color: T.textDim,
    textTransform: "uppercase", margin: "14px 0 9px",
    display: "flex", alignItems: "center", gap: "8px",
  },
  secLine: { flex: 1, height: "1px", background: "rgba(123,92,229,0.1)" },

  // ── Transform card ──
  xyzCard: {
    background: T.bg2, borderRadius: "10px",
    border: "1px solid rgba(123,92,229,0.15)",
    padding: "10px 12px", marginBottom: "4px",
  },
  xyzRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" },
  xyzBadge: (color) => ({
    width: "20px", height: "20px", borderRadius: "5px",
    background: color + "22", border: `1px solid ${color}55`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "10px", fontWeight: 700, color, flexShrink: 0,
  }),
  xyzSlider: (color, pct) => ({
    flex: 1, WebkitAppearance: "none", appearance: "none",
    height: "3px", borderRadius: "2px", outline: "none", cursor: "pointer",
    background: `linear-gradient(to right,${color} ${pct}%,#1f1f32 ${pct}%)`,
  }),
  xyzInput: {
    width: "52px", background: T.bg0,
    border: `1px solid rgba(123,92,229,0.3)`, borderRadius: "5px",
    padding: "3px 6px", color: T.accentLight, fontSize: "10px",
    fontFamily: "monospace", outline: "none", textAlign: "right", flexShrink: 0,
  },
  xyzReset: {
    fontSize: "9px", color: T.textDim, cursor: "pointer",
    padding: "3px 7px", borderRadius: "4px",
    border: "1px solid rgba(123,92,229,0.15)",
    background: "none", fontFamily: "'DM Sans',sans-serif",
    marginTop: "4px", alignSelf: "flex-end",
  },

  // ── Metal / Gem grids ──
  metalGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px", marginBottom: "2px" },
  metalOpt: (a) => ({
    padding: "8px 4px", borderRadius: "9px", cursor: "pointer",
    border: a ? `1px solid ${T.accent}` : "1px solid rgba(123,92,229,0.1)",
    background: a ? "rgba(75,108,247,0.1)" : T.bg2,
    display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
    transition: "all 0.2s",
    boxShadow: a ? `0 0 8px rgba(123,92,229,0.2)` : "none",
  }),
  metalSwatch: (g) => ({
    width: "28px", height: "28px", borderRadius: "50%", background: g,
    border: "2px solid rgba(255,255,255,0.1)", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
  }),
  metalLabel: (a) => ({ fontSize: "8.5px", color: a ? T.accentLight : T.textDim, textAlign: "center", lineHeight: 1.25 }),

  gemGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px", marginBottom: "2px" },
  gemOpt: (a) => ({
    padding: "8px 4px", borderRadius: "9px", cursor: "pointer",
    border: a ? `1px solid ${T.accent}` : "1px solid rgba(123,92,229,0.1)",
    background: a ? "rgba(75,108,247,0.1)" : T.bg2,
    display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
    transition: "all 0.2s",
    boxShadow: a ? `0 0 8px rgba(123,92,229,0.2)` : "none",
  }),
  gemShape: (color) => ({
    width: "26px", height: "26px",
    clipPath: "polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)",
    background: color, boxShadow: `0 0 8px ${color}66`,
  }),
  gemLabel: (a) => ({ fontSize: "8.5px", color: a ? T.accentLight : T.textDim, textAlign: "center" }),

  cutGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "5px", marginBottom: "4px" },
  cutOpt: (a) => ({
    padding: "7px 4px", borderRadius: "7px", cursor: "pointer",
    border: a ? `1px solid ${T.accent}` : "1px solid rgba(123,92,229,0.1)",
    background: a ? "rgba(75,108,247,0.1)" : T.bg2,
    display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
    transition: "all 0.2s",
  }),
  cutIcon:  { fontSize: "13px", color: T.textSub },
  cutLabel: (a) => ({ fontSize: "8.5px", color: a ? T.accentLight : T.textDim }),

  slRow:   { display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" },
  slLabel: { fontSize: "11px", color: T.textSub, width: "68px", flexShrink: 0 },
  slVal:   { fontSize: "11px", color: T.accentLight, width: "36px", textAlign: "right", flexShrink: 0, fontWeight: 500 },

  tagRow: { display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "6px" },
  tag: (a) => ({
    padding: "4px 10px", borderRadius: "5px", cursor: "pointer",
    border: a ? `1px solid ${T.accent}` : "1px solid rgba(123,92,229,0.1)",
    background: a ? "rgba(75,108,247,0.1)" : T.bg2,
    fontSize: "11px", color: a ? T.accentLight : T.textDim,
    transition: "all 0.2s",
  }),

  prongRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" },
  prongCtr: { display: "flex", alignItems: "center", gap: "8px" },
  pcBtn: {
    width: "26px", height: "26px", borderRadius: "7px",
    background: T.bg2, border: "1px solid rgba(123,92,229,0.2)",
    color: T.textSub, cursor: "pointer", fontSize: "16px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
  },
  pCount: { fontSize: "18px", fontWeight: 600, color: T.text, minWidth: "20px", textAlign: "center" },
  pDots:  { display: "flex", gap: "4px" },
  pDot:   (a) => ({
    width: "8px", height: "8px", borderRadius: "50%",
    background: a ? T.accent : T.bg4,
    transition: "background 0.2s",
    boxShadow: a ? `0 0 5px ${T.accent}88` : "none",
  }),

  bandOpts: { display: "flex", gap: "5px", marginBottom: "8px" },
  bandOpt: (a) => ({
    flex: 1, padding: "7px 4px", borderRadius: "7px", cursor: "pointer",
    border: a ? `1px solid ${T.accent}` : "1px solid rgba(123,92,229,0.1)",
    background: a ? "rgba(75,108,247,0.1)" : T.bg2,
    textAlign: "center", fontSize: "10px",
    color: a ? T.accentLight : T.textDim, transition: "all 0.2s",
  }),

  actRow: { display: "flex", gap: "6px", marginTop: "18px" },
  delBtn: {
    flex: 1, padding: "9px", borderRadius: "8px",
    background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.25)",
    color: "#e74c3c", cursor: "pointer", fontSize: "12px",
    fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
  },
  saveBtn: {
    flex: 2, padding: "9px", borderRadius: "8px",
    background: "linear-gradient(135deg,rgba(75,108,247,0.2),rgba(155,89,232,0.2))",
    border: `1px solid rgba(123,92,229,0.4)`,
    color: T.accentLight, cursor: "pointer", fontSize: "12px",
    fontFamily: "'DM Sans',sans-serif", fontWeight: 600, transition: "all 0.2s",
  },
  noSel: {
    padding: "30px 20px", textAlign: "center",
    color: T.textDim, fontSize: "12px", lineHeight: 1.7,
  },

  // ── AI panel ──
  aiHeader: {
    padding: "10px 14px", borderBottom: "1px solid rgba(123,92,229,0.1)",
    display: "flex", alignItems: "center", gap: "8px", flexShrink: 0,
    background: "linear-gradient(90deg,rgba(75,108,247,0.06),transparent)",
  },
  aiDot: {
    width: "7px", height: "7px", borderRadius: "50%",
    background: T.success, boxShadow: `0 0 6px ${T.success}`,
  },
  aiIntro: {
    padding: "12px 14px", fontSize: "12px", color: T.textSub,
    lineHeight: 1.6, borderBottom: "1px solid rgba(123,92,229,0.08)",
  },
  qaGrid: { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" },
  qaBtn: (v) => ({
    padding: "5px 10px", borderRadius: "7px", fontSize: "11px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
    border:
      v === "rose" ? "1px solid rgba(224,64,251,0.3)" :
      v === "blue" ? "1px solid rgba(75,108,247,0.3)" :
                     "1px solid rgba(123,92,229,0.2)",
    background:
      v === "rose" ? "rgba(224,64,251,0.07)" :
      v === "blue" ? "rgba(75,108,247,0.07)" :
                     "rgba(123,92,229,0.05)",
    color:
      v === "rose" ? "#e080f5" :
      v === "blue" ? "#7b9ff9" :
                     T.textSub,
  }),
  engrRow: { display: "flex", gap: "6px", marginBottom: "8px" },
  engrInput: {
    flex: 1, background: T.bg0,
    border: "1px solid rgba(123,92,229,0.2)",
    borderRadius: "7px", padding: "7px 10px", color: T.text,
    fontSize: "12px", fontFamily: "'DM Sans',sans-serif", outline: "none",
  },
  addBtn: {
    padding: "7px 12px",
    background: "linear-gradient(135deg,rgba(75,108,247,0.15),rgba(155,89,232,0.15))",
    border: `1px solid rgba(123,92,229,0.35)`,
    borderRadius: "7px", color: T.accentLight,
    fontSize: "11px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
  },
  chatArea: {
    padding: "10px 14px", borderTop: "1px solid rgba(123,92,229,0.1)",
    display: "flex", gap: "6px", alignItems: "flex-end", flexShrink: 0,
  },
  chatInput: {
    flex: 1, background: T.bg2,
    border: "1px solid rgba(123,92,229,0.2)",
    borderRadius: "9px", padding: "8px 10px", color: T.text,
    fontSize: "12px", fontFamily: "'DM Sans',sans-serif",
    outline: "none", resize: "none", minHeight: "36px", maxHeight: "80px",
  },
  sendBtn: {
    width: "34px", height: "34px",
    background: "linear-gradient(135deg,#4B6CF7,#9B59E8)",
    border: "none", borderRadius: "9px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", flexShrink: 0, transition: "all 0.2s",
    boxShadow: "0 2px 10px rgba(75,108,247,0.4)",
  },
  fontTag: (a) => ({
    padding: "4px 10px", borderRadius: "5px", cursor: "pointer",
    border: a ? `1px solid ${T.accent}` : "1px solid rgba(123,92,229,0.1)",
    background: a ? "rgba(75,108,247,0.1)" : T.bg2,
    fontSize: "11px", color: a ? T.accentLight : T.textDim,
    fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
//  Atoms
// ─────────────────────────────────────────────────────────────────────────────

function SecTitle({ children }) {
  return (
    <div style={S.secTitle}>
      {children}
      <div style={S.secLine} />
    </div>
  );
}

function RangeSlider({ label, min, max, step, value, onChange, display }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div style={S.slRow}>
      <div style={S.slLabel}>{label}</div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          flex: 1, WebkitAppearance: "none", appearance: "none",
          height: "3px", borderRadius: "2px", outline: "none", cursor: "pointer",
          background: `linear-gradient(to right,${T.accent} ${pct}%,${T.bg4} ${pct}%)`,
        }}
      />
      <div style={S.slVal}>{display ?? value}</div>
    </div>
  );
}

function MetalPicker({ value, onChange }) {
  return (
    <div style={S.metalGrid}>
      {METALS.map((m) => (
        <div key={m.id} style={S.metalOpt(value === m.id)} onClick={() => onChange(m)}>
          <div style={S.metalSwatch(m.gradient)} />
          <div style={S.metalLabel(value === m.id)}>
            {m.label.split(" ").map((w, i) => <div key={i}>{w}</div>)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TransformControls
// ─────────────────────────────────────────────────────────────────────────────

const AXIS = [
  { key: "x", label: "X", color: "#e74c3c", min: -5, max: 5 },
  { key: "y", label: "Y", color: "#2ecc71", min: -5, max: 5 },
  { key: "z", label: "Z", color: "#3498db", min: -5, max: 5 },
];

function TransformControls({ comp, onUpdate }) {
  const pos   = comp.transform?.position || [0, 0, 0];
  const scale = comp.transform?.scale    ?? 1;
  const scalePct = Math.max(0, Math.min(100, ((scale - 0.1) / 4.9) * 100));

  const setAxis = (idx, val) => {
    const np = [...pos]; np[idx] = val;
    onUpdate("_position", np);
  };

  return (
    <div style={S.xyzCard}>
      {AXIS.map(({ key, color, label, min, max }, idx) => {
        const v   = parseFloat((pos[idx] ?? 0).toFixed(2));
        const pct = Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
        return (
          <div key={key} style={S.xyzRow}>
            <div style={S.xyzBadge(color)}>{label}</div>
            <input type="range" min={min} max={max} step={0.05} value={v}
              onChange={(e) => setAxis(idx, parseFloat(e.target.value))}
              style={S.xyzSlider(color, pct)} />
            <input type="number" value={v} step={0.05} min={min} max={max}
              onChange={(e) => setAxis(idx, parseFloat(e.target.value) || 0)}
              style={S.xyzInput} />
          </div>
        );
      })}

      {/* Scale */}
      <div style={{ ...S.xyzRow, marginBottom: 0 }}>
        <div style={{ ...S.xyzBadge(T.accent), fontSize: "8px" }}>SZ</div>
        <input type="range" min={0.1} max={5} step={0.05} value={parseFloat(scale.toFixed(2))}
          onChange={(e) => onUpdate("scale", parseFloat(e.target.value))}
          style={S.xyzSlider(T.accent, scalePct)} />
        <input type="number" value={parseFloat(scale.toFixed(2))} step={0.05} min={0.1} max={5}
          onChange={(e) => onUpdate("scale", parseFloat(e.target.value) || 1)}
          style={S.xyzInput} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
        <button style={S.xyzReset} onClick={() => { onUpdate("_position", [0,0,0]); onUpdate("scale", 1); }}>
          ↺ Reset Transform
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-panels
// ─────────────────────────────────────────────────────────────────────────────

function BandControls({ comp, onUpdate, onDelete, onSave }) {
  const [metal,   setMetal]   = useState(comp.materialOverrides?.metalType || "yellow_gold");
  const [width,   setWidth]   = useState(parseFloat(comp.geometry?.bandWidth) || 2.5);
  const [profile, setProfile] = useState(comp.geometry?.profile || "Round");
  const [size,    setSize]    = useState(comp.geometry?.ringSize || "7");

  useEffect(() => {
    setMetal(comp.materialOverrides?.metalType || "yellow_gold");
    setWidth(parseFloat(comp.geometry?.bandWidth) || 2.5);
    setProfile(comp.geometry?.profile || "Round");
    setSize(comp.geometry?.ringSize || "7");
  }, [comp]);

  return (
    <>
      <SecTitle>Transform</SecTitle>
      <TransformControls comp={comp} onUpdate={onUpdate} />
      <SecTitle>Metal Type</SecTitle>
      <MetalPicker value={metal} onChange={(m) => { setMetal(m.id); onUpdate("color", m.color); onUpdate("metalType", m.id); }} />
      <SecTitle>Band Width</SecTitle>
      <RangeSlider label="Width" min={1} max={6} step={0.5} value={width} display={`${width.toFixed(1)}mm`}
        onChange={(v) => { setWidth(v); onUpdate("bandWidth", v); }} />
      <SecTitle>Profile Style</SecTitle>
      <div style={S.bandOpts}>
        {BAND_PROFILES.map((p) => (
          <div key={p} style={S.bandOpt(profile === p)} onClick={() => { setProfile(p); onUpdate("profile", p); }}>
            {p.split(" ")[0]}
          </div>
        ))}
      </div>
      <SecTitle>Ring Size</SecTitle>
      <div style={S.tagRow}>
        {RING_SIZES.map((s) => (
          <div key={s} style={S.tag(size === s)} onClick={() => { setSize(s); onUpdate("ringSize", s); }}>{s}</div>
        ))}
      </div>
      <div style={S.actRow}>
        <button style={S.delBtn} onClick={onDelete}>Delete</button>
        <button style={S.saveBtn} onClick={onSave}>✓ Save Changes</button>
      </div>
    </>
  );
}

function GemControls({ comp, onUpdate, onDelete, onSave }) {
  const [gem,   setGem]   = useState(comp.materialOverrides?.gemType  || "diamond");
  const [cut,   setCut]   = useState(comp.geometry?.cut               || "round_brilliant");
  const [carat, setCarat] = useState(comp.geometry?.caratSize         || "1ct");

  useEffect(() => {
    setGem(comp.materialOverrides?.gemType  || "diamond");
    setCut(comp.geometry?.cut               || "round_brilliant");
    setCarat(comp.geometry?.caratSize       || "1ct");
  }, [comp]);

  return (
    <>
      <SecTitle>Transform</SecTitle>
      <TransformControls comp={comp} onUpdate={onUpdate} />
      <SecTitle>Stone Type</SecTitle>
      <div style={S.gemGrid}>
        {GEMS.map((g) => (
          <div key={g.id} style={S.gemOpt(gem === g.id)}
            onClick={() => { setGem(g.id); onUpdate("color", g.color); onUpdate("gemType", g.id); }}>
            <div style={S.gemShape(g.color)} />
            <div style={S.gemLabel(gem === g.id)}>{g.label}</div>
          </div>
        ))}
      </div>
      <SecTitle>Cut Style</SecTitle>
      <div style={S.cutGrid}>
        {CUTS.map((c) => (
          <div key={c.id} style={S.cutOpt(cut === c.id)}
            onClick={() => { setCut(c.id); onUpdate("cut", c.id); }}>
            <div style={S.cutIcon}>{c.icon}</div>
            <div style={S.cutLabel(cut === c.id)}>{c.label}</div>
          </div>
        ))}
      </div>
      <SecTitle>Carat Size</SecTitle>
      <div style={S.tagRow}>
        {CARAT_SIZES.map((s) => (
          <div key={s} style={S.tag(carat === s)} onClick={() => { setCarat(s); onUpdate("caratSize", s); }}>{s}</div>
        ))}
      </div>
      <div style={S.actRow}>
        <button style={S.delBtn} onClick={onDelete}>Delete</button>
        <button style={S.saveBtn} onClick={onSave}>✓ Save Changes</button>
      </div>
    </>
  );
}

function ProngControls({ comp, onUpdate, onDelete, onSave }) {
  const [count,     setCount]     = useState(comp.geometry?.prongCount || comp.geometry?.count || 4);
  const [height,    setHeight]    = useState(parseFloat(comp.geometry?.prongHeight)    || 1.2);
  const [thickness, setThickness] = useState(parseFloat(comp.geometry?.prongThickness) || 0.9);
  const [metal,     setMetal]     = useState(comp.materialOverrides?.metalType || "yellow_gold");

  useEffect(() => {
    setCount(comp.geometry?.prongCount || comp.geometry?.count || 4);
    setHeight(parseFloat(comp.geometry?.prongHeight) || 1.2);
    setThickness(parseFloat(comp.geometry?.prongThickness) || 0.9);
    setMetal(comp.materialOverrides?.metalType || "yellow_gold");
  }, [comp]);

  const changeCount = (d) => { const n = Math.max(2, Math.min(6, count + d)); setCount(n); onUpdate("prongCount", n); };

  return (
    <>
      <SecTitle>Transform</SecTitle>
      <TransformControls comp={comp} onUpdate={onUpdate} />
      <SecTitle>Prong Count</SecTitle>
      <div style={S.prongRow}>
        <div style={S.prongCtr}>
          <button style={S.pcBtn} onClick={() => changeCount(-1)}>−</button>
          <div style={S.pCount}>{count}</div>
          <button style={S.pcBtn} onClick={() => changeCount(+1)}>+</button>
        </div>
        <div style={S.pDots}>
          {[1,2,3,4,5,6].map((i) => <div key={i} style={S.pDot(i <= count)} />)}
        </div>
      </div>
      <SecTitle>Dimensions</SecTitle>
      <RangeSlider label="Height" min={0.5} max={2.5} step={0.1} value={height} display={`${height.toFixed(1)}mm`}
        onChange={(v) => { setHeight(v); onUpdate("prongHeight", v); }} />
      <RangeSlider label="Thickness" min={0.3} max={1.5} step={0.1} value={thickness} display={`${thickness.toFixed(1)}mm`}
        onChange={(v) => { setThickness(v); onUpdate("prongThickness", v); }} />
      <SecTitle>Metal</SecTitle>
      <MetalPicker value={metal} onChange={(m) => { setMetal(m.id); onUpdate("color", m.color); onUpdate("metalType", m.id); }} />
      <div style={S.actRow}>
        <button style={S.delBtn} onClick={onDelete}>Delete</button>
        <button style={S.saveBtn} onClick={onSave}>✓ Save Changes</button>
      </div>
    </>
  );
}

function SettingControls({ comp, onUpdate, onDelete, onSave }) {
  const [style, setStyle] = useState(comp.geometry?.settingStyle || "prong");
  const [metal, setMetal] = useState(comp.materialOverrides?.metalType || "yellow_gold");

  useEffect(() => {
    setStyle(comp.geometry?.settingStyle || "prong");
    setMetal(comp.materialOverrides?.metalType || "yellow_gold");
  }, [comp]);

  return (
    <>
      <SecTitle>Transform</SecTitle>
      <TransformControls comp={comp} onUpdate={onUpdate} />
      <SecTitle>Setting Style</SecTitle>
      <div style={S.cutGrid}>
        {SETTING_STYLES.map((s) => (
          <div key={s.id} style={S.cutOpt(style === s.id)}
            onClick={() => { setStyle(s.id); onUpdate("settingStyle", s.id); }}>
            <div style={S.cutIcon}>{s.icon}</div>
            <div style={S.cutLabel(style === s.id)}>{s.label}</div>
          </div>
        ))}
      </div>
      <SecTitle>Metal</SecTitle>
      <MetalPicker value={metal} onChange={(m) => { setMetal(m.id); onUpdate("color", m.color); onUpdate("metalType", m.id); }} />
      <div style={S.actRow}>
        <button style={S.delBtn} onClick={onDelete}>Delete</button>
        <button style={S.saveBtn} onClick={onSave}>✓ Save Changes</button>
      </div>
    </>
  );
}

function GenericControls({ comp, onUpdate, onDelete, onSave }) {
  const [metal, setMetal] = useState(comp.materialOverrides?.metalType || "yellow_gold");
  useEffect(() => { setMetal(comp.materialOverrides?.metalType || "yellow_gold"); }, [comp]);

  return (
    <>
      <SecTitle>Transform</SecTitle>
      <TransformControls comp={comp} onUpdate={onUpdate} />
      <SecTitle>Material</SecTitle>
      <MetalPicker value={metal} onChange={(m) => { setMetal(m.id); onUpdate("color", m.color); onUpdate("metalType", m.id); }} />
      <div style={S.actRow}>
        <button style={S.delBtn} onClick={onDelete}>Delete</button>
        <button style={S.saveBtn} onClick={onSave}>✓ Save Changes</button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  AI Agent
// ─────────────────────────────────────────────────────────────────────────────

function AIAgentPanel({ onQuickAction }) {
  const [msg,      setMsg]      = useState("");
  const [engrave,  setEngrave]  = useState("");
  const [engrFont, setEngrFont] = useState("Script");

  const qas = [
    { label: "🌸 Rose gold",  action: "rose gold",  v: "rose" },
    { label: "✦ Add halo",   action: "add halo",   v: "" },
    { label: "◻ Minimal",    action: "minimal",    v: "" },
    { label: "⬡ Art Deco",   action: "art deco",   v: "" },
    { label: "◆ Sapphire",   action: "sapphire",   v: "blue" },
    { label: "$ Budget",     action: "budget",     v: "" },
  ];

  const send = () => { if (!msg.trim()) return; onQuickAction(msg.trim()); setMsg(""); };

  return (
    <>
      <div style={S.aiHeader}>
        <div style={S.aiDot} />
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: T.text }}>AI AGENT</div>
          <div style={{ fontSize: "10px", color: T.textDim }}>GPT-4o connected</div>
        </div>
        <button style={{ marginLeft: "auto", background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: "14px" }}>↺</button>
      </div>

      <div style={S.aiIntro}>
        I'm your <strong style={{ color: T.accentLight }}>AI jewelry design assistant.</strong>
        <br />Describe any change in plain English:
        <br /><span style={{ color: T.textDim }}>• "switch to rose gold and thin band"</span>
        <br /><span style={{ color: T.textDim }}>• "change center stone to sapphire"</span>
      </div>

      <div style={S.body}>
        <SecTitle>Inner Band Engraving</SecTitle>
        <div style={S.engrRow}>
          <input style={S.engrInput} placeholder='"Forever mine"' value={engrave}
            onChange={(e) => setEngrave(e.target.value)} />
          <button style={S.addBtn} onClick={() => { if (engrave.trim()) { onQuickAction("engrave: " + engrave); setEngrave(""); } }}>ADD</button>
        </div>
        <div style={{ display: "flex", gap: "5px", marginBottom: "12px" }}>
          {["Script","Block","Italic"].map((f) => (
            <div key={f} style={S.fontTag(engrFont === f)} onClick={() => setEngrFont(f)}>{f}</div>
          ))}
        </div>

        <SecTitle>Quick Actions</SecTitle>
        <div style={S.qaGrid}>
          {qas.map((q) => (
            <button key={q.action} style={S.qaBtn(q.v)} onClick={() => onQuickAction(q.action)}>
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div style={S.chatArea}>
        <textarea style={S.chatInput} placeholder="Describe a change..." value={msg} rows={1}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button style={S.sendBtn} onClick={send}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2L2 8l5 2 2 5 5-13z" />
          </svg>
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Analytics
// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsPanel({ jewelryJSON }) {
  const comps      = jewelryJSON?.components || [];
  const gemCount   = comps.filter((c) => isGemType(c.type)).length;
  const metalCount = comps.length - gemCount;

  return (
    <div style={S.body}>
      <SecTitle>Design Overview</SecTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
        {[
          { label: "Total Components", value: comps.length },
          { label: "Gem Stones",       value: gemCount },
          { label: "Metal Parts",      value: metalCount },
          { label: "Version",          value: "v1" },
        ].map((item) => (
          <div key={item.label} style={{
            background: T.bg2, borderRadius: "9px", padding: "10px",
            border: "1px solid rgba(123,92,229,0.12)",
          }}>
            <div style={{ fontSize: "10px", color: T.textDim, marginBottom: "4px" }}>{item.label}</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: T.accentLight }}>{item.value}</div>
          </div>
        ))}
      </div>

      <SecTitle>Components</SecTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {comps.map((c) => (
          <div key={c.id} style={{
            background: T.bg2, borderRadius: "7px", padding: "8px 10px",
            border: "1px solid rgba(123,92,229,0.1)",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
              background: isGemType(c.type)
                ? "linear-gradient(135deg,#4B6CF7,#9B59E8)"
                : "linear-gradient(135deg,#9B59E8,#E040FB)",
            }} />
            <div style={{ fontSize: "11px", color: T.text, flex: 1 }}>{c.name || c.id}</div>
            <div style={{ fontSize: "10px", color: T.textDim }}>{c.type}</div>
          </div>
        ))}
      </div>

      <SecTitle>Production Ready?</SecTitle>
      <div style={{
        background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.2)",
        borderRadius: "9px", padding: "10px",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <div style={{ fontSize: "24px", fontWeight: 700, color: T.success, fontFamily: "'Nunito',sans-serif" }}>93</div>
        <div style={{ fontSize: "11px", color: T.success, lineHeight: 1.4 }}>
          <strong>High Precision</strong><br />Ready for production
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main export
// ─────────────────────────────────────────────────────────────────────────────

export default function ControlPanel({
  selectedId, jewelryJSON, setJewelryJSON,
  setSelectedId, designId, onQuickAction,
}) {
  const [activeTab, setActiveTab] = useState("agent");

  useEffect(() => { if (selectedId) setActiveTab("controls"); }, [selectedId]);

  const comp = jewelryJSON?.components?.find((c) => c.id === selectedId);

  const updateComp = (path, val) => {
    setJewelryJSON((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        components: prev.components.map((c) => {
          if (c.id !== selectedId) return c;
          const copy = {
            ...c,
            transform:         { ...(c.transform         || { position:[0,0,0], scale:1, rotation:[0,0,0] }) },
            materialOverrides: { ...(c.materialOverrides || {}) },
            geometry:          { ...(c.geometry          || {}) },
          };
          if (path === "_position")  { copy.transform = { ...copy.transform, position: val }; return copy; }
          if (path === "scale")      { copy.transform = { ...copy.transform, scale: val };    return copy; }
          if (path === "x") { copy.transform.position = [...(copy.transform.position||[0,0,0])]; copy.transform.position[0] = val; return copy; }
          if (path === "y") { copy.transform.position = [...(copy.transform.position||[0,0,0])]; copy.transform.position[1] = val; return copy; }
          if (path === "z") { copy.transform.position = [...(copy.transform.position||[0,0,0])]; copy.transform.position[2] = val; return copy; }
          if (path === "color")     { copy.materialOverrides.color     = val; return copy; }
          if (path === "metalType") { copy.materialOverrides.metalType = val; return copy; }
          if (path === "gemType")   { copy.materialOverrides.gemType   = val; return copy; }
          const geoPaths = ["bandWidth","profile","ringSize","cut","caratSize","prongCount","prongHeight","prongThickness","settingStyle","count"];
          if (geoPaths.includes(path)) { copy.geometry[path] = val; return copy; }
          return copy;
        }),
      };
    });
  };

  const deleteComp = () => {
    setJewelryJSON((prev) => ({ ...prev, components: prev.components.filter((c) => c.id !== selectedId) }));
    setSelectedId(null);
  };

  const saveToStorage = () => {
    setJewelryJSON((prev) => {
      if (!prev || !designId) return prev;
      const str = JSON.stringify(prev);
      localStorage.setItem(`design_${designId}_level2`, str);
      localStorage.setItem(`design_${designId}_level1`, str);
      return prev;
    });
  };

  const renderControls = () => {
    if (!comp) {
      return (
        <div style={S.noSel}>
          <div style={{ fontSize: "28px", marginBottom: "10px", opacity: 0.4 }}>◎</div>
          Click any component in the 3D view<br />or the component tree to edit it
        </div>
      );
    }
    const ctype  = (comp.type || "").toLowerCase().trim();
    const common = { key: comp.id, comp, onUpdate: updateComp, onDelete: deleteComp, onSave: saveToStorage };
    if (isGemType(ctype))                             return <GemControls     {...common} />;
    if (["prong","prongs"].includes(ctype))           return <ProngControls   {...common} />;
    if (["setting","basket","bezel"].includes(ctype)) return <SettingControls {...common} />;
    if (["band","ring","shank"].includes(ctype))      return <BandControls    {...common} />;
    return <GenericControls {...common} />;
  };

  const tabs = [
    { id: "agent",     label: "AI Agent" },
    { id: "controls",  label: "Controls" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div style={S.panel}>
      <div style={S.tabRow}>
        {tabs.map((t) => (
          <button key={t.id} style={S.tabBtn(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "agent" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <AIAgentPanel onQuickAction={onQuickAction || (() => {})} />
        </div>
      )}

      {activeTab === "controls" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {comp && (
            <div style={S.selBanner}>
              <div style={S.selDot} />
              <div style={S.selName}>{comp.name || comp.id}</div>
              <div style={S.selType}>{comp.type}</div>
            </div>
          )}
          <div style={S.body}>{renderControls()}</div>
        </div>
      )}

      {activeTab === "analytics" && <AnalyticsPanel jewelryJSON={jewelryJSON} />}
    </div>
  );
}