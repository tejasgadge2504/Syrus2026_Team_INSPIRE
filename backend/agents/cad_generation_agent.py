import requests
import os
import uuid

OUTPUT_DIR = "generated_models"
os.makedirs(OUTPUT_DIR, exist_ok=True)

KAGGLE_MODEL_API = "https://afc8-34-9-133-7.ngrok-free.app/generate"


def generate_cad_model(image_path):

    files = {"image": open(image_path, "rb")}

    response = requests.post(KAGGLE_MODEL_API, files=files)

    if response.status_code != 200:
        return {"status": "error"}

    model_url = response.json()["model_url"]

    obj_name = f"{uuid.uuid4()}.obj"
    obj_path = os.path.join(OUTPUT_DIR, obj_name)

    obj_data = requests.get(model_url).content

    with open(obj_path, "wb") as f:
        f.write(obj_data)

    return obj_path