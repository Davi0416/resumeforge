/**
 * Integração com APILayer Resume Parser.
 * https://apilayer.com/marketplace/resume_parser-api
 *
 * Fluxo:
 *   1. Usuário configura a API key nas Settings (armazenada no localStorage)
 *   2. Ao importar PDF, tenta fazer parse estruturado via APILayer
 *   3. Se falhar ou não houver key, App faz fallback para extração raw (PDF.js)
 */

const ENDPOINT = 'https://api.apilayer.com/resume_parser/upload'
const STORAGE_KEY = 'resumeforge_apilayer_key'

/** Salva a API key no localStorage */
export function saveApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim())
}

/** Lê a API key do localStorage */
export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

/** Remove a API key do localStorage */
export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Faz o parse estruturado de um arquivo PDF via APILayer.
 * Retorna o texto formatado para o Ollama ou lança erro.
 *
 * @param {File} file
 * @returns {Promise<string>} texto estruturado pronto para o prompt
 */
export async function parseResume(file) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('API key não configurada.')

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { apikey: apiKey },
    body: formData,
  })

  if (res.status === 401) throw new Error('API key inválida ou expirada.')
  if (res.status === 429) throw new Error('Limite de requisições atingido. Aguarde e tente novamente.')
  if (!res.ok) throw new Error(`Erro na API: status ${res.status}`)

  const data = await res.json()
  return formatParsedResume(data)
}

/**
 * Converte o JSON estruturado da APILayer em texto legível e organizado
 * para ser enviado ao Ollama como input do currículo.
 */
function formatParsedResume(data) {
  const lines = []

  // Cabeçalho de contato
  if (data.name) lines.push(`NOME: ${data.name}`)
  if (data.email) lines.push(`EMAIL: ${data.email}`)
  if (data.phone) lines.push(`TELEFONE: ${data.phone}`)
  if (data.address) lines.push(`LOCALIZAÇÃO: ${data.address}`)
  if (data.linkedin) lines.push(`LINKEDIN: ${data.linkedin}`)
  if (lines.length > 0) lines.push('')

  // Resumo / objetivo
  if (data.summary) {
    lines.push('RESUMO PROFISSIONAL:')
    lines.push(data.summary)
    lines.push('')
  }

  // Experiência profissional
  if (data.work_experience?.length > 0) {
    lines.push('EXPERIÊNCIA PROFISSIONAL:')
    for (const exp of data.work_experience) {
      const period = [exp.date_start, exp.date_end].filter(Boolean).join(' – ')
      lines.push(`  ${exp.title || 'Cargo'} | ${exp.company || 'Empresa'}${period ? ' | ' + period : ''}`)
      if (exp.description) {
        lines.push(`  ${exp.description}`)
      }
      lines.push('')
    }
  }

  // Educação
  if (data.education?.length > 0) {
    lines.push('FORMAÇÃO ACADÊMICA:')
    for (const edu of data.education) {
      const period = [edu.date_start, edu.date_end].filter(Boolean).join(' – ')
      lines.push(`  ${edu.degree || 'Curso'} | ${edu.school || 'Instituição'}${period ? ' | ' + period : ''}`)
    }
    lines.push('')
  }

  // Habilidades
  if (data.skills?.length > 0) {
    lines.push('HABILIDADES:')
    lines.push('  ' + (Array.isArray(data.skills)
      ? data.skills.map(s => typeof s === 'string' ? s : s.name || s).join(', ')
      : data.skills))
    lines.push('')
  }

  // Idiomas
  if (data.languages?.length > 0) {
    lines.push('IDIOMAS:')
    lines.push('  ' + data.languages.map(l =>
      typeof l === 'string' ? l : `${l.name || l}${l.level ? ' (' + l.level + ')' : ''}`
    ).join(', '))
    lines.push('')
  }

  // Certificações
  if (data.certifications?.length > 0) {
    lines.push('CERTIFICAÇÕES:')
    for (const cert of data.certifications) {
      lines.push(`  ${typeof cert === 'string' ? cert : cert.name || cert}`)
    }
    lines.push('')
  }

  const result = lines.join('\n').trim()
  if (!result) throw new Error('Parser não extraiu nenhum dado do currículo.')
  return result
}
