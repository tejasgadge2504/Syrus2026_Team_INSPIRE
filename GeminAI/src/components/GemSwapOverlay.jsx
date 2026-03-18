/**
 * GemSwapOverlay.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Controlled overlay — shown/hidden by parent via  open / onClose  props.
 * The "Exchange Diamond" button in ControlPanel sets open=true.
 *
 * Usage in Editor.jsx:
 *
 *   const [gemSwapOpen, setGemSwapOpen] = useState(false);
 *
 *   // inside the relative viewport div:
 *   <GemSwapOverlay
 *     open={gemSwapOpen}
 *     onClose={() => setGemSwapOpen(false)}
 *     selectedId={selectedId}
 *     jewelryJSON={jewelryJSON}
 *     onSwap={handleGemSwap}
 *   />
 *
 *   // pass the trigger down to ControlPanel:
 *   <ControlPanel
 *     ...
 *     onOpenGemSwap={() => setGemSwapOpen(true)}
 *   />
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg0:"#09090f", bg1:"#11111c", bg2:"#18182a",
  accent:"#7B5CE5", accentLight:"#9d80f0",
  text:"#e8e4f4", textSub:"#9490b0", textDim:"#55526a",
  success:"#2ecc71", danger:"#e74c3c",
  grad:"linear-gradient(135deg,#4B6CF7,#9B59E8,#E040FB)",
};

const GEM_TYPES = new Set([
  "gem","gemstone","stone","center_stone","center stone",
  "diamond","ruby","sapphire","emerald","amethyst","topaz","opal","pearl",
]);
function isGemComp(t) { return GEM_TYPES.has((t||"").toLowerCase().trim()); }

const REF_PPC   = { diamond:475000,ruby:95000,sapphire:65000,emerald:72000,amethyst:1200,topaz:1600,opal:12000,pearl:10000 };
const CUT_MULT  = { round_brilliant:1,princess:0.863,oval:0.884,emerald_cut:0.811,cushion:0.821,pear:0.853 };
const DCOL_MULT = { diamond_yellow:1.15,diamond_white:1,diamond_rose:2.4,diamond_red:5 };

function fmtINR(n) {
  if (!n||isNaN(n)) return "₹0";
  n=Math.round(n);
  if (n>=10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n>=100000)   return `₹${(n/100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function GemSwapOverlay({
  open            = false,
  onClose         = () => {},
  selectedId,
  jewelryJSON,
  onSwap,
  apiBase         = "http://localhost:5000",
}) {
  const [catalog,  setCatalog]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [swapping, setSwapping] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const panelRef = useRef(null);

  const comp         = jewelryJSON?.components?.find(c => c.id === selectedId) ?? null;
  const isGem        = comp != null && isGemComp(comp.type);
  const currentUrl   = comp?.model_path || "";
  const currentDCol  = comp?.materialOverrides?.diamondColor || "diamond_white";
  const currentCut   = comp?.geometry?.cut || "round_brilliant";

  // fetch catalog when panel opens (and on retry)
  useEffect(() => {
    if (!open || !isGem) return;
    let dead = false;
    setLoading(true); setError(null);
    fetch(`${apiBase}/api/gems/catalog`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (!dead) { setCatalog(d.gems||[]); setLoading(false); } })
      .catch(e => { if (!dead) { setError(e.message);  setLoading(false); } });
    return () => { dead = true; };
  }, [open, isGem, selectedId, apiBase, retryKey]);

  // outside-click closes
  useEffect(() => {
    if (!open) return;
    const fn = e => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open, onClose]);

  // swap tile
  const handleTile = useCallback(async entry => {
    if (!entry.available || !comp) return;
    setSwapping(entry.id);
    await new Promise(r => setTimeout(r, 90));
    onSwap(comp.id, entry);
    setSwapping(null);
  }, [comp, onSwap]);

  // active tile
  const activeId = (() => {
    if (!catalog.length) return null;
    if (currentUrl) { const h = catalog.find(g => g.model_url === currentUrl); if (h) return h.id; }
    const gemType = comp?.materialOverrides?.gemType || "diamond";
    return catalog.find(g => g.gem_type === gemType && (g.cut === currentCut || !g.cut))?.id || null;
  })();

  // don't render at all when closed (keeps DOM clean)
  if (!open) return null;
  // also guard: only works on gem components
  if (!isGem) return null;

  return (
    <>
      <style>{`
        @keyframes gso-drop  { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes gso-spin  { to{transform:rotate(360deg)} }
        @keyframes gso-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .gso-tile { transition:border-color .15s,background .15s,box-shadow .15s !important; }
        .gso-tile:hover { border-color:rgba(75,108,247,.5)!important; background:rgba(75,108,247,.1)!important; box-shadow:0 0 10px rgba(75,108,247,.2)!important; }
        .gso-close:hover { background:rgba(231,76,60,.15)!important; color:#e74c3c!important; }
      `}</style>

      {/* ── backdrop blur layer ── */}
      <div
        onClick={onClose}
        style={{
          position:"absolute", inset:0, zIndex:49,
          background:"rgba(0,0,0,0.35)",
          backdropFilter:"blur(2px)",
          WebkitBackdropFilter:"blur(2px)",
        }}
      />

      {/* ── panel ── */}
      <div
        ref={panelRef}
        style={{
          position:"absolute", top:16, left:"50%", zIndex:50,
          width:310, fontFamily:"'DM Sans',sans-serif",
          animation:"gso-drop 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      >
        <div style={{
          borderRadius:16,
          border:"1.5px solid rgba(75,108,247,0.38)",
          background:"linear-gradient(160deg,rgba(9,9,15,0.98),rgba(15,14,28,0.98))",
          backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
          boxShadow:"0 0 50px rgba(75,108,247,0.18),0 24px 64px rgba(0,0,0,0.8)",
          overflow:"hidden",
        }}>

          {/* header */}
          <div style={{
            padding:"11px 14px 10px",
            background:"linear-gradient(90deg,rgba(75,108,247,0.2),rgba(224,64,251,0.07))",
            borderBottom:"1px solid rgba(75,108,247,0.16)",
            display:"flex", alignItems:"center", gap:9,
          }}>
            <div style={{
              width:26, height:26, borderRadius:8, flexShrink:0,
              background:T.grad, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:13,
              boxShadow:"0 2px 10px rgba(75,108,247,0.45)",
            }}>◈</div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#9dc4ff", letterSpacing:"0.2px" }}>
                Exchange Gem
              </div>
              <div style={{ fontSize:9, color:T.textDim, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {comp.name || comp.id}
                <span style={{ opacity:0.55, marginLeft:5 }}>· {comp.type}</span>
              </div>
            </div>

            {/* status */}
            <div style={{
              fontSize:8, padding:"2px 7px", borderRadius:4,
              fontFamily:"monospace", flexShrink:0,
              background: loading?"rgba(255,152,0,0.1)":error?"rgba(231,76,60,0.1)":"rgba(46,204,113,0.1)",
              border:`1px solid ${loading?"rgba(255,152,0,0.3)":error?"rgba(231,76,60,0.3)":"rgba(46,204,113,0.3)"}`,
              color: loading?"#ffa500":error?T.danger:T.success,
            }}>
              {loading?"⟳ loading":error?"⚠ offline":`⬤ ${catalog.length} gems`}
            </div>

            <button className="gso-close" onClick={onClose} style={{
              width:22, height:22, borderRadius:"50%", flexShrink:0,
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(255,255,255,0.09)",
              color:T.textDim, cursor:"pointer", fontSize:13,
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.15s",
            }}>✕</button>
          </div>

          {/* skeletons */}
          {loading && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, padding:12 }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{
                  height:100, borderRadius:10,
                  background:"rgba(75,108,247,0.06)",
                  border:"1px solid rgba(75,108,247,0.08)",
                  animation:`gso-pulse 1.5s ease-in-out ${i*0.1}s infinite`,
                }}/>
              ))}
            </div>
          )}

          {/* error */}
          {!loading && error && (
            <div style={{ padding:"20px 16px", textAlign:"center" }}>
              <div style={{ fontSize:30, marginBottom:8 }}>⚠️</div>
              <div style={{ fontSize:11, color:T.danger, marginBottom:5 }}>Flask backend unreachable</div>
              <div style={{ fontSize:9, fontFamily:"monospace", color:T.textDim, marginBottom:12, wordBreak:"break-all" }}>{error}</div>
              <div style={{
                fontSize:9, color:T.textDim, lineHeight:1.9,
                background:"rgba(75,108,247,0.04)", border:"1px solid rgba(75,108,247,0.1)",
                borderRadius:7, padding:"8px 10px", textAlign:"left", marginBottom:10,
              }}>
                1. Run <code style={{color:T.accentLight}}>python app.py</code><br/>
                2. <code style={{color:T.accentLight}}>app.register_blueprint(gem_swap_bp)</code><br/>
                3. CORS must allow <code style={{color:T.accentLight}}>localhost:5173</code>
              </div>
              <button onClick={() => setRetryKey(k=>k+1)} style={{
                padding:"6px 18px", borderRadius:7, cursor:"pointer",
                background:"rgba(75,108,247,0.1)", border:"1px solid rgba(75,108,247,0.25)",
                color:T.accentLight, fontSize:11, fontFamily:"'DM Sans',sans-serif",
              }}>↺ Retry</button>
            </div>
          )}

          {/* tiles */}
          {!loading && !error && catalog.length > 0 && (
            <div style={{ padding:"12px 12px 6px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7 }}>
                {catalog.map(entry => {
                  const active   = entry.id === activeId;
                  const busy     = swapping === entry.id;
                  const disabled = !entry.available;
                  const ppc      = entry.cut
                    ? Math.round(REF_PPC.diamond*(CUT_MULT[entry.cut]||1)*(DCOL_MULT[currentDCol]||1))
                    : (REF_PPC[entry.gem_type]||0);

                  return (
                    <div
                      key={entry.id}
                      className={disabled?"":"gso-tile"}
                      onClick={() => !disabled && !busy && handleTile(entry)}
                      title={entry.note||entry.label}
                      style={{
                        borderRadius:11,
                        cursor: disabled?"not-allowed":busy?"wait":"pointer",
                        padding:"11px 6px 9px",
                        border: active?"2px solid #7b9ff9":"1px solid rgba(75,108,247,0.14)",
                        background: active
                          ? "linear-gradient(145deg,rgba(75,108,247,0.25),rgba(123,92,229,0.12))"
                          : "rgba(255,255,255,0.02)",
                        display:"flex", flexDirection:"column", alignItems:"center", gap:5,
                        boxShadow: active?"0 0 20px rgba(75,108,247,0.3)":"none",
                        opacity: disabled?0.35:1,
                        position:"relative",
                        transition:"all 0.15s",
                      }}
                    >
                      {active && !busy && (
                        <div style={{
                          position:"absolute", top:5, right:5,
                          width:15, height:15, borderRadius:"50%",
                          background:T.grad,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:8, color:"#fff", fontWeight:800,
                        }}>✓</div>
                      )}
                      {busy && (
                        <div style={{
                          position:"absolute", top:5, right:5,
                          width:15, height:15, borderRadius:"50%",
                          border:"2px solid rgba(123,92,229,0.25)",
                          borderTopColor:T.accentLight,
                          animation:"gso-spin 0.7s linear infinite",
                        }}/>
                      )}
                      {disabled && (
                        <div style={{
                          position:"absolute", top:5, left:5,
                          fontSize:7, color:T.danger,
                          background:"rgba(231,76,60,0.14)",
                          borderRadius:3, padding:"1px 4px",
                        }}>✗ missing</div>
                      )}

                      {/* gem facet */}
                      <div style={{
                        width:38, height:38, flexShrink:0,
                        clipPath:"polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)",
                        background: active
                          ? `radial-gradient(circle at 30% 28%,rgba(255,255,255,0.85),${entry.color})`
                          : `radial-gradient(circle at 30% 28%,rgba(255,255,255,0.22),${entry.color})`,
                        boxShadow: active
                          ? `0 0 22px ${entry.color}bb`
                          : `0 0 8px ${entry.color}44`,
                        transition:"all 0.15s",
                      }}/>

                      <div style={{ fontSize:9, fontWeight:active?700:500, color:active?"#9dc4ff":T.textSub, textAlign:"center", lineHeight:1.2 }}>
                        {entry.label}
                      </div>
                      <div style={{ fontSize:7.5, fontFamily:"monospace", color:active?"#7b9ff9":T.textDim, textAlign:"center" }}>
                        {fmtINR(ppc)}/ct
                      </div>
                      <div style={{
                        fontSize:6.5, color:T.textDim,
                        background:"rgba(123,92,229,0.1)",
                        border:"1px solid rgba(123,92,229,0.15)",
                        borderRadius:3, padding:"1px 5px",
                        fontFamily:"monospace", textTransform:"capitalize",
                      }}>{entry.gem_type}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* empty */}
          {!loading && !error && catalog.length === 0 && (
            <div style={{ padding:"22px 14px", textAlign:"center", color:T.textDim, fontSize:11, lineHeight:1.7 }}>
              No gem models found.<br/>
              <span style={{ fontSize:9 }}>Add <code style={{color:T.accentLight}}>isGem: True</code> entries to MODEL_DATABASE.</span>
            </div>
          )}

          {/* footer */}
          {!loading && !error && catalog.length > 0 && (
            <div style={{
              margin:"0 12px 12px",
              padding:"6px 10px",
              background:"rgba(75,108,247,0.05)",
              border:"1px solid rgba(75,108,247,0.1)",
              borderRadius:8,
              display:"flex", alignItems:"center", gap:6,
              fontSize:9, color:T.textDim,
            }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#7b9ff9", flexShrink:0 }}/>
              <span>
                Active:{" "}
                <span style={{ color:"#9dc4ff", fontWeight:600 }}>
                  {catalog.find(g=>g.id===activeId)?.label || "Default geometry"}
                </span>
              </span>
              <span style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:7, color:T.textDim }}>
                {currentUrl ? currentUrl.split("/").pop() : "procedural"}
              </span>
            </div>
          )}

        </div>
      </div>
    </>
  );
}