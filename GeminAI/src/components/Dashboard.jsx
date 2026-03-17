import { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import ImageUploadModal from "./ImageUploadModal";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const T = {
  bg0: "#09090f", bg1: "#11111c", bg2: "#18182a", bg3: "#1f1f32", bg4: "#27273e",
  blue: "#4B6CF7", purple: "#9B59E8", pink: "#E040FB",
  accent: "#7B5CE5", accentLight: "#9d80f0", accentDim: "#3d2e8a",
  text: "#e8e4f4", textSub: "#9490b0", textDim: "#55526a",
  success: "#2ecc71", danger: "#e74c3c",
  grad:  "linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB)",
  gradH: "linear-gradient(90deg,#4B6CF7,#9B59E8,#E040FB)",
};

const API = "http://localhost:5000";

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #09090f; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #27273e; border-radius: 4px; }

  @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.45} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes shimmer   { 0%{opacity:0.5} 50%{opacity:1} 100%{opacity:0.5} }

  .dash-stat  { transition:transform 0.2s,box-shadow 0.2s; }
  .dash-stat:hover  { transform:translateY(-3px); box-shadow:0 8px 32px rgba(75,108,247,0.18)!important; }

  .dcard { transition:transform 0.22s,box-shadow 0.22s,border-color 0.22s; }
  .dcard:hover { transform:translateY(-4px) scale(1.01); box-shadow:0 12px 40px rgba(123,92,229,0.25)!important; border-color:rgba(123,92,229,0.5)!important; }

  .grad-btn {
    background:linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB);
    background-size:200% 200%; animation:gradShift 3.5s ease infinite;
    border:none; color:#fff; font-weight:700; cursor:pointer;
    transition:opacity 0.2s,transform 0.15s;
  }
  .grad-btn:hover  { opacity:0.9; transform:scale(1.03); }
  .grad-btn:active { transform:scale(0.97); }
  .grad-btn:disabled { opacity:0.4; pointer-events:none; }

  .ghost-btn {
    background:rgba(123,92,229,0.07); border:1px solid rgba(123,92,229,0.25);
    color:#9490b0; cursor:pointer; transition:all 0.2s;
  }
  .ghost-btn:hover { background:rgba(123,92,229,0.14); border-color:rgba(123,92,229,0.5); color:#9d80f0; }

  .nav-a { cursor:pointer; transition:color 0.18s; color:#9490b0; text-decoration:none; }
  .nav-a:hover { color:#9d80f0; }

  .del-btn {
    background:rgba(231,76,60,0.07); border:1px solid rgba(231,76,60,0.2);
    color:#e74c3c; cursor:pointer; transition:all 0.2s; border-radius:7px;
  }
  .del-btn:hover { background:rgba(231,76,60,0.16); border-color:rgba(231,76,60,0.45); }

  /* Skeleton shimmer */
  .skel { background:linear-gradient(90deg,#18182a 25%,#1f1f32 50%,#18182a 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:8px; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(s) {
  if (s === "Production Ready") return T.success;
  if (s === "In Progress")      return T.purple;
  if (s === "Error")            return T.danger;
  return T.textDim;
}

function scoreFromStatus(s) {
  if (s === "Production Ready") return 93;
  if (s === "In Progress")      return 62;
  if (s === "Draft")            return 30;
  return 0;
}

function authHeader() {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      borderRadius: "16px", background: T.bg1, overflow: "hidden",
      border: "1px solid rgba(123,92,229,0.1)",
    }}>
      <div className="skel" style={{ height: "130px" }} />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div className="skel" style={{ height: "14px", width: "70%" }} />
        <div className="skel" style={{ height: "11px", width: "50%" }} />
        <div style={{ display: "flex", gap: "7px", marginTop: "4px" }}>
          <div className="skel" style={{ flex: 1, height: "32px" }} />
          <div className="skel" style={{ width: "36px", height: "32px" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmModal({ open, name, onConfirm, onCancel, deleting }) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "340px", background: T.bg1, borderRadius: "16px",
          border: "1px solid rgba(231,76,60,0.25)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          padding: "28px 24px", fontFamily: "'DM Sans',sans-serif",
          animation: "fadeUp 0.2s ease",
        }}
      >
        <div style={{ fontSize: "22px", marginBottom: "12px", textAlign: "center" }}>🗑</div>
        <div style={{ fontSize: "15px", fontWeight: 700, color: T.text, textAlign: "center", fontFamily: "'Nunito',sans-serif", marginBottom: "8px" }}>
          Delete Design?
        </div>
        <div style={{ fontSize: "12px", color: T.textSub, textAlign: "center", marginBottom: "24px", lineHeight: 1.6 }}>
          "<strong style={{ color: T.text }}>{name}</strong>" will be permanently deleted from your account. This action cannot be undone.
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="ghost-btn" onClick={onCancel}
            style={{ flex: 1, padding: "9px", borderRadius: "8px", fontSize: "13px", fontFamily: "'DM Sans',sans-serif" }}>
            Cancel
          </button>
          <button
            onClick={onConfirm} disabled={deleting}
            style={{
              flex: 1, padding: "9px", borderRadius: "8px", fontSize: "13px",
              fontFamily: "'DM Sans',sans-serif", fontWeight: 600, border: "none", cursor: "pointer",
              background: deleting ? "rgba(231,76,60,0.4)" : T.danger, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            {deleting ? (
              <><div style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />Deleting…</>
            ) : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Design Card ─────────────────────────────────────────────────────────────

function DesignCard({ design, onOpen, onDelete, style }) {
  const score = scoreFromStatus(design.status);

  return (
    <div
      className="dcard"
      onClick={() => onOpen(design)}
      style={{
        borderRadius: "16px", cursor: "pointer",
        border: "1px solid rgba(123,92,229,0.15)",
        background: T.bg1, overflow: "hidden",
        boxShadow: "0 2px 16px rgba(0,0,0,0.25)",
        ...style,
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height: "130px", position: "relative", overflow: "hidden",
        background: `linear-gradient(135deg,${design.color}20,${design.color}06)`,
        borderBottom: "1px solid rgba(123,92,229,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Jewel SVG illustration */}
        <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
          <ellipse cx="34" cy="48" rx="24" ry="8" stroke={design.color} strokeWidth="4" strokeOpacity="0.55" />
          <polygon points="34,10 46,30 34,40 22,30" fill={design.color} opacity="0.65" />
          <polygon points="34,10 46,30 34,22" fill={design.color} opacity="0.9" />
          <polygon points="34,10 22,30 34,22" fill="white" opacity="0.25" />
          <polygon points="34,22 46,30 34,40" fill={design.color} opacity="0.4" />
          <polygon points="34,22 22,30 34,40" fill="white" opacity="0.1" />
        </svg>

        {/* Score badge */}
        <div style={{
          position: "absolute", top: "10px", right: "10px",
          padding: "3px 9px", borderRadius: "20px",
          background: `${statusColor(design.status)}18`,
          border: `1px solid ${statusColor(design.status)}40`,
          fontSize: "11px", fontWeight: 700,
          color: statusColor(design.status),
          fontFamily: "'Nunito',sans-serif",
        }}>{score}</div>

        {/* Type pill */}
        <div style={{
          position: "absolute", top: "10px", left: "10px",
          padding: "3px 9px", borderRadius: "20px",
          background: "rgba(9,9,15,0.65)",
          border: "1px solid rgba(123,92,229,0.2)",
          fontSize: "10px", color: T.textSub,
        }}>{design.type}</div>

        {/* GLB indicator */}
        {design.has_glb && (
          <div style={{
            position: "absolute", bottom: "8px", right: "10px",
            padding: "2px 7px", borderRadius: "4px",
            background: "rgba(75,108,247,0.2)", border: "1px solid rgba(75,108,247,0.3)",
            fontSize: "9px", color: "#7b9ff9", letterSpacing: "0.5px",
          }}>GLB</div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: T.text, marginBottom: "5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {design.name}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: statusColor(design.status) }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: statusColor(design.status),
              animation: design.status === "In Progress" ? "pulse 2s infinite" : "none",
            }} />
            {design.status}
          </div>
          <div style={{ fontSize: "10px", color: T.textDim }}>{design.updated}</div>
        </div>

        {/* Comp count bar */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "9px", color: T.textDim, letterSpacing: "0.5px", textTransform: "uppercase" }}>Components</span>
            <span style={{ fontSize: "9px", color: T.textSub }}>{design.comp_count}</span>
          </div>
          <div style={{ height: "3px", borderRadius: "2px", background: T.bg3, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "2px",
              width: `${Math.min(100, (design.comp_count / 8) * 100)}%`,
              background: `linear-gradient(90deg,${design.color},${design.color}88)`,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "7px" }}>
          <button
            className="grad-btn"
            onClick={(e) => { e.stopPropagation(); onOpen(design); }}
            style={{ flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", fontFamily: "'DM Sans',sans-serif" }}
          >
            Open Editor
          </button>
          <button
            className="del-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(design); }}
            style={{ padding: "8px 11px", fontSize: "14px" }}
            title="Delete design"
          >🗑</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();

  const [user,        setUser]        = useState({ email: "", name: "" });
  const [greeting,    setGreeting]    = useState("Hello");
  const [designs,     setDesigns]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);
  const [hasMore,     setHasMore]     = useState(false);
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);

  const [showModal,   setShowModal]   = useState(false);
  const [newDesignId, setNewDesignId] = useState(null);

  const [openingId,   setOpeningId]   = useState(null); // card being loaded
  const [confirmDel,  setConfirmDel]  = useState(null); // { id, name }
  const [deleting,    setDeleting]    = useState(false);

  // ── Auth + greeting ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");

    const token    = Cookies.get("token");
    const userJson = Cookies.get("user");
    if (!token) { navigate("/login"); return; }
    if (userJson) {
      try { setUser(JSON.parse(userJson)); }
      catch { setUser({ email: "", name: "" }); }
    }
  }, [navigate]);

  // ── Fetch designs list ─────────────────────────────────────────────────────
  const fetchDesigns = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const res  = await fetch(`${API}/designs/all?page=${pageNum}&limit=12&sort=updated`, {
        headers: authHeader(),
      });
      if (res.status === 401) { navigate("/login"); return; }
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      setDesigns((prev) => append ? [...prev, ...data.designs] : data.designs);
      setTotal(data.total);
      setHasMore(data.has_more);
      setPage(pageNum);
    } catch (e) {
      setError(e.message || "Failed to load designs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [navigate]);

  useEffect(() => { fetchDesigns(1); }, [fetchDesigns]);

  // ── Open a design in editor ────────────────────────────────────────────────
  const handleOpenDesign = async (design) => {
    setOpeningId(design.id);
    try {
      const res  = await fetch(`${API}/designs/${design.id}`, { headers: authHeader() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Hydrate localStorage so Editor picks it up immediately
      localStorage.setItem("currentDesignId", data.id);
      if (data.level1_json) localStorage.setItem(`design_${data.id}_level1`, JSON.stringify(data.level1_json));
      if (data.level2_json) localStorage.setItem(`design_${data.id}_level2`, JSON.stringify(data.level2_json));

      navigate(`/designs/${data.id}`);
    } catch (e) {
      alert("Could not load design: " + e.message);
    } finally {
      setOpeningId(null);
    }
  };

  // ── Create new design ──────────────────────────────────────────────────────
  const handleCreateNew = async () => {
    try {
      const res  = await fetch(`${API}/designs/new`, { method: "POST", headers: authHeader() });
      const data = await res.json();
      if (res.ok && data.id) {
        setNewDesignId(data.id);
        localStorage.setItem("currentDesignId", data.id);
        setShowModal(true);
      } else {
        alert("Failed to create design: " + (data.error || "Unknown error"));
      }
    } catch { alert("Network error"); }
  };

  const handleImageUpload = async (file, detectedJson, modelJson = null) => {
    if (!newDesignId) return;
    localStorage.setItem(`design_${newDesignId}_level1`, JSON.stringify(detectedJson));
    if (modelJson) {
      localStorage.setItem(`design_${newDesignId}_level2`, JSON.stringify(modelJson));
      navigate(`/designs/${newDesignId}`);
    }
    setShowModal(false);
    fetchDesigns(1); // refresh list
  };

  // ── Delete design ──────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/designs/${confirmDel.id}`, { method: "DELETE", headers: authHeader() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `HTTP ${res.status}`); }
      setDesigns((prev) => prev.filter((d) => d.id !== confirmDel.id));
      setTotal((t) => t - 1);
      setConfirmDel(null);
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const logout = () => { Cookies.remove("token"); Cookies.remove("user"); navigate("/login"); };

  // ── Stats derived from real data ───────────────────────────────────────────
  const statsData = [
    {
      label: "Total Designs",    value: total,
      icon: "◈", grad: "linear-gradient(135deg,rgba(75,108,247,0.15),rgba(75,108,247,0.05))", border: "rgba(75,108,247,0.2)",
    },
    {
      label: "Production Ready", value: designs.filter((d) => d.status === "Production Ready").length,
      icon: "✓", grad: "linear-gradient(135deg,rgba(46,204,113,0.15),rgba(46,204,113,0.05))", border: "rgba(46,204,113,0.2)",
    },
    {
      label: "In Progress",      value: designs.filter((d) => d.status === "In Progress").length,
      icon: "⟳", grad: "linear-gradient(135deg,rgba(155,89,232,0.15),rgba(155,89,232,0.05))", border: "rgba(155,89,232,0.2)",
    },
    {
      label: "AI Credits Left",  value: 120,
      icon: "✦", grad: "linear-gradient(135deg,rgba(224,64,251,0.15),rgba(224,64,251,0.05))", border: "rgba(224,64,251,0.2)",
    },
  ];

  const firstLetter = (user.name || user.email || "U")[0].toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: T.bg0, color: T.text, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav style={{
        height: "58px", background: T.bg1,
        borderBottom: "1px solid rgba(123,92,229,0.14)",
        display: "flex", alignItems: "center",
        padding: "0 28px", gap: "12px",
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginRight: "16px" }}>
          <img src="/assets/logo.png" alt="GeminAI" style={{ height: "32px", width: "auto", objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", gap: "4px", flex: 1 }}>
          {["Dashboard", "My Designs", "Catalog", "Settings"].map((l, i) => (
            <a key={l} className="nav-a" style={{
              padding: "6px 13px", borderRadius: "7px", fontSize: "13px",
              fontWeight: i === 0 ? 500 : 400,
              color: i === 0 ? T.accentLight : T.textSub,
              background: i === 0 ? "rgba(75,108,247,0.1)" : "none",
              border: i === 0 ? "1px solid rgba(123,92,229,0.3)" : "1px solid transparent",
            }}>{l}</a>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "4px 12px", borderRadius: "20px",
            background: "rgba(224,64,251,0.08)", border: "1px solid rgba(224,64,251,0.2)",
            fontSize: "12px", color: "#e080f5",
          }}><span style={{ fontSize: "10px" }}>✦</span> 120 credits</div>

          <div style={{
            width: "34px", height: "34px", borderRadius: "8px",
            background: T.bg2, border: "1px solid rgba(123,92,229,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: T.textSub, fontSize: "15px",
          }}>🔔</div>

          <div style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: T.grad, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer",
            boxShadow: "0 2px 10px rgba(75,108,247,0.35)",
          }}>{firstLetter}</div>

          <button className="ghost-btn" onClick={logout}
            style={{ padding: "6px 14px", borderRadius: "7px", fontSize: "12px", fontFamily: "'DM Sans',sans-serif" }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── PAGE BODY ── */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "36px 28px" }}>

        {/* ── HERO ── */}
        <div style={{
          borderRadius: "18px",
          background: "linear-gradient(135deg,rgba(75,108,247,0.12),rgba(155,89,232,0.08),rgba(224,64,251,0.06))",
          border: "1px solid rgba(123,92,229,0.18)",
          padding: "32px 36px", marginBottom: "32px",
          position: "relative", overflow: "hidden",
          animation: "fadeUp 0.5s ease both",
        }}>
          <div style={{ position: "absolute", top: "-40px", right: "60px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle,rgba(75,108,247,0.15),transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-30px", right: "20%", width: "140px", height: "140px", borderRadius: "50%", background: "radial-gradient(circle,rgba(224,64,251,0.12),transparent 70%)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <div style={{ fontSize: "13px", color: T.textDim, marginBottom: "6px", letterSpacing: "0.5px" }}>{greeting} 👋</div>
              <div style={{
                fontSize: "28px", fontWeight: 800, fontFamily: "'Nunito',sans-serif",
                background: T.gradH, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                {user.name || user.email || "Designer"}
              </div>
              <div style={{ fontSize: "13px", color: T.textSub, marginTop: "6px" }}>
                {loading ? "Loading your designs…" : (
                  <>You have <strong style={{ color: T.accentLight }}>{total} design{total !== 1 ? "s" : ""}</strong>
                  {designs.filter(d => d.status === "Production Ready").length > 0 && (
                    <> — <strong style={{ color: T.success }}>{designs.filter(d => d.status === "Production Ready").length} ready for production</strong></>
                  )}</>
                )}
              </div>
            </div>

            <button className="grad-btn" onClick={handleCreateNew}
              style={{
                padding: "13px 28px", borderRadius: "12px", fontSize: "14px",
                fontFamily: "'DM Sans',sans-serif",
                display: "flex", alignItems: "center", gap: "8px",
                boxShadow: "0 4px 20px rgba(75,108,247,0.35)",
              }}>
              <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span> New Design
            </button>
          </div>
        </div>

        {/* ── STATS ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: "14px", marginBottom: "36px",
          animation: "fadeUp 0.5s 0.1s ease both",
        }}>
          {statsData.map((s) => (
            <div key={s.label} className="dash-stat" style={{
              background: s.grad, border: `1px solid ${s.border}`,
              borderRadius: "14px", padding: "18px 20px",
              display: "flex", alignItems: "center", gap: "14px",
            }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "10px",
                background: `${s.border}44`, border: `1px solid ${s.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", color: T.accentLight, flexShrink: 0,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: "22px", fontWeight: 800, fontFamily: "'Nunito',sans-serif", color: T.text, lineHeight: 1.1 }}>
                  {loading ? <div className="skel" style={{ width: "28px", height: "22px" }} /> : s.value}
                </div>
                <div style={{ fontSize: "11px", color: T.textSub, marginTop: "2px" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── DESIGNS GRID ── */}
        <div style={{ animation: "fadeUp 0.5s 0.2s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Nunito',sans-serif", color: T.text }}>
                {loading ? "Loading…" : `My Designs  (${total})`}
              </div>
              {!loading && (
                <button
                  onClick={() => fetchDesigns(1)}
                  style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: "14px", padding: "2px", lineHeight: 1 }}
                  title="Refresh"
                >⟳</button>
              )}
            </div>
            <a className="nav-a" style={{ fontSize: "12px", color: T.accentLight }}>View all →</a>
          </div>

          {/* Error state */}
          {error && (
            <div style={{
              padding: "20px", borderRadius: "12px", textAlign: "center",
              background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)",
              color: T.danger, fontSize: "13px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "20px", marginBottom: "8px" }}>⚠</div>
              {error}
              <button className="ghost-btn" onClick={() => fetchDesigns(1)}
                style={{ display: "block", margin: "12px auto 0", padding: "6px 16px", borderRadius: "7px", fontSize: "12px", fontFamily: "'DM Sans',sans-serif" }}>
                Retry
              </button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: "16px" }}>
            {/* New Design CTA card */}
            <div
              className="dcard"
              onClick={handleCreateNew}
              style={{
                borderRadius: "16px", cursor: "pointer",
                border: "1.5px dashed rgba(123,92,229,0.3)",
                background: "rgba(75,108,247,0.03)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: "40px 20px", gap: "12px", minHeight: "220px",
              }}
            >
              <div style={{
                width: "52px", height: "52px", borderRadius: "50%",
                background: T.grad, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "26px", color: "#fff", fontWeight: 300,
                boxShadow: "0 4px 16px rgba(75,108,247,0.3)",
              }}>+</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: T.accentLight }}>Create New Design</div>
              <div style={{ fontSize: "11px", color: T.textDim, textAlign: "center", lineHeight: 1.5 }}>
                Upload a jewelry image<br />to get started with AI
              </div>
            </div>

            {/* Skeleton loading cards */}
            {loading && [0,1,2].map((i) => <SkeletonCard key={i} />)}

            {/* Real design cards */}
            {!loading && designs.map((d, i) => (
              <DesignCard
                key={d.id}
                design={d}
                onOpen={handleOpenDesign}
                onDelete={(design) => setConfirmDel({ id: design.id, name: design.name })}
                style={{
                  animation: `fadeUp 0.5s ${0.05 + i * 0.05}s ease both`,
                  // Show spinner overlay if this card is being opened
                  position: "relative",
                  opacity: openingId && openingId !== d.id ? 0.6 : 1,
                  transition: "opacity 0.2s",
                }}
              />
            ))}

            {/* Empty state (no designs at all) */}
            {!loading && !error && designs.length === 0 && (
              <div style={{
                gridColumn: "1/-1", padding: "60px 20px", textAlign: "center",
                borderRadius: "16px", background: T.bg1,
                border: "1px solid rgba(123,92,229,0.1)",
              }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>◆</div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: T.text, marginBottom: "8px", fontFamily: "'Nunito',sans-serif" }}>
                  No designs yet
                </div>
                <div style={{ fontSize: "12px", color: T.textSub, marginBottom: "20px" }}>
                  Create your first AI jewelry design to get started
                </div>
                <button className="grad-btn" onClick={handleCreateNew}
                  style={{ padding: "10px 24px", borderRadius: "10px", fontSize: "13px", fontFamily: "'DM Sans',sans-serif" }}>
                  + New Design
                </button>
              </div>
            )}
          </div>

          {/* Load more */}
          {hasMore && !loading && (
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <button
                className="ghost-btn"
                onClick={() => fetchDesigns(page + 1, true)}
                disabled={loadingMore}
                style={{
                  padding: "9px 28px", borderRadius: "9px", fontSize: "13px",
                  fontFamily: "'DM Sans',sans-serif",
                  display: "inline-flex", alignItems: "center", gap: "8px",
                }}
              >
                {loadingMore ? (
                  <><div style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#9d80f0", animation: "spin 0.7s linear infinite" }} /> Loading…</>
                ) : "Load more designs"}
              </button>
            </div>
          )}
        </div>

        {/* ── PRO TIP BANNER ── */}
        {!loading && (
          <div style={{
            marginTop: "36px", borderRadius: "14px",
            background: "linear-gradient(90deg,rgba(75,108,247,0.08),rgba(224,64,251,0.05))",
            border: "1px solid rgba(123,92,229,0.14)",
            padding: "18px 22px", display: "flex", alignItems: "center", gap: "16px",
            animation: "fadeUp 0.5s 0.3s ease both",
          }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
              background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px",
            }}>✦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "3px" }}>
                Pro tip: Use AI Agent for faster design
              </div>
              <div style={{ fontSize: "12px", color: T.textSub }}>
                Try typing "switch to rose gold and add halo" in the AI Agent panel inside the editor.
              </div>
            </div>
            <button className="ghost-btn" style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
              Learn more →
            </button>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <ImageUploadModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onUpload={handleImageUpload}
        designId={newDesignId}
      />

      <ConfirmModal
        open={!!confirmDel}
        name={confirmDel?.name || ""}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDel(null)}
        deleting={deleting}
      />
    </div>
  );
}