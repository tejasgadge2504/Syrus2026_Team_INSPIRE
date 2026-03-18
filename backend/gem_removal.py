import os
import uuid
import mimetypes
import shutil

from flask import Blueprint, request, jsonify
from google import genai
from google.genai import types

from gradio_client import Client, handle_file
import trimesh

# -------------------------------
# INIT
# -------------------------------
diamond_bp = Blueprint("diamond_bp", __name__)
os.environ["HF_TOKEN"] = "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"
OUTPUT_FOLDER = "processed_images"
MODEL_FOLDER = "database/models"

os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(MODEL_FOLDER, exist_ok=True)


# -------------------------------
# UTILS
# -------------------------------
def save_binary_file(file_name, data):
    with open(file_name, "wb") as f:
        f.write(data)


# -------------------------------
# GEMINI IMAGE PROCESSING
# -------------------------------
def process_with_gemini(image_path, prompt_text):
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-3.1-flash-image-preview"

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt_text),
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg"
                ),
            ],
        ),
    ]

    config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level="MINIMAL",
        ),
        image_config=types.ImageConfig(
            image_size="1K",
        ),
        response_modalities=["IMAGE", "TEXT"],
    )

    output_path = None

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=config,
    ):
        if chunk.parts is None:
            continue

        part = chunk.parts[0]

        # IMAGE OUTPUT
        if part.inline_data and part.inline_data.data:
            file_id = str(uuid.uuid4())
            ext = mimetypes.guess_extension(part.inline_data.mime_type) or ".png"
            output_path = os.path.join(OUTPUT_FOLDER, f"{file_id}{ext}")

            save_binary_file(output_path, part.inline_data.data)

        elif chunk.text:
            print(chunk.text)

    return output_path


# -------------------------------
# 3D GENERATION + OBJ CONVERSION
# -------------------------------
def generate_3d_obj(image_path):
    try:
        client = Client("tencent/Hunyuan3D-2")

        result = client.predict(
            caption="high detail 3D model of metal jewelry without gemstones, preserve prongs and structure",
            image=handle_file(image_path),
            mv_image_front=None,
            mv_image_back=None,
            mv_image_left=None,
            mv_image_right=None,
            steps=30,
            guidance_scale=7,
            seed=1234,
            octree_resolution=256,
            check_box_rembg=True,
            num_chunks=8000,
            randomize_seed=True,
            api_name="/shape_generation"
        )

        # Extract GLB path
        glb_path = result[0]['value']

        # Save locally
        glb_local = os.path.join(OUTPUT_FOLDER, f"{uuid.uuid4()}.glb")
        shutil.copy(glb_path, glb_local)

        # Load mesh safely
        mesh = trimesh.load(glb_local, force='mesh')

        # If scene → merge
        if isinstance(mesh, trimesh.Scene):
            mesh = trimesh.util.concatenate(mesh.dump())

        # Export OBJ
        obj_path = os.path.join(MODEL_FOLDER, f"{uuid.uuid4()}.obj")
        mesh.export(obj_path)

        return obj_path

    except Exception as e:
        print("3D Generation Error:", str(e))
        return None


# -------------------------------
# API ROUTE
# -------------------------------
@diamond_bp.route("/remove-diamonds", methods=["POST"])
def remove_diamonds():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files["image"]

        # Save input image
        input_path = os.path.join(OUTPUT_FOLDER, f"input_{uuid.uuid4()}.jpg")
        file.save(input_path)

        # 🔥 PROMPT
        prompt = """
        Remove ALL diamonds, gemstones, and stones from the jewelry image.
        Preserve ONLY the metal structure (gold/silver/platinum).
        Remove background noise if present.
        
        Rules:
        - Remove even tiny or blurred diamonds
        - Remove diamonds between prongs
        - Keep prongs intact
        - Do NOT distort structure
        - Fill removed areas naturally with metal
        - Final background must be pure white
        """

        # Step 1: Remove diamonds
        processed_image = process_with_gemini(input_path, prompt)

        if not processed_image:
            return jsonify({"error": "Image processing failed"}), 500

        # Step 2: Generate 3D OBJ
        obj_model = generate_3d_obj(processed_image)

        if not obj_model:
            return jsonify({
                "message": "Diamonds removed but 3D failed",
                "image_output": processed_image
            }), 500

        return jsonify({
            "message": "Success",
            "image_output": processed_image,
            "obj_model": obj_model
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500