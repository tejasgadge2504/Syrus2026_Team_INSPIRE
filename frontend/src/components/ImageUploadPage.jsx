import React, { useState, useRef, useCallback } from "react";

const FALLBACK_JSON = {
  scene: { jewelry_type: "ring", units: "normalized", version: "1.0" },
  components: [
    {
      id: "ring_band_01", name: "ring_band", render_type: "geometry",
      geometry: { type: "torus", radius: 1.3, tube: 0.12, radialSegments: 24, tubularSegments: 64 },
      materialOverrides: { metal: "silver", color: "#c0c0c0" },
      transform: { position: [0, -1.3, 0], rotation: [0, 0, 0], scale: 1 },
    },
    {
      id: "diamond_01", name: "diamond", render_type: "model",
      placement: { attach_to: "ring_band_01", mount_point: "top", offset: [0, 0, 0], overlap_depth: 0 },
      materialOverrides: { color: "#b9f0ff", gem_type: "diamond" },
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.6 },
    },
    {
      id: "prong_01", name: "prong", render_type: "geometry",
      geometry: { type: "cylinder", radius: 0.04, height: 0.5, radialSegments: 8, heightSegments: 1 },
      placement: { attach_to: "ring_band_01", mount_point: "top", offset: [0.45, 0.5, 0], overlap_depth: 0.05 },
      materialOverrides: { metal: "silver", color: "#c0c0c0" },
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
    },
  ],
};

const COMPONENT_ICONS = {
  ring_band: "◯", diamond: "◆", prong: "⌇", gem: "◈",
  band: "◯", stone: "◆", setting: "⌇", default: "◉",
};
const COMPONENT_COLORS = {
  ring_band: "#f59e0b", diamond: "#60a5fa", prong: "#a78bfa",
  gem: "#34d399", band: "#f59e0b", stone: "#60a5fa",
  setting: "#a78bfa", default: "#94a3b8",
};

function getIcon(name) {
  return COMPONENT_ICONS[name] || COMPONENT_ICONS.default;
}
function getColor(name) {
  return COMPONENT_COLORS[name] || COMPONENT_COLORS.default;
}

