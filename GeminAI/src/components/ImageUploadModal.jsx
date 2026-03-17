import React, { useState } from "react";

export default function ImageUploadModal({ open, onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detected, setDetected] = useState(null);
  const [detectLoading, setDetectLoading] = useState(false);
  const designId = localStorage.getItem("currentDesignId");
  if (!open) return null;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setError("");
    setDetected(null);
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDetect = async () => {
    if (!file) return;
    setDetectLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("http://localhost:5000/detect_jewelry_components", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setDetected(data);
      // Store detected JSON (level1) in localStorage
      if (designId) {
        localStorage.setItem(`design_${designId}_level1`, JSON.stringify(data));
      }
    } catch (err) {
      setError("Detection failed");
    } finally {
      setDetectLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !detected) return;
    setLoading(true);
    setError("");
    try {
      await onUpload(file, detected);
      onClose();
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={{ color: "#bfa14a" }}>Upload Jewelry Image</h2>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {preview && <img src={preview} alt="preview" style={styles.preview} />}
        {error && <div style={styles.error}>{error}</div>}
        <button className="primary-btn" style={{ marginTop: 18 }} onClick={handleDetect} disabled={!file || detectLoading}>
          {detectLoading ? "Detecting..." : "Detect Components"}
        </button>
        {detected && detected.components && (
          <div style={{ marginTop: 18, width: "100%" }}>
            <h3 style={{ color: "#bfa14a", fontSize: "1.1rem" }}>Detected Components</h3>
            <ul style={{ paddingLeft: 18 }}>
              {detected.components.map((comp) => (
                <li key={comp.id} style={{ color: "#5a4a1b", marginBottom: 6 }}>
                  <b>{comp.name}</b> ({comp.render_type})
                </li>
              ))}
            </ul>
            <button className="primary-btn" style={{ marginTop: 12 }} onClick={async () => {
              if (!file || !detected) return;
              setLoading(true);
              setError("");
              try {
                // Prepare FormData for create-model API
                const formData = new FormData();
                formData.append("image", file);
                formData.append("components", JSON.stringify(detected));
                const res = await fetch("http://localhost:5000/create-model", {
                  method: "POST",
                  body: formData
                });
                const data = await res.json();
                // Store model JSON (level2) in localStorage
                if (designId && data) {
                  localStorage.setItem(`design_${designId}_level2`, JSON.stringify(data));
                }
                // Pass model JSON to Dashboard for navigation
                await onUpload(file, detected, data);
              } catch (err) {
                setError(err.message || "Upload failed");
              } finally {
                setLoading(false);
              }
            }} disabled={loading}>
              {loading ? "Saving..." : "Create Model"}
            </button>
          </div>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button className="primary-btn" style={{ background: "#fff3cd", color: "#bfa14a" }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.18)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
  },
  modal: {
    background: "#fffbe6", borderRadius: 16, padding: 32, minWidth: 320, boxShadow: "0 8px 32px rgba(220,180,80,0.18)", display: "flex", flexDirection: "column", alignItems: "center"
  },
  preview: {
    marginTop: 16, maxWidth: 220, maxHeight: 180, borderRadius: 8, border: "1px solid #f3e2b8"
  },
  error: {
    color: "#bfa14a", background: "#fff3cd", border: "1px solid #ffe082", borderRadius: 8, padding: "6px 12px", marginTop: 10
  }
};
