import { useState } from 'react'
import { saveApiKey, getApiKey, clearApiKey } from '../services/ResumeParserService.js'

export default function SettingsModal({ onClose }) {
  const [key, setKey] = useState(getApiKey())
  const [saved, setSaved] = useState(false)

  function handleSave() {
    if (key.trim()) {
      saveApiKey(key.trim())
    } else {
      clearApiKey()
    }
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 800)
  }

  function handleClear() {
    clearApiKey()
    setKey('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configurações</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <h3>APILayer Resume Parser</h3>
            <p className="settings-desc">
              Configure uma API key para obter parsing estruturado de PDFs — extrai seções,
              experiências e habilidades com muito mais precisão do que a extração de texto bruto.
            </p>
            <p className="settings-desc">
              Obtenha sua key gratuita em{' '}
              <a
                href="https://apilayer.com/marketplace/resume_parser-api"
                target="_blank"
                rel="noopener noreferrer"
              >
                apilayer.com/marketplace/resume_parser-api
              </a>
            </p>

            <div className="field">
              <label htmlFor="api-key">API Key</label>
              <input
                id="api-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Cole sua API key aqui..."
                autoComplete="off"
              />
            </div>

            <div className="settings-status">
              {getApiKey() ? (
                <span className="status-active">✓ API key configurada — parsing estruturado ativo</span>
              ) : (
                <span className="status-inactive">Sem API key — usando extração de texto bruto (PDF.js)</span>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {key && (
            <button className="btn btn-cancel" onClick={handleClear}>
              Remover key
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? '✓ Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
