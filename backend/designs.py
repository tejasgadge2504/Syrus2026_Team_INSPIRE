from flask import Blueprint, request, jsonify
from models.design_model import create_design
import jwt
import os
from db import db
from bson import ObjectId
from datetime import datetime

new_design_bp = Blueprint('new_design', __name__)

JWT_SECRET  = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = "HS256"

# ─── Auth helper ──────────────────────────────────────────────────────────────

def get_user_id():
    """
    Extract user_id from the Bearer JWT token.
    Returns (user_id_str, None) on success or (None, error_response) on failure.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, (jsonify({"error": "Missing or invalid Authorization header"}), 401)
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            return None, (jsonify({"error": "Token missing sub claim"}), 401)
        return uid, None
    except Exception:
        return None, (jsonify({"error": "Invalid token"}), 401)


def serialize_design(doc):
    """
    Convert a raw MongoDB design document into a JSON-safe summary dict
    for the dashboard cards.
    """
    oid    = str(doc["_id"])
    level2 = doc.get("level2_json") or {}
    level1 = doc.get("level1_json") or {}
    comps  = level2.get("components") or level1.get("components") or []
    output = level2.get("output")     or level1.get("output")     or {}

    # Map output.status → human-readable status
    raw_status = output.get("status", "draft")
    status_map = {
        "completed":  "Production Ready",
        "processing": "In Progress",
        "draft":      "Draft",
        "error":      "Error",
    }
    status = status_map.get(raw_status, raw_status.title())

    # Accent colour rotating through brand palette
    palette = ["#4B6CF7", "#9B59E8", "#E040FB", "#7B5CE5", "#2471a3"]
    color   = palette[len(comps) % len(palette)]

    # Component type summary  e.g. "Ring · Gem"
    types_seen = []
    for c in comps:
        t = (c.get("render_type") or c.get("type") or "").lower()
        label = (
            "Ring"    if any(k in t for k in ["ring", "band", "frame", "shank"]) else
            "Gem"     if any(k in t for k in ["gem", "diamond", "stone"])        else
            "Prong"   if "prong" in t                                             else
            "Setting" if "setting" in t                                           else
            c.get("name", "Component").title()
        )
        if label not in types_seen:
            types_seen.append(label)
    type_label = " · ".join(types_seen[:2]) or "Jewelry"

    # Pretty relative timestamp
    updated_at = doc.get("updated_at") or doc.get("created_at")
    if isinstance(updated_at, datetime):
        delta = datetime.utcnow() - updated_at
        secs  = int(delta.total_seconds())
        if   secs < 60:          updated_str = "just now"
        elif secs < 3600:        updated_str = f"{secs // 60}m ago"
        elif secs < 86400:       updated_str = f"{secs // 3600}h ago"
        elif secs < 86400 * 7:   updated_str = f"{secs // 86400}d ago"
        else:                    updated_str = updated_at.strftime("%b %d")
    else:
        updated_str = "–"

    return {
        "id":         oid,
        "name":       doc.get("name") or f"Design {oid[-4:].upper()}",
        "type":       type_label,
        "status":     status,
        "color":      color,
        "comp_count": len(comps),
        "updated":    updated_str,
        "created_at": str(doc.get("created_at", "")),
        "has_glb":    bool(output.get("final_glb")),
    }


# ─────────────────────────────────────────────────────────────────────────────
#  POST /designs/new
#  Create a blank design document for the authenticated user.
# ─────────────────────────────────────────────────────────────────────────────

@new_design_bp.route('/designs/new', methods=['POST'])
def create_new_design():
    user_id, err = get_user_id()
    if err:
        return err

    design_id = create_design("", "", user_id)
    return jsonify({'id': design_id}), 201


# ─────────────────────────────────────────────────────────────────────────────
#  GET /designs/all
#  Return paginated list of ALL designs belonging to the authenticated user.
#  Query params: ?page=1  ?limit=12  ?sort=updated|created
# ─────────────────────────────────────────────────────────────────────────────

@new_design_bp.route('/designs/all', methods=['GET'])
def get_all_designs():
    user_id, err = get_user_id()
    if err:
        return err

    page  = max(1,  int(request.args.get("page",  1)))
    limit = min(50, int(request.args.get("limit", 12)))
    sort  = request.args.get("sort", "updated")
    sort_field = "updated_at" if sort == "updated" else "created_at"

    designs_collection = db["designs"]

    # Support user_id stored as plain string OR as ObjectId in MongoDB
    try:
        uid_query = {"$in": [user_id, ObjectId(user_id)]}
    except Exception:
        uid_query = user_id

    cursor = (
        designs_collection
        .find({"user_id": uid_query})
        .sort(sort_field, -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    designs = [serialize_design(doc) for doc in cursor]
    total   = designs_collection.count_documents({"user_id": uid_query})

    return jsonify({
        "designs":  designs,
        "total":    total,
        "page":     page,
        "limit":    limit,
        "has_more": (page * limit) < total,
    })


# ─────────────────────────────────────────────────────────────────────────────
#  GET /designs/<design_id>
#  Return the FULL document (level1_json + level2_json) for a single design.
#  Called when the user clicks a card on the dashboard to open the editor.
# ─────────────────────────────────────────────────────────────────────────────

@new_design_bp.route('/designs/<design_id>', methods=['GET'])
def get_design(design_id):
    user_id, err = get_user_id()
    if err:
        return err

    designs_collection = db["designs"]

    try:
        oid = ObjectId(design_id)
    except Exception:
        return jsonify({"error": "Invalid design id"}), 400

    doc = designs_collection.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Design not found"}), 404

    # Ownership check — stored user_id may be string or ObjectId
    stored_uid = str(doc.get("user_id", ""))
    if stored_uid != str(user_id):
        try:
            if str(ObjectId(stored_uid)) != str(user_id):
                return jsonify({"error": "Forbidden"}), 403
        except Exception:
            return jsonify({"error": "Forbidden"}), 403

    return jsonify({
        "id":          str(doc["_id"]),
        "name":        doc.get("name") or f"Design {design_id[-4:].upper()}",
        "level1_json": doc.get("level1_json"),
        "level2_json": doc.get("level2_json"),
        "created_at":  str(doc.get("created_at", "")),
        "updated_at":  str(doc.get("updated_at", "")),
    })


# ─────────────────────────────────────────────────────────────────────────────
#  PATCH /designs/save-model/<design_id>
#  Save / update level1_json and level2_json for a design.
# ─────────────────────────────────────────────────────────────────────────────

@new_design_bp.route('/designs/save-model/<design_id>', methods=['PATCH'])
def save_model(design_id):
    # Auth is optional here — keep same behaviour as your original if desired.
    # We add it for consistency; remove the two lines below to revert to open.
    user_id, err = get_user_id()
    if err:
        return err

    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    level1_json = data.get("level1_json")
    level2_json = data.get("level2_json")

    if not (level1_json and level2_json):
        return jsonify({"error": "Missing level1_json or level2_json"}), 400

    designs_collection = db["designs"]

    try:
        oid = ObjectId(design_id)
    except Exception:
        return jsonify({"error": "Invalid design id"}), 400

    result = designs_collection.update_one(
        {"_id": oid},
        {
            "$set": {
                "level1_json": level1_json,
                "level2_json": level2_json,
                "updated_at":  datetime.utcnow(),
            }
        }
    )

    if result.matched_count == 0:
        return jsonify({"error": "Design not found"}), 404

    return jsonify({"success": True, "message": "Design updated successfully"})


# ─────────────────────────────────────────────────────────────────────────────
#  DELETE /designs/<design_id>
#  Permanently delete a design. Only the owner can delete.
# ─────────────────────────────────────────────────────────────────────────────

@new_design_bp.route('/designs/<design_id>', methods=['DELETE'])
def delete_design(design_id):
    user_id, err = get_user_id()
    if err:
        return err

    designs_collection = db["designs"]

    try:
        oid = ObjectId(design_id)
    except Exception:
        return jsonify({"error": "Invalid design id"}), 400

    doc = designs_collection.find_one({"_id": oid}, {"user_id": 1})
    if not doc:
        return jsonify({"error": "Design not found"}), 404

    # Ownership check
    stored_uid = str(doc.get("user_id", ""))
    if stored_uid != str(user_id):
        try:
            if str(ObjectId(stored_uid)) != str(user_id):
                return jsonify({"error": "Forbidden"}), 403
        except Exception:
            return jsonify({"error": "Forbidden"}), 403

    designs_collection.delete_one({"_id": oid})
    return jsonify({"success": True, "deleted_id": design_id})