const OLLAMA_BASE_URL = 'http://localhost:11434'
// Use 'resumeforge' após rodar .\setup-model.ps1 (modelo customizado com system prompt dedicado)
// Por padrão usa llama3.1 que já vem instalado
const MODEL = 'qwen2.5:14b'

/**
 * Verifica se o Ollama está online e se o modelo está disponível.
 * Retorna { ok: true } ou { ok: false, reason: string, models: string[] }
 */
export async function checkModel() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    if (!res.ok) {
      return { ok: false, reason: 'ollama_error', models: [] }
    }
    const data = await res.json()
    const models = (data.models || []).map((m) => m.name)
    const available = models.some((name) => name.startsWith(MODEL))
    if (!available) {
      return { ok: false, reason: 'model_missing', models }
    }
    return { ok: true, models }
  } catch (err) {
    if (err instanceof TypeError) {
      // Erro de rede — Ollama offline ou CORS bloqueado
      return { ok: false, reason: 'offline', models: [] }
    }
    return { ok: false, reason: 'unknown', models: [] }
  }
}

/**
 * Envia um prompt ao Ollama com stream: true.
 * Retorna o ReadableStream bruto do response.body.
 * Lança erro se a requisição falhar.
 */
export async function generate(prompt, signal) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: true,
      format: 'json',
      options: { num_ctx: 8192 },
    }),
  })

  if (!res.ok) {
    throw new Error(`Ollama retornou status ${res.status}`)
  }

  return res.body
}