export default function ImageUploadPage({ onGenerate }) {
  const [dragOver, setDragOver] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [detectedJSON, setDetectedJSON] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setDetectedJSON(null);
    setStatus("idle");
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleDetect = async () => {
    if (!imageFile) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await fetch("http://localhost:5000/detect_jewelry_components", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setDetectedJSON(data);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message);
      setDetectedJSON(FALLBACK_JSON);
      setStatus("error");
    }
  };

  const json = detectedJSON || FALLBACK_JSON;

  return (
    <div style={styles.root}>
      {/* Animated background grid */}
      <div style={styles.gridBg} />
      <div style={styles.gradientOrb1} />
      <div style={styles.gradientOrb2} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoGem}>◆</span>
          <span style={styles.logoText}>Gemin<span style={styles.logoAccent}>AI</span></span>
        </div>
        <nav style={styles.nav}>
          <span style={styles.navItem}>Workspace</span>
          <span style={styles.navItem}>Gallery</span>
          <span style={styles.navItem}>Export</span>
        </nav>
        <div style={styles.headerRight}>
          <div style={styles.statusDot(status)} />
          <span style={styles.statusText}>
            {status === "idle" && "Ready"}
            {status === "loading" && "Analyzing..."}
            {status === "done" && "Detection Complete"}
            {status === "error" && "Using Fallback"}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <main style={styles.main}>
        {/* Left panel — upload */}
        <section style={styles.leftPanel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>INPUT</span>
            <h2 style={styles.panelTitle}>Image Source</h2>
          </div>

          {/* Drop zone */}
          <div
            style={styles.dropzone(dragOver, !!imagePreview)}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef} type="file" accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {imagePreview ? (
              <div style={styles.previewWrapper}>
                <img src={imagePreview} alt="preview" style={styles.previewImg} />
                <div style={styles.previewOverlay}>
                  <span style={styles.previewChange}>Click to change</span>
                </div>
              </div>
            ) : (
              <div style={styles.dropContent}>
                <div style={styles.dropIcon}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M20 8L20 28M12 20L20 28L28 20" stroke="#475569" strokeWidth="2" strokeLinecap="round"/>
                    <rect x="4" y="30" width="32" height="2" rx="1" fill="#475569"/>
                  </svg>
                </div>
                <p style={styles.dropTitle}>Drop jewelry image here</p>
                <p style={styles.dropSub}>PNG, JPG, WEBP · Up to 20MB</p>
              </div>
            )}
          </div>

          {/* Detect button */}
          <button
            style={styles.detectBtn(!!imageFile && status !== "loading")}
            onClick={handleDetect}
            disabled={!imageFile || status === "loading"}
          >
            {status === "loading" ? (
              <span style={styles.btnInner}>
                <span style={styles.spinner} />
                Analyzing Image...
              </span>
            ) : (
              <span style={styles.btnInner}>
                <span style={{ fontSize: "16px" }}>◈</span>
                Detect Components
              </span>
            )}
          </button>

          {status === "error" && (
            <div style={styles.errorBadge}>
              <span>⚠ API offline — using fallback design</span>
            </div>
          )}

          {/* Image info */}
          {imageFile && (
            <div style={styles.fileInfo}>
              <span style={styles.fileInfoLabel}>File</span>
              <span style={styles.fileInfoValue}>{imageFile.name}</span>
              <span style={styles.fileInfoLabel}>Size</span>
              <span style={styles.fileInfoValue}>{(imageFile.size / 1024).toFixed(0)} KB</span>
            </div>
          )}
        </section>

        {/* Center panel — components */}
        <section style={styles.centerPanel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>DETECTION</span>
            <h2 style={styles.panelTitle}>Components Found</h2>
          </div>

          {/* Scene meta */}
          {(status === "done" || status === "error") && (
            <div style={styles.sceneMeta}>
              <div style={styles.sceneMetaItem}>
                <span style={styles.sceneMetaLabel}>Type</span>
                <span style={styles.sceneMetaValue}>{json.scene?.jewelry_type?.toUpperCase() || "—"}</span>
              </div>
              <div style={styles.sceneMetaDivider} />
              <div style={styles.sceneMetaItem}>
                <span style={styles.sceneMetaLabel}>Components</span>
                <span style={styles.sceneMetaValue}>{json.components?.length || 0}</span>
              </div>
              <div style={styles.sceneMetaDivider} />
              <div style={styles.sceneMetaItem}>
                <span style={styles.sceneMetaLabel}>Version</span>
                <span style={styles.sceneMetaValue}>{json.scene?.version || "1.0"}</span>
              </div>
            </div>
          )}

          {/* Component cards */}
          <div style={styles.componentList}>
            {(status === "done" || status === "error")
              ? json.components?.map((comp, i) => (
                  <ComponentCard key={comp.id} comp={comp} index={i} />
                ))
              : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>◈</div>
                  <p style={styles.emptyText}>
                    {status === "loading"
                      ? "Scanning image for jewelry components..."
                      : "Upload an image and run detection to see components"}
                  </p>
                  {status === "loading" && (
                    <div style={styles.loadingBar}>
                      <div style={styles.loadingBarFill} />
                    </div>
                  )}
                </div>
              )
            }
          </div>
        </section>

        {/* Right panel — JSON + generate */}
        <section style={styles.rightPanel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>OUTPUT</span>
            <h2 style={styles.panelTitle}>Scene JSON</h2>
          </div>

          <div style={styles.jsonViewer}>
            <pre style={styles.jsonPre}>
              {(status === "done" || status === "error")
                ? JSON.stringify(json, null, 2)
                : "// Detection output will\n// appear here..."}
            </pre>
          </div>

          {/* Generate 3D button */}
          <button
            style={styles.generateBtn(status === "done" || status === "error")}
            onClick={() => onGenerate(detectedJSON || FALLBACK_JSON)}
            disabled={status !== "done" && status !== "error"}
          >
            <span style={styles.generateBtnInner}>
              <span style={styles.generateIcon}>⬡</span>
              <span>
                <span style={styles.generateBtnTitle}>Generate 3D Model</span>
                <span style={styles.generateBtnSub}>Open in 3D Sandbox →</span>
              </span>
            </span>
          </button>

          <p style={styles.generateHint}>
            {status === "idle" && "Detect components first to enable 3D generation"}
            {status === "loading" && "Detection in progress..."}
            {status === "done" && "Ready — click to open the 3D editor"}
            {status === "error" && "Using fallback — click to open 3D editor anyway"}
          </p>
        </section>
      </main>

      {/* Bottom status bar */}
      <footer style={styles.footer}>
        <span style={styles.footerItem}>GeminAI v1.0</span>
        <span style={styles.footerDot}>·</span>
        <span style={styles.footerItem}>AI-Powered Jewelry Design</span>
        <span style={styles.footerDot}>·</span>
        <span style={styles.footerItem}>
          API: <span style={{ color: status === "done" ? "#4ade80" : "#f59e0b" }}>localhost:5000</span>
        </span>
      </footer>

      <style>{keyframes}</style>
    </div>
  );
}

