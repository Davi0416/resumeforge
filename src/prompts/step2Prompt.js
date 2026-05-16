/**
 * Monta o prompt do Step 2 — Ação.
 *
 * O campo prompt_externo gera um prompt para ser colado em outra IA
 * junto com o PDF do currículo em anexo (sem reproduzir o texto).
 * Inclui exemplo few-shot para calibrar formato e qualidade.
 */
export function buildStep2Prompt({ resume, job, mode, step1Result }) {
  const modeInstructions = {
    geral: 'Gere sugestões gerais de melhoria para o currículo.',
    ats: 'Foque em otimizações para sistemas ATS: adicione palavras-chave, ajuste formatação e estrutura.',
    rewrite: 'Proponha reescritas completas das seções mais fracas, usando linguagem mais impactante e resultados mensuráveis.',
  }

  const instruction = modeInstructions[mode] || modeInstructions.geral

  const jobSection = job
    ? 'DESCRIÇÃO DA VAGA:\n---\n' + job + '\n---\n\n'
    : ''

  const adaptacaoVagaSchema = job
    ? `  "adaptacao_vaga": {
    "match_score": <inteiro de 1 a 10, compatibilidade curriculo x vaga>,
    "palavras_faltando": ["palavra1", "palavra2"],
    "secoes_adaptar": [
      {
        "secao": "<nome da secao>",
        "motivo": "<por que adaptar>",
        "sugestao": "<texto reescrito>"
      }
    ],
    "o_que_destacar": "<string com o que o candidato deve destacar para esta vaga>",
    "o_que_remover": "<string com o que pode ser removido por nao ser relevante para esta vaga>"
  },`
    : ''

  const adaptacaoVagaNote = job
    ? '- "adaptacao_vaga": obrigatorio pois uma vaga foi fornecida'
    : '- "adaptacao_vaga": NAO incluir pois nenhuma vaga foi fornecida'

  const promptExternoRegra =
    '- "prompt_externo": o usuario vai colar este texto em outra IA ' +
    '(ChatGPT, Claude, Gemini) E VAI ANEXAR O PDF DO CURRICULO junto. ' +
    'Por isso o prompt NAO deve reproduzir o texto do curriculo. ' +
    'Ele deve: (1) informar que o curriculo esta em anexo como PDF, ' +
    '(2) listar de forma numerada e detalhada cada melhoria do campo ' +
    '"mudancas" com titulo, descricao e exemplo, ' +
    '(3) pedir que a IA aplique todas as melhorias diretamente no ' +
    'documento preservando o formato original.'

  const fewShotExample =
    'EXEMPLO DE DIAGNOSTICO DO STEP 1:\n' +
    '{"scores":{"impacto":3,"clareza":5,"palavras_chave":4,"geral":4},' +
    '"resumo":"Curriculo vago, sem resultados mensuraveis e verbos fracos."}\n' +
    '\n' +
    'EXEMPLO DE SAIDA ESPERADA DO STEP 2:\n' +
    '{"mudancas":[' +
    '{"tipo":"rewrite","titulo":"Reescrever experiencias com resultados",' +
    '"descricao":"As descricoes atuais usam verbos fracos e nao mostram impacto. Reescreva com verbos de acao e metricas concretas.",' +
    '"exemplo":"Antes: Trabalhou com React (2020-2023)\\nDepois: Desenvolveu 8 features em React/TypeScript para plataforma SaaS com 5k usuarios ativos, reduzindo tempo de carregamento em 35%"},' +
    '{"tipo":"add","titulo":"Adicionar secao de projetos",' +
    '"descricao":"Candidatos sem projetos listados sao descartados por 70% dos recrutadores tech. Adicione 2-3 projetos relevantes.",' +
    '"exemplo":"Projetos: E-commerce API (Node.js + PostgreSQL) — processando 500 pedidos/dia em producao. GitHub: github.com/ana/ecommerce-api"}' +
    '],' +
    '"prompt_externo":"Tenho meu curriculo em anexo (PDF). Por favor, aplique as seguintes melhorias:\\n\\n1. REESCREVER EXPERIENCIAS: substitua descricoes vagas por frases com verbos de acao e metricas. Exemplo — Antes: Trabalhou com React. Depois: Desenvolveu X features em React para Y usuarios, obtendo Z resultado.\\n\\n2. ADICIONAR PROJETOS: inclua uma secao Projetos com 2-3 projetos tecnicos com nome, tecnologias usadas e impacto mensuravel.\\n\\nMantenha o formato e estrutura originais do documento."}\n'

  const body = [
    'Voce e ResumeForge. ' + instruction,
    '',
    fewShotExample,
    'Agora gere as sugestoes para o curriculo abaixo. Retorne APENAS o JSON:',
    '',
    'DIAGNOSTICO DO STEP 1:',
    JSON.stringify(step1Result, null, 2),
    '',
    'CURRICULO:',
    '---',
    resume,
    '---',
    '',
    jobSection + 'Retorne SOMENTE este JSON:',
    '{',
    '  "mudancas": [',
    '    {',
    '      "tipo": "<add | edit | remove | rewrite>",',
    '      "titulo": "<titulo curto>",',
    '      "descricao": "<o que mudar e por que>",',
    '      "exemplo": "<antes -> depois concreto>"',
    '    }',
    '  ],',
    adaptacaoVagaSchema,
    '  "prompt_externo": "<prompt para colar em outra IA junto com o PDF em anexo>"',
    '}',
    '',
    'Regras:',
    '- "mudancas": entre 5 e 10 itens',
    '- Tipos: add | edit | remove | rewrite',
    '- Exemplos devem ser concretos com antes e depois real',
    '- LIMITE DE ESPACO: o curriculo tem no maximo 2 paginas. Sugestoes do tipo "add" so sao validas se houver espaco real (ex: remover algo para abrir espaco, ou condensar texto existente). Nunca sugira adicionar secoes inteiras sem considerar o espaco disponivel.',
    '- Prefira sugestoes de rewrite e edit que melhorem o impacto sem aumentar o tamanho, ou sugestoes de remove que liberem espaco para algo mais valioso.',
    promptExternoRegra,
    adaptacaoVagaNote,
  ].join('\n')

  return body
}
