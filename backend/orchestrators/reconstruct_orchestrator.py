import json, base64
from backend.services import ollama_service, github_service
from backend.prompts.github_eval_prompt import build_github_eval_prompt
from backend.prompts.reconstruct_prompt import build_reconstruct_prompt
from backend.prompts.step1_prompt import build_step1_prompt
from backend.adapters.docx_adapter import generate_docx
from backend.validators.schema_validator import validate_step1

def _reconstructed_to_text(data: dict) -> str:
    """Converte o JSON do currículo reconstruído em texto legível para análise."""
    lines = []
    if nome := data.get("nome"):
        lines.append(nome)
    if titulo := data.get("titulo"):
        lines.append(titulo)
    c = data.get("contato", {})
    contact = " | ".join(v for v in [c.get("email"), c.get("linkedin"), c.get("github"), c.get("localizacao")] if v)
    if contact:
        lines.append(contact)
    if resumo := data.get("resumo_profissional"):
        lines.append(f"\nRESUMO PROFISSIONAL\n{resumo}")
    if exps := data.get("experiencia"):
        lines.append("\nEXPERIÊNCIA PROFISSIONAL")
        for e in exps:
            lines.append(f"{e.get('cargo','')} @ {e.get('empresa','')} ({e.get('periodo','')})")
            for r in e.get("responsabilidades", []):
                lines.append(f"  • {r}")
    if projs := data.get("projetos"):
        lines.append("\nPROJETOS")
        for p in projs:
            techs = ", ".join(p.get("tecnologias", []))
            lines.append(f"{p.get('nome','')} [{techs}]")
            if d := p.get("descricao"):
                lines.append(f"  {d}")
    h = data.get("habilidades", {})
    skill_parts = []
    for k in ("linguagens", "frameworks", "ferramentas", "outros"):
        if v := h.get(k):
            skill_parts.append(f"{k.capitalize()}: {', '.join(v)}")
    if skill_parts:
        lines.append("\nHABILIDADES\n" + "\n".join(skill_parts))
    if fms := data.get("formacao"):
        lines.append("\nFORMAÇÃO")
        for f in fms:
            lines.append(f"{f.get('curso','')} — {f.get('instituicao','')} ({f.get('ano_conclusao','')})")
    if idiomas := data.get("idiomas"):
        parts = [f"{i.get('idioma','')} ({i.get('nivel','')})" for i in idiomas]
        lines.append(f"\nIDIOMAS\n{' • '.join(parts)}")
    if certs := data.get("certificacoes"):
        lines.append(f"\nCERTIFICAÇÕES\n" + "\n".join(f"• {c}" for c in certs))
    return "\n".join(lines)

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

    # 7. Analisar currículo reconstruído para comparação de scores
    yield _sse("scoring", {})
    new_scores = None
    try:
        reconstructed_text = _reconstructed_to_text(reconstructed)
        score_prompt = build_step1_prompt(reconstructed_text, mode)
        raw_score = await ollama_service.generate_stream(score_prompt)
        new_step1  = validate_step1(raw_score)
        new_scores = new_step1.model_dump()["scores"]
    except Exception:
        pass  # scores opcionais — não quebra o fluxo

    name = reconstructed.get("nome", "candidato").replace(" ", "-").lower()
    filename = f"curriculo-{name}.docx"

    yield _sse("complete", {
        "docx_b64": docx_b64,
        "filename": filename,
        "data": reconstructed,
        "scores_antes": step1_result.get("scores") if step1_result else None,
        "scores_depois": new_scores,
    })
