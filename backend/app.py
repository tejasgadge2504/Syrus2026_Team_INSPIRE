from flask import Flask, request, jsonify
from PIL import Image
from google import genai
import json
import re

app = Flask(__name__)

# -------------------------
# GEMINI CONFIG
# -------------------------

GEMINI_API_KEY = "AIzaSyBUtxPDM_BTSYW0eRZpGtVDOmfXS5vMOUM"
client = genai.Client(api_key=GEMINI_API_KEY)


# -------------------------
# STRICT PROMPT FOR YOUR RENDERER
# -------------------------

PROMPT = """
You are an expert AI Jewelry Analyzer.

Analyze the jewelry image and convert it into a structured JSON
that will be used directly by a 3D renderer.

You MUST follow this JSON schema EXACTLY.

Rules:

1. Use render_type = "geometry" for simple metal structures like rings, chains, rods.
2. Use render_type = "model" for complex gemstones like diamonds, pearls, rubies.
3. Positions should be normalized values.
4. Use torus geometry for rings.
5. Diamonds should attach to ring using placement rules.

Return ONLY JSON.

JSON SCHEMA:

{
  "scene": {
    "jewelry_type": "ring | necklace | earring | bracelet",
    "units": "normalized",
    "version": "1.0"
  },

  "components": [
    {
      "id": "component_id",
      "name": "component_name",
      "render_type": "geometry | model",

      "geometry": {
        "type": "torus | sphere | cylinder",
        "radius": number,
        "tube": number,
        "radialSegments": number,
        "tubularSegments": number
      },

      "transform": {
        "position": [x, y, z],
        "rotation": [x, y, z],
        "scale": number
      },

      "placement": {
        "attach_to": "component_id",
        "mount_point": "top | center | bottom",
        "overlap_depth": number,
        "offset": [x,y,z]
      },

      "materialOverrides": {
        "metal": "gold | silver | platinum",
        "gem_type": "diamond | ruby | emerald",
        "color": "hex_color"
      }
    }
  ]
}

Example Output:

{
  "scene": {
    "jewelry_type": "ring",
    "units": "normalized",
    "version": "1.0"
  },

  "components": [
    {
      "id": "ring_band_01",
      "name": "ring_band",
      "render_type": "geometry",

      "geometry": {
        "type": "torus",
        "radius": 1.3,
        "tube": 0.12,
        "radialSegments": 16,
        "tubularSegments": 100
      },

      "transform": {
        "position": [0, -1.3, 0],
        "rotation": [0, 0, 0],
        "scale": 1
      },

      "materialOverrides": {
        "metal": "gold"
      }
    },

    {
      "id": "diamond_01",
      "name": "diamond",
      "render_type": "model",

      "placement": {
        "attach_to": "ring_band_01",
        "mount_point": "top",
        "overlap_depth": 0.25,
        "offset": [0,0,0]
      },

      "transform": {
        "scale": 0.6,
        "rotation": [0,0,0]
      },

      "materialOverrides": {
        "gem_type": "diamond",
        "color": "#ffffff"
      }
    }
  ]
}

Important:
Return ONLY valid JSON.
Do not include explanations.
"""


# -------------------------
# IMAGE ANALYSIS FUNCTION
# -------------------------

def analyze_image(image):

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[PROMPT, image]
    )

    text = response.text

    # Extract JSON safely
    json_match = re.search(r"\{.*\}", text, re.S)

    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            return {"error": "Invalid JSON from model"}

    return {"error": "Could not parse JSON", "raw_output": text}


# -------------------------
# API ROUTE
# -------------------------

@app.route("/detect_jewelry_components", methods=["POST"])
def detect_components():

    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    image = Image.open(file.stream)

    result = analyze_image(image)

    return jsonify(result)


# -------------------------
# RUN SERVER
# -------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)