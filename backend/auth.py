import os
import re
from datetime import datetime, timedelta

import jwt
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from models.user_model import create_user, find_user_by_email

auth_bp = Blueprint("auth", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = "HS256"
JWT_EXP_MINUTES = int(os.getenv("JWT_EXP_MINUTES", "60"))

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_user_input(name=None, email=None, password=None):
    errors = {}
    if name is not None:
        if not isinstance(name, str) or not name.strip():
            errors["name"] = "Name is required and must be a non-empty string."
        elif len(name.strip()) < 2:
            errors["name"] = "Name must be at least 2 characters."
    if email is not None:
        if not isinstance(email, str) or not email.strip():
            errors["email"] = "Email is required and must be a non-empty string."
        elif not EMAIL_REGEX.match(email.strip().lower()):
            errors["email"] = "Email is invalid."
    if password is not None:
        if not isinstance(password, str) or not password:
            errors["password"] = "Password is required."
        elif len(password) < 8:
            errors["password"] = "Password must be at least 8 characters long."
    return errors


def create_token(user_id, email):
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXP_MINUTES),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON payload"}), 400

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    errors = validate_user_input(name=name, email=email, password=password)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    email = email.strip().lower()
    if find_user_by_email(email):
        return jsonify({"error": "Email already registered", "details": {"email": "Email already exists"}}), 409

    try:
        result = create_user(name, email, password)
        token = create_token(result.inserted_id, email)
        return jsonify({"message": "User registered successfully", "token": token}), 201
    except Exception as ex:
        return jsonify({"error": "Failed to register user", "details": str(ex)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON payload"}), 400

    email = data.get("email")
    password = data.get("password")

    errors = validate_user_input(email=email, password=password)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    email = email.strip().lower()
    try:
        user = find_user_by_email(email)
    except Exception as ex:
        return jsonify({"error": "Database error", "details": str(ex)}), 500

    if not user:
        return jsonify({"error": "Invalid credentials", "details": "No user found with this email"}), 401

    if not check_password_hash(user.get("password", ""), password):
        return jsonify({"error": "Invalid credentials", "details": "Incorrect password"}), 401

    token = create_token(user.get("_id"), email)
    return jsonify({"message": "Login successful", "token": token, "user": {"name": user.get("name"), "email": user.get("email")}}), 200

