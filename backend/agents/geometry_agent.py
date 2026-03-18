import requests
from agents.cad_generation_agent import generate_cad_model

REMOVE_DIAMONDS_API = "http://127.0.0.1:5000/remove-diamonds"


def call_remove_diamonds(image_path: str) -> dict | None:
    """
    POST the user image to /remove-diamonds and return the response dict.
    Returns None on failure.
    """
    try:
        with open(image_path, "rb") as f:
            response = requests.post(
                REMOVE_DIAMONDS_API,
                files={"image": f},
                timeout=60,
            )

        if response.status_code != 200:
            print(f"[geometry_agent] /remove-diamonds returned {response.status_code}")
            return None

        data = response.json()

        if data.get("message") != "Success":
            print(f"[geometry_agent] /remove-diamonds error: {data}")
            return None

        return data  # { "image_output": "...", "obj_model": "...", "message": "Success" }

    except Exception as e:
        print(f"[geometry_agent] /remove-diamonds call failed: {e}")
        return None


def geometry_agent(components: list, image_path: str) -> list:
    """
    Process all components:
      - render_type == "geometry"  → mark as procedural (no external call needed)
      - render_type == "model"     → handled by model_loader_agent, skip here
      - anything else / unknown   → call /remove-diamonds to get an .obj model
    """
    results = []
    complex_detected = False

    for comp in components:
        render_type = comp.get("render_type")

        if render_type == "geometry":
            # Simple procedural shape — nothing to generate
            comp["generated"] = {"status": "procedural"}
            results.append(comp)

        elif render_type == "model":
            # Will be handled by model_loader_agent; skip here
            pass

        else:
            # Unknown / unsupported render_type → needs CAD generation
            complex_detected = True

    # If any unknown component was found, call /remove-diamonds once with the image
    if complex_detected:
        print("[geometry_agent] Unknown component detected — calling /remove-diamonds")
        response_data = call_remove_diamonds(image_path)

        if response_data:
            obj_path = response_data.get("obj_model")
            img_output = response_data.get("image_output")

            results.append({
                "status": "complex_base_generated",
                "source": "remove_diamonds_api",
                "model_path": obj_path,
                "processed_image": img_output,
            })
        else:
            # Fallback to original CAD generation pipeline
            print("[geometry_agent] Falling back to generate_cad_model()")
            base_model = generate_cad_model(image_path)
            if base_model:
                results.append({
                    "status": "complex_base_generated",
                    "source": "cad_fallback",
                    "model_path": base_model,
                })

    return results