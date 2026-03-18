import os
from agents.geometry_agent import geometry_agent
from agents.model_loader_agent import model_loader_agent
from agents.scene_assembler import assemble_scene


def create_model_pipeline(components: list, image_path: str) -> dict:
    """
    Orchestrates:
      1. model_loader_agent  — loads known gems/models from MODEL_DATABASE
      2. geometry_agent      — handles procedural geometry + unknown components
                               (unknown → /remove-diamonds API)
      3. assemble_scene      — merges everything into a final .glb

    Returns a JSON-serialisable dict ready to be sent back to the frontend.
    """

    # ── Step 1: load known models from the database ──────────────────────────
    loaded_models = model_loader_agent(components)

    # ── Step 2: handle geometry + unknown components ──────────────────────────
    geometry_results = geometry_agent(components, image_path)

    # ── Step 3: split results for scene assembly ──────────────────────────────
    # base_model  = the first complex/unknown .obj (from remove-diamonds or CAD)
    # gem_models  = the known models loaded from DB
    base_model = None
    extra_components = []

    for item in geometry_results:
        if item.get("status") in ("complex_base_generated",):
            if base_model is None:           # use the first one as the base
                base_model = item.get("model_path")
            extra_components.append(item)
        else:
            extra_components.append(item)   # procedural geometries

    # ── Step 4: assemble final scene ──────────────────────────────────────────
    final_scene_path = assemble_scene(base_model, loaded_models)

    # ── Step 5: build response ────────────────────────────────────────────────
    all_components = loaded_models + geometry_results

    response = {
        "status": "success",
        "components": all_components,
        "scene": {
            "final_model": final_scene_path,
            "base_obj": base_model,
            "total_components": len(all_components),
        },
    }

    return response