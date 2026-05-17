import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '../services/ApiService.js'

export default function SettingsModal({ onClose }) {
  const [githubToken, setGithubToken] = useState('')
  const [apilayerKey, setApilayerKey] = useState('')
  const [status, setStatus] = useState(null) // { hasGithubToken, hasApilayerKey }
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings().then(setStatus).catch(() => {})
  }, [])

  async function handleSave() {
    await saveSettings({ githubToken: githubToken.trim(), apilayerKey: apilayerKey.trim() })
    const updated = await getSettings()
    setStatus(updated)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configurações</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="modal-body">
          {/* GitHub Token */}
          <div className="settings-section">
            <h3>GitHub Token</h3>
            <p className="settings-desc">
              Necessário para repositórios privados. Gere em{' '}
              <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noopener noreferrer">
                github.com/settings/tokens
              </a>{' '}
              com escopo <code>repo</code>.
            </p>
            <div className="field">
              <label htmlFor="github-token">Personal Access Token</label>
              <input
                id="github-token"
                type="password"
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                placeholder="ghp_... (deixe em branco para remover)"
                autoComplete="off"
              />
            </div>
            <div className="settings-status">
              {status?.hasGithubToken
                ? <span className="status-active">✓ Token configurado — repos privados acessíveis</span>
                : <span className="status-inactive">Sem token — apenas repos públicos (60 req/hora)</span>}
            </div>
          </div>

          {/* APILayer */}
          <div className="settings-section">
            <h3>APILayer Resume Parser</h3>
            <p className="settings-desc">
              Para parsing estruturado de PDFs. Obtenha em{' '}
              <a href="https://apilayer.com/marketplace/resume_parser-api" target="_blank" rel="noopener noreferrer">
                apilayer.com
              </a>.
            </p>
            <div className="field">
              <label htmlFor="api-key">API Key</label>
              <input
                id="api-key"
                type="password"
                value={apilayerKey}
                onChange={e => setApilayerKey(e.target.value)}
                placeholder="Cole sua API key aqui... (deixe em branco para remover)"
                autoComplete="off"
              />
            </div>
            <div className="settings-status">
              {status?.hasApilayerKey
                ? <span className="status-active">✓ API key configurada — parsing estruturado ativo</span>
                : <span className="status-inactive">Sem API key — usando extração de texto bruto (PDF.js)</span>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? '✓ Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
