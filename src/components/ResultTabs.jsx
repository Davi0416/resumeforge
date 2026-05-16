import { useState } from 'react'
import CopyPromptButton from './CopyPromptButton.jsx'

const TIPO_BADGE = {
  add: { label: 'Adicionar', cls: 'badge-add' },
  edit: { label: 'Editar', cls: 'badge-edit' },
  remove: { label: 'Remover', cls: 'badge-remove' },
  rewrite: { label: 'Reescrever', cls: 'badge-rewrite' },
}

export default function ResultTabs({ result, hasJob }) {
  const tabs = [
    { id: 'mudancas', label: 'Mudanças' },
    ...(hasJob && result.adaptacao_vaga ? [{ id: 'vaga', label: 'Adaptar à vaga' }] : []),
    { id: 'prompt', label: 'Prompt pronto' },
  ]

  const [activeTab, setActiveTab] = useState('mudancas')

  return (
    <section className="result-tabs-section">
      <h2>Sugestões de melhoria</h2>

      <div className="tab-bar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'mudancas' && (
          <MudancasTab mudancas={result.mudancas} />
        )}
        {activeTab === 'vaga' && result.adaptacao_vaga && (
          <VagaTab data={result.adaptacao_vaga} />
        )}
        {activeTab === 'prompt' && (
          <PromptTab text={result.prompt_externo} />
        )}
      </div>
    </section>
  )
}

function MudancasTab({ mudancas }) {
  return (
    <ul className="mudancas-list">
      {mudancas.map((m, i) => {
        const badge = TIPO_BADGE[m.tipo] ?? { label: m.tipo, cls: '' }
        return (
          <li key={i} className="mudanca-item">
            <div className="mudanca-header">
              <span className={`badge ${badge.cls}`}>{badge.label}</span>
              <strong>{m.titulo}</strong>
            </div>
            <p className="mudanca-descricao">{m.descricao}</p>
            {m.exemplo && (
              <pre className="mudanca-exemplo">{m.exemplo}</pre>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function VagaTab({ data }) {
  return (
    <div className="vaga-tab">
      <div className="match-score">
        <span className="match-label">Compatibilidade com a vaga</span>
        <span className="match-value">{data.match_score}/10</span>
      </div>

      {data.palavras_faltando?.length > 0 && (
        <div className="vaga-block">
          <h3>Palavras-chave ausentes</h3>
          <div className="tags">
            {data.palavras_faltando.map((w, i) => (
              <span key={i} className="tag">{w}</span>
            ))}
          </div>
        </div>
      )}

      {data.secoes_adaptar?.length > 0 && (
        <div className="vaga-block">
          <h3>Seções para adaptar</h3>
          {data.secoes_adaptar.map((s, i) => (
            <div key={i} className="secao-item">
              <strong>{s.secao}</strong>
              <p>{s.motivo}</p>
              {s.sugestao && <pre className="mudanca-exemplo">{s.sugestao}</pre>}
            </div>
          ))}
        </div>
      )}

      {data.o_que_destacar && (
        <div className="vaga-block">
          <h3>O que destacar</h3>
          <p>{data.o_que_destacar}</p>
        </div>
      )}

      {data.o_que_remover && (
        <div className="vaga-block">
          <h3>O que remover</h3>
          <p>{data.o_que_remover}</p>
        </div>
      )}
    </div>
  )
}

function PromptTab({ text }) {
  return (
    <div className="prompt-tab">
      <p className="prompt-tip">
        Copie o prompt abaixo e cole em qualquer modelo de IA (ChatGPT, Claude, Gemini…) para continuar editando seu currículo.
      </p>
      <CopyPromptButton text={text} />
      <pre className="prompt-text">{text}</pre>
    </div>
  )
}
