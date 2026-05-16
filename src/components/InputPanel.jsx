import { useRef } from 'react'
import { limits } from '../validators/InputValidator.js'

const MODES = [
  { value: 'geral', label: 'Análise geral' },
  { value: 'ats', label: 'Otimizar para ATS' },
  { value: 'rewrite', label: 'Reescrever tudo' },
]

export default function InputPanel({ resume, job, mode, onChange, onPdfUpload, pdfStatus, disabled }) {
  const fileInputRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) onPdfUpload(file)
    // limpa o input para permitir reenvio do mesmo arquivo
    e.target.value = ''
  }

  return (
    <div className="input-panel">
      <div className="field">
        <label htmlFor="resume">
          Currículo
          <span className="char-count">
            {resume.length.toLocaleString('pt-BR')} / {limits.MAX_RESUME_CHARS.toLocaleString('pt-BR')}
          </span>
        </label>

        {/* Área de upload de PDF */}
        <div className="pdf-upload-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={disabled}
            style={{ display: 'none' }}
            id="pdf-file-input"
          />
          <button
            type="button"
            className="btn btn-upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            📄 Importar PDF
          </button>
          {pdfStatus && (
            <span className={`pdf-status ${pdfStatus.error ? 'pdf-status-error' : 'pdf-status-ok'}`}>
              {pdfStatus.error
                ? `⚠️ ${pdfStatus.error}`
                : pdfStatus.structured === true
                  ? `✦ ${pdfStatus.name} — parsing estruturado`
                  : pdfStatus.structured === false
                    ? `✓ ${pdfStatus.name} — texto bruto`
                    : `${pdfStatus.name}`}
            </span>
          )}
        </div>

        <textarea
          id="resume"
          value={resume}
          onChange={(e) => onChange('resume', e.target.value)}
          disabled={disabled}
          placeholder="Cole aqui o texto do currículo ou importe um PDF acima..."
          rows={14}
          maxLength={limits.MAX_RESUME_CHARS}
          className={resume.length > limits.MAX_RESUME_CHARS ? 'over-limit' : ''}
        />
      </div>

      <div className="field">
        <label htmlFor="job">
          Descrição da vaga{' '}
          <span className="optional">(opcional)</span>
          <span className="char-count">
            {job.length.toLocaleString('pt-BR')} / {limits.MAX_JOB_CHARS.toLocaleString('pt-BR')}
          </span>
        </label>
        <textarea
          id="job"
          value={job}
          onChange={(e) => onChange('job', e.target.value)}
          disabled={disabled}
          placeholder="Cole a descrição da vaga para análise de compatibilidade..."
          rows={6}
          maxLength={limits.MAX_JOB_CHARS}
          className={job.length > limits.MAX_JOB_CHARS ? 'over-limit' : ''}
        />
      </div>

      <div className="field field-mode">
        <label htmlFor="mode">Modo de análise</label>
        <select
          id="mode"
          value={mode}
          onChange={(e) => onChange('mode', e.target.value)}
          disabled={disabled}
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
