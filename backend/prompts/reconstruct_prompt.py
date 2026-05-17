import json

def build_reconstruct_prompt(resume: str, job: str, mode: str,
                              step1_result: dict | None, github_eval: dict) -> str:
    problems = step1_result.get("problemas", []) if step1_result else []
    highlights = github_eval.get("projetos_destaque", [])
    skills = github_eval.get("habilidades_identificadas", [])
    strong_points = github_eval.get("pontos_fortes", [])

    job_section = f"\nVAGA ALVO:\n{job}\n" if job and job.strip() else ""

    return f"""Você é um redator especialista em currículos para mercado tech. Reconstrua o currículo abaixo incorporando as informações dos projetos do GitHub.

CURRÍCULO ORIGINAL:
{resume}
{job_section}
PROBLEMAS IDENTIFICADOS NA ANÁLISE:
{json.dumps(problems, ensure_ascii=False)}

PROJETOS DESTACADOS DO GITHUB:
{json.dumps(highlights, ensure_ascii=False, indent=2)}

HABILIDADES IDENTIFICADAS NO GITHUB:
{json.dumps(skills, ensure_ascii=False)}

PONTOS FORTES DO GITHUB:
{json.dumps(strong_points, ensure_ascii=False)}

REGRAS DE RECONSTRUÇÃO:
1. Máximo 2 páginas — seja conciso e de alto impacto.
2. Adicione os projetos relevantes do GitHub na seção de projetos.
3. Corrija os problemas identificados com linguagem específica e métricas quando possível.
4. Mantenha todas as informações verdadeiras do currículo original.
5. Use verbos de ação no passado para experiências (desenvolveu, implementou, liderou).
6. Se houver vaga alvo, otimize keywords para ela.

Retorne SOMENTE o JSON, sem markdown:
{{
  "nome": "<nome completo>",
  "titulo": "<cargo/título profissional>",
  "contato": {{
    "email": "<email>",
    "telefone": "<telefone ou null>",
    "linkedin": "<url ou null>",
    "github": "<url ou null>",
    "localizacao": "<cidade/estado ou null>"
  }},
  "resumo_profissional": "<3-4 frases de alto impacto sobre o profissional>",
  "experiencia": [
    {{
      "cargo": "<cargo>",
      "empresa": "<empresa>",
      "periodo": "<mês/ano — mês/ano ou atual>",
      "responsabilidades": ["<bullet 1>", "<bullet 2>"]
    }}
  ],
  "projetos": [
    {{
      "nome": "<nome do projeto>",
      "descricao": "<1-2 frases descrevendo o projeto e impacto>",
      "tecnologias": ["<tech1>"],
      "url": "<url ou null>"
    }}
  ],
  "habilidades": {{
    "linguagens": ["<lang1>"],
    "frameworks": ["<fw1>"],
    "ferramentas": ["<tool1>"],
    "outros": ["<outro1>"]
  }},
  "formacao": [
    {{
      "curso": "<nome do curso>",
      "instituicao": "<nome>",
      "ano_conclusao": "<ano ou previsto ano>"
    }}
  ],
  "idiomas": [
    {{"idioma": "<idioma>", "nivel": "<nível>"}}
  ],
  "certificacoes": ["<cert1>"]
}}"""
