/**
 * Valida o objeto retornado pelo Step 1.
 * Lança Error se os campos obrigatórios faltarem ou tiverem tipo errado.
 *
 * Schema esperado:
 * {
 *   scores: { impacto, clareza, palavras_chave, geral }  <- inteiros 1–10
 *   resumo: string
 * }
 */
export function validateStep1(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Resposta do Step 1 não é um objeto JSON válido.')
  }

  if (!obj.scores || typeof obj.scores !== 'object') {
    throw new Error('Campo "scores" ausente ou inválido no Step 1.')
  }

  const scoreFields = ['impacto', 'clareza', 'palavras_chave', 'geral']
  for (const field of scoreFields) {
    const val = obj.scores[field]
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 10) {
      throw new Error(
        `Campo scores.${field} deve ser um inteiro entre 1 e 10. Recebido: ${JSON.stringify(val)}`
      )
    }
  }

  if (typeof obj.resumo !== 'string' || obj.resumo.trim() === '') {
    throw new Error('Campo "resumo" ausente ou vazio no Step 1.')
  }
}

/**
 * Valida o objeto retornado pelo Step 2.
 * Lança Error se os campos obrigatórios faltarem ou tiverem tipo errado.
 *
 * Schema esperado:
 * {
 *   mudancas: Array (mín 1, máx 10) de { tipo, titulo, descricao, exemplo }
 *   adaptacao_vaga?: { match_score, palavras_faltando, secoes_adaptar, o_que_destacar, o_que_remover }
 *   prompt_externo: string
 * }
 */
export function validateStep2(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Resposta do Step 2 não é um objeto JSON válido.')
  }

  if (!Array.isArray(obj.mudancas) || obj.mudancas.length === 0) {
    throw new Error('Campo "mudancas" ausente ou vazio no Step 2.')
  }

  const tiposValidos = ['add', 'edit', 'remove', 'rewrite']
  for (let i = 0; i < obj.mudancas.length; i++) {
    const m = obj.mudancas[i]
    if (!tiposValidos.includes(m.tipo)) {
      throw new Error(
        `mudancas[${i}].tipo inválido: "${m.tipo}". Esperado: ${tiposValidos.join(' | ')}`
      )
    }
    if (typeof m.titulo !== 'string' || m.titulo.trim() === '') {
      throw new Error(`mudancas[${i}].titulo ausente ou vazio.`)
    }
    if (typeof m.descricao !== 'string' || m.descricao.trim() === '') {
      throw new Error(`mudancas[${i}].descricao ausente ou vazia.`)
    }
    if (typeof m.exemplo !== 'string') {
      throw new Error(`mudancas[${i}].exemplo ausente.`)
    }
  }

  if (typeof obj.prompt_externo !== 'string' || obj.prompt_externo.trim() === '') {
    throw new Error('Campo "prompt_externo" ausente ou vazio no Step 2.')
  }

  // adaptacao_vaga é opcional — só valida se presente
  if (obj.adaptacao_vaga !== undefined) {
    const av = obj.adaptacao_vaga
    if (typeof av.match_score !== 'number') {
      throw new Error('adaptacao_vaga.match_score deve ser um número.')
    }
    if (!Array.isArray(av.palavras_faltando)) {
      throw new Error('adaptacao_vaga.palavras_faltando deve ser um array.')
    }
    if (!Array.isArray(av.secoes_adaptar)) {
      throw new Error('adaptacao_vaga.secoes_adaptar deve ser um array.')
    }
  }
}

/**
 * Valida o objeto retornado pelo Step 3 (avaliação GitHub).
 */
export function validateStep3(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Resposta do Step 3 não é um objeto JSON válido.')
  }
  if (!Array.isArray(obj.melhores_projetos)) {
    throw new Error('Campo "melhores_projetos" ausente no Step 3.')
  }
  if (!Array.isArray(obj.skills_descobertas)) {
    throw new Error('Campo "skills_descobertas" ausente no Step 3.')
  }
  if (typeof obj.avaliacao_geral !== 'string') {
    throw new Error('Campo "avaliacao_geral" ausente no Step 3.')
  }
}

/**
 * Valida o objeto retornado pelo Step 4 (currículo reconstruído).
 */
export function validateStep4(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Resposta do Step 4 não é um objeto JSON válido.')
  }
  if (typeof obj.nome !== 'string' || obj.nome.trim() === '') {
    throw new Error('Campo "nome" ausente no Step 4.')
  }
  if (!Array.isArray(obj.experiencias)) {
    throw new Error('Campo "experiencias" ausente no Step 4.')
  }
  if (!Array.isArray(obj.habilidades_tecnicas)) {
    throw new Error('Campo "habilidades_tecnicas" ausente no Step 4.')
  }
}
