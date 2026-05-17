import json

def build_step2_prompt(resume: str, job: str, mode: str, step1_result: dict) -> str:
    job_section = ""
    if job and job.strip():
        job_section = f"""
DESCRIÇÃO DA VAGA:
{job}

Para adaptação_vaga, identifique palavras-chave da vaga ausentes no currículo e ajustes específicos.
Se houver PDF da vaga anexado (prompt_externo), priorize as informações do PDF.
"""
    else:
        job_section = "\nNenhuma vaga específica fornecida. Pule o campo adaptacao_vaga (retorne null).\n"

    mode_instructions = {
        "geral": "Sugestões gerais para melhorar o currículo.",
        "tech": "Foque em stack técnica, projetos, métricas de engenharia.",
        "gestao": "Foque em liderança, resultados de negócio, gestão de equipes.",
    }
    mode_text = mode_instructions.get(mode, mode_instructions["geral"])

    problems = step1_result.get("problemas", [])
    scores = step1_result.get("scores", {})

    return f"""Você é um especialista em currículos. Com base na análise já feita, gere sugestões concretas e acionáveis de melhoria.

MODO: {mode_text}

ANÁLISE JÁ FEITA:
- Nota geral: {scores.get('geral', '?')}/10
- Problemas identificados: {json.dumps(problems, ensure_ascii=False)}
{job_section}
CURRÍCULO ATUAL:
{resume}

REGRAS:
1. Cada mudança deve mostrar o texto original E o texto melhorado (quando aplicável).
2. Seja específico — não diga "adicione métricas", mostre como ficaria a frase com a métrica.
3. Limite a 2 páginas — não sugira adicionar seções desnecessárias. Se já está cheio, sugira substituições.
4. Priorize mudanças de alto impacto (as que mais melhoram a nota).
5. No máximo 6 mudanças.

EXEMPLO DE MUDANÇA BEM FORMATADA:
{{
  "secao": "Experiência — TechCorp",
  "original": "Trabalhei no desenvolvimento de sistemas.",
  "sugerido": "Desenvolvi APIs REST em Python/FastAPI, reduzindo latência média em 40% (de 500ms para 300ms).",
  "motivo": "Especifica tecnologia, adiciona métrica quantitativa de impacto."
}}

Retorne SOMENTE o JSON, sem markdown:
{{
  "mudancas": [
    {{
      "secao": "<nome da seção>",
      "original": "<texto atual ou null se novo>",
      "sugerido": "<texto melhorado>",
      "motivo": "<por que essa mudança melhora o currículo>"
    }}
  ],
  "adaptacao_vaga": {{
    "palavras_chave_ausentes": ["<keyword 1>", ...],
    "ajustes_recomendados": ["<ajuste específico>", ...]
  }}
}}"""
