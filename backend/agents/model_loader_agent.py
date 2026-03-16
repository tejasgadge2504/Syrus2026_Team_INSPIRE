from database.model_database import MODEL_DATABASE


def model_loader_agent(components):

    model_results = []

    for comp in components:

        if comp.get("render_type") == "model":

            name = comp.get("name")

            if name in MODEL_DATABASE:

                db = MODEL_DATABASE[name]

                comp["model_path"] = db["path"]

                comp["generated"] = {
                    "status": "loaded"
                }

                model_results.append(comp)

    return model_results