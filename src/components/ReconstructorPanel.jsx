import { useState, useRef } from 'react'
import * as ReconstructorOrchestrator from '../orchestrators/ReconstructorOrchestrator.js'
import { generateDocx, downloadBlob } from '../utils/generateDocx.js'

const STAGES = {
  idle: null,
  checking: 'Verificando Ollama...',
  github: 'Buscando repositórios do GitHub...',
  analyzing: 'Analisando currículo (Step 1)...',
  evaluating: 'Avaliando projetos do GitHub (Step 3)...',
  reconstructing: 'Reconstruindo currículo (Step 4)...',
  generating: 'Gerando arquivo Word...',
  done: null,
  error: null,
}

export default function ReconstructorPanel({ resume }) {
  const [githubUrl, setGithubUrl] = useState('')
  const [stage, setStage] = useState('idle')
  const [repoCount, setRepoCount] = useState(null)
  const [step3Result, setStep3Result] = useState(null)
  const [step4Result, setStep4Result] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const cancelRef = useRef(null)

  const isRunning = !['idle', 'done', 'error'].includes(stage)
  const canRun = resume.trim().length > 100 && githubUrl.trim().length > 3 && !isRunning

  function handleStart() {
    setStage('checking')
    setStep3Result(null)
    setStep4Result(null)
    setErrorMsg(null)
    setRepoCount(null)

    const handle = ReconstructorOrchestrator.run(
      { resume, githubUrl, mode: 'geral' },
      {
        onFetchingGitHub: () => setStage('github'),
        onReposFetched: (total, enriched) => setRepoCount({ total, enriched }),
        onAnalyzing: () => setStage('analyzing'),
        onStep1Complete: () => {},
        onEvaluating: () => setStage('evaluating'),
        onStep3Complete: (r) => setStep3Result(r),
        onReconstructing: () => setStage('reconstructing'),
        onComplete: (s3, s4) => {
          setStep3Result(s3)
          setStep4Result(s4)
          setStage('done')
          cancelRef.current = null
        },
        onError: (msg) => {
          setErrorMsg(msg)
          setStage('error')
          cancelRef.current = null
        },
        onAbort: () => {
          setStage('idle')
          cancelRef.current = null
        },
      }
    )
    cancelRef.current = handle
  }

  function handleCancel() {
    cancelRef.current?.cancel()
  }

  async function handleDownload() {
    if (!step4Result) return
    setDownloading(true)
    try {
      const blob = await generateDocx(step4Result)
      const nome = step4Result.nome?.replace(/\s+/g, '-').toLowerCase() || 'curriculo'
      downloadBlob(blob, `${nome}-reconstruido.docx`)
    } catch (err) {
      alert('Erro ao gerar o Word: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  function handleReset() {
    setStage('idle')
    setStep3Result(null)
    setStep4Result(null)
    setErrorMsg(null)
    setRepoCount(null)
  }

  return (
    <div className="reconstructor-panel">
      <div className="reconstructor-intro">
        <h2>Reconstrutor de Currículo</h2>
        <p>
          Informa o seu GitHub, a IA lê todos os seus repositórios, avalia quais projetos
          são realmente os melhores, compara com o que está no currículo e reconstrói tudo
          do zero — aplicando as melhorias da análise e colocando seus projetos mais fortes.
        </p>
      </div>

      {/* Input GitHub */}
      {stage === 'idle' && (
        <div className="reconstructor-form">
          {resume.trim().length < 100 && (
            <div className="alert alert-warning" role="alert">
              ⚠️ Cole seu currículo na aba <strong>Análise</strong> antes de reconstruir.
            </div>
          )}

          <div className="field">
            <label htmlFor="github-url">Perfil do GitHub</label>
            <input
              id="github-url"
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/seu-usuario  ou  seu-usuario"
              disabled={isRunning}
            />
          </div>

          <button
            className="btn btn-primary btn-reconstruct"
            onClick={handleStart}
            disabled={!canRun}
          >
            🔨 Reconstruir Currículo
          </button>
        </div>
      )}

      {/* Status durante o processo */}
      {isRunning && (
        <div className="reconstructor-progress">
          <div className="progress-steps">
            {[
              { key: 'github',       label: 'Buscando GitHub',   icon: '🐙' },
              { key: 'analyzing',    label: 'Analisando',         icon: '🔍' },
              { key: 'evaluating',   label: 'Avaliando projetos', icon: '⚖️' },
              { key: 'reconstructing', label: 'Reconstruindo',    icon: '🔨' },
            ].map((s) => {
              const stageOrder = ['github', 'analyzing', 'evaluating', 'reconstructing']
              const current = stageOrder.indexOf(stage)
              const thisIdx = stageOrder.indexOf(s.key)
              const status = thisIdx < current ? 'done' : thisIdx === current ? 'active' : 'pending'
              return (
                <div key={s.key} className={`progress-step progress-step-${status}`}>
                  <span className="progress-icon">{status === 'done' ? '✓' : s.icon}</span>
                  <span>{s.label}</span>
                </div>
              )
            })}
          </div>

          <p className="progress-msg">
            {STAGES[stage]}
            {stage === 'github' && repoCount && ` (${repoCount.total} repos encontrados, lendo detalhes de ${repoCount.enriched})`}
          </p>

          <button className="btn btn-cancel" onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      )}

      {/* Erro */}
      {stage === 'error' && (
        <div className="reconstructor-result">
          <div className="alert alert-error" role="alert">
            <strong>Erro:</strong>
            <pre>{errorMsg}</pre>
          </div>
          <button className="btn btn-secondary" onClick={handleReset}>Tentar novamente</button>
        </div>
      )}

      {/* Resultado */}
      {stage === 'done' && step3Result && step4Result && (
        <div className="reconstructor-result">
          {/* Avaliação GitHub */}
          <div className="github-eval-card">
            <h3>📊 Avaliação do GitHub</h3>
            <p className="eval-text">{step3Result.avaliacao_geral}</p>

            {step3Result.melhores_projetos?.length > 0 && (
              <div className="eval-section">
                <strong>✅ Projetos incluídos no currículo:</strong>
                <ul>
                  {step3Result.melhores_projetos.map((p, i) => (
                    <li key={i}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer">{p.titulo || p.repo}</a>
                      {p.motivo && <span className="eval-reason"> — {p.motivo}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step3Result.projetos_remover?.length > 0 && (
              <div className="eval-section">
                <strong>❌ Projetos removidos ou substituídos:</strong>
                <ul>
                  {step3Result.projetos_remover.map((p, i) => (
                    <li key={i}><em>{p.nome}</em>{p.motivo && <span className="eval-reason"> — {p.motivo}</span>}</li>
                  ))}
                </ul>
              </div>
            )}

            {step3Result.skills_descobertas?.length > 0 && (
              <div className="eval-section">
                <strong>💡 Skills descobertas nos repos:</strong>
                <div className="skills-tags">
                  {step3Result.skills_descobertas.map((s, i) => (
                    <span key={i} className="skill-tag">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Download */}
          <div className="download-section">
            <h3>✅ Currículo reconstruído para {step4Result.nome}</h3>
            <p>O currículo foi reconstruído com {step4Result.experiencias?.length || 0} experiências e {step4Result.projetos?.length || 0} projetos selecionados.</p>
            <button
              className="btn btn-primary btn-download"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? '⏳ Gerando Word...' : '📥 Baixar .docx'}
            </button>
            <button className="btn btn-secondary" onClick={handleReset} style={{ marginLeft: '1rem' }}>
              Reconstruir novamente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
