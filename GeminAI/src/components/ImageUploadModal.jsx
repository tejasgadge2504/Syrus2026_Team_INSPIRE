import React, { useState, useRef } from "react";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const T = {
  bg0: "#09090f", bg1: "#11111c", bg2: "#18182a", bg3: "#1f1f32", bg4: "#27273e",
  blue: "#4B6CF7", purple: "#9B59E8", pink: "#E040FB",
  accent: "#7B5CE5", accentLight: "#9d80f0", accentDim: "#3d2e8a",
  text: "#e8e4f4", textSub: "#9490b0", textDim: "#55526a",
  success: "#2ecc71", danger: "#e74c3c",
  grad: "linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB)",
};

// Component type icon map
function compIcon(type) {
  const t = (type || "").toLowerCase();
  if (["gem","diamond","stone","center_stone"].some(k => t.includes(k))) return "◆";
  if (t.includes("prong")) return "⋮";
  if (t.includes("setting") || t.includes("basket")) return "⬡";
  if (t.includes("halo")) return "◌";
  return "◎";
}
function compColor(type) {
  const t = (type || "").toLowerCase();
  if (["gem","diamond","stone","center_stone"].some(k => t.includes(k))) return "#4B6CF7";
  if (t.includes("prong")) return "#9B59E8";
  if (t.includes("setting") || t.includes("basket")) return "#E040FB";
  return "#7B5CE5";
}

