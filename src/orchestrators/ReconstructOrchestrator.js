/**
 * ReconstructOrchestrator — pipeline de reconstrucao de curriculo com GitHub.
 *
 * Etapas:
 *   1. Busca repos do GitHub (enriquece com linguagens e README)
 *   2. Ollama avalia os projetos (githubEvalPrompt)
 *   3. Ollama reconstroi o curriculo completo (reconstructPrompt)
 *   4. Gera .docx via DocxAdapter (roda no browser, sem servidor)
 */

import * as OllamaService from '../services/OllamaService.js'
import * as StreamAdapter from '../adapters/StreamAdapter.js'
import * as GitHubService from '../services/GitHubService.js'
import * as DocxAdapter from '../adapters/DocxAdapter.js'
import { buildGithubEvalPrompt } from '../prompts/githubEvalPrompt.js'
import { buildReconstructPrompt } from '../prompts/reconstructPrompt.js'

const STEP_TIMEOUT_MS = 180_000

export function run(inputs, callbacks) {
  const controller = new AbortController()
  const { signal } = controller
  _execute(inputs, callbacks, signal).catch(() => {})
  return { cancel: () => controller.abort() }
}

async function _execute({ resume, job, mode, githubUsername, step1Result }, callbacks, signal) {
  // ── 1. Busca e enriquece repos do GitHub ───────────────────────
  let githubEval = null
  try {
    callbacks.onFetchingGithub?.({ current: 0, total: 0, name: 'buscando repositorios...' })
    const repos = await GitHubService.getRepos(githubUsername)

    if (repos.length === 0) {
      callbacks.onError?.('Nenhum repositorio encontrado para este usuario.')
      return
    }

    const enriched = await GitHubService.enrichRepos(repos, (progress) => {
      callbacks.onFetchingGithub?.(progress)
    })

    if (signal.aborted) { callbacks.onAbort?.(); return }

    // ── 2. Avalia projetos com Ollama ─────────────────────────────
    callbacks.onEvaluating?.()
    const evalPrompt = buildGithubEvalPrompt({ repos: enriched })
    const evalStream = await _generateWithTimeout(evalPrompt, signal, STEP_TIMEOUT_MS)
    githubEval = await StreamAdapter.collect(evalStream)

    if (signal.aborted) { callbacks.onAbort?.(); return }
  } catch (err) {
    if (err.name === 'AbortError') { callbacks.onAbort?.(); return }
    callbacks.onGithubWarning?.(`GitHub: ${err.message}. Reconstruindo apenas com o curriculo.`)
  }

  // ── 3. Reconstroi curriculo ────────────────────────────────────
  callbacks.onReconstructing?.()
  let reconstructed
  try {
    const recPrompt = buildReconstructPrompt({ resume, job, mode, step1Result, githubEval })
    const recStream = await _generateWithTimeout(recPrompt, signal, STEP_TIMEOUT_MS)
    reconstructed = await StreamAdapter.collect(recStream)
    if (!reconstructed || typeof reconstructed !== 'object') {
      throw new Error('Modelo retornou formato invalido')
    }
  } catch (err) {
    if (err.name === 'AbortError') { callbacks.onAbort?.(); return }
    callbacks.onError?.('Erro na reconstrucao: ' + err.message)
    return
  }

  // ── 4. Gera .docx ─────────────────────────────────────────────
  callbacks.onGeneratingDocx?.()
  try {
    const blob = await DocxAdapter.generate(reconstructed)
    callbacks.onComplete?.(blob, reconstructed)
  } catch (err) {
    callbacks.onError?.('Erro ao gerar Word: ' + err.message)
  }
}

async function _generateWithTimeout(prompt, signal, timeoutMs) {
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)
  const combined = typeof AbortSignal.any === 'function'
    ? AbortSignal.any([signal, timeoutController.signal])
    : (() => {
        const c = new AbortController()
        signal.addEventListener('abort', () => c.abort(), { once: true })
        timeoutController.signal.addEventListener('abort', () => c.abort(), { once: true })
        return c.signal
      })()
  try {
    const stream = await OllamaService.generate(prompt, combined)
    clearTimeout(timeoutId)
    return stream
  } catch (err) {
    clearTimeout(timeoutId)
    if (timeoutController.signal.aborted && !signal.aborted) {
      const e = new Error('A etapa demorou demais. Tente novamente.')
      e.name = 'TimeoutError'
      throw e
    }
    throw err
  }
}
