import React from "react";

const SLIDER_CONFIG = [
  { label: "X", sublabel: "Left / Right", axis: 0 },
  { label: "Y", sublabel: "Up / Down",    axis: 1 },
  { label: "Z", sublabel: "Front / Back", axis: 2 },
];

export default function ControlPanel({ selectedId, jewelryJSON, setJewelryJSON }) {

  if (!selectedId) {
    return (
      <div style={panelStyle}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <span style={{ fontSize: "28px" }}>💍</span>
          <p style={{ color: "#444", fontSize: "12px", textAlign: "center", lineHeight: 1.6 }}>
            Click any part of<br />the ring to edit it
          </p>
        </div>
        <p style={{ color: "#333", fontSize: "10px", textAlign: "center", margin: 0 }}>
          Press 💾 Save to persist changes
        </p>
      </div>
    );
  }

  const component = jewelryJSON.components.find((c) => c.id === selectedId);
  if (!component) return null;

  const getPos = (axis) => {
    const v = component.transform?.position?.[axis];
    return typeof v === "number" && isFinite(v) ? v : 0;
  };
  const getScale = () => {
    const v = component.transform?.scale;
    return typeof v === "number" && isFinite(v) ? v : 1;
  };
  const getColor = () => component.materialOverrides?.color || "#ffffff";

  const updateField = (path, value) => {
    setJewelryJSON((prev) => {
      const nextComponents = prev.components.map((c) => {
        if (c.id !== selectedId) return c;
        const next = JSON.parse(JSON.stringify(c));
        if (!Array.isArray(next.transform?.position) || next.transform.position.length < 3) {
          if (!next.transform) next.transform = {};
          next.transform.position = [
            next.transform?.position?.[0] ?? 0,
            next.transform?.position?.[1] ?? 0,
            next.transform?.position?.[2] ?? 0,
          ];
        }
        let cursor = next;
        for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i]];
        cursor[path[path.length - 1]] = value;
        return next;
      });
      return { ...prev, components: nextComponents };
    });
  };

  const resetTransform = () => {
    setJewelryJSON((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id !== selectedId ? c : { ...c, transform: { ...c.transform, position: [0, 0, 0], scale: 1 } }
      ),
    }));
  };

  return (
    <div style={panelStyle}>
      {/* Component header */}
      <div style={{ borderBottom: "1px solid #222", paddingBottom: "12px", marginBottom: "4px" }}>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>{component.name}</p>
        <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#444", fontFamily: "monospace" }}>{component.id}</p>
      </div>

      {/* Position */}
      <p style={sectionLabel}>Position</p>
      {SLIDER_CONFIG.map(({ label, sublabel, axis }) => {
        const val = getPos(axis);
        return (
          <div key={axis} style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
              <span style={{ fontSize: "12px", color: "#bbb" }}>
                {label} <span style={{ color: "#444", fontSize: "10px" }}>{sublabel}</span>
              </span>
              <span style={{ fontSize: "11px", color: "#555", fontFamily: "monospace" }}>
                {val.toFixed(2)}
              </span>
            </div>
            <input
              type="range" min="-3" max="3" step="0.05"
              style={sliderStyle} value={val}
              onChange={(e) => updateField(["transform", "position", axis], parseFloat(e.target.value))}
            />
          </div>
        );
      })}

      {/* Scale */}
      <p style={sectionLabel}>Scale</p>
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ fontSize: "12px", color: "#bbb" }}>Size</span>
          <span style={{ fontSize: "11px", color: "#555", fontFamily: "monospace" }}>{getScale().toFixed(2)}</span>
        </div>
        <input
          type="range" min="0.1" max="3" step="0.05"
          style={sliderStyle} value={getScale()}
          onChange={(e) => updateField(["transform", "scale"], parseFloat(e.target.value))}
        />
      </div>

      {/* Color */}
      <p style={sectionLabel}>Color</p>
      <input
        type="color" value={getColor()}
        style={{ width: "100%", height: "36px", border: "none", borderRadius: "6px", cursor: "pointer" }}
        onChange={(e) => updateField(["materialOverrides", "color"], e.target.value)}
      />

      {/* Reset */}
      <button onClick={resetTransform} style={{
        marginTop: "16px", width: "100%", padding: "7px",
        background: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a",
        borderRadius: "6px", cursor: "pointer", fontSize: "11px",
      }}>
        Reset Transform
      </button>

      <div style={{ flex: 1 }} />
      <p style={{ color: "#333", fontSize: "10px", textAlign: "center", margin: 0 }}>
        Changes are unsaved until you press 💾
      </p>
    </div>
  );
}

const panelStyle = {
  width: "260px",
  minWidth: "260px",
  background: "#111",
  color: "white",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  overflowY: "auto",
  borderRight: "1px solid #1e1e1e",
  margin: 0,        // ← explicitly zero
  flexShrink: 0,    // ← never shrink below 260px
};
const sectionLabel = {
  margin: "10px 0 6px", fontSize: "10px",
  textTransform: "uppercase", letterSpacing: "0.08em", color: "#444",
};
const sliderStyle = { width: "100%", accentColor: "#4a9eff" };