import io
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

PRIMARY   = RGBColor(0x4F, 0x46, 0xE5)  # indigo
MUTED     = RGBColor(0x64, 0x74, 0x8B)  # slate-500
BLACK     = RGBColor(0x1E, 0x29, 0x3B)  # slate-900

def _set_font(run, name="Arial", size=10, bold=False, color=None, italic=False):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    if color:
        run.font.color.rgb = color

def _add_border_bottom(paragraph):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), "4F46E5")
    pBdr.append(bottom)
    pPr.append(pBdr)

def _section_heading(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after  = Pt(4)
    run = p.add_run(title.upper())
    _set_font(run, size=10, bold=True, color=PRIMARY)
    _add_border_bottom(p)
    return p

def _bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after  = Pt(1)
    p.paragraph_format.left_indent  = Cm(0.5)
    run = p.add_run(text)
    _set_font(run, size=9.5)
    return p

def generate_docx(data: dict) -> bytes:
    doc = Document()

    # Page setup — A4, narrow margins
    section = doc.sections[0]
    section.page_width  = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin    = Cm(1.5)
    section.bottom_margin = Cm(1.5)
    section.left_margin   = Cm(2)
    section.right_margin  = Cm(2)

    # Remove default paragraph spacing
    style = doc.styles["Normal"]
    style.font.name = "Arial"
    style.font.size = Pt(10)

    # ── Header: Name + title + contact ──────────────────────────────
    name_p = doc.add_paragraph()
    name_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    name_run = name_p.add_run(data.get("nome", ""))
    _set_font(name_run, size=18, bold=True, color=PRIMARY)

    if titulo := data.get("titulo"):
        title_p = doc.add_paragraph()
        title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        t_run = title_p.add_run(titulo)
        _set_font(t_run, size=11, color=MUTED)

    contato = data.get("contato", {})
    contact_parts = []
    for key in ("email", "telefone", "linkedin", "github", "localizacao"):
        val = contato.get(key)
        if val:
            contact_parts.append(val)
    if contact_parts:
        contact_p = doc.add_paragraph()
        contact_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c_run = contact_p.add_run("  |  ".join(contact_parts))
        _set_font(c_run, size=9, color=MUTED)

    # ── Resumo Profissional ──────────────────────────────────────────
    if resumo := data.get("resumo_profissional"):
        _section_heading(doc, "Resumo Profissional")
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(resumo)
        _set_font(run, size=9.5)

    # ── Experiência ──────────────────────────────────────────────────
    experiencias = data.get("experiencia", [])
    if experiencias:
        _section_heading(doc, "Experiência Profissional")
        for exp in experiencias:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after  = Pt(1)
            cargo_run = p.add_run(exp.get("cargo", ""))
            _set_font(cargo_run, size=10, bold=True, color=BLACK)
            p.add_run("  ")
            empresa_run = p.add_run(f"@ {exp.get('empresa', '')}")
            _set_font(empresa_run, size=10, color=MUTED)
            periodo_run = p.add_run(f"  •  {exp.get('periodo', '')}")
            _set_font(periodo_run, size=9, color=MUTED, italic=True)

            for resp in exp.get("responsabilidades", []):
                _bullet(doc, resp)

    # ── Projetos ─────────────────────────────────────────────────────
    projetos = data.get("projetos", [])
    if projetos:
        _section_heading(doc, "Projetos")
        for proj in projetos:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(5)
            p.paragraph_format.space_after  = Pt(1)
            nome_run = p.add_run(proj.get("nome", ""))
            _set_font(nome_run, size=10, bold=True, color=PRIMARY)
            techs = proj.get("tecnologias", [])
            if techs:
                tech_run = p.add_run(f"  [{', '.join(techs)}]")
                _set_font(tech_run, size=9, color=MUTED)
            if desc := proj.get("descricao"):
                d_p = doc.add_paragraph()
                d_p.paragraph_format.left_indent = Cm(0.3)
                d_p.paragraph_format.space_after = Pt(1)
                d_run = d_p.add_run(desc)
                _set_font(d_run, size=9.5)
            if url := proj.get("url"):
                u_p = doc.add_paragraph()
                u_p.paragraph_format.left_indent = Cm(0.3)
                u_p.paragraph_format.space_after = Pt(1)
                u_run = u_p.add_run(url)
                _set_font(u_run, size=9, color=MUTED, italic=True)

    # ── Habilidades ──────────────────────────────────────────────────
    habilidades = data.get("habilidades", {})
    skill_lines = []
    if langs := habilidades.get("linguagens"):
        skill_lines.append(("Linguagens", ", ".join(langs)))
    if fws := habilidades.get("frameworks"):
        skill_lines.append(("Frameworks", ", ".join(fws)))
    if tools := habilidades.get("ferramentas"):
        skill_lines.append(("Ferramentas", ", ".join(tools)))
    if outros := habilidades.get("outros"):
        skill_lines.append(("Outros", ", ".join(outros)))

    if skill_lines:
        _section_heading(doc, "Habilidades")
        for label, value in skill_lines:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(2)
            label_run = p.add_run(f"{label}: ")
            _set_font(label_run, size=9.5, bold=True)
            val_run = p.add_run(value)
            _set_font(val_run, size=9.5)

    # ── Formação ─────────────────────────────────────────────────────
    formacao = data.get("formacao", [])
    if formacao:
        _section_heading(doc, "Formação")
        for edu in formacao:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after  = Pt(1)
            curso_run = p.add_run(edu.get("curso", ""))
            _set_font(curso_run, size=10, bold=True)
            inst_run = p.add_run(f"  —  {edu.get('instituicao', '')}")
            _set_font(inst_run, size=10, color=MUTED)
            if ano := edu.get("ano_conclusao"):
                ano_run = p.add_run(f"  ({ano})")
                _set_font(ano_run, size=9, color=MUTED, italic=True)

    # ── Idiomas ──────────────────────────────────────────────────────
    idiomas = data.get("idiomas", [])
    if idiomas:
        _section_heading(doc, "Idiomas")
        parts = [f"{i.get('idioma', '')} ({i.get('nivel', '')})" for i in idiomas]
        p = doc.add_paragraph()
        run = p.add_run("  •  ".join(parts))
        _set_font(run, size=9.5)

    # ── Certificações ────────────────────────────────────────────────
    certs = data.get("certificacoes", [])
    if certs:
        _section_heading(doc, "Certificações")
        for cert in certs:
            _bullet(doc, cert)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
