/**
 * Lê o ReadableStream do Ollama chunk a chunk,
 * acumula o campo "response" de cada linha JSON,
 * sanitiza e faz JSON.parse() do resultado.
 *
 * Lança SyntaxError se o JSON final for inválido.
 */
export async function collect(stream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let raw = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // Cada chunk pode conter múltiplas linhas JSON separadas por '\n'
    const text = decoder.decode(value, { stream: true })
    const lines = text.split('\n').filter((l) => l.trim() !== '')

    for (const line of lines) {
      let chunk
      try {
        chunk = JSON.parse(line)
      } catch {
        // linha incompleta — ignora e continua
        continue
      }
      raw += chunk.response ?? ''
      if (chunk.done) break
    }
  }

  return parseJSON(raw)
}

/**
 * Remove blocos de markdown (```json ... ```) e faz JSON.parse.
 * Lança SyntaxError se o texto não for JSON válido.
 */
function parseJSON(text) {
  const clean = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  return JSON.parse(clean)
}
