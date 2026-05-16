/**
 * generateDocx — converte o JSON estruturado do Step 4 em um arquivo .docx.
 * Usa a biblioteca `docx` que funciona no navegador via Vite.
 */

import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle,
  TabStopType, TabStopPosition, LevelFormat, ExternalHyperlink,
} from 'docx'

const COLOR_NAME = '1F2937'
const COLOR_SECTION = '4F46E5'
const COLOR_MUTED = '6B7280'
const COLOR_BULLET = '374151'

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_SECTION, space: 4 } },
    spacing: { before: 120, after: 60 },
    children: [],
  })
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 200, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_SECTION, space: 2 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: COLOR_SECTION, font: 'Arial' })],
  })
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, font: 'Arial', color: COLOR_BULLET })],
  })
}

function contactLine(items) {
  const runs = []
  items.filter(Boolean).forEach((item, i) => {
    if (i > 0) runs.push(new TextRun({ text: '  •  ', size: 18, color: COLOR_MUTED, font: 'Arial' }))
    if (item.url) {
      runs.push(new ExternalHyperlink({
        link: item.url,
        children: [new TextRun({ text: item.label, size: 18, color: COLOR_SECTION, font: 'Arial', underline: {} })],
      }))
    } else {
      runs.push(new TextRun({ text: item.label, size: 18, color: COLOR_MUTED, font: 'Arial' }))
    }
  })
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: runs })
}

