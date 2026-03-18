from database.model_database import MODEL_DATABASE


def model_loader_agent(components: list) -> list:
    """
    For every component with render_type == "model", look up the MODEL_DATABASE
    and attach the local model path.  Components not found in the DB are skipped
    here and will be handled by geometry_agent (via /remove-diamonds).
    """
    model_results = []

    for comp in components:

        if comp.get("render_type") != "model":
            continue

        name = comp.get("name")

        if name in MODEL_DATABASE:
            db_entry = MODEL_DATABASE[name]
            comp["model_path"] = db_entry["path"]
            comp["generated"] = {"status": "loaded", "source": "model_database"}
            model_results.append(comp)
        else:
            # Not in DB — geometry_agent will handle via /remove-diamonds
            print(f"[model_loader_agent] '{name}' not in MODEL_DATABASE, deferring to geometry_agent")

    return model_results