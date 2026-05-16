const MAX_RESUME_CHARS = 12000
const MAX_JOB_CHARS = 4000
const TOKEN_WARNING_THRESHOLD = 6400 // estimativa: 1 token ≈ 3 chars (num_ctx 8192)

/**
 * Valida os inputs antes de habilitar o botão de análise.
 * Retorna { valid: boolean, errors: string[], tokenWarning: boolean }
 */
export function validate(resume, job) {
  const errors = []

  if (!resume || resume.trim() === '') {
    errors.push('O currículo não pode estar vazio.')
  } else if (resume.length > MAX_RESUME_CHARS) {
    errors.push(
      `O currículo ultrapassou o limite de ${MAX_RESUME_CHARS.toLocaleString('pt-BR')} caracteres (atual: ${resume.length.toLocaleString('pt-BR')}).`
    )
  }

  if (job && job.length > MAX_JOB_CHARS) {
    errors.push(
      `A descrição da vaga ultrapassou o limite de ${MAX_JOB_CHARS.toLocaleString('pt-BR')} caracteres (atual: ${job.length.toLocaleString('pt-BR')}).`
    )
  }

  const estimatedTokens = Math.ceil((resume.length + (job?.length ?? 0)) / 3)
  const tokenWarning = errors.length === 0 && estimatedTokens > TOKEN_WARNING_THRESHOLD

  return {
    valid: errors.length === 0,
    errors,
    tokenWarning,
    estimatedTokens,
  }
}

export const limits = { MAX_RESUME_CHARS, MAX_JOB_CHARS }
