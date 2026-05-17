import { useState, useRef } from 'react'
import { reconstruct } from '../services/ApiService.js'

const STEPS = {
  idle: null,
  fetching: 'Lendo repositórios do GitHub...',
  evaluating: 'Avaliando projetos com IA...',
  reconstructing: 'Reconstruindo currículo...',
  generating: 'Gerando arquivo Word...',
  done: 'Concluído!',
  error: null,
}

export default function ReconstructPanel({ resume, job, mode, step1Result }) {
  const [githubUsername, setGithubUsername] = useState('')
  const [state, setState]     = useState('idle')
  const [progress, setProgress] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [warning, setWarning]   = useState(null)
  const [downloadUrl, setDownloadUrl]   = useState(null)
  const [downloadName, setDownloadName] = useState('curriculo-reconstruido.docx')
  const cancelRef = useRef(null)

  const isRunning = state !== 'idle' && state !== 'done' && state !== 'error'

  function handleStart() {
    if (!resume.trim()) return
    setErrorMsg(null); setWarning(null); setDownloadUrl(null)
    setState('fetching'); setProgress(null)

    const handle = reconstruct(
      { resume, job, mode, githubUsername: githubUsername.trim(), step1Result },
      {
        onFetchingGithub: (p) => { setState('fetching'); setProgress(p) },
        onEvaluating:     ()  => { setState('evaluating'); setProgress(null) },
        onReconstructing: ()  => setState('reconstructing'),
        onGeneratingDocx: ()  => setState('generating'),
        onGithubWarning:  (msg) => setWarning(msg),
        onComplete: (blob, _data, filename) => {
          const url = URL.createObjectURL(blob)
          setDownloadUrl(url)
          setDownloadName(filename || 'curriculo-reconstruido.docx')
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
        </div>
      )}
    </div>
  )
}
