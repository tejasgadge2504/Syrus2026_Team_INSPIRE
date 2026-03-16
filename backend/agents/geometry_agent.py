from agents.cad_generation_agent import generate_cad_model


def geometry_agent(components, image_path):

    results = []
    complex_detected = False

    for comp in components:

        if comp.get("render_type") == "geometry":

            name = comp.get("name")

            # simple geometry (rings etc)
            if name == "ring_band":

                results.append({
                    "id": comp["id"],
                    "status": "simple",
                    "geometry": comp.get("geometry"),
                    "transform": comp.get("transform")
                })

            else:
                complex_detected = True

    # try CAD generation
    if complex_detected:

        try:

            obj_model = generate_cad_model(image_path)

            results.append({
                "status": "complex_base_generated",
                "model_path": obj_model
            })

        except Exception as e:

            print("⚠️ CAD generation failed, switching to simple geometry")
            print(e)

            # fallback to simple geometry
            for comp in components:

                if comp.get("render_type") == "geometry":

                    results.append({
                        "id": comp["id"],
                        "status": "fallback_simple",
                        "geometry": comp.get("geometry"),
                        "transform": comp.get("transform")
                    })

    return results