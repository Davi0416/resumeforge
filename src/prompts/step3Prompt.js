/**
 * Step 3 — Avaliação dos projetos do GitHub vs currículo.
 *
 * Recebe: currículo atual + lista enriquecida de repos do GitHub.
 * Produz: JSON com os melhores projetos para incluir, os fracos para remover
 * e skills descobertas que não estão no currículo.
 */
export function buildStep3Prompt({ resume, repos }) {
  const reposSummary = repos.map((r, i) => {
    const langs = r.languages && r.languages.length > 0
      ? 'Linguagens: ' + r.languages.join(', ')
      : ''
    const readme = r.readme_excerpt ? 'README: ' + r.readme_excerpt.slice(0, 300) : ''
    return (
      (i + 1) + '. ' + r.name + (r.stars > 0 ? ' (' + r.stars + ' ★)' : '') + '\n' +
      '   Descrição: ' + (r.description || 'sem descrição') + '\n' +
      (langs ? '   ' + langs + '\n' : '') +
      (r.topics && r.topics.length > 0 ? '   Tópicos: ' + r.topics.join(', ') + '\n' : '') +
      (readme ? '   ' + readme + '\n' : '') +
      '   URL: ' + r.url
    )
  }).join('\n\n')

  return [
    'Você é ResumeForge. Sua tarefa é avaliar os projetos do GitHub de um candidato e compará-los com o currículo atual.',
    '',
    'CURRÍCULO ATUAL:',
    '---',
    resume,
    '---',
    '',
    'REPOSITÓRIOS DO GITHUB (ordenados por estrelas):',
    '---',
    reposSummary,
    '---',
    '',
    'Analise criticamente e retorne APENAS este JSON:',
    '{',
    '  "melhores_projetos": [',
    '    {',
    '      "repo": "<nome exato do repo no GitHub>",',
    '      "titulo": "<título para aparecer no currículo (mais descritivo que o nome do repo)>",',
    '      "descricao": "<1-2 frases de impacto para o currículo, com verbos de ação e resultado>",',
    '      "tecnologias": ["tech1", "tech2"],',
    '      "url": "<url do repo>",',
    '      "motivo": "<por que este projeto é forte para o currículo>"',
    '    }',
    '  ],',
    '  "projetos_remover": [',
    '    {',
    '      "nome": "<nome do projeto que está no currículo>",',
    '      "motivo": "<por que remover ou substituir>"',
    '    }',
    '  ],',
    '  "skills_descobertas": ["<skill que aparece nos repos mas NÃO está no currículo>"],',
    '  "avaliacao_geral": "<parágrafo avaliando os projetos do GitHub vs o que está no currículo>"',
    '}',
    '',
    'Regras:',
    '- "melhores_projetos": escolha entre 2 e 4 projetos que realmente agreguem valor ao currículo',
    '- Prefira projetos originais (não forks), com README, com estrelas ou com tecnologias relevantes',
    '- "projetos_remover": só liste projetos do currículo que sejam claramente inferiores aos do GitHub',
    '- "skills_descobertas": skills reais vistas nos repos que o candidato não listou no currículo',
    '- Seja honesto: se os projetos do GitHub forem fracos, diga isso na avaliacao_geral',
  ].join('\n')
}