// ── Steps indicator ───────────────────────────────────────────────────────────
function StepDot({ n, label, active, done }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
      <div style={{
        width: "30px", height: "30px", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", fontWeight: 700, transition: "all 0.3s",
        background: done ? T.success : active ? T.grad : T.bg3,
        border: done ? "none" : active ? "none" : "1px solid rgba(123,92,229,0.2)",
        color: (done || active) ? "#fff" : T.textDim,
        boxShadow: active ? "0 0 12px rgba(75,108,247,0.4)" : "none",
      }}>
        {done ? "✓" : n}
      </div>
      <div style={{ fontSize: "10px", color: active ? T.accentLight : T.textDim, whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
}

function StepLine({ done }) {
  return (
    <div style={{
      flex: 1, height: "2px", marginBottom: "18px",
      background: done
        ? "linear-gradient(90deg,#4B6CF7,#9B59E8)"
        : "rgba(123,92,229,0.15)",
      transition: "background 0.4s",
      borderRadius: "2px",
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Modal
// ─────────────────────────────────────────────────────────────────────────────

export default function ImageUploadModal({ open, onClose, onUpload }) {
  const [file,          setFile]          = useState(null);
  const [preview,       setPreview]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [detected,      setDetected]      = useState(null);
  const [detectLoading, setDetectLoading] = useState(false);
  const [isDragging,    setIsDragging]    = useState(false);
  const [step,          setStep]          = useState(1); // 1=upload 2=detect 3=model
  const fileInputRef = useRef();
  const designId     = localStorage.getItem("currentDesignId");

  if (!open) return null;

  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) { setError("Please select a valid image file."); return; }
    setFile(f);
    setError("");
    setDetected(null);
    setStep(1);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleFileChange = (e) => handleFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleDetect = async () => {
    if (!file) return;
    setDetectLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res  = await fetch("http://localhost:5000/detect_jewelry_components", { method: "POST", body: formData });
      const data = await res.json();
      setDetected(data);
      if (designId) localStorage.setItem(`design_${designId}_level1`, JSON.stringify(data));
      setStep(2);
    } catch {
      setError("Detection failed. Please check your connection and try again.");
    } finally {
      setDetectLoading(false);
    }
  };

  const handleCreateModel = async () => {
    if (!file || !detected) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("components", JSON.stringify(detected));
      const res  = await fetch("http://localhost:5000/create-model", { method: "POST", body: formData });
      const data = await res.json();
      if (designId && data) localStorage.setItem(`design_${designId}_level2`, JSON.stringify(data));
      setStep(3);
      await onUpload(file, detected, data);
    } catch (err) {
      setError(err.message || "Model creation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null); setPreview(null); setDetected(null);
    setError(""); setStep(1);
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
        padding: "20px",
      }}
    >
      {/* Modal box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "520px",
          background: T.bg1,
          borderRadius: "20px",
          border: "1px solid rgba(123,92,229,0.2)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(75,108,247,0.08)",
          overflow: "hidden",
          fontFamily: "'DM Sans', sans-serif",
          animation: "slideUp 0.25s ease",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
          @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin    { to{transform:rotate(360deg)} }
          @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
          .modal-grad-btn {
            background: linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB);
            background-size: 200% 200%;
            animation: gradShift 3.5s ease infinite;
            border: none; color: #fff; font-weight: 700; cursor: pointer;
            transition: opacity 0.2s, transform 0.15s; font-family: 'DM Sans',sans-serif;
          }
          .modal-grad-btn:hover  { opacity:0.9; transform:scale(1.02); }
          .modal-grad-btn:active { transform:scale(0.97); }
          .modal-grad-btn:disabled { opacity:0.4; pointer-events:none; }
          .modal-ghost-btn {
            background: rgba(123,92,229,0.07); border:1px solid rgba(123,92,229,0.22);
            color:#9490b0; cursor:pointer; font-family:'DM Sans',sans-serif;
            transition:all 0.18s;
          }
          .modal-ghost-btn:hover { background:rgba(123,92,229,0.14); border-color:rgba(123,92,229,0.45); color:#9d80f0; }
          .comp-row:hover { background:rgba(75,108,247,0.07) !important; }
        `}</style>

        {/* Header */}
        <div style={{
          padding: "22px 24px 18px",
          background: "linear-gradient(135deg,rgba(75,108,247,0.08),rgba(155,89,232,0.05))",
          borderBottom: "1px solid rgba(123,92,229,0.12)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src="/assets/logo.png" alt="GeminAI" style={{ height: "26px" }} />
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: T.text, fontFamily: "'Nunito',sans-serif" }}>
                New Jewelry Design
              </div>
              <div style={{ fontSize: "11px", color: T.textDim, marginTop: "1px" }}>
                AI-powered component detection
              </div>
            </div>
          </div>
          <button
            className="modal-ghost-btn"
            onClick={handleClose}
            style={{ width: "30px", height: "30px", borderRadius: "8px", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
          >×</button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: "18px 28px 0", display: "flex", alignItems: "center" }}>
          <StepDot n={1} label="Upload"  active={step === 1} done={step > 1} />
          <StepLine done={step > 1} />
          <StepDot n={2} label="Detect"  active={step === 2} done={step > 2} />
          <StepLine done={step > 2} />
          <StepDot n={3} label="3D Model" active={step === 3} done={false} />
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px 24px" }}>

          {/* ── Error banner ── */}
          {error && (
            <div style={{
              marginBottom: "14px", padding: "10px 14px",
              background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.25)",
              borderRadius: "9px", fontSize: "12px", color: "#e74c3c",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* ── STEP 1: Upload drop zone ── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              borderRadius: "14px",
              border: isDragging
                ? "2px solid #7B5CE5"
                : file
                ? "1.5px solid rgba(123,92,229,0.35)"
                : "1.5px dashed rgba(123,92,229,0.25)",
              background: isDragging
                ? "rgba(75,108,247,0.07)"
                : file
                ? "rgba(75,108,247,0.04)"
                : T.bg2,
              cursor: "pointer",
              transition: "all 0.2s",
              overflow: "hidden",
              minHeight: preview ? "auto" : "160px",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              position: "relative",
              marginBottom: "16px",
            }}
          >
            <input
              ref={fileInputRef}
              type="file" accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {preview ? (
              <>
                <img
                  src={preview} alt="preview"
                  style={{ width: "100%", maxHeight: "200px", objectFit: "cover", display: "block" }}
                />
                <div style={{
                  position: "absolute", bottom: "8px", right: "8px",
                  padding: "3px 10px", borderRadius: "20px",
                  background: "rgba(9,9,15,0.75)", backdropFilter: "blur(4px)",
                  border: "1px solid rgba(123,92,229,0.3)",
                  fontSize: "10px", color: T.accentLight,
                }}>
                  Click to change
                </div>
              </>
            ) : (
              <div style={{ padding: "30px 20px", textAlign: "center" }}>
                <div style={{
                  width: "50px", height: "50px", borderRadius: "50%",
                  background: "rgba(75,108,247,0.1)", border: "1px solid rgba(75,108,247,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px", fontSize: "20px",
                }}>
                  📸
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "5px" }}>
                  Drop your jewelry image here
                </div>
                <div style={{ fontSize: "11px", color: T.textDim }}>
                  PNG, JPG or WEBP • or <span style={{ color: T.accentLight }}>click to browse</span>
                </div>
              </div>
            )}
          </div>

          {/* ── STEP 2: Detected components ── */}
          {detected && detected.components && (
            <div style={{
              marginBottom: "16px",
              background: T.bg2,
              borderRadius: "12px",
              border: "1px solid rgba(123,92,229,0.14)",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "10px 14px",
                background: "linear-gradient(90deg,rgba(75,108,247,0.08),transparent)",
                borderBottom: "1px solid rgba(123,92,229,0.1)",
                display: "flex", alignItems: "center", gap: "7px",
              }}>
                <div style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: T.success, boxShadow: `0 0 6px ${T.success}`,
                  animation: "pulse 2s infinite",
                }} />
                <div style={{ fontSize: "12px", fontWeight: 600, color: T.accentLight }}>
                  {detected.components.length} components detected
                </div>
              </div>

              <div style={{ padding: "8px 0", maxHeight: "200px", overflowY: "auto" }}>
                {detected.components.map((comp, i) => {
                  const col = compColor(comp.render_type || comp.type || "");
                  return (
                    <div
                      key={comp.id || i}
                      className="comp-row"
                      style={{
                        padding: "8px 14px",
                        display: "flex", alignItems: "center", gap: "10px",
                        borderBottom: i < detected.components.length - 1
                          ? "1px solid rgba(123,92,229,0.06)" : "none",
                        transition: "background 0.15s",
                        cursor: "default",
                      }}
                    >
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "7px", flexShrink: 0,
                        background: `${col}18`, border: `1px solid ${col}33`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "12px", color: col,
                      }}>
                        {compIcon(comp.render_type || comp.type || "")}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: 500, color: T.text }}>
                          {comp.name || comp.id}
                        </div>
                        <div style={{ fontSize: "10px", color: T.textDim }}>
                          {comp.render_type || comp.type || "component"}
                        </div>
                      </div>
                      <div style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: col, boxShadow: `0 0 4px ${col}88`, flexShrink: 0,
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>

            {/* Detect button */}
            {!detected && (
              <button
                className="modal-grad-btn"
                onClick={handleDetect}
                disabled={!file || detectLoading}
                style={{
                  width: "100%", padding: "12px",
                  borderRadius: "11px", fontSize: "13px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                }}
              >
                {detectLoading ? (
                  <>
                    <div style={{
                      width: "14px", height: "14px", borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite",
                    }} />
                    Detecting components...
                  </>
                ) : (
                  <><span style={{ fontSize: "15px" }}>🔍</span> Detect Components</>
                )}
              </button>
            )}

            {/* Create model button */}
            {detected && (
              <button
                className="modal-grad-btn"
                onClick={handleCreateModel}
                disabled={loading}
                style={{
                  width: "100%", padding: "12px",
                  borderRadius: "11px", fontSize: "13px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  boxShadow: "0 4px 18px rgba(75,108,247,0.35)",
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: "14px", height: "14px", borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite",
                    }} />
                    Building 3D model...
                  </>
                ) : (
                  <><span style={{ fontSize: "15px" }}>◈</span> Create 3D Model</>
                )}
              </button>
            )}

            {/* Re-detect option if already detected */}
            {detected && (
              <button
                className="modal-ghost-btn"
                onClick={() => { setDetected(null); setStep(1); }}
                style={{
                  width: "100%", padding: "9px",
                  borderRadius: "9px", fontSize: "12px",
                }}
              >
                ↺ Re-detect components
              </button>
            )}

            {/* Cancel */}
            <button
              className="modal-ghost-btn"
              onClick={handleClose}
              style={{
                width: "100%", padding: "9px",
                borderRadius: "9px", fontSize: "12px",
              }}
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}