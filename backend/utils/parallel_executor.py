from concurrent.futures import ThreadPoolExecutor


def run_parallel_agents(model_agent, geometry_agent, components, image_path):

    with ThreadPoolExecutor(max_workers=2) as executor:

        model_future = executor.submit(model_agent, components)
        geometry_future = executor.submit(geometry_agent, components, image_path)

        model_results = model_future.result()
        geometry_results = geometry_future.result()

    return model_results, geometry_results