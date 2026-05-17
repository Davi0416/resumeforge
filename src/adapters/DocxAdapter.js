/**
 * DocxAdapter — gera um arquivo .docx de curriculo a partir do JSON reconstruido.
 * Usa a biblioteca docx (funciona no browser via ESM).
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, WidthType, BorderStyle, ShadingType,
  ExternalHyperlink, TabStopType, TabStopPosition, HeadingLevel,
} from 'docx'

// ── Cores e estilos ────────────────────────────────────────────────
const PRIMARY = '4F46E5'   // indigo
const MUTED   = '64748B'
const BLACK   = '1E293B'
const BORDER  = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }

function run(text, opts = {}) {
  return new TextRun({ text: String(text || ''), font: 'Arial', color: BLACK, ...opts })
}

function muted(text, opts = {}) {
  return new TextRun({ text: String(text || ''), font: 'Arial', color: MUTED, size: 20, ...opts })
}

function sectionHeading(title) {
  return new Paragraph({
    children: [new TextRun({ text: title.toUpperCase(), bold: true, font: 'Arial', color: PRIMARY, size: 22 })],
    spacing: { before: 280, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: PRIMARY, space: 4 } },
  })
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [run(text, { size: 22 })],
    spacing: { after: 40 },
  })
}

function spacer(size = 120) {
  return new Paragraph({ children: [new TextRun('')], spacing: { after: size } })
}

// ── Montagem do documento ──────────────────────────────────────────
export async function generate(data) {
  const children = []

  // ── Nome e titulo ──────────────────────────────────────────────
  children.push(new Paragraph({
    children: [new TextRun({ text: data.nome || 'Nome', bold: true, font: 'Arial', size: 52, color: BLACK })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }))

  if (data.titulo_profissional) {
    children.push(new Paragraph({
      children: [new TextRun({ text: data.titulo_profissional, font: 'Arial', size: 24, color: MUTED })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }))
  }

  // ── Contato ────────────────────────────────────────────────────
  const c = data.contato || {}
  const contatoItens = [c.email, c.telefone, c.linkedin, c.github, c.portfolio].filter(Boolean)
  if (contatoItens.length > 0) {
    children.push(new Paragraph({
      children: contatoItens.flatMap((item, i) => [
        new TextRun({ text: item, font: 'Arial', size: 20, color: MUTED }),
        ...(i < contatoItens.length - 1 ? [new TextRun({ text: '  |  ', font: 'Arial', size: 20, color: MUTED })] : []),
      ]),
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }))
  }

  // ── Resumo profissional ────────────────────────────────────────
  if (data.resumo_profissional) {
    children.push(sectionHeading('Resumo Profissional'))
    children.push(new Paragraph({
      children: [run(data.resumo_profissional, { size: 22 })],
      spacing: { after: 60 },
    }))
  }

  // ── Experiencia ────────────────────────────────────────────────
  if (data.experiencias?.length > 0) {
    children.push(sectionHeading('Experiência Profissional'))
    for (const exp of data.experiencias) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.cargo || '', bold: true, font: 'Arial', size: 24, color: BLACK }),
          new TextRun({ text: '\t' + (exp.periodo || ''), font: 'Arial', size: 20, color: MUTED }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 120, after: 40 },
      }))
      children.push(new Paragraph({
        children: [new TextRun({ text: exp.empresa || '', font: 'Arial', size: 22, color: PRIMARY })],
        spacing: { after: 60 },
      }))
      for (const desc of (exp.descricoes || [])) {
        children.push(bullet(desc))
      }
      children.push(spacer(60))
    }
  }

  // ── Projetos ───────────────────────────────────────────────────
  if (data.projetos?.length > 0) {
    children.push(sectionHeading('Projetos'))
    for (const proj of data.projetos) {
      const linkRun = proj.url
        ? new ExternalHyperlink({
            link: proj.url,
            children: [new TextRun({ text: proj.url, font: 'Arial', size: 20, color: PRIMARY, underline: {} })],
          })
        : null
      children.push(new Paragraph({
        children: [
          new TextRun({ text: proj.nome || '', bold: true, font: 'Arial', size: 23, color: BLACK }),
          new TextRun({ text: '  —  ' + (proj.tecnologias || ''), font: 'Arial', size: 20, color: MUTED }),
        ],
        spacing: { before: 100, after: 40 },
      }))
      children.push(new Paragraph({
        children: [run(proj.descricao || '', { size: 22 })],
        spacing: { after: 40 },
      }))
      if (linkRun) {
        children.push(new Paragraph({ children: [linkRun], spacing: { after: 80 } }))
      }
    }
  }

  // ── Habilidades ────────────────────────────────────────────────
  const hab = data.habilidades || {}
  const habItems = [
    hab.linguagens?.length ? { label: 'Linguagens', value: hab.linguagens.join(', ') } : null,
    hab.frameworks?.length ? { label: 'Frameworks & Libs', value: hab.frameworks.join(', ') } : null,
    hab.ferramentas?.length ? { label: 'Ferramentas', value: hab.ferramentas.join(', ') } : null,
  ].filter(Boolean)

  if (habItems.length > 0) {
    children.push(sectionHeading('Habilidades Técnicas'))
    for (const item of habItems) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: item.label + ': ', bold: true, font: 'Arial', size: 22, color: BLACK }),
          run(item.value, { size: 22 }),
        ],
        spacing: { after: 60 },
      }))
    }
  }

  // ── Formacao ───────────────────────────────────────────────────
  if (data.formacao?.length > 0) {
    children.push(sectionHeading('Formação'))
    for (const form of data.formacao) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: form.curso || '', bold: true, font: 'Arial', size: 22, color: BLACK }),
          new TextRun({ text: '\t' + (form.periodo || ''), font: 'Arial', size: 20, color: MUTED }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 80, after: 30 },
      }))
      children.push(new Paragraph({
        children: [new TextRun({ text: form.instituicao || '', font: 'Arial', size: 21, color: MUTED })],
        spacing: { after: 80 },
      }))
    }
  }

  // ── Idiomas e Certificacoes ────────────────────────────────────
  const hasIdiomas = data.idiomas?.length > 0
  const hasCerts = data.certificacoes?.length > 0

  if (hasIdiomas) {
    children.push(sectionHeading('Idiomas'))
    for (const id of data.idiomas) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: (id.idioma || '') + ': ', bold: true, font: 'Arial', size: 22, color: BLACK }),
          run(id.nivel || '', { size: 22 }),
        ],
        spacing: { after: 50 },
      }))
    }
  }

  if (hasCerts) {
    children.push(sectionHeading('Certificações'))
    for (const cert of data.certificacoes) {
      children.push(bullet(cert))
    }
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 440, hanging: 220 } } },
        }],
      }],
    },
    styles: {
      default: { document: { run: { font: 'Arial', size: 22, color: BLACK } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
        },
      },
      children,
    }],
  })

  return Packer.toBlob(doc)
}
