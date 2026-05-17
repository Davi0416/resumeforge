import json

FIXED_WEAK = {
    "resume": "João Silva\nEmail: joao@email.com\nExperiência: Trabalhei em várias empresas. Fiz muitas coisas. Tenho experiência com sistemas.\nFormação: Faculdade de TI.",
    "step1": {
        "scores": {"geral": 3, "impacto": 4, "clareza": 3, "palavras_chave": 3},
        "resumo": "Currículo genérico demais. Sem métricas, sem detalhamento de responsabilidades, sem tecnologias específicas.",
        "problemas": ["Sem métricas quantitativas", "Linguagem vaga ('várias empresas', 'muitas coisas')", "Sem stack técnica explícita", "Resumo profissional ausente"],
        "destaques": []
    }
}

FIXED_STRONG = {
    "resume": "Maria Costa | Software Engineer | São Paulo\nmariacosta@email.com | linkedin.com/in/mariacosta | github.com/mariacosta\n\nRESUMO\nEngenheira de software com 6 anos de experiência em sistemas distribuídos e APIs de alto desempenho. Especialista em Python e Go, com foco em redução de latência e escalabilidade.\n\nEXPERIÊNCIA\nSoftware Engineer II — TechCorp (2021–atual)\n• Redesenhei pipeline de dados reduzindo latência em 60% (de 800ms para 320ms)\n• Liderei migração de monolito para microserviços (12 serviços), aumentando disponibilidade de 97% para 99,9%\n• Mentorei 3 desenvolvedores júnior\n\nHABILIDADES\nPython, Go, Kubernetes, PostgreSQL, Redis, AWS, Kafka\n\nFORMAÇÃO\nBacharelado em Ciência da Computação — USP (2018)",
    "step1": {
        "scores": {"geral": 9, "impacto": 9, "clareza": 9, "palavras_chave": 9},
        "resumo": "Currículo excelente: métricas concretas, stack bem definida, progressão de carreira clara.",
        "problemas": ["Poderia incluir link para projetos open source"],
        "destaques": ["Métricas de impacto quantificadas (60% redução de latência)", "Stack técnica clara e relevante", "Liderança evidenciada com exemplos concretos"]
    }
}

def build_step1_prompt(resume: str, mode: str, best_entry: dict | None = None, worst_entry: dict | None = None) -> str:
    mode_instructions = {
        "geral": "Avalie o currículo de forma geral, sem considerar uma vaga específica.",
        "tech": "Foque em habilidades técnicas, stack, projetos e profundidade técnica.",
        "gestao": "Foque em liderança, gestão de equipes, resultados de negócio e soft skills.",
    }
    mode_text = mode_instructions.get(mode, mode_instructions["geral"])

    # Build few-shot examples
    weak_resume = worst_entry["resumeText"] if worst_entry else FIXED_WEAK["resume"]
    weak_result = worst_entry["step1Result"] if worst_entry else FIXED_WEAK["step1"]
    strong_resume = best_entry["resumeText"] if best_entry else FIXED_STRONG["resume"]
    strong_result = best_entry["step1Result"] if best_entry else FIXED_STRONG["step1"]

    return f"""Você é um especialista em recrutamento e análise de currículos. Analise o currículo abaixo e retorne um JSON com avaliação honesta e crítica.

MODO: {mode_text}

ESCALA DE NOTAS (seja honesto e calibrado):
- 1-3: Muito fraco. Genérico, sem detalhes, sem métricas, erros graves.
- 4-5: Abaixo da média. Falta clareza, métricas ou especificidade em áreas importantes.
- 6-7: Bom. Competente, com alguns pontos fortes, mas com lacunas.
- 8-9: Muito bom. Claro, específico, com métricas e bom impacto.
- 10: Excepcional. Perfeito em todos os aspectos (raro).

REGRA IMPORTANTE: Currículos têm no máximo 2 páginas. Avalie densidade de informação útil por espaço. Um currículo cheio de conteúdo genérico em 2 páginas é pior que um conciso com métricas em 1 página.

EXEMPLO DE CURRÍCULO FRACO:
{weak_resume}

ANÁLISE ESPERADA PARA CURRÍCULO FRACO:
{json.dumps(weak_result, ensure_ascii=False, indent=2)}

EXEMPLO DE CURRÍCULO FORTE:
{strong_resume}

ANÁLISE ESPERADA PARA CURRÍCULO FORTE:
{json.dumps(strong_result, ensure_ascii=False, indent=2)}

CURRÍCULO PARA ANALISAR:
{resume}

Retorne SOMENTE o JSON, sem texto antes ou depois, sem markdown. Formato:
{{
  "scores": {{
    "geral": <0-10>,
    "impacto": <0-10>,
    "clareza": <0-10>,
    "palavras_chave": <0-10>
  }},
  "resumo": "<diagnóstico geral em 2-3 frases>",
  "problemas": ["<problema 1>", "<problema 2>", ...],
  "destaques": ["<destaque 1>", ...]
}}"""
