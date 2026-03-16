import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGO_URI") or os.getenv("mongo_URI")
if not mongo_uri:
    raise RuntimeError("MONGO_URI environment variable not set")

client = MongoClient(mongo_uri)
_db_name = os.getenv("MONGO_DB_NAME") or os.getenv("mongo_DB_NAME")
if not _db_name:
    default_db = client.get_default_database()
    _db_name = default_db.name if default_db is not None else "jewelry_app"
db = client[_db_name]
users = db["users"]
