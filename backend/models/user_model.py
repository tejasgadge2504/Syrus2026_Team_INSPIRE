from werkzeug.security import generate_password_hash
from db import users


def find_user_by_email(email: str):
    return users.find_one({"email": email.lower()})


def create_user(name: str, email: str, password: str):
    hashed = generate_password_hash(password)
    return users.insert_one({
        "name": name.strip(),
        "email": email.lower(),
        "password": hashed,
    })
