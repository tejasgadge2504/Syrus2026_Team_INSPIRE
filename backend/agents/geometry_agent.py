from agents.cad_generation_agent import generate_cad_model


def geometry_agent(components, image_path):

    results = []
    base_model = None
    complex_detected = False

    for comp in components:

        if comp.get("render_type") == "geometry":

            comp["generated"] = {
                "status": "procedural"
            }

            results.append(comp)

        else:
            complex_detected = True

    if complex_detected:

        base_model = generate_cad_model(image_path)

        if base_model:

            results.append({
                "status": "complex_base_generated",
                "model_path": base_model
            })

    return results