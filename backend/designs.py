from flask import Blueprint, request, jsonify
from models.design_model import create_design
import jwt
import os
from db import db

new_design_bp = Blueprint('new_design', __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = "HS256"

@new_design_bp.route('/designs/new', methods=['POST'])
def create_new_design():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({'error': 'Missing or invalid Authorization header'}), 401
    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except Exception:
        return jsonify({'error': 'Invalid token'}), 401

    # Create blank design fields
    design_id = create_design("", "", user_id)
    return jsonify({'id': design_id}), 201

# PATCH API to save/update model level1 and level2 json
@new_design_bp.route('/designs/save-model/<design_id>', methods=['PATCH'])
def save_model(design_id):
    data = request.get_json()
    level1_json = data.get('level1_json')
    level2_json = data.get('level2_json')
    if not (level1_json and level2_json):
        return jsonify({'error': 'Missing level1_json or level2_json'}), 400
    result = db['designs'].update_one(
        {'_id': design_id if not design_id.startswith('ObjectId(') else ObjectId(design_id)},
        {'$set': {'level1_json': level1_json, 'level2_json': level2_json}}
    )
    if result.modified_count:
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Design not found or not updated'}), 404
# from flask import Blueprint, request, jsonify
# from models.design_model import create_design
# import jwt
# import os

# new_design_bp = Blueprint('new_design', __name__)

# JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
# JWT_ALGORITHM = "HS256"

# @new_design_bp.route('/designs/new', methods=['POST'])
# def create_new_design():
#     auth_header = request.headers.get("Authorization")
#     if not auth_header or not auth_header.startswith("Bearer "):
#         return jsonify({'error': 'Missing or invalid Authorization header'}), 401
#     token = auth_header.split(" ", 1)[1]
#     try:
#         payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
#         user_id = payload.get("sub")
#     except Exception:
#         return jsonify({'error': 'Invalid token'}), 401

#     # Create blank design fields
#     design_id = create_design("", "", user_id)
#     return jsonify({'id': design_id}), 201
