/**
 * HistoryService — persiste análises no IndexedDB do navegador.
 *
 * Cada entrada guarda:
 *   id, date, resumeText, jobText, mode, step1Result, step2Result
 *
 * A nota "geral" do step1 é usada pra selecionar os melhores e piores
 * exemplos como few-shot dinâmico nos prompts.
 */

const DB_NAME = 'resumeforge'
const STORE = 'analyses'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
        store.createIndex('geral', 'geral', { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Salva uma análise completa no banco.
 */
export async function save({ resumeText, jobText, mode, step1Result, step2Result }) {
  const db = await openDB()
  const entry = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    resumeText,
    jobText: jobText || '',
    mode,
    step1Result,
    step2Result: step2Result || null,
    geral: step1Result?.scores?.geral ?? 0,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add(entry)
    tx.oncomplete = () => resolve(entry)
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Retorna todas as análises ordenadas da mais recente pra mais antiga.
 */
export async function getAll() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () =>
      resolve(req.result.sort((a, b) => new Date(b.date) - new Date(a.date)))
    req.onerror = () => reject(req.error)
  })
}

/**
 * Retorna o melhor exemplo (nota geral mais alta) para few-shot.
 */
export async function getBest() {
  const all = await getAll()
  if (!all.length) return null
  return all.reduce((best, cur) => (cur.geral > best.geral ? cur : best), all[0])
}

/**
 * Retorna o pior exemplo (nota geral mais baixa) para few-shot.
 */
export async function getWorst() {
  const all = await getAll()
  if (!all.length) return null
  return all.reduce((worst, cur) => (cur.geral < worst.geral ? cur : worst), all[0])
}

/**
 * Remove uma análise pelo id.
 */
export async function remove(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}
