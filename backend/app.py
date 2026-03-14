from flask import Flask, request, jsonify
from PIL import Image
from google import genai
import io
import json
import re

app = Flask(__name__)

# -------------------------
# GEMINI CONFIG
# -------------------------

GEMINI_API_KEY = "AIzaSyBUtxPDM_BTSYW0eRZpGtVDOmfXS5vMOUM"

client = genai.Client(api_key=GEMINI_API_KEY)


# -------------------------
# PROMPT
# -------------------------

PROMPT = """
You are an expert jewelry CAD analyzer.

Analyze the jewelry image and extract all DISTINCT components.

For each component produce detailed JSON describing how it should
be reconstructed in 3D.

Return ONLY JSON.

For every component include:

component_id
component_name
component_type
shape

detailed_description:
Explain how this component should appear in 3D including curvature,
edges, symmetry, corners, and surface properties.

color
material

position:
x
y
z

depth_or_height

size_parameters:
radius
width
length
thickness

surface_type:
smooth / faceted / engraved

Example format:

{
 "jewelry_type": "ring",
 "components":[
  {
   "component_id":"band_1",
   "component_name":"ring_band",
   "component_type":"structure",
   "shape":"torus",
   "color":"gold",
   "material":"gold",
   "detailed_description":"Smooth circular band with rounded edges and uniform thickness",
   "position":{"x":0,"y":0,"z":0},
   "depth_or_height":2.2,
   "size_parameters":{
        "radius":9,
        "thickness":2
   },
   "surface_type":"smooth"
  }
 ]
}

Important:
- Estimate realistic 3D depth from jewelry design knowledge.
- Detect gemstones, prongs, band, decorative elements.
- Coordinates should assume a normalized 3D space.
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

    json_match = re.search(r"\{.*\}", text, re.S)

    if json_match:
        return json.loads(json_match.group())

    return {"error": "Could not parse JSON from model output"}


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