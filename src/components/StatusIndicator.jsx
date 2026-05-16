const MESSAGES = {
  idle: null,
  checking: 'Verificando conexão com o Ollama...',
  streaming_1: 'Step 1 — Diagnosticando o currículo...',
  streaming_2: 'Step 2 — Gerando sugestões de melhoria...',
  partial: null,
  success: null,
  error: null,
}

export default function StatusIndicator({ appState, streamingStep }) {
  let key = appState
  if (appState === 'streaming') key = `streaming_${streamingStep}`

  const message = MESSAGES[key]
  if (!message) return null

  return (
    <div className="status-indicator">
      <span className="spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
