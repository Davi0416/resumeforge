import httpx
from backend import config

APILAYER_URL = "https://api.apilayer.com/resume_parser/upload"

async def parse_resume(file_bytes: bytes, filename: str) -> dict:
    api_key = config.get_apilayer_key()
    if not api_key:
        raise ValueError("APILayer key não configurada")

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            APILAYER_URL,
            headers={"apikey": api_key},
            content=file_bytes,
        )
        r.raise_for_status()
        data = r.json()

    return {"text": _format(data), "structured": True}

def _format(data: dict) -> str:
    parts = []

    if name := data.get("name"):
        parts.append(f"Nome: {name}")
    if email := data.get("email"):
        parts.append(f"Email: {email}")
    if phone := data.get("phone"):
        parts.append(f"Telefone: {phone}")

    if summary := data.get("summary"):
        parts.append(f"\nResumo Profissional:\n{summary}")

    if experience := data.get("experience"):
        parts.append("\nExperiência Profissional:")
        for exp in experience:
            title = exp.get("title", "")
            company = exp.get("employer", "")
            dates = f"{exp.get('start', '')} - {exp.get('end', 'atual')}"
            parts.append(f"  {title} @ {company} ({dates})")
            if desc := exp.get("description"):
                parts.append(f"    {desc[:300]}")

    if education := data.get("education"):
        parts.append("\nFormação:")
        for edu in education:
            degree = edu.get("degree", "")
            school = edu.get("school", "")
            parts.append(f"  {degree} — {school}")

    if skills := data.get("skills"):
        if isinstance(skills, list):
            parts.append(f"\nHabilidades: {', '.join(skills)}")

    return "\n".join(parts)
