import json
from backend.services import ollama_service
from backend.validators.schema_validator import validate_step1, validate_step2
from backend.prompts.step1_prompt import build_step1_prompt
from backend.prompts.step2_prompt import build_step2_prompt
from backend import database

def _sse(event: str, data: dict | str) -> str:
    payload = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"

async def stream_analyze(resume: str, job: str, mode: str):
    # 1. Check model
    yield _sse("checking", {"status": "checking"})
    check = await ollama_service.check_model()
    if not check["ok"]:
        yield _sse("error", {"message": check["reason"]})
        return

    # 2. Fetch few-shot examples from DB
    best   = await database.get_best()
    worst  = await database.get_worst()

    # 3. Step 1 — analysis
    yield _sse("streaming", {"step": 1})
    prompt1 = build_step1_prompt(resume, mode, best_entry=best, worst_entry=worst)
    try:
        raw1 = await ollama_service.generate_stream(prompt1)
        step1 = validate_step1(raw1)
        step1_dict = step1.model_dump()
    except Exception as e:
        yield _sse("error", {"message": f"Erro na análise (passo 1): {e}"})
        return

    yield _sse("step1_complete", step1_dict)

    # 4. Step 2 — suggestions
    yield _sse("streaming", {"step": 2})
    prompt2 = build_step2_prompt(resume, job, mode, step1_dict)
    step2_dict = None
    try:
        raw2 = await ollama_service.generate_stream(prompt2)
        step2 = validate_step2(raw2)
        step2_dict = step2.model_dump()
        yield _sse("step2_complete", step2_dict)
    except Exception as e:
        yield _sse("step2_error", {"message": f"Sugestões não puderam ser geradas: {e}"})

    # 5. Save to DB
    try:
        await database.save_analysis(resume, job, mode, step1_dict, step2_dict)
    except Exception:
        pass  # DB errors shouldn't break the flow

    yield _sse("done", {"status": "done"})