function ComponentCard({ comp, index }) {
  const color = getColor(comp.name);
  const icon = getIcon(comp.name);
  return (
    <div style={styles.compCard(color, index)}>
      <div style={styles.compCardLeft}>
        <div style={styles.compIcon(color)}>{icon}</div>
        <div>
          <p style={styles.compName}>{comp.name.replace(/_/g, " ")}</p>
          <p style={styles.compId}>{comp.id}</p>
        </div>
      </div>
      <div style={styles.compTags}>
        <span style={styles.tag(color)}>{comp.render_type}</span>
        {comp.geometry?.type && <span style={styles.tag("#64748b")}>{comp.geometry.type}</span>}
        {comp.placement && <span style={styles.tag("#7c3aed")}>placed</span>}
        {comp.materialOverrides?.gem_type && (
          <span style={styles.tag("#0891b2")}>{comp.materialOverrides.gem_type}</span>
        )}
        {comp.materialOverrides?.metal && (
          <span style={styles.tag("#b45309")}>{comp.materialOverrides.metal}</span>
        )}
      </div>
    </div>
  );
}

const keyframes = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes slideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes loadingSlide { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
  @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.1)} }
  @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,40px) scale(0.9)} }
  @keyframes gridMove { from{background-position:0 0} to{background-position:40px 40px} }
