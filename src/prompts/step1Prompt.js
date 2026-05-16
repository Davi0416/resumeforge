/**
 * Monta o prompt do Step 1 — Diagnóstico.
 *
 * Usa exemplos do banco de histórico quando disponíveis (few-shot dinâmico).
 * Quando não há histórico suficiente, usa exemplos fixos de calibração.
 */

const FIXED_WEAK =
  'EXEMPLO — Currículo fraco:\n' +
  'ENTRADA:\n' +
  '---\n' +
  'Ana Souza | Desenvolvedora | ana@email.com\n' +
  'Experiência: Trabalhou com React (2020-2023). Fez projetos na empresa Y.\n' +
  'Formação: Sistemas de Informação - UNICAMP 2020\n' +
  'Habilidades: React, JavaScript, CSS\n' +
  '---\n' +
  'SAÍDA:\n' +
  '{"scores":{"impacto":3,"clareza":4,"palavras_chave":3,"geral":3},' +
  '"resumo":"Currículo excessivamente vago: \'trabalhou com\' e \'fez projetos\' não comunicam resultados nem responsabilidades reais. ' +
  'Ausência total de métricas, tecnologias complementares (TypeScript, testes, CI/CD) e contexto dos projetos. ' +
  'A formação na UNICAMP é ponto positivo, mas não compensa a falta de substância nas experiências."}\n'

const FIXED_STRONG =
  'EXEMPLO — Currículo forte:\n' +
  'ENTRADA:\n' +
  '---\n' +
  'Carlos Lima | Engenheiro de Software Sênior | carlos@email.com | github.com/climalima\n' +
  'Experiência:\n' +
  'TechCorp (2019-2024) — Liderou migração de monolito para microsserviços em Node.js/TypeScript, reduzindo latência em 40% e custo de infra em 25%.\n' +
  'Conduziu squad de 6 pessoas, implementou CI/CD com GitHub Actions, cobertura de testes de 85%.\n' +
  'Freelance (2017-2019) — Entregou 12 projetos React para clientes internacionais, com NPS médio de 92.\n' +
  'Formação: Ciência da Computação - USP 2017\n' +
  'Habilidades: Node.js, TypeScript, React, Docker, Kubernetes, PostgreSQL, AWS\n' +
  'Idiomas: Inglês fluente, Espanhol intermediário\n' +
  '---\n' +
  'SAÍDA:\n' +
  '{"scores":{"impacto":9,"clareza":9,"palavras_chave":9,"geral":9},' +
  '"resumo":"Currículo forte com métricas concretas e resultados mensuráveis (redução de 40% na latência, 25% em custo). ' +
  'Stack técnica relevante e bem detalhada. Liderança de equipe comprovada. ' +
  'Ponto de melhoria: adicionar link para projetos freelance ou portfólio. ' +
  'Idiomas são diferencial importante e bem posicionados."}\n'

function buildDynamicExample(entry, label) {
  if (!entry) return null
  const scores = entry.step1Result?.scores
  const resumo = entry.step1Result?.resumo
  if (!scores || !resumo) return null
  return (
    'EXEMPLO — Currículo ' + label + ' (do seu banco de análises):\n' +
    'ENTRADA:\n' +
    '---\n' +
    entry.resumeText.slice(0, 800) +
    (entry.resumeText.length > 800 ? '\n[... trecho]' : '') +
    '\n---\n' +
    'SAÍDA:\n' +
    JSON.stringify({ scores, resumo }) + '\n'
  )
}

export function buildStep1Prompt({ resume, mode, bestEntry, worstEntry }) {
  const modeInstructions = {
    geral: 'Faça uma análise geral do currículo, avaliando qualidade, clareza e impacto profissional.',
    ats: 'Avalie o currículo com foco em otimização para sistemas ATS (Applicant Tracking Systems), priorizando palavras-chave, formatação e relevância.',
    rewrite: 'Avalie o currículo com olhar crítico, focando em identificar trechos que precisam de reescrita completa para maior impacto.',
  }

  const instruction = modeInstructions[mode] || modeInstructions.geral

  const dynamicWeak = buildDynamicExample(worstEntry, 'fraco')
  const dynamicStrong = buildDynamicExample(bestEntry, 'forte')

  const exampleWeak = dynamicWeak || FIXED_WEAK
  const exampleStrong = dynamicStrong || FIXED_STRONG

  return [
    'Você é ResumeForge, um avaliador de currículos honesto e criterioso. ' + instruction,
    '',
    'INSTRUÇÕES DE AVALIAÇÃO:',
    '- Seja honesto: se o currículo for realmente bom, dê notas altas (8-10). Se for fraco, dê notas baixas (1-4).',
    '- Notas 8-10 são para currículos com métricas reais, resultados concretos e stack relevante.',
    '- Notas 5-7 são para currículos medianos: têm substância mas faltam detalhes ou métricas.',
    '- Notas 1-4 são para currículos vagos, genéricos ou sem evidências de resultado.',
    '- Sempre aponte os pontos fortes, não apenas os fracos.',
    '- CONTEXTO DE ESPAÇO: currículos têm no máximo 2 páginas. Leve isso em conta ao avaliar — um currículo denso e bem aproveitado é melhor que um esparso com espaço vazio. Não penalize por falta de seções se o currículo já está no limite de espaço.',
    '',
    exampleWeak,
    '',
    exampleStrong,
    '',
    'Agora analise o currículo abaixo e retorne APENAS o JSON, sem texto adicional:',
    '',
    'CURRÍCULO:',
    '---',
    resume,
    '---',
    '',
    'Retorne SOMENTE este JSON:',
    '{',
    '  "scores": {',
    '    "impacto": <inteiro 1-10>,',
    '    "clareza": <inteiro 1-10>,',
    '    "palavras_chave": <inteiro 1-10>,',
    '    "geral": <inteiro 1-10>',
    '  },',
    '  "resumo": "<parágrafo único de diagnóstico honesto com pontos fortes e fracos>"',
    '}',
  ].join('\n')
}
