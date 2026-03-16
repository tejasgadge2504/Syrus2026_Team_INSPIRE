from flask import Blueprint, request, jsonify
from backend.db import db_session
from backend.models.design_model import Design

new_design_bp = Blueprint('new_design', __name__)

@new_design_bp.route('/designs/new', methods=['POST'])
def create_new_design():
    data = request.get_json()
    level1_json = data.get('level1_json')
    level2_json = data.get('level2_json')
    user_id = data.get('user_id')

    if not all([level1_json, level2_json, user_id]):
        return jsonify({'error': 'Missing required fields'}), 400

    design = Design(
        level1_json=level1_json,
        level2_json=level2_json,
        user_id=user_id
    )
    db_session.add(design)
    db_session.commit()

    return jsonify({'id': design.id}), 201
