import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Aponta o worker para o arquivo local (resolvido pelo Vite em build-time)
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * Extrai o texto de um arquivo PDF enviado pelo usuário.
 * @param {File} file — arquivo PDF do input[type=file]
 * @returns {Promise<string>} texto extraído de todas as páginas
 */
export async function extractText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Agrupa itens por linha usando a posição Y, preservando a estrutura visual
    const lineMap = new Map()
    for (const item of content.items) {
      if (!item.str) continue
      const y = Math.round(item.transform[5])
      if (!lineMap.has(y)) lineMap.set(y, [])
      lineMap.get(y).push(item)
    }

    // Ordena as linhas de cima para baixo e concatena
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a)
    const pageLines = sortedYs.map((y) =>
      lineMap.get(y).map((item) => item.str).join(' ').trim()
    ).filter(Boolean)

    pages.push(pageLines.join('\n'))
  }

  return pages.join('\n\n').trim()
}
