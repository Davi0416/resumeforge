import * as OllamaService from '../services/OllamaService.js'
import * as StreamAdapter from '../adapters/StreamAdapter.js'
import { validateStep1, validateStep2 } from '../validators/SchemaValidator.js'
import { buildStep1Prompt } from '../prompts/step1Prompt.js'
import { buildStep2Prompt } from '../prompts/step2Prompt.js'
import { getBest, getWorst } from '../services/HistoryService.js'

const STEP_TIMEOUT_MS = 120_000 // 120 segundos por step

/**
 * Executa o pipeline completo de análise.
 *
 * @param {{ resume: string, job: string, mode: string }} inputs
 * @param {{
 *   onChecking: () => void,
 *   onStreaming: (step: number) => void,
 *   onStep1Complete: (result: object) => void,
 *   onStep2Complete: (result: object) => void,
 * }} callbacks
 * @returns {{ cancel: () => void }}
 */
export function run(inputs, callbacks) {
  const controller = new AbortController()
  const { signal } = controller

  // Executa assincronamente e retorna o cancel imediatamente
  _execute(inputs, callbacks, signal).catch(() => {
    // Erros são tratados dentro de _execute via callbacks
  })

  return {
    cancel: () => controller.abort(),
  }
}

async function _execute({ resume, job, mode }, callbacks, signal) {
  // ── Pré-checagem ────────────────────────────────────────────────
  callbacks.onChecking?.()

  const check = await OllamaService.checkModel()
  if (!check.ok) {
    const msg = _buildCheckErrorMessage(check)
    callbacks.onError?.(msg, 'pre_check')
    return
  }

  // ── Busca exemplos do histórico para few-shot dinâmico ──────────
  let bestEntry = null
  let worstEntry = null
  try {
    ;[bestEntry, worstEntry] = await Promise.all([getBest(), getWorst()])
    // Evita usar o mesmo registro como melhor e pior
    if (bestEntry && worstEntry && bestEntry.id === worstEntry.id) {
      worstEntry = null
    }
  } catch {
    // Falha silenciosa — usa exemplos fixos
  }

  // ── Step 1 — Diagnóstico ────────────────────────────────────────
  callbacks.onStreaming?.(1)

  let step1Result
  try {
    const prompt1 = buildStep1Prompt({ resume, mode, bestEntry, worstEntry })
    const stream1 = await _generateWithTimeout(prompt1, signal, STEP_TIMEOUT_MS)
    const raw1 = await StreamAdapter.collect(stream1)
    validateStep1(raw1)
    step1Result = raw1
    callbacks.onStep1Complete?.(step1Result)
  } catch (err) {
    if (err.name === 'AbortError') {
      callbacks.onAbort?.()
      return
    }
    callbacks.onError?.(_buildStepErrorMessage(err), 'step1')
    return
  }

  // ── Step 2 — Ação ───────────────────────────────────────────────
  callbacks.onStreaming?.(2)

  try {
    const prompt2 = buildStep2Prompt({ resume, job, mode, step1Result })
    const stream2 = await _generateWithTimeout(prompt2, signal, STEP_TIMEOUT_MS)
    const raw2 = await StreamAdapter.collect(stream2)
    validateStep2(raw2)
    callbacks.onStep2Complete?.(raw2)
  } catch (err) {
    if (err.name === 'AbortError') {
      callbacks.onAbort?.()
      return
    }
    // Step 1 já foi exibido — estado "partial"
    callbacks.onStep2Error?.(_buildStepErrorMessage(err))
  }
}

/**
 * Chama OllamaService.generate com um timeout via AbortController composto.
 */
async function _generateWithTimeout(prompt, externalSignal, timeoutMs) {
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)

  // Combina o signal externo (cancelamento manual) com o de timeout
  const combinedSignal = _combineSignals(externalSignal, timeoutController.signal)

  try {
    const stream = await OllamaService.generate(prompt, combinedSignal)
    clearTimeout(timeoutId)
    return stream
  } catch (err) {
    clearTimeout(timeoutId)
    // Se o timeout disparou mas o signal externo não foi abortado,
    // transforma em mensagem de timeout
    if (timeoutController.signal.aborted && !externalSignal.aborted) {
      const timeoutErr = new Error('A análise demorou demais. Tente um currículo menor.')
      timeoutErr.name = 'TimeoutError'
      throw timeoutErr
    }
    throw err
  }
}

/**
 * Combina dois AbortSignals: aborta quando qualquer um dos dois for abortado.
 * Fallback simples sem AbortSignal.any() para compatibilidade ampla.
 */
function _combineSignals(s1, s2) {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([s1, s2])
  }
  const controller = new AbortController()
  const abort = () => controller.abort()
  s1.addEventListener('abort', abort, { once: true })
  s2.addEventListener('abort', abort, { once: true })
  return controller.signal
}

function _buildCheckErrorMessage({ reason, models }) {
  switch (reason) {
    case 'offline':
      return "Ollama não está rodando. Inicie com:\n\nOLLAMA_ORIGINS='*' ollama serve"
    case 'model_missing': {
      const list = models.length > 0 ? `\n\nModelos instalados: ${models.join(', ')}` : ''
      return `Modelo não encontrado. Execute:\n\nollama pull qwen2.5:14b${list}`
    }
    default:
      return "Erro ao conectar com o Ollama. Verifique se ele está rodando com CORS liberado:\n\nOLLAMA_ORIGINS='*' ollama serve"
  }
}

function _buildStepErrorMessage(err) {
  if (err.name === 'TimeoutError') {
    return err.message
  }
  if (err instanceof SyntaxError) {
    return 'O modelo retornou um formato inválido. Tente novamente.'
  }
  if (err.message.includes('Schema') || err.message.includes('Campo') || err.message.includes('ausente')) {
    return `Resposta incompleta do modelo. Tente novamente.\n\nDetalhe: ${err.message}`
  }
  if (err.message.toLowerCase().includes('cors') || err.message.includes('NetworkError')) {
    return "CORS bloqueado. Inicie o Ollama com:\n\nOLLAMA_ORIGINS='*' ollama serve"
  }
  return `Erro inesperado: ${err.message}`
}
