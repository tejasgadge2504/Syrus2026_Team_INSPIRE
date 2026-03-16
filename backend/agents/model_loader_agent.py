from database.model_database import MODEL_DATABASE


def model_loader_agent(components):

    model_results = []

    for comp in components:

        if comp.get("render_type") == "model":

            name = comp.get("name")

            if name in MODEL_DATABASE:

                db = MODEL_DATABASE[name]

                model_results.append({
                    "id": comp["id"],
                    "name": name,
                    "model_path": db["path"],
                    "transform": comp.get("transform", {})
                })

    return model_results