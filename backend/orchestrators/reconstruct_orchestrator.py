import json, base64
from backend.services import ollama_service, github_service
from backend.prompts.github_eval_prompt import build_github_eval_prompt
from backend.prompts.reconstruct_prompt import build_reconstruct_prompt
from backend.adapters.docx_adapter import generate_docx

def _sse(event: str, data: dict | str) -> str:
    payload = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"

async def stream_reconstruct(resume: str, job: str, mode: str,
                              github_username: str, step1_result: dict | None):
    # 1. Resolve GitHub username
    username = github_username.strip()
    if not username:
        resolved = await github_service.get_authenticated_username()
        if not resolved:
            yield _sse("error", {"message": "Nenhum usuário GitHub informado e sem token configurado. Configure um token em ⚙️ ou informe o usuário."})
            return
        username = resolved

    # 2. Fetch repos
    yield _sse("fetching_github", {"current": 0, "total": 0, "name": username})
    try:
        repos = await github_service.get_repos(username)
    except Exception as e:
        yield _sse("error", {"message": f"Erro ao buscar repositórios de '{username}': {e}"})
        return

    if not repos:
        yield _sse("github_warning", {"message": f"Nenhum repositório encontrado para '{username}'. Continuando sem dados do GitHub."})
        github_eval = {"projetos_destaque": [], "habilidades_identificadas": [], "pontos_fortes": [], "lacunas": []}
    else:
        # 3. Enrich repos with languages + README
        progress_data = {"current": 0, "total": len(repos), "name": ""}
        def on_progress(p):
            progress_data.update(p)

        enriched = await github_service.enrich_repos(repos, on_progress=on_progress)
        yield _sse("fetching_github", {"current": len(enriched), "total": len(enriched), "name": "concluído"})

        # 4. Evaluate projects with AI
        yield _sse("evaluating", {})
        eval_prompt = build_github_eval_prompt(enriched)
        try:
            github_eval = await ollama_service.generate_stream(eval_prompt)
        except Exception as e:
            yield _sse("github_warning", {"message": f"Avaliação do GitHub falhou: {e}. Continuando sem dados."})
            github_eval = {"projetos_destaque": [], "habilidades_identificadas": [], "pontos_fortes": [], "lacunas": []}

    # 5. Reconstruct resume
    yield _sse("reconstructing", {})
    reconstruct_prompt = build_reconstruct_prompt(resume, job, mode, step1_result, github_eval)
    try:
        reconstructed = await ollama_service.generate_stream(reconstruct_prompt)
    except Exception as e:
        yield _sse("error", {"message": f"Erro ao reconstruir currículo: {e}"})
        return

    # 6. Generate .docx
    yield _sse("generating_docx", {})
    try:
        docx_bytes = generate_docx(reconstructed)
        docx_b64   = base64.b64encode(docx_bytes).decode("ascii")
    except Exception as e:
        yield _sse("error", {"message": f"Erro ao gerar arquivo Word: {e}"})
        return

    name = reconstructed.get("nome", "candidato").replace(" ", "-").lower()
    filename = f"curriculo-{name}.docx"

    yield _sse("complete", {
        "docx_b64": docx_b64,
        "filename": filename,
        "data": reconstructed,
    })
