export default function AnalyzeButton({ appState, isValid, onAnalyze, onCancel }) {
  const isProcessing = appState === 'checking' || appState === 'streaming'

  if (isProcessing) {
    return (
      <div className="button-row">
        <button className="btn btn-cancel" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="button-row">
      <button
        className="btn btn-primary"
        onClick={onAnalyze}
        disabled={!isValid}
      >
        Analisar currículo
      </button>
    </div>
  )
}
