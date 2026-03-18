"""
gem_swap_routes.py
──────────────────
Flask blueprint: /api/gems/*

Endpoints
─────────
GET  /api/gems/catalog
     Returns the full list of gem models from MODEL_DATABASE that are
     isGem=True. Used by the frontend GemSwapCard to populate tiles.

GET  /api/gems/model/<model_id>
     Streams the actual .obj file from disk so OBJLoader in the browser
     can load it directly. CORS headers included so the React dev server
     (localhost:5173) can fetch it.

GET  /api/gems/preview/<model_id>
     Returns lightweight metadata (vertex count, face count, file size)
     so the frontend can show stats without downloading the full OBJ.

Register in app.py:
    from gem_swap_routes import gem_swap_bp
    app.register_blueprint(gem_swap_bp)
"""

import os
import json
from flask import Blueprint, jsonify, send_file, request, abort, Response

# ── import the model database ──────────────────────────────────────────────────
# Adjust the import path to match your project layout.
# If models_dataset.py is in database/models_dataset.py, use:
#   from database.models_dataset import MODEL_DATABASE
# If it is at the top level:
#   from models_dataset import MODEL_DATABASE

try:
    from database.models_dataset import MODEL_DATABASE          # nested layout
except ImportError:
    try:
        from models_dataset import MODEL_DATABASE               # flat layout
    except ImportError:
        # Hard-coded fallback so the server still starts even if the import fails.
        MODEL_DATABASE = {
            "diamond": {
                "path": "database/models/diamond.obj",
                "type": "OBJ",
                "isGem": True,
            },
            "CushionCut_Diamond": {
                "path": "database/models/CushionCutDiamond.obj",
                "type": "OBJ",
                "isGem": True,
            },
            "Emerald_Diamond": {
                "path": "database/models/EmeraldDiamond.obj",
                "type": "OBJ",
                "isGem": True,
            },
            "Oval_Diamond": {
                "path": "database/models/OvalDiamond.obj",
                "type": "OBJ",
                "isGem": True,
            },
            "pearl_Sphere": {
                "path": "database/models/pearlSphere.obj",
                "type": "OBJ",
                "isGem": True,
            },
            "Princess_Dimond": {
                "path": "database/models/PrincessDimond.obj",
                "type": "OBJ",
                "isGem": True,
            },
        }

# ── blueprint ──────────────────────────────────────────────────────────────────
gem_swap_bp = Blueprint("gem_swap", __name__, url_prefix="/api/gems")

# ── CORS helper (avoids needing flask-cors just for these routes) ──────────────
def _cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return response

@gem_swap_bp.after_request
def add_cors(response):
    return _cors(response)

@gem_swap_bp.route("/<path:p>", methods=["OPTIONS"])
def options_handler(p):
    return _cors(Response(status=204))


# ─────────────────────────────────────────────────────────────────────────────
#  Human-readable metadata that maps model_id → display info for the frontend
#  tiles. Add / edit entries here freely.
# ─────────────────────────────────────────────────────────────────────────────
GEM_DISPLAY_META = {
    "diamond": {
        "label":      "Round Brilliant",
        "cut":        "round_brilliant",
        "gem_type":   "diamond",
        "color":      "#d6eaf8",
        "note":       "Classic round brilliant cut · most sparkle",
        "price_mult": 1.00,
    },
    "CushionCut_Diamond": {
        "label":      "Cushion Cut",
        "cut":        "cushion",
        "gem_type":   "diamond",
        "color":      "#c8dff5",
        "note":       "Soft rounded corners · vintage charm",
        "price_mult": 0.821,
    },
    "Emerald_Diamond": {
        "label":      "Emerald Cut",
        "cut":        "emerald_cut",
        "gem_type":   "diamond",
        "color":      "#b8d4f0",
        "note":       "Step cut · hall-of-mirrors effect",
        "price_mult": 0.811,
    },
    "Oval_Diamond": {
        "label":      "Oval Cut",
        "cut":        "oval",
        "gem_type":   "diamond",
        "color":      "#cce8ff",
        "note":       "Appears larger per carat",
        "price_mult": 0.884,
    },
    "pearl_Sphere": {
        "label":      "Pearl",
        "cut":        None,
        "gem_type":   "pearl",
        "color":      "#f5f0e8",
        "note":       "Lustrous cultured pearl sphere",
        "price_mult": 1.00,
    },
    "Princess_Dimond": {
        "label":      "Princess Cut",
        "cut":        "princess",
        "gem_type":   "diamond",
        "color":      "#d8eeff",
        "note":       "Square shape · brilliant facets",
        "price_mult": 0.863,
    },
}


def _get_abs_path(relative_path: str) -> str:
    """
    Resolve a MODEL_DATABASE path (e.g. 'database/models/diamond.obj')
    to an absolute path relative to this file's location.
    """
    base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, relative_path)


