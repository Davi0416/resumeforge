/**
 * Prompt para avaliar os projetos do GitHub do candidato.
 * Retorna JSON com os projetos mais relevantes e habilidades identificadas.
 */
export function buildGithubEvalPrompt({ repos }) {
  const reposSummary = repos.map((r) => {
    const langs = Object.keys(r.languages || {}).join(', ') || r.language || 'desconhecida'
    const readmeSnippet = r.readme
      ? 'README (trecho): ' + r.readme.slice(0, 500).replace(/\n+/g, ' ')
      : 'Sem README'
    return (
      '- Nome: ' + r.name + '\n' +
      '  Descricao: ' + (r.description || 'sem descricao') + '\n' +
      '  Linguagens: ' + langs + '\n' +
      '  Stars: ' + r.stars + (r.fork ? ' (fork)' : '') + '\n' +
      '  ' + readmeSnippet
    )
  }).join('\n\n')

  return [
    'Voce e um avaliador tecnico de portfolios GitHub. Analise os repositorios abaixo e retorne APENAS o JSON.',
    '',
    'REPOSITORIOS:',
    reposSummary,
    '',
    'Retorne SOMENTE este JSON (sem texto adicional):',
    '{',
    '  "projetos_destaque": [',
    '    {',
    '      "nome": "<nome do repo>",',
    '      "impacto": "<por que este projeto impressiona ou demonstra habilidade real>",',
    '      "tecnologias": "<lista das tecnologias principais>",',
    '      "url": "<url do repo>"',
    '    }',
    '  ],',
    '  "habilidades_identificadas": {',
    '    "linguagens": ["<lista de linguagens vistas>"],',
    '    "frameworks": ["<frameworks e libs identificados nos READMEs e linguagens>"],',
    '    "areas": ["<areas de atuacao ex: backend, frontend, dados, devops, mobile>"]',
    '  },',
    '  "pontos_fortes": "<o que o portfolio demonstra de mais forte>",',
    '  "lacunas": "<o que esta faltando ou poderia ser melhorado no portfolio>"',
    '}',
    '',
    'Regras:',
    '- "projetos_destaque": selecione os 3 a 5 mais relevantes para um curriculo tech',
    '- Seja especifico sobre o impacto — mencione o que o projeto faz de verdade',
    '- Ignore repos de curso/tutorial generico (ex: hello-world, repositorio-de-estudos)',
    '- Priorize projetos com README descritivo, stars ou tecnologias relevantes',
  ].join('\n')
}