`;

const styles = {
  root: {
    minHeight: "100vh", background: "#080b12",
    fontFamily: "'Syne', sans-serif", color: "#e2e8f0",
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column",
  },
  gridBg: {
    position: "fixed", inset: 0, zIndex: 0, opacity: 0.15,
    backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`,
    backgroundSize: "40px 40px",
    animation: "gridMove 4s linear infinite",
  },
  gradientOrb1: {
    position: "fixed", width: "600px", height: "600px",
    borderRadius: "50%", top: "-200px", left: "-100px",
    background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
    animation: "orb1 8s ease-in-out infinite", zIndex: 0,
  },
  gradientOrb2: {
    position: "fixed", width: "500px", height: "500px",
    borderRadius: "50%", bottom: "-150px", right: "-100px",
    background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)",
    animation: "orb2 10s ease-in-out infinite", zIndex: 0,
  },
  header: {
    position: "relative", zIndex: 10, height: "56px",
    background: "rgba(8,11,18,0.8)", backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 28px", flexShrink: 0,
  },
  logo: { display: "flex", alignItems: "center", gap: "10px" },
  logoGem: { fontSize: "18px", color: "#f59e0b", filter: "drop-shadow(0 0 8px rgba(245,158,11,0.6))" },
  logoText: { fontSize: "15px", fontWeight: 800, letterSpacing: "0.12em", color: "#f1f5f9" },
  logoAccent: { color: "#6366f1" },
  nav: { display: "flex", gap: "28px" },
  navItem: { fontSize: "12px", color: "#475569", cursor: "pointer", letterSpacing: "0.06em", fontWeight: 600 },
  headerRight: { display: "flex", alignItems: "center", gap: "8px" },
  statusDot: (s) => ({
    width: "7px", height: "7px", borderRadius: "50%",
    background: s === "done" ? "#4ade80" : s === "loading" ? "#f59e0b" : s === "error" ? "#f87171" : "#334155",
    boxShadow: s === "done" ? "0 0 8px #4ade80" : s === "loading" ? "0 0 8px #f59e0b" : "none",
    animation: s === "loading" ? "pulse 1s infinite" : "none",
  }),
  statusText: { fontSize: "11px", color: "#64748b", letterSpacing: "0.04em" },
  main: {
    position: "relative", zIndex: 10, flex: 1,
    display: "grid", gridTemplateColumns: "340px 1fr 300px",
    gap: "0", overflow: "hidden",
  },
  leftPanel: {
    background: "rgba(15,20,30,0.6)", backdropFilter: "blur(8px)",
    borderRight: "1px solid rgba(255,255,255,0.05)",
    padding: "24px", display: "flex", flexDirection: "column", gap: "16px",
    overflowY: "auto",
  },
  centerPanel: {
    padding: "24px", display: "flex", flexDirection: "column", gap: "16px",
    overflowY: "auto",
  },
  rightPanel: {
    background: "rgba(15,20,30,0.6)", backdropFilter: "blur(8px)",
    borderLeft: "1px solid rgba(255,255,255,0.05)",
    padding: "24px", display: "flex", flexDirection: "column", gap: "16px",
    overflowY: "auto",
  },
  panelHeader: { marginBottom: "4px" },
  panelLabel: {
    fontSize: "9px", letterSpacing: "0.15em", color: "#334155",
    fontFamily: "'Space Mono', monospace", display: "block", marginBottom: "4px",
  },
  panelTitle: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#f1f5f9" },
  dropzone: (drag, hasPrev) => ({
    border: `1.5px dashed ${drag ? "#6366f1" : hasPrev ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: "10px", minHeight: "200px", cursor: "pointer",
    background: drag ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
    transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
    boxShadow: drag ? "0 0 0 1px rgba(99,102,241,0.3)" : "none",
  }),
  previewWrapper: { width: "100%", height: "100%", position: "relative", minHeight: "200px" },
  previewImg: { width: "100%", height: "200px", objectFit: "cover", display: "block" },
  previewOverlay: {
    position: "absolute", inset: 0,
    background: "rgba(0,0,0,0.5)", opacity: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "opacity 0.2s",
    ":hover": { opacity: 1 },
  },
  previewChange: { color: "white", fontSize: "12px", fontWeight: 600 },
  dropContent: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "24px" },
  dropIcon: { opacity: 0.4 },
  dropTitle: { margin: 0, fontSize: "13px", color: "#64748b", fontWeight: 600 },
  dropSub: { margin: 0, fontSize: "11px", color: "#334155" },
  detectBtn: (enabled) => ({
    padding: "12px", borderRadius: "8px", border: "none",
    background: enabled ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "#1e293b",
    color: enabled ? "white" : "#475569",
    cursor: enabled ? "pointer" : "not-allowed",
    fontSize: "13px", fontWeight: 700, fontFamily: "'Syne', sans-serif",
    letterSpacing: "0.04em", transition: "all 0.2s",
    boxShadow: enabled ? "0 4px 24px rgba(99,102,241,0.3)" : "none",
  }),
  btnInner: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
  spinner: {
    width: "14px", height: "14px", borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.2)",
    borderTopColor: "white", display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  errorBadge: {
    background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.2)",
    borderRadius: "6px", padding: "8px 12px", fontSize: "11px",
    color: "#fb7185", fontFamily: "'Space Mono', monospace",
  },
  fileInfo: {
    display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px",
    background: "rgba(255,255,255,0.02)", borderRadius: "8px",
    padding: "10px 14px", border: "1px solid rgba(255,255,255,0.04)",
  },
  fileInfoLabel: { fontSize: "9px", color: "#334155", letterSpacing: "0.1em", fontFamily: "'Space Mono', monospace", alignSelf: "center" },
  fileInfoValue: { fontSize: "11px", color: "#94a3b8", fontFamily: "'Space Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sceneMeta: {
    display: "flex", alignItems: "center", gap: "0",
    background: "rgba(255,255,255,0.02)", borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.04)", overflow: "hidden",
    animation: "slideIn 0.3s ease",
  },
  sceneMetaItem: { flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: "3px" },
  sceneMetaDivider: { width: "1px", background: "rgba(255,255,255,0.06)", alignSelf: "stretch" },
  sceneMetaLabel: { fontSize: "9px", color: "#334155", letterSpacing: "0.12em", fontFamily: "'Space Mono', monospace" },
  sceneMetaValue: { fontSize: "14px", fontWeight: 700, color: "#f1f5f9" },
  componentList: { display: "flex", flexDirection: "column", gap: "10px", flex: 1 },
  emptyState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px", padding: "60px 0" },
  emptyIcon: { fontSize: "36px", color: "#1e293b" },
  emptyText: { fontSize: "13px", color: "#334155", textAlign: "center", maxWidth: "240px", lineHeight: 1.7 },
  loadingBar: { width: "200px", height: "2px", background: "#1e293b", borderRadius: "2px", overflow: "hidden" },
  loadingBarFill: { height: "100%", width: "40%", background: "linear-gradient(90deg, #6366f1, #a78bfa)", animation: "loadingSlide 1.4s ease infinite", borderRadius: "2px" },
  compCard: (color, i) => ({
    background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.05)`,
    borderLeft: `3px solid ${color}`, borderRadius: "8px", padding: "14px 16px",
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    gap: "12px", animation: `slideIn 0.3s ease ${i * 0.08}s both`,
    transition: "background 0.2s", cursor: "default",
  }),
  compCardLeft: { display: "flex", alignItems: "center", gap: "12px" },
  compIcon: (color) => ({
    width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0,
    background: `${color}18`, border: `1px solid ${color}30`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "16px", color,
  }),
  compName: { margin: 0, fontSize: "13px", fontWeight: 700, color: "#e2e8f0", textTransform: "capitalize" },
  compId: { margin: "2px 0 0", fontSize: "10px", color: "#475569", fontFamily: "'Space Mono', monospace" },
  compTags: { display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "flex-end", maxWidth: "160px" },
  tag: (color) => ({
    fontSize: "9px", padding: "2px 7px", borderRadius: "100px",
    background: `${color}20`, color, border: `1px solid ${color}30`,
    fontFamily: "'Space Mono', monospace", whiteSpace: "nowrap",
    letterSpacing: "0.04em",
  }),
  jsonViewer: {
    flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden",
    minHeight: "200px", maxHeight: "400px",
  },
  jsonPre: {
    margin: 0, padding: "16px", fontSize: "10px", lineHeight: 1.7,
    color: "#4ade80", fontFamily: "'Space Mono', monospace",
    overflow: "auto", height: "100%", whiteSpace: "pre",
  },
  generateBtn: (enabled) => ({
    padding: "0", borderRadius: "10px", border: "none",
    background: enabled
      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
      : "#1e293b",
    color: enabled ? "#0c0a00" : "#334155",
    cursor: enabled ? "pointer" : "not-allowed",
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    transition: "all 0.2s", width: "100%",
    boxShadow: enabled ? "0 4px 24px rgba(245,158,11,0.4)" : "none",
  }),
  generateBtnInner: {
    display: "flex", alignItems: "center", gap: "14px",
    padding: "14px 20px",
  },
  generateIcon: { fontSize: "22px" },
  generateBtnTitle: { display: "block", fontSize: "14px", letterSpacing: "0.04em" },
  generateBtnSub: { display: "block", fontSize: "10px", opacity: 0.7, fontWeight: 600, marginTop: "1px" },
  generateHint: { margin: 0, fontSize: "10px", color: "#334155", textAlign: "center", fontFamily: "'Space Mono', monospace" },
  footer: {
    position: "relative", zIndex: 10, height: "36px",
    background: "rgba(8,11,18,0.9)", borderTop: "1px solid rgba(255,255,255,0.04)",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
    flexShrink: 0,
  },
  footerItem: { fontSize: "10px", color: "#334155", fontFamily: "'Space Mono', monospace" },
  footerDot: { color: "#1e293b", fontSize: "10px" },
};