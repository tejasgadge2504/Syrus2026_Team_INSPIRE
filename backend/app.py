from flask import Flask, request, jsonify
from PIL import Image
from google import genai
from google.genai import types
import json
import re
import io

app = Flask(__name__)

# -------------------------
# GEMINI CONFIG
# -------------------------

GEMINI_API_KEY = "AIzaSyDb0KT1JK8CfoaYIcqtdDvNog7BGBsJRYo"

client = genai.Client(api_key=GEMINI_API_KEY)

# -------------------------
# STRICT PROMPT
# -------------------------

PROMPT = """
You are an expert AI Jewelry Analyzer.

Analyze the jewelry image and convert it into a structured JSON
that will be used directly by a 3D renderer.

Rules:

1. Use render_type = "geometry" for simple metal structures
2. Use render_type = "model" for complex gemstones
3. Positions should be normalized values
4. Rings use torus geometry

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
# API ROUTE
# -------------------------

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


# -------------------------
# RUN SERVER
# -------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)