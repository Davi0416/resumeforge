import json

def build_github_eval_prompt(repos: list[dict]) -> str:
    repos_json = json.dumps(repos, ensure_ascii=False, indent=2)
    return f"""Você é um recrutador técnico avaliando o perfil GitHub de um candidato.
Analise os repositórios abaixo e identifique os projetos mais relevantes, habilidades demonstradas e pontos fortes.

REPOSITÓRIOS:
{repos_json}

Retorne SOMENTE o JSON, sem markdown:
{{
  "projetos_destaque": [
    {{
      "nome": "<nome do repo>",
      "url": "<url>",
      "descricao": "<descrição do que o projeto faz — baseada no README e código>",
      "tecnologias": ["<tech1>", "<tech2>"],
      "relevancia": "<por que este projeto é relevante para o currículo>"
    }}
  ],
  "habilidades_identificadas": ["<habilidade 1>", "<habilidade 2>"],
  "pontos_fortes": ["<ponto forte 1>", ...],
  "lacunas": ["<área que poderia ser melhorada ou está ausente>"]
}}"""
