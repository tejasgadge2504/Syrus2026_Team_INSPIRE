import os
import trimesh


def assemble_scene(base_model, gem_models):

    meshes = []

    # FIX: extract path if dict
    if isinstance(base_model, dict):
        base_model = base_model.get("model_path")

    if base_model and isinstance(base_model, str) and os.path.exists(base_model):
        meshes.append(trimesh.load(base_model))

    for gem in gem_models:

        path = gem.get("model_path")

        if path and os.path.exists(path):
            meshes.append(trimesh.load(path))

    if not meshes:
        return None

    scene = trimesh.Scene(meshes)
    print("BASE MODEL TYPE:", type(base_model))
    print("BASE MODEL VALUE:", base_model)
    output_path = "generated_models/final_scene.glb"

    scene.export(output_path)

    return output_path