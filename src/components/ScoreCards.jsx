const SCORE_LABELS = {
  impacto: 'Impacto',
  clareza: 'Clareza',
  palavras_chave: 'Palavras-chave',
  geral: 'Nota geral',
}

function scoreColor(score) {
  if (score >= 8) return 'score-high'
  if (score >= 5) return 'score-mid'
  return 'score-low'
}

export default function ScoreCards({ result }) {
  if (!result) return null
  const { scores, resumo } = result

  return (
    <section className="score-section">
      <h2>Diagnóstico</h2>
      <div className="score-cards">
        {Object.entries(SCORE_LABELS).map(([key, label]) => (
          <div key={key} className={`score-card ${scoreColor(scores[key])}`}>
            <span className="score-value">{scores[key]}</span>
            <span className="score-label">{label}</span>
            <div
              className="score-bar"
              style={{ '--pct': `${scores[key] * 10}%` }}
            />
          </div>
        ))}
      </div>
      <p className="resumo">{resumo}</p>
    </section>
  )
}
