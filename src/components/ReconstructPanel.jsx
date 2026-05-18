import { useState, useRef } from 'react'
import { reconstruct } from '../services/ApiService.js'

const STEPS = {
  idle: null,
  fetching: 'Lendo repositórios do GitHub...',
  evaluating: 'Avaliando projetos com IA...',
  reconstructing: 'Reconstruindo currículo...',
  generating: 'Gerando arquivo Word...',
  scoring: 'Calculando melhoria...',
  done: 'Concluído!',
  error: null,
}

const SCORE_LABELS = { geral: 'Geral', impacto: 'Impacto', clareza: 'Clareza', palavras_chave: 'Keywords' }

function ScoreComparison({ before, after }) {
  if (!before && !after) return null
  const keys = Object.keys(SCORE_LABELS)
  return (
    <div className="score-comparison">
      <h3 className="score-comparison-title">📊 Antes × Depois</h3>
      <div className="score-comparison-grid">
        {keys.map(key => {
          const a = before?.[key]
          const b = after?.[key]
          const diff = (a != null && b != null) ? (b - a) : null
          const diffColor = diff > 0 ? 'var(--color-high)' : diff < 0 ? 'var(--color-low)' : 'var(--color-mid)'
          return (
            <div key={key} className="score-comparison-row">
              <span className="score-comparison-label">{SCORE_LABELS[key]}</span>
              <span className="score-comparison-before">{a != null ? a.toFixed(1) : '—'}</span>
              <span className="score-comparison-arrow">→</span>
              <span className="score-comparison-after">{b != null ? b.toFixed(1) : '—'}</span>
              {diff != null && (
                <span className="score-comparison-diff" style={{ color: diffColor }}>
                  {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ReconstructPanel({ resume, job, mode, step1Result }) {
  const [githubUsername, setGithubUsername] = useState('')
  const [state, setState]     = useState('idle')
  const [progress, setProgress] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [warning, setWarning]   = useState(null)
  const [downloadUrl, setDownloadUrl]   = useState(null)
  const [downloadName, setDownloadName] = useState('curriculo-reconstruido.docx')
  const [scoresBefore, setScoresBefore] = useState(null)
  const [scoresAfter, setScoresAfter]   = useState(null)
  const cancelRef = useRef(null)

  const isRunning = state !== 'idle' && state !== 'done' && state !== 'error'

  function handleStart() {
    if (!resume.trim()) return
    setErrorMsg(null); setWarning(null); setDownloadUrl(null); setScoresBefore(null); setScoresAfter(null)
    setState('fetching'); setProgress(null)

    const handle = reconstruct(
      { resume, job, mode, githubUsername: githubUsername.trim(), step1Result },
      {
        onFetchingGithub: (p) => { setState('fetching'); setProgress(p) },
        onEvaluating:     ()  => { setState('evaluating'); setProgress(null) },
        onReconstructing: ()  => setState('reconstructing'),
        onGeneratingDocx: ()  => setState('generating'),
        onScoring:        ()  => setState('scoring'),
        onGithubWarning:  (msg) => setWarning(msg),
        onComplete: (blob, _data, filename, scoresBef, scoresAft) => {
          const url = URL.createObjectURL(blob)
          setDownloadUrl(url)
          setDownloadName(filename || 'curriculo-reconstruido.docx')
          setScoresBefore(scoresBef || null)
          setScoresAfter(scoresAft || null)
          setState('done')
          cancelRef.current = null
        },
        onError: (msg) => { setErrorMsg(msg); setState('error'); cancelRef.current = null },
        onAbort: ()    => { setState('idle'); cancelRef.current = null },
      }
    )
    cancelRef.current = handle
  }

  function handleCancel() { cancelRef.current?.cancel() }

  function handleReset() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null); setState('idle'); setErrorMsg(null); setWarning(null); setProgress(null)
    setScoresBefore(null); setScoresAfter(null)
  }

  return (
    <div className="reconstruct-panel">
      <div className="reconstruct-header">
        <h2>🔨 Reconstrutor de Currículo</h2>
        <p className="reconstruct-desc">
          Lê seus repositórios do GitHub, avalia seus projetos com IA e reconstrói
          o currículo incorporando o que encontrou — corrigindo os problemas da análise.
          Baixa como <strong>.docx</strong> formatado e pronto para enviar.
        </p>
      </div>

      {warning && <div className="alert alert-warning">{warning}</div>}

      <div className="reconstruct-form">
        <div className="field">
          <label htmlFor="github-user">Usuário do GitHub</label>
          <input
            id="github-user"
            type="text"
            value={githubUsername}
            onChange={e => setGithubUsername(e.target.value)}
            placeholder="ex: torvalds"
            disabled={isRunning}
            autoComplete="off"
          />
          <span className="field-hint">
            Deixe em branco para usar o usuário autenticado pelo token configurado em ⚙️.
          </span>
        </div>

        <div className="reconstruct-actions">
          {!isRunning && state !== 'done' && (
            <button className="btn btn-primary btn-reconstruct" onClick={handleStart} disabled={!resume.trim()}>
              🔨 Reconstruir currículo
            </button>
          )}
          {isRunning  && <button className="btn btn-cancel" onClick={handleCancel}>Cancelar</button>}
          {state === 'done' && <button className="btn btn-cancel" onClick={handleReset}>Reconstruir novamente</button>}
        </div>
      </div>

      {isRunning && (
        <div className="reconstruct-progress">
          <div className="progress-spinner" />
          <div className="progress-text">
            <span>{STEPS[state] || '...'}</span>
            {state === 'fetching' && progress?.total > 0 && (
              <span className="progress-detail">{progress.current}/{progress.total} — {progress.name}</span>
            )}
          </div>
        </div>
      )}

      {state === 'error' && errorMsg && (
        <div className="alert alert-error">
          <strong>Erro:</strong> {errorMsg}
          <br />
          <button className="btn btn-retry" onClick={handleReset} style={{ marginTop: '0.5rem' }}>Tentar novamente</button>
        </div>
      )}

      {state === 'done' && downloadUrl && (
        <div className="reconstruct-done">
          <div className="done-icon">✅</div>
          <p>Currículo reconstruído com sucesso!</p>
          <a href={downloadUrl} download={downloadName} className="btn btn-primary btn-download">
            ⬇ Baixar {downloadName}
          </a>
          <ScoreComparison before={scoresBefore} after={scoresAfter} />
          {!scoresAfter && (
            <p className="score-comparison-hint">
              Complete uma análise antes de reconstruir para ver a comparação de scores.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
