/**
 * ApiService — consome a API Python via SSE (Server-Sent Events sobre fetch).
 * Substitui os orchestrators JS migrados para o backend.
 */

function parseSseStream(reader, onEvent) {
  const decoder = new TextDecoder()
  let buffer = ''

  async function pump() {
    let currentEvent = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // última linha pode estar incompleta

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          try {
            const payload = JSON.parse(line.slice(6))
            if (currentEvent) {
              onEvent(currentEvent, payload)
              currentEvent = null
            }
          } catch { /* ignora linha malformada */ }
        } else if (line === '') {
          currentEvent = null // reset entre mensagens
        }
      }
    }
  }

  return pump()
}

/**
 * Inicia análise via SSE. Retorna { cancel }.
 */
export function analyze({ resume, job, mode }, callbacks) {
  const controller = new AbortController()

  async function run() {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, job, mode }),
      })
      if (!res.ok) throw new Error(`Servidor retornou ${res.status}`)

      await parseSseStream(res.body.getReader(), (event, payload) => {
        switch (event) {
          case 'checking':       callbacks.onChecking?.(); break
          case 'streaming':      callbacks.onStreaming?.(payload.step); break
          case 'step1_complete': callbacks.onStep1Complete?.(payload); break
          case 'step2_complete': callbacks.onStep2Complete?.(payload); break
          case 'step2_error':    callbacks.onStep2Error?.(payload.message); break
          case 'error':          callbacks.onError?.(payload.message); break
          case 'done':           break
        }
      })
    } catch (err) {
      if (err.name === 'AbortError') {
        callbacks.onAbort?.()
      } else {
        callbacks.onError?.(err.message)
      }
    }
  }

  run()
  return { cancel: () => controller.abort() }
}

/**
 * Inicia reconstrução via SSE. Retorna { cancel }.
 */
export function reconstruct({ resume, job, mode, githubUsername, step1Result }, callbacks) {
  const controller = new AbortController()

  async function run() {
    try {
      const res = await fetch('/api/reconstruct', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, job, mode, githubUsername, step1Result }),
      })
      if (!res.ok) throw new Error(`Servidor retornou ${res.status}`)

      await parseSseStream(res.body.getReader(), (event, payload) => {
        switch (event) {
          case 'fetching_github':  callbacks.onFetchingGithub?.(payload); break
          case 'github_warning':   callbacks.onGithubWarning?.(payload.message); break
          case 'evaluating':       callbacks.onEvaluating?.(); break
          case 'reconstructing':   callbacks.onReconstructing?.(); break
          case 'generating_docx':  callbacks.onGeneratingDocx?.(); break
          case 'scoring':          callbacks.onScoring?.(); break
          case 'complete': {
            const bytes = Uint8Array.from(atob(payload.docx_b64), c => c.charCodeAt(0))
            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
            callbacks.onComplete?.(blob, payload.data, payload.filename, payload.scores_antes, payload.scores_depois)
            break
          }
          case 'error': callbacks.onError?.(payload.message); break
        }
      })
    } catch (err) {
      if (err.name === 'AbortError') callbacks.onAbort?.()
      else callbacks.onError?.(err.message)
    }
  }

  run()
  return { cancel: () => controller.abort() }
}

/**
 * Histórico
 */
export async function getHistory() {
  const r = await fetch('/api/history')
  if (!r.ok) throw new Error('Erro ao buscar histórico')
  return r.json()
}

export async function deleteHistory(id) {
  const r = await fetch(`/api/history/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Erro ao remover entrada')
  return r.json()
}

/**
 * Configurações
 */
export async function getSettings() {
  const r = await fetch('/api/settings')
  return r.json()
}

export async function saveSettings({ githubToken, apilayerKey }) {
  const r = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ githubToken, apilayerKey }),
  })
  return r.json()
}

/**
 * Parse de PDF via backend (APILayer)
 */
export async function parsePdf(file) {
  const form = new FormData()
  form.append('file', file)
  const r = await fetch('/api/pdf/parse', { method: 'POST', body: form })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: 'Erro desconhecido' }))
    throw new Error(err.detail || 'Erro no parse')
  }
  return r.json() // { text, structured }
}
