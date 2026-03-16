from agents.model_loader_agent import model_loader_agent
from agents.geometry_agent import geometry_agent
from agents.scene_assembly_agent import assemble_scene
from utils.parallel_executor import run_parallel_agents


def create_model_pipeline(components, image_path):

    models, geometry = run_parallel_agents(
        model_loader_agent,
        geometry_agent,
        components,
        image_path
    )

    base_model = None

    for g in geometry:
        if g.get("status") == "complex_base_generated":
            base_model = g["model_path"]

    # if CAD generation failed
    if base_model is None:
        print("⚠️ Using simple geometry fallback")

    final_scene = assemble_scene(base_model, models)

    return {
        "status": "completed",
        "base_model": base_model,
        "gems": models,
        "final_glb": final_scene
    }