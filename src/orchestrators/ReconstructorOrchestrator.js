/**
 * ReconstructorOrchestrator — pipeline completo de reconstrução de currículo.
 *
 * Etapas:
 *   1. Fetch GitHub — busca repos e detalhes (README, linguagens)
 *   2. Step 1 — diagnóstico do currículo (reutiliza o existente)
 *   3. Step 3 — avaliação dos projetos GitHub vs currículo
 *   4. Step 4 — reconstrução completa do currículo em JSON estruturado
 *
 * Callbacks:
 *   onFetchingGitHub()
 *   onAnalyzing()          — step 1
 *   onEvaluating()         — step 3
 *   onReconstructing()     — step 4
 *   onComplete(step3, step4)
 *   onError(msg, stage)
 *   onAbort()
 */

import * as OllamaService from '../services/OllamaService.js'
import * as StreamAdapter from '../adapters/StreamAdapter.js'
import * as GitHubService from '../services/GitHubService.js'
import { validateStep1, validateStep3, validateStep4 } from '../validators/SchemaValidator.js'
import { buildStep1Prompt } from '../prompts/step1Prompt.js'
import { buildStep3Prompt } from '../prompts/step3Prompt.js'
import { buildStep4Prompt } from '../prompts/step4Prompt.js'
import { getBest, getWorst } from '../services/HistoryService.js'

const STEP_TIMEOUT_MS = 180_000 // 3 min por step (reconstrução é pesada)

export function run(inputs, callbacks) {
  const controller = new AbortController()
  const { signal } = controller

  _execute(inputs, callbacks, signal).catch(() => {})

  return { cancel: () => controller.abort() }
}

async function _execute({ resume, githubUrl, mode = 'geral' }, callbacks, signal) {
  // ── Verifica Ollama ─────────────────────────────────────────────
  const check = await OllamaService.checkModel()
  if (!check.ok) {
    callbacks.onError?.(_buildCheckError(check), 'pre_check')
    return
  }

  // ── 1. Fetch GitHub ─────────────────────────────────────────────
  callbacks.onFetchingGitHub?.()

  let repos
  try {
    const token = _getGitHubToken()
    const username = GitHubService.parseUsername(githubUrl)
    const allRepos = await GitHubService.fetchRepos(username, token)
    if (allRepos.length === 0) {
      callbacks.onError?.(`Nenhum repositório público encontrado para "${username}".`, 'github')
      return
    }
    repos = await GitHubService.fetchRepoDetails(allRepos, token, 12)
    callbacks.onReposFetched?.(allRepos.length, repos.length)
  } catch (err) {
    if (signal.aborted) { callbacks.onAbort?.(); return }
    callbacks.onError?.(err.message, 'github')
    return
  }

  if (signal.aborted) { callbacks.onAbort?.(); return }

  // ── 2. Step 1 — Diagnóstico ─────────────────────────────────────
  callbacks.onAnalyzing?.()

  let step1Result
  try {
    let bestEntry = null, worstEntry = null
    try { [bestEntry, worstEntry] = await Promise.all([getBest(), getWorst()]) } catch {}
    if (bestEntry?.id === worstEntry?.id) worstEntry = null

    const prompt1 = buildStep1Prompt({ resume, mode, bestEntry, worstEntry })
    const stream1 = await _generateWithTimeout(prompt1, signal, STEP_TIMEOUT_MS)
    const raw1 = await StreamAdapter.collect(stream1)
    validateStep1(raw1)
    step1Result = raw1
    callbacks.onStep1Complete?.(step1Result)
  } catch (err) {
    if (err.name === 'AbortError' || signal.aborted) { callbacks.onAbort?.(); return }
    callbacks.onError?.(_buildStepError(err), 'step1')
    return
  }

  // ── 3. Step 3 — Avaliação GitHub ────────────────────────────────
  callbacks.onEvaluating?.()

  let step3Result
  try {
    const prompt3 = buildStep3Prompt({ resume, repos })
    const stream3 = await _generateWithTimeout(prompt3, signal, STEP_TIMEOUT_MS)
    const raw3 = await StreamAdapter.collect(stream3)
    validateStep3(raw3)
    step3Result = raw3
    callbacks.onStep3Complete?.(step3Result)
  } catch (err) {
    if (err.name === 'AbortError' || signal.aborted) { callbacks.onAbort?.(); return }
    callbacks.onError?.(_buildStepError(err), 'step3')
    return
  }

  // ── 4. Step 4 — Reconstrução ────────────────────────────────────
  callbacks.onReconstructing?.()

  try {
    const prompt4 = buildStep4Prompt({ resume, step1Result, step3Result })
    const stream4 = await _generateWithTimeout(prompt4, signal, STEP_TIMEOUT_MS)
    const raw4 = await StreamAdapter.collect(stream4)
    validateStep4(raw4)
    callbacks.onComplete?.(step3Result, raw4)
  } catch (err) {
    if (err.name === 'AbortError' || signal.aborted) { callbacks.onAbort?.(); return }
    callbacks.onError?.(_buildStepError(err), 'step4')
  }
}

async function _generateWithTimeout(prompt, externalSignal, timeoutMs) {
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)
  const combined = typeof AbortSignal.any === 'function'
    ? AbortSignal.any([externalSignal, timeoutController.signal])
    : (() => {
        const c = new AbortController()
        const abort = () => c.abort()
        externalSignal.addEventListener('abort', abort, { once: true })
        timeoutController.signal.addEventListener('abort', abort, { once: true })
        return c.signal
      })()

  try {
    const stream = await OllamaService.generate(prompt, combined)
    clearTimeout(timeoutId)
    return stream
  } catch (err) {
    clearTimeout(timeoutId)
    if (timeoutController.signal.aborted && !externalSignal.aborted) {
      const e = new Error('Etapa demorou demais. Tente um currículo menor ou um modelo mais rápido.')
      e.name = 'TimeoutError'
      throw e
    }
    throw err
  }
}

function _getGitHubToken() {
  try { return localStorage.getItem('resumeforge_github_token') || '' } catch { return '' }
}

function _buildCheckError({ reason, models }) {
  if (reason === 'offline') return "Ollama não está rodando. Inicie com:\n\nOLLAMA_ORIGINS='*' ollama serve"
  if (reason === 'model_missing') {
    const list = models.length > 0 ? `\n\nModelos instalados: ${models.join(', ')}` : ''
    return `Modelo não encontrado. Execute:\n\nollama pull qwen2.5:14b${list}`
  }
  return "Erro ao conectar com o Ollama."
}

function _buildStepError(err) {
  if (err.name === 'TimeoutError') return err.message
  if (err instanceof SyntaxError) return 'O modelo retornou um formato inválido. Tente novamente.'
  if (err.message.includes('Schema') || err.message.includes('Campo')) {
    return `Resposta incompleta do modelo. Tente novamente.\n\nDetalhe: ${err.message}`
  }
  return `Erro inesperado: ${err.message}`
}
