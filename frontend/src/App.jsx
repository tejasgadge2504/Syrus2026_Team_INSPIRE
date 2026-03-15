import React, { useState } from "react";
import ImageUploadPage from "./components/ImageUploadPage";
import JewelryViewer from "./components/JewelryViewer";
import ControlPanel from "./components/ControlPanel";

const STORAGE_KEY = "jewelry_designer_json";

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export default function App() {
  const [page, setPage] = useState("upload");
  const [selectedId, setSelectedId] = useState(null);
  const [jewelryJSON, setJewelryJSON] = useState(loadFromStorage);
  const [saveStatus, setSaveStatus] = useState("idle");

  const handleGenerate = (json) => {
    setJewelryJSON(json);
    setSelectedId(null);
    setPage("sandbox");
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jewelryJSON));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset design to defaults?")) {
      localStorage.removeItem(STORAGE_KEY);
      setJewelryJSON(null);
      setSelectedId(null);
    }
  };

  if (page === "upload") {
    return <ImageUploadPage onGenerate={handleGenerate} />;
  }

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#080b12",
      fontFamily: "'Syne', sans-serif",
      overflow: "hidden",
    }}>

      {/* Top bar */}
      <div style={{
        height: "48px",
        background: "rgba(8,11,18,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => setPage("upload")}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#64748b",
              borderRadius: "6px",
              padding: "4px 12px",
              cursor: "pointer",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ← Back
          </button>
          <span style={{ color: "#f59e0b", fontSize: "18px", filter: "drop-shadow(0 0 8px rgba(245,158,11,0.5))" }}>
            ◆
          </span>
          <span style={{ color: "#f1f5f9", fontWeight: 800, fontSize: "14px", letterSpacing: "0.1em" }}>
            Gemin<span style={{ color: "#6366f1" }}>AI</span>
            <span style={{ fontSize: "10px", color: "#334155", marginLeft: "10px", fontWeight: 400 }}>
              3D SANDBOX
            </span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={handleReset} style={topBtnStyle("#1a1a2e", "#475569")}>
            Reset
          </button>
          <button
            onClick={handleSave}
            style={topBtnStyle(
              saveStatus === "saved" ? "#0f2a1a" : "#0f1a2e",
              saveStatus === "saved" ? "#4ade80" : "#6366f1"
            )}
          >
            {saveStatus === "saved" ? "✓ Saved" : "💾 Save"}
          </button>
        </div>
      </div>

      {/* Main sandbox — fills remaining height exactly */}
      {/* Main sandbox */}
<div style={{
  flex: 1,
  minHeight: 0,
  display: "flex",
  overflow: "hidden",
  gap: 0,           // ← no gap between panel and canvas
  margin: 0,
  padding: 0,
}}>
  <ControlPanel
    selectedId={selectedId}
    jewelryJSON={jewelryJSON}
    setJewelryJSON={setJewelryJSON}
  />
  <div style={{
    flex: 1,
    minWidth: 0,
    height: "100%",
    overflow: "hidden",
    margin: 0,
    padding: 0,
    background: "radial-gradient(ellipse at center, #0f172a 0%, #080b12 100%)",
  }}>
    <JewelryViewer
      jsonData={jewelryJSON}
      setSelectedId={setSelectedId}
      selectedId={selectedId}
    />
  </div>
</div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

function topBtnStyle(bg, color) {
  return {
    background: bg,
    color,
    border: `1px solid ${color}44`,
    borderRadius: "6px",
    padding: "5px 14px",
    fontSize: "11px",
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: "'Syne', sans-serif",
  };
}