export async function generateDocx(data) {
  const {
    nome, titulo_profissional, contato = {}, resumo_profissional,
    experiencias = [], projetos = [], formacao = [],
    habilidades_tecnicas = [], habilidades_interpessoais = [],
    idiomas = [], certificacoes = [],
  } = data

  const children = []

  // Header
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: nome, bold: true, size: 40, color: COLOR_NAME, font: 'Arial' })],
  }))

  if (titulo_profissional) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: titulo_profissional, size: 22, color: COLOR_MUTED, font: 'Arial', italics: true })],
    }))
  }

  const contactItems = [
    contato.email && { label: contato.email },
    contato.telefone && { label: contato.telefone },
    contato.cidade && { label: contato.cidade },
    contato.linkedin && { label: 'LinkedIn', url: contato.linkedin.startsWith('http') ? contato.linkedin : 'https://' + contato.linkedin },
    contato.github && { label: 'GitHub', url: contato.github.startsWith('http') ? contato.github : 'https://' + contato.github },
    contato.portfolio && { label: 'Portfolio', url: contato.portfolio.startsWith('http') ? contato.portfolio : 'https://' + contato.portfolio },
  ].filter(Boolean)
  if (contactItems.length > 0) children.push(contactLine(contactItems))
  children.push(divider())

  // Resumo
  if (resumo_profissional) {
    children.push(sectionTitle('Resumo'))
    children.push(new Paragraph({
      spacing: { before: 60, after: 120 },
      children: [new TextRun({ text: resumo_profissional, size: 20, font: 'Arial', color: COLOR_BULLET })],
    }))
  }

  // Experiencia
  if (experiencias.length > 0) {
    children.push(sectionTitle('Experiencia'))
    for (const exp of experiencias) {
      children.push(new Paragraph({
        spacing: { before: 120, after: 20 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: exp.empresa || '', bold: true, size: 22, font: 'Arial', color: COLOR_NAME }),
          new TextRun({ text: '\t' + (exp.periodo || ''), size: 19, font: 'Arial', color: COLOR_MUTED }),
        ],
      }))
      children.push(new Paragraph({
        spacing: { before: 0, after: 40 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: exp.cargo || '', size: 20, italics: true, font: 'Arial', color: COLOR_MUTED }),
          exp.local ? new TextRun({ text: '\t' + exp.local, size: 19, font: 'Arial', color: COLOR_MUTED }) : new TextRun({ text: '' }),
        ],
      }))
      for (const b of (exp.bullets || [])) children.push(bullet(b))
    }
  }

  // Projetos
  if (projetos.length > 0) {
    children.push(sectionTitle('Projetos'))
    for (const proj of projetos) {
      const titleRuns = []
      if (proj.url && proj.url.trim()) {
        titleRuns.push(new ExternalHyperlink({
          link: proj.url.startsWith('http') ? proj.url : 'https://' + proj.url,
          children: [new TextRun({ text: proj.nome, bold: true, size: 21, font: 'Arial', color: COLOR_SECTION, underline: {} })],
        }))
      } else {
        titleRuns.push(new TextRun({ text: proj.nome, bold: true, size: 21, font: 'Arial', color: COLOR_NAME }))
      }
      if (proj.tecnologias) {
        titleRuns.push(new TextRun({ text: '  -  ' + proj.tecnologias, size: 19, font: 'Arial', color: COLOR_MUTED }))
      }
      children.push(new Paragraph({ spacing: { before: 100, after: 20 }, children: titleRuns }))
      if (proj.descricao) {
        children.push(new Paragraph({
          spacing: { before: 0, after: 60 },
          children: [new TextRun({ text: proj.descricao, size: 20, font: 'Arial', color: COLOR_BULLET })],
        }))
      }
    }
  }

  // Habilidades
  if (habilidades_tecnicas.length > 0 || habilidades_interpessoais.length > 0) {
    children.push(sectionTitle('Habilidades'))
    if (habilidades_tecnicas.length > 0) {
      children.push(new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: 'Tecnicas: ', bold: true, size: 20, font: 'Arial', color: COLOR_NAME }),
          new TextRun({ text: habilidades_tecnicas.join(' • '), size: 20, font: 'Arial', color: COLOR_BULLET }),
        ],
      }))
    }
    if (habilidades_interpessoais.length > 0) {
      children.push(new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({ text: 'Interpessoais: ', bold: true, size: 20, font: 'Arial', color: COLOR_NAME }),
          new TextRun({ text: habilidades_interpessoais.join(' • '), size: 20, font: 'Arial', color: COLOR_BULLET }),
        ],
      }))
    }
  }

  // Formacao
  if (formacao.length > 0) {
    children.push(sectionTitle('Formacao'))
    for (const f of formacao) {
      children.push(new Paragraph({
        spacing: { before: 100, after: 20 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: f.instituicao || '', bold: true, size: 21, font: 'Arial', color: COLOR_NAME }),
          new TextRun({ text: '\t' + (f.periodo || ''), size: 19, font: 'Arial', color: COLOR_MUTED }),
        ],
      }))
      if (f.curso) {
        children.push(new Paragraph({
          spacing: { before: 0, after: 60 },
          children: [new TextRun({ text: f.curso, size: 20, italics: true, font: 'Arial', color: COLOR_MUTED })],
        }))
      }
    }
  }

  // Idiomas
  if (idiomas.length > 0) {
    children.push(sectionTitle('Idiomas'))
    children.push(new Paragraph({
      spacing: { before: 60, after: 80 },
      children: idiomas.flatMap((l, i) => [
        ...(i > 0 ? [new TextRun({ text: '   •   ', size: 20, font: 'Arial', color: COLOR_MUTED })] : []),
        new TextRun({ text: l.idioma, bold: true, size: 20, font: 'Arial', color: COLOR_NAME }),
        new TextRun({ text: ': ' + l.nivel, size: 20, font: 'Arial', color: COLOR_BULLET }),
      ]),
    }))
  }

  // Certificacoes
  if (certificacoes.length > 0) {
    children.push(sectionTitle('Certificacoes'))
    for (const cert of certificacoes) children.push(bullet(cert))
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 240 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      children,
    }],
  })

  return Packer.toBlob(doc)
}

export function downloadBlob(blob, filename = 'curriculo-reconstruido.docx') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
