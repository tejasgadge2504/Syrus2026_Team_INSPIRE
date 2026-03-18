from flask import Flask, request, jsonify
from PIL import Image
from google import genai
from google.genai import types
import json
import re
import io
from concurrent.futures import ThreadPoolExecutor
from database.model_database import MODEL_DATABASE
import os
import uuid
from flask_cors import CORS

from services.model_service import create_model_pipeline

from gem_removal import diamond_bp
from price import price_bp
from auth import auth_bp
from designs import new_design_bp
from gem_swap_routes import gem_swap_bp

app = Flask(__name__)
CORS(app)
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(new_design_bp)
app.register_blueprint(price_bp, url_prefix="/api/price")
app.register_blueprint(gem_swap_bp)
app.register_blueprint(diamond_bp)
 
# -------------------------
# GEMINI CONFIG
# -------------------------


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


GEMINI_API_KEY = "AIzaSyDb0KT1JK8CfoaYIcqtdDvNog7BGBsJRYo"

client = genai.Client(api_key=GEMINI_API_KEY)

# -------------------------
# STRICT PROMPT
# -------------------------
from flask import send_from_directory

@app.route('/database/<path:filename>')
def serve_database(filename):
    return send_from_directory('database', filename)
PROMPT = """
You are an expert AI Jewelry Analyzer.

Analyze the jewelry image and convert it into a structured JSON
that will be used directly by a 3D renderer.

Rules:

1. Use render_type = "geometry" for simple metal structures
2. Use render_type = "model" for complex gemstones
3. Positions should be normalized values
4. For normal rings with prongs render_type = "model" and give it the name as "ring_frame" only.
5. for gems identify first as diamond,CushionCut_Diamond,Emerald_Diamond,Oval_Diamond,pearl_Sphere,Princess_Dimond and then any other.
Return ONLY JSON.

Schema:

{
  scene: { jewelry_type: "ring", units: "normalized", version: "1.0" },
  components: [
    {
      id: "ring_band_01",
      name: "ring_band",
      render_type: "geometry",
      geometry: { type: "torus", radius: 1.3, tube: 0.12, radialSegments: 24, tubularSegments: 64 },
      materialOverrides: { metal: "silver", color: "#c0c0c0" },
      transform: { position: [0, -1.3, 0], rotation: [0, 0, 0], scale: 1 },
    },
    {
      id: "diamond_01",
      name: "diamond",
      render_type: "model",
      placement: { attach_to: "ring_band_01", mount_point: "top", offset: [0, 0, 0], overlap_depth: 0 },
      materialOverrides: { color: "#b52f2f", gem_type: "diamond" },
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.6 },
    },
    {
      id: "prong_01",
      name: "prong",
      render_type: "geometry",
      geometry: { type: "cylinder", radius: 0.04, height: 0.5, radialSegments: 8, heightSegments: 1 },
      placement: { attach_to: "ring_band_01", mount_point: "top", offset: [0.45, 0.5, 0], overlap_depth: 0.05 },
      materialOverrides: { metal: "silver", color: "#c0c0c0" },
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
    },
  ],
};


"""


# -------------------------
# IMAGE ANALYSIS FUNCTION
# -------------------------

def analyze_image(image):

    # convert PIL image to bytes
    img_bytes = io.BytesIO()
    image.save(img_bytes, format="PNG")
    img_bytes = img_bytes.getvalue()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            PROMPT,
            types.Part.from_bytes(
                data=img_bytes,
                mime_type="image/png"
            )
        ]
    )

    text = response.text

    # extract JSON safely
    json_match = re.search(r"\{.*\}", text, re.S)

    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            return {"error": "Invalid JSON returned", "raw": text}

    return {"error": "Could not parse JSON", "raw": text}





# -------------------------
# GENERATE LEVEL JSON AND PRICE ESTIMATION
# -------------------------

@app.route("/generate-level-json", methods=["POST"])
def generate_level_json():
    data = request.get_json()
    level1_json = data.get("level1_json")
    level2_json = data.get("level2_json")
    if not (level1_json and level2_json):
        return jsonify({"error": "Missing level1_json or level2_json"}), 400

    # Compose prompt for Gemini price estimation
    price_prompt = f"""
You are an expert jewelry pricing estimator.
Given the following level1 and level2 JSON for a jewelry design, estimate the price in INR.
Return ONLY JSON in this format:
{{
  price_estimation: {{
    currency: "INR",
    estimated_price: <number>,
    breakdown: {{ metal: <number>, gem: <number> }}
  }}
}}

level1_json: {json.dumps(level1_json)}
level2_json: {json.dumps(level2_json)}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[price_prompt]
    )
    text = response.text
    json_match = re.search(r"\{.*\}", text, re.S)
    if json_match:
        try:
            price_data = json.loads(json_match.group())
        except json.JSONDecodeError:
            price_data = {"error": "Invalid JSON returned", "raw": text}
    else:
        price_data = {"error": "Could not parse JSON", "raw": text}

    return jsonify({
        "level1_json": level1_json,
        "level2_json": level2_json,
        **price_data
    })

@app.route("/detect_jewelry_components", methods=["POST"])
def detect_components():

    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]

    try:
        image = Image.open(file.stream).convert("RGB")
    except:
        return jsonify({"error": "Invalid image"}), 400

    result = analyze_image(image)

    return jsonify(result)

# ===============CREATE MODEL=============


@app.route("/create-model", methods=["POST"])
def create_model():

    if "image" not in request.files:
        return jsonify({"error": "Image required"}), 400

    if "components" not in request.form:
        return jsonify({"error": "Components JSON required"}), 400

    image = request.files["image"]

    filename = f"{uuid.uuid4()}.png"
    image_path = os.path.join(UPLOAD_DIR, filename)

    image.save(image_path)

    components_json = json.loads(request.form["components"])

    result = create_model_pipeline(
        components_json["components"],
        image_path
    )

    return jsonify(result)


# -------------------------
# RUN SERVER
# -------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)