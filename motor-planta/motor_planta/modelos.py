"""Tipos de dados do motor. Só dados, sem lógica de I/O."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Literal


@dataclass(frozen=True)
class Palavra:
    texto: str
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def cx(self) -> float:
        return (self.x0 + self.x1) / 2

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2

    @property
    def altura(self) -> float:
        return self.y1 - self.y0


@dataclass(frozen=True)
class Retangulo:
    x0: float
    y0: float
    x1: float
    y1: float
    cor: str | None = None  # "#rrggbb" do preenchimento

    @property
    def largura(self) -> float:
        return self.x1 - self.x0

    @property
    def altura(self) -> float:
        return self.y1 - self.y0

    @property
    def area(self) -> float:
        return max(0.0, self.largura) * max(0.0, self.altura)

    @property
    def cx(self) -> float:
        return (self.x0 + self.x1) / 2

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2

    def contem(self, x: float, y: float) -> bool:
        return self.x0 <= x <= self.x1 and self.y0 <= y <= self.y1

    def pontos(self) -> list[list[float]]:
        return [[self.x0, self.y0], [self.x1, self.y0], [self.x1, self.y1], [self.x0, self.y1]]


@dataclass
class PaginaExtraida:
    largura: float
    altura: float
    palavras: list[Palavra]
    retangulos: list[Retangulo]
    arquivo: str = ""


@dataclass
class Estande:
    codigo: str                 # canônico após renomear, ex. "P-01"
    codigo_original: str        # como estava escrito na planta, ex. "P01"
    familia: str                # "P"
    numero: int | None          # 1
    stand_nr: str               # "P 01" (formato da planilha)
    estrito: bool               # True se o texto original já era LETRA-NN
    ret: Retangulo | None
    cx: float
    cy: float
    area_planta: float | None = None
    medidas: list[str] = field(default_factory=list)
    obs: str | None = None
    area: float | None = None   # área comercial final (manifesto > planta)

    @property
    def cor(self) -> str | None:
        return self.ret.cor if self.ret else None

    def para_dict(self) -> dict[str, Any]:
        return {
            "codigo": self.codigo,
            "codigo_original": self.codigo_original,
            "familia": self.familia,
            "numero": self.numero,
            "stand_nr": self.stand_nr,
            "pontos": self.ret.pontos() if self.ret else None,
            "centro": [round(self.cx, 2), round(self.cy, 2)],
            "cor": self.cor,
            "area_planta": self.area_planta,
            "area": self.area,
            "medidas": list(self.medidas),
            "obs": self.obs,
        }


Nivel = Literal["erro", "aviso", "info"]


@dataclass(frozen=True)
class Alerta:
    nivel: Nivel
    regra: str
    mensagem: str
    codigo: str | None = None

    def para_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Familia:
    letra: str
    tag: str
    tipo: Literal["fixo", "area_livre"]
    preco: float = 0.0
    preco_m2: float | None = None
    area_padrao: float | None = None
    area_planta_ignorar: bool = False


@dataclass
class Manifesto:
    slug: str
    titulo: str
    ano: int
    arquivo_planta: str
    versao: str
    ignorar_familias: set[str]
    familias: dict[str, Familia]          # por letra, na ordem do manifesto
    combos_nomes: list[str]
    combos_precos: list[float]
    estandes: dict[str, dict[str, Any]]   # sobrescritas por código canônico
    renomear: dict[str, str]

    @staticmethod
    def de_dict(d: dict[str, Any]) -> "Manifesto":
        fams: dict[str, Familia] = {}
        for letra, f in (d.get("familias") or {}).items():
            fams[letra] = Familia(
                letra=letra,
                tag=f["tag"],
                tipo=f.get("tipo", "fixo"),
                preco=float(f.get("preco", 0) or 0),
                preco_m2=(float(f["preco_m2"]) if f.get("preco_m2") is not None else None),
                area_padrao=(float(f["area_padrao"]) if f.get("area_padrao") is not None else None),
                area_planta_ignorar=bool(f.get("area_planta_ignorar", False)),
            )
        ed = d.get("edicao") or {}
        pl = d.get("planta") or {}
        combos = d.get("combos") or {}
        return Manifesto(
            slug=ed.get("slug", "edicao"),
            titulo=ed.get("titulo", ""),
            ano=int(ed.get("ano", 0) or 0),
            arquivo_planta=pl.get("arquivo", ""),
            versao=pl.get("versao", ""),
            ignorar_familias=set(d.get("ignorar_familias") or []),
            familias=fams,
            combos_nomes=list(combos.get("nomes") or []),
            combos_precos=[float(x) for x in (combos.get("precos") or [])],
            estandes=dict(d.get("estandes") or {}),
            renomear=dict(d.get("renomear") or {}),
        )
