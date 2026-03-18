import os
import trimesh


def assemble_scene(base_model: str | None, gem_models: list) -> str | None:
    """
    Merge the base .obj (from /remove-diamonds or CAD) with all loaded gem
    models into a single .glb file.

    Returns the output path, or None if there was nothing to assemble.
    """
    meshes = []

    if base_model and os.path.exists(base_model):
        print(f"[scene_assembler] Loading base model: {base_model}")
        loaded = trimesh.load(base_model)
        if isinstance(loaded, trimesh.Scene):
            meshes.extend(loaded.dump())
        else:
            meshes.append(loaded)

    for gem in gem_models:
        path = gem.get("model_path")
        if path and os.path.exists(path):
            print(f"[scene_assembler] Loading gem: {path}")
            loaded = trimesh.load(path)
            if isinstance(loaded, trimesh.Scene):
                meshes.extend(loaded.dump())
            else:
                meshes.append(loaded)

    if not meshes:
        print("[scene_assembler] No meshes to assemble.")
        return None

    os.makedirs("generated_models", exist_ok=True)
    output_path = "generated_models/final_scene.glb"

    scene = trimesh.Scene(meshes)
    scene.export(output_path)

    print(f"[scene_assembler] Exported scene → {output_path}")
    return output_path