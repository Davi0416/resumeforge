import { useState, useEffect } from 'react'
import * as HistoryService from '../services/HistoryService.js'

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ScoreBadge({ label, value }) {
  const color = value >= 7 ? 'var(--score-high)' : value >= 5 ? 'var(--score-mid)' : 'var(--score-low)'
  return (
    <span className="history-score-badge" style={{ '--badge-color': color }}>
      {label} {value}
    </span>
  )
}

export default function HistoryPanel({ onClose }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    HistoryService.getAll()
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [])

  async function handleRemove(id) {
    await HistoryService.remove(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (expanded === id) setExpanded(null)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Histórico de análises</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading && <p className="history-empty">Carregando...</p>}

        {!loading && entries.length === 0 && (
          <p className="history-empty">
            Nenhuma análise salva ainda. Complete uma análise para ela aparecer aqui.
          </p>
        )}

        {!loading && entries.length > 0 && (
          <div className="history-list">
            <p className="history-meta">
              {entries.length} análise{entries.length !== 1 ? 's' : ''} salva{entries.length !== 1 ? 's' : ''}.
              Os melhores e piores exemplos são usados automaticamente para calibrar as próximas análises.
            </p>

            {entries.map((entry) => {
              const scores = entry.step1Result?.scores
              const isOpen = expanded === entry.id
              return (
                <div key={entry.id} className={`history-entry ${isOpen ? 'history-entry-open' : ''}`}>
                  <div className="history-entry-header" onClick={() => setExpanded(isOpen ? null : entry.id)}>
                    <div className="history-entry-meta">
                      <span className="history-date">{formatDate(entry.date)}</span>
                      <span className="history-mode">{entry.mode}</span>
                    </div>
                    {scores && (
                      <div className="history-scores">
                        <ScoreBadge label="Geral" value={scores.geral} />
                        <ScoreBadge label="Impacto" value={scores.impacto} />
                        <ScoreBadge label="Clareza" value={scores.clareza} />
                        <ScoreBadge label="Keywords" value={scores.palavras_chave} />
                      </div>
                    )}
                    <span className="history-toggle">{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {isOpen && (
                    <div className="history-entry-body">
                      {entry.step1Result?.resumo && (
                        <p className="history-resumo">{entry.step1Result.resumo}</p>
                      )}
                      <div className="history-resume-preview">
                        <strong>Trecho do currículo:</strong>
                        <pre>{entry.resumeText.slice(0, 300)}{entry.resumeText.length > 300 ? '...' : ''}</pre>
                      </div>
                      <button
                        className="btn btn-danger-sm"
                        onClick={() => handleRemove(entry.id)}
                      >
                        🗑 Remover do histórico
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
