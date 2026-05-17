import { useState, useRef, useCallback } from 'react'
import InputPanel from './InputPanel.jsx'
import AnalyzeButton from './AnalyzeButton.jsx'
import StatusIndicator from './StatusIndicator.jsx'
import ScoreCards from './ScoreCards.jsx'
import ResultTabs from './ResultTabs.jsx'
import SettingsModal from './SettingsModal.jsx'
import HistoryPanel from './HistoryPanel.jsx'
import ReconstructPanel from './ReconstructPanel.jsx'
import { validate } from '../validators/InputValidator.js'
import * as ApiService from '../services/ApiService.js'
import { extractText } from '../adapters/PdfAdapter.js'

export default function App() {
  const [resume, setResume]     = useState('')
  const [job, setJob]           = useState('')
  const [mode, setMode]         = useState('geral')
  const [pdfStatus, setPdfStatus] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory]   = useState(false)

  const [appState, setAppState]         = useState('idle')
  const [streamingStep, setStreamingStep] = useState(null)
  const [step1Result, setStep1Result]   = useState(null)
  const [step2Result, setStep2Result]   = useState(null)
  const [errorMsg, setErrorMsg]         = useState(null)
  const [step2ErrorMsg, setStep2ErrorMsg] = useState(null)

  const cancelRef     = useRef(null)
  const step1ResultRef = useRef(null)

  const validation = validate(resume, job)

  function handleInputChange(field, value) {
    if (field === 'resume') setResume(value)
    if (field === 'job')    setJob(value)
    if (field === 'mode')   setMode(value)
  }

  async function handlePdfUpload(file) {
    setPdfStatus({ name: `Lendo ${file.name}...` })
    try {
      // Tenta parse estruturado via backend
      const result = await ApiService.parsePdf(file)
      setResume(result.text)
      setPdfStatus({ name: file.name, structured: result.structured })
      return
    } catch {
      // Fallback: extração local com PDF.js
    }
    try {
      const text = await extractText(file)
      if (!text.trim()) {
        setPdfStatus({ error: 'PDF sem texto extraível (pode ser imagem escaneada).' })
        return
      }
      setResume(text)
      setPdfStatus({ name: file.name, structured: false })
    } catch (err) {
      setPdfStatus({ error: `Falha ao ler o PDF: ${err.message}` })
    }
  }

  const handleAnalyze = useCallback(() => {
    setAppState('checking')
    setStreamingStep(null)
    setStep1Result(null)
    setStep2Result(null)
    setErrorMsg(null)
    setStep2ErrorMsg(null)
    step1ResultRef.current = null

    const handle = ApiService.analyze(
      { resume, job, mode },
      {
        onChecking: () => setAppState('checking'),
        onStreaming: (step) => { setAppState('streaming'); setStreamingStep(step) },
        onStep1Complete: (result) => { setStep1Result(result); step1ResultRef.current = result },
        onStep2Complete: (result) => { setStep2Result(result); setAppState('success'); cancelRef.current = null },
        onStep2Error: (msg) => { setStep2ErrorMsg(msg); setAppState('partial'); cancelRef.current = null },
        onError: (msg) => { setErrorMsg(msg); setAppState('error'); cancelRef.current = null },
        onAbort: () => { setAppState('idle'); cancelRef.current = null },
      }
    )
    cancelRef.current = handle
  }, [resume, job, mode])

  function handleCancel() { cancelRef.current?.cancel() }

  function handleRetryStep2() {
    if (!step1Result) return
    setAppState('checking')
    setStep2Result(null)
    setStep2ErrorMsg(null)

    const handle = ApiService.analyze(
      { resume, job, mode },
      {
        onChecking: () => {},
        onStreaming: (step) => { if (step === 2) { setAppState('streaming'); setStreamingStep(2) } },
        onStep1Complete: () => {},
        onStep2Complete: (result) => { setStep2Result(result); setAppState('success'); cancelRef.current = null },
        onStep2Error: (msg) => { setStep2ErrorMsg(msg); setAppState('partial'); cancelRef.current = null },
        onError: (msg) => { setErrorMsg(msg); setAppState('error'); cancelRef.current = null },
        onAbort: () => { setAppState('partial'); cancelRef.current = null },
      }
    )
    cancelRef.current = handle
  }

  const isProcessing = appState === 'checking' || appState === 'streaming'
  const showResults  = appState === 'success' || appState === 'partial' || step1Result !== null

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>ResumeForge</h1>
          <div className="header-actions">
            <button className="btn-settings" onClick={() => setShowHistory(true)} title="Histórico" aria-label="Histórico">🕐</button>
            <button className="btn-settings" onClick={() => setShowSettings(true)} title="Configurações" aria-label="Configurações">⚙️</button>
          </div>
        </div>
        <p className="subtitle">Análise e reescrita de currículos com IA local</p>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showHistory  && <HistoryPanel  onClose={() => setShowHistory(false)} />}

      <main className="app-main">
        <section className="input-section">
          <InputPanel
            resume={resume} job={job} mode={mode}
            onChange={handleInputChange}
            onPdfUpload={handlePdfUpload}
            pdfStatus={pdfStatus}
            disabled={isProcessing}
          />

          {validation.errors.length > 0 && (
            <div className="alert alert-error" role="alert">
              {validation.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {validation.tokenWarning && (
            <div className="alert alert-warning" role="alert">
              ⚠️ Estimativa de tokens alta ({validation.estimatedTokens.toLocaleString('pt-BR')} tokens).
              O modelo pode cortar parte do texto. Considere reduzir o currículo ou a descrição da vaga.
            </div>
          )}

          <AnalyzeButton appState={appState} isValid={validation.valid} onAnalyze={handleAnalyze} onCancel={handleCancel} />
          <StatusIndicator appState={appState} streamingStep={streamingStep} />

          {appState === 'error' && errorMsg && (
            <div className="alert alert-error" role="alert">
              <strong>Erro:</strong>
              <pre>{errorMsg}</pre>
            </div>
          )}
        </section>

        {showResults && (
          <section className="results-section">
            <ScoreCards result={step1Result} />

            {appState === 'partial' && step2ErrorMsg && (
              <div className="alert alert-warning step2-error" role="alert">
                <p><strong>As sugestões não puderam ser geradas.</strong></p>
                <p>{step2ErrorMsg}</p>
                <button className="btn btn-retry" onClick={handleRetryStep2}>Tentar etapa 2 novamente</button>
              </div>
            )}

            {appState === 'streaming' && streamingStep === 2 && (
              <div className="step2-loading">
                <StatusIndicator appState="streaming" streamingStep={2} />
              </div>
            )}

            {step2Result && <ResultTabs result={step2Result} hasJob={!!job.trim()} />}
          </section>
        )}

        {resume.trim() && (
          <section className="reconstruct-section">
            <ReconstructPanel resume={resume} job={job} mode={mode} step1Result={step1Result} />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>Roda 100% local com <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Ollama</a> — sem custo, sem API key, sem enviar seus dados para a nuvem.</p>
      </footer>
    </div>
  )
}
