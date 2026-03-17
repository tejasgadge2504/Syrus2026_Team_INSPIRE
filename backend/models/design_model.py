from db import db
from bson import ObjectId
from datetime import datetime

designs = db["designs"]

def create_design(level1_json, level2_json, user_id):
    design = {
        "level1_json": level1_json,
        "level2_json": level2_json,
        "user_id": ObjectId(user_id),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = designs.insert_one(design)
    return str(result.inserted_id)
