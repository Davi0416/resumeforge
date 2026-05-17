from pydantic import BaseModel, field_validator
from typing import Optional

class Scores(BaseModel):
    geral: float
    impacto: float
    clareza: float
    palavras_chave: float

    @field_validator("geral", "impacto", "clareza", "palavras_chave", mode="before")
    @classmethod
    def clamp(cls, v):
        return max(0.0, min(10.0, float(v)))

class Step1Result(BaseModel):
    scores: Scores
    resumo: str
    problemas: list[str]
    destaques: list[str]

class Mudanca(BaseModel):
    secao: str
    original: Optional[str] = None
    sugerido: str
    motivo: str

class AdaptacaoVaga(BaseModel):
    palavras_chave_ausentes: list[str]
    ajustes_recomendados: list[str]

class Step2Result(BaseModel):
    mudancas: list[Mudanca]
    adaptacao_vaga: Optional[AdaptacaoVaga] = None

def validate_step1(data: dict) -> Step1Result:
    return Step1Result(**data)

def validate_step2(data: dict) -> Step2Result:
    return Step2Result(**data)
