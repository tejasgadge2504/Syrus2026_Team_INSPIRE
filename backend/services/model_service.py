from agents.model_loader_agent import model_loader_agent
from agents.geometry_agent import geometry_agent
from agents.scene_assembly_agent import assemble_scene
from utils.parallel_executor import run_parallel_agents


def create_model_pipeline(scene_json, image_path):

    # FIX: support both dict and list
    if isinstance(scene_json, list):
        components = scene_json
        scene_info = {}
    else:
        components = scene_json.get("components", [])
        scene_info = scene_json.get("scene", {})

    models, geometry = run_parallel_agents(
        model_loader_agent,
        geometry_agent,
        components,
        image_path
    )

    base_model = None

    for g in geometry:

        if isinstance(g, dict) and g.get("status") == "complex_base_generated":

            base_model = g["model_path"]

    if base_model is None:
        print("⚠️ Using simple geometry fallback")

    final_scene = assemble_scene(base_model, models)

    return {
        "scene": scene_info,
        "components": components,
        "output": {
            "status": "completed",
            "base_model": base_model,
            "final_glb": final_scene
        }
    }