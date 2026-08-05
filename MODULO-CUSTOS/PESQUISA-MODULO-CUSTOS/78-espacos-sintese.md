# 78 — SÍNTESE: como o usuário monta espaços (96 planilhas reais analisadas)

> Consolidação do Fable sobre os lotes 72–77 (6 Haiku, 04/08/2026).
> Fonte: `C:\Users\ronal\OneDrive\Pictures\Screenshots\Nova pasta` — descritivos
> de eventos (padrão Prosperitas), propostas de stand numeradas por cliente,
> layouts e catálogos. Eventos dominantes: Megaleite (várias edições),
> ExpoLeite Uberaba, Superminas/AMIS, Mangalarga/Haras, Stone Fair.

## Como as planilhas se organizam (o processo real)

1. **Por evento, um arquivo POR FRENTE**: "3ª EXPOLEITE - ESTRUTURA / PISTA /
   LEILÃO / MOBILIÁRIO / PROGRAMAÇÃO VISUAL / SOM E LED" — **as frentes são
   exatamente as categorias de cotação do sistema** (valida RF-002/RF-036).
2. **Descritivo padrão Prosperitas**: cabeçalho (cliente, evento, projetista
   RONALDO BORBA, local, datas) + itens em grupos por Tipo (Tenda/Telhado,
   Piso, Mobiliário...) com Quant | Unid | Tipo | Observações.
3. **Propostas numeradas por cliente/expositor** ("ALMIR - STAND PRÉ-CONSTRUÍDO
   B09 B10 - PROPOSTA 1088"): o espaço é COMPOSTO, orçado e vendido
   individualmente — o elo direto com RF-034 (custo do espaço → proposta).
4. **Módulo de 18 m² como unidade base** dos stands modulares (economia de
   escala na replicação); variantes esquina/meio/ponta.

## TEMPLATES PADRÃO (recorrentes em quase todos os eventos → cadastrar para todos)

| Template | Composição típica | Portes |
|---|---|---|
| **Stand modular básico** | piso tablado/MDF elevado + painéis TS + testeira metalon c/ impressão digital + balcão + tomadas + iluminação frontal | 9/16/18/25 m²; variantes esquina/meio/ponta |
| **Stand pré-construído** | Box Truss Q25/Q30 + piso elevado + revestimento (lona lamicel / tecido bagun) + iluminação HQI | 150 / 240–270 / 730 m² |
| **Pista de Julgamento** | tendas 10x10 (entrada de animais) + piso deck/carpete + placas de fechamento + back drop + som de pista | — |
| **Pórtico / Portal de entrada** | box truss + lona com impressão digital + iluminação | tamanhos variados |
| **Alameda dos Criadores** | deck linear + painéis + galhardetes | por metro |
| **Ilha comercial** | piso + balcões em ilha + testeiras 360° | 12–30 m² |
| **Leilão** | palco 10x5 + carpete + sonorização + pórtico | — |
| **Sala administrativa / VIP / Lounge** | piso + fechamento + climatização + mobiliário; lounge: guarda-corpo + iluminação especial | 8–145 m² |
| **Bloco sanitário/alojamento** | contêiner duplo + alojamento de tratadores | escala com público |
| **Baias / testeira de baias** | baias equinos/bovinos + testeira rural + identificação | por unidade |

## ESPECÍFICOS por tipo de evento (cadastrar sob demanda, não como padrão)

Caixa de areia (equinos), camarins, painéis de vidro spider (premium),
choperia/espaço social, fazendinha, tenda médica, cenografia rústica de haras
(marcenaria: sarrafos, curvim, vitrines de madeira, Bertóia, samambaias).

## CATÁLOGO — itens novos que apareceram (para o Bloco de seeds futuro)

Box Truss Q25/Q30 e cubos; lona lamicel branca; tecido bagun; painéis TS;
piso tablado; deck premium; Decorflex; grama sintética; Ecoblock; guarda-corpo;
vitrines de madeira; iluminação HQI; refletores em série; balcão inox; fogão
industrial; contêiner duplo sanitário; baias para equinos; placas de
fechamento de pista; lona com ilhós especiais; painéis de vidro spider;
pia bancada; escaninho.

Preços estáveis observados (referência): tenda 3x3 R$ 250 · 4x4 R$ 450 ·
5x5 R$ 600 (proposta/dia — conferir vigência).

## Recomendação

1. Cadastrar os **10 templates padrão** acima na biblioteca (com portes como
   variantes) — Bloco SQL de seeds.
2. Ampliar o catálogo com os ~20 itens novos (categoria certa por item).
3. Os específicos ficam como templates INATIVOS ou criados no evento que usar.
4. Insight de produto: propostas numeradas por expositor sugerem, para v2, um
   "gerar proposta do espaço" a partir do custo do composto (RF-034 → PDF).
