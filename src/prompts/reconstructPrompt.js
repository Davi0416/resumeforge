/**
 * Prompt para reconstruir o curriculo completo.
 * Combina o curriculo base, a analise (step1), os projetos do GitHub e os erros encontrados.
 * Retorna JSON estruturado pronto para gerar o .docx.
 */
export function buildReconstructPrompt({ resume, job, step1Result, githubEval, mode }) {
  const jobSection = job
    ? 'VAGA ALVO:\n---\n' + job + '\n---\n'
    : ''

  const analysisSection = step1Result
    ? 'DIAGNOSTICO DA ANALISE:\n' + JSON.stringify(step1Result, null, 2) + '\n'
    : ''

  const githubSection = githubEval
    ? 'AVALIACAO DO GITHUB:\n' + JSON.stringify(githubEval, null, 2) + '\n'
    : ''

  const modeNote = {
    geral: 'Reconstrua para maximo impacto geral.',
    ats: 'Priorize palavras-chave ATS e formatacao limpa.',
    rewrite: 'Reescreva completamente as secoes fracas com linguagem de alto impacto.',
  }[mode] || 'Reconstrua para maximo impacto geral.'

  return [
    'Voce e ResumeForge, especialista em reconstrucao de curriculos tech.',
    modeNote,
    '',
    'CURRICULO ORIGINAL:',
    '---',
    resume,
    '---',
    '',
    analysisSection,
    githubSection,
    jobSection,
    'INSTRUCOES:',
    '- Use o curriculo original como base — preserve dados reais (empresas, datas, formacao)',
    '- Incorpore os projetos destaque do GitHub como secao "Projetos" se nao existir ou for fraca',
    '- Corrija os problemas identificados na analise (frases vagas, falta de metricas, etc)',
    '- Adicione habilidades identificadas no GitHub que nao estao no curriculo original',
    '- Reescreva experiencias com verbos de acao e metricas quando possivel',
    '- Mantenha no maximo 2 paginas de conteudo',
    '- Idiomas e certificacoes: preserve o que existe, adicione apenas se identificado no GitHub',
    '',
    'Retorne SOMENTE este JSON (sem texto adicional, sem markdown):',
    '{',
    '  "nome": "<nome completo>",',
    '  "titulo_profissional": "<ex: Desenvolvedor Full Stack | 3+ anos>",',
    '  "contato": {',
    '    "email": "<email>",',
    '    "telefone": "<telefone ou vazio>",',
    '    "linkedin": "<url linkedin ou vazio>",',
    '    "github": "<url github ou vazio>",',
    '    "portfolio": "<url portfolio ou vazio>"',
    '  },',
    '  "resumo_profissional": "<3-4 frases impactantes sobre o candidato>",',
    '  "experiencias": [',
    '    {',
    '      "empresa": "<nome>",',
    '      "cargo": "<cargo>",',
    '      "periodo": "<mes/ano - mes/ano ou Atual>",',
    '      "descricoes": ["<frase de impacto com verbo de acao>", "..."]',
    '    }',
    '  ],',
    '  "projetos": [',
    '    {',
    '      "nome": "<nome>",',
    '      "tecnologias": "<stack>",',
    '      "descricao": "<1-2 frases sobre o que faz e impacto>",',
    '      "url": "<link github ou deploy>"',
    '    }',
    '  ],',
    '  "habilidades": {',
    '    "linguagens": ["<lista>"],',
    '    "frameworks": ["<lista>"],',
    '    "ferramentas": ["<lista>"]',
    '  },',
    '  "formacao": [',
    '    {',
    '      "instituicao": "<nome>",',
    '      "curso": "<nome do curso>",',
    '      "periodo": "<ano inicio - ano fim ou Em andamento>"',
    '    }',
    '  ],',
    '  "idiomas": [',
    '    { "idioma": "<nome>", "nivel": "<Nativo | Fluente | Avancado | Intermediario | Basico>" }',
    '  ],',
    '  "certificacoes": ["<nome da cert (plataforma, ano)>"]',
    '}',
  ].join('\n')
}
