import os
import trimesh


def assemble_scene(base_model, gem_models):

    meshes = []

    if base_model and os.path.exists(base_model):

        print("Loading base model:", base_model)

        meshes.append(trimesh.load(base_model))

    for gem in gem_models:

        path = gem.get("model_path")

        if path and os.path.exists(path):

            print("Loading gem:", path)

            meshes.append(trimesh.load(path))

    if not meshes:
        return None

    scene = trimesh.Scene(meshes)

    output_path = "generated_models/final_scene.glb"

    scene.export(output_path)

    return output_path