def _obj_stats(filepath: str) -> dict:
    """
    Read an OBJ file and count vertices (v) and faces (f).
    Returns dict with vertex_count, face_count, file_size_kb.
    """
    vertices = 0
    faces    = 0
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if line.startswith("v "):
                    vertices += 1
                elif line.startswith("f "):
                    faces += 1
        size_kb = round(os.path.getsize(filepath) / 1024, 1)
    except Exception:
        size_kb = 0
    return {"vertex_count": vertices, "face_count": faces, "file_size_kb": size_kb}


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/gems/catalog
# ─────────────────────────────────────────────────────────────────────────────
@gem_swap_bp.route("/catalog", methods=["GET"])
def gem_catalog():
    """
    Returns a list of all isGem=True entries from MODEL_DATABASE, enriched
    with display metadata and a ready-to-use model_url the frontend can pass
    directly to OBJLoader.

    Response shape:
    {
      "gems": [
        {
          "id":         "CushionCut_Diamond",
          "label":      "Cushion Cut",
          "cut":        "cushion",
          "gem_type":   "diamond",
          "color":      "#c8dff5",
          "note":       "...",
          "price_mult": 0.821,
          "model_url":  "http://localhost:5000/api/gems/model/CushionCut_Diamond",
          "file_type":  "OBJ",
          "available":  true      // false if the file is missing on disk
        },
        ...
      ]
    }
    """
    gems = []
    host = request.host_url.rstrip("/")   # e.g. "http://localhost:5000"

    for model_id, entry in MODEL_DATABASE.items():
        if not entry.get("isGem"):
            continue

        meta      = GEM_DISPLAY_META.get(model_id, {})
        rel_path  = entry.get("path", "")
        abs_path  = _get_abs_path(rel_path)
        available = os.path.isfile(abs_path)

        gems.append({
            "id":         model_id,
            "label":      meta.get("label",      model_id.replace("_", " ")),
            "cut":        meta.get("cut",         None),
            "gem_type":   meta.get("gem_type",    "diamond"),
            "color":      meta.get("color",       "#d6eaf8"),
            "note":       meta.get("note",         ""),
            "price_mult": meta.get("price_mult",   1.0),
            "model_url":  f"{host}/api/gems/model/{model_id}",
            "file_type":  entry.get("type", "OBJ"),
            "available":  available,
            "rel_path":   rel_path,
        })

    # Sort: available first, then alphabetically by label
    gems.sort(key=lambda g: (0 if g["available"] else 1, g["label"]))

    return jsonify({"gems": gems, "total": len(gems)})


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/gems/model/<model_id>
# ─────────────────────────────────────────────────────────────────────────────
@gem_swap_bp.route("/model/<model_id>", methods=["GET"])
def serve_gem_model(model_id):
    """
    Streams the raw .obj file for a given model_id so OBJLoader in Three.js
    can load it directly.

    The frontend calls:
        objLoader.load("http://localhost:5000/api/gems/model/CushionCut_Diamond", ...)

    Returns: the binary .obj file with MIME type model/obj.
    """
    entry = MODEL_DATABASE.get(model_id)
    if not entry:
        abort(404, description=f"Model '{model_id}' not found in MODEL_DATABASE")

    rel_path = entry.get("path", "")
    abs_path = _get_abs_path(rel_path)

    if not os.path.isfile(abs_path):
        abort(404, description=f"OBJ file not found on disk: {rel_path}")

    return send_file(
        abs_path,
        mimetype="model/obj",
        as_attachment=False,
        download_name=os.path.basename(abs_path),
    )


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/gems/preview/<model_id>
# ─────────────────────────────────────────────────────────────────────────────
@gem_swap_bp.route("/preview/<model_id>", methods=["GET"])
def gem_preview(model_id):
    """
    Returns lightweight metadata for a gem model — vertex count, face count,
    file size. Used to show stats in the swap card without downloading the OBJ.

    Response:
    {
      "id":           "CushionCut_Diamond",
      "label":        "Cushion Cut",
      "vertex_count": 1024,
      "face_count":   2048,
      "file_size_kb": 48.3,
      "available":    true
    }
    """
    entry = MODEL_DATABASE.get(model_id)
    if not entry:
        abort(404, description=f"Model '{model_id}' not found")

    meta     = GEM_DISPLAY_META.get(model_id, {})
    rel_path = entry.get("path", "")
    abs_path = _get_abs_path(rel_path)
    stats    = _obj_stats(abs_path) if os.path.isfile(abs_path) else {}

    return jsonify({
        "id":           model_id,
        "label":        meta.get("label", model_id),
        "available":    os.path.isfile(abs_path),
        **stats,
    })