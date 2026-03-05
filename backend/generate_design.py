import requests
import base64
import json
from pathlib import Path

GEMINI_API_KEY = "AIzaSyA3OgPwkbvPxyuxEoMlhackLvninpJ5WUc"

API_URL = f"""
https://generativelanguage.googleapis.com/v1beta/models/
gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}
""".replace("\n", "")


def encode_image(image_path):
    with open(image_path, "rb") as img:
        return base64.b64encode(img.read()).decode("utf-8")


def build_prompt():
    return """

Analyze this jewelry image.

Return ONLY valid JSON.

Create a parametric jewelry description usable for procedural 3D rendering.

Rules:
- Detect symmetry
- Detect repeating patterns
- Identify shapes: circle, oval, teardrop, flower, bead
- Estimate counts
- Provide radius layout
- Provide scale values
- Every object must have unique id
- Output must be renderable directly in Three.js

JSON FORMAT:

{
 "jewelry_type": "",
 "symmetry": "",
 "materials": {
   "defaultMetal": "",
   "defaultStone": ""
 },
 "parts":[
   {
     "id":"",
     "type":"",
     "shape":"",
     "count":0,
     "radius":0,
     "scale":0,
     "position":[0,0,0],
     "material":"metal|stone"
   }
 ]
}
the json will be given to generate the exact copy using three js so you need to geive in such a 
way that it is rebndered perfectly not as the scattred parts.
NO TEXT. JSON ONLY.
"""


def call_gemini(image_path):
    image_base64 = encode_image(image_path)

    payload = {
        "contents": [{
            "parts": [
                {"text": build_prompt()},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_base64
                    }
                }
            ]
        }]
    }

    response = requests.post(API_URL, json=payload)
    response.raise_for_status()

    result = response.json()

    text_output = result["candidates"][0]["content"]["parts"][0]["text"]

    return text_output


def save_json(text, output="jewelry_design.json"):
    # Gemini sometimes wraps ```json
    text = text.replace("```json", "").replace("```", "").strip()

    data = json.loads(text)

    with open(output, "w") as f:
        json.dump(data, f, indent=2)

    print("✅ Saved:", output)


if __name__ == "__main__":
    image_path = "jewelry.jpeg"
    json_text = call_gemini(image_path)
    save_json(json_text)