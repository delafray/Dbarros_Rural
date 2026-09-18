# Motor de Planta → Mapa de Vendas — Especificação

> Status: **APROVADA 17/09/2026 — EM CONSTRUÇÃO** na branch `feature-mapa-vendas` (não mergeada).
> Feito: motor Python (1-4), migration + RLS + mapaCalc + serviço (5-6) e a página do mapa (7). Piloto (8) depende do usuário rodar `RODAR-NO-SUPABASE.md`, testar a branch e autorizar merge/push.
> Piloto: Megaleite 2027 (planta ALT 01 em `H:\PROJETOS\2027 - PROJETOS\DBARROS 27\MEGALEITE\PLANTA BAIXA`).
> Regras do repositório valem integralmente: `PADRAO-NOVOS-SISTEMAS.md` (teste + RLS
> desde o zero), páginas não importam `supabase`, commits pequenos e reversíveis.

## 1. Problema e decisões já tomadas

O usuário desenha a planta baixa do evento no Corel e exporta PDF vetorial com texto
vivo. Hoje a leitura (códigos, áreas, validação) é manual. Isso vai se repetir a cada
evento e a cada alteração de planta (ALT 01, ALT 02…).

Decisões do usuário (17/09/2026):

| Decisão | Escolha |
| --- | --- |
| Onde o mapa aparece | **Dentro do sistema** (página nova por edição) |
| Quem vê | **Só equipe de vendas** (usuários autenticados; sem acesso público por enquanto) |
| Onde o motor mora | **Neste repositório**, pasta `motor-planta/` (Python + PyMuPDF, fora do bundle) |
| Automação | **Semi-automática**: o usuário aciona a IA, que roda o motor; decisões ficam no manifesto |
| Custo | Fundação (dados, RLS, arquitetura, teste-molde) no modelo forte; boilerplate e volume de testes delegados a agentes menores |

## 2. Visão geral do fluxo

```
Corel → PDF vetorial ──┐
                       ├─► motor-planta (Python, local) ──► saida/<edicao>/
manifesto.json ────────┘        │                              ├─ relatorio.md      (validação p/ o usuário)
                                │                              ├─ mapa.json         (geometria dos estandes)
                                │                              ├─ fundo.png         (planta rasterizada, sem os estandes)
                                │                              ├─ planilha.json     (categorias no formato CategoriaSetup + áreas)
                                │                              └─ diff.md           (vs. versão anterior, se houver)
                                ▼
                     publicação no sistema (SQL/serviço) ──► tabela planilha_mapa + bucket edicao-docs
                                                                    │
                                                                    ▼
                                            página /mapa-vendas/:edicaoId  (pinta pela planilha, realtime)
```

## 3. Convenção de desenho no Corel (contrato de entrada)

O motor é tolerante, mas o relatório aponta tudo que fugir disto:

1. Código do estande: `LETRA-NN` (letra maiúscula, hífen, dois dígitos). Ex.: `P-01`, `L-19`.
2. Numeração de cada família começa em **01** e é contínua (sem buracos). Não existe `X-00`.
3. O texto do código fica **dentro** do retângulo do estande.
4. Logo abaixo do código: área em m² (`25m²`) e, opcionalmente, medida (`5x5`). **Uma** medida por estande. Texto extra (ex.: bônus de área) vai para o manifesto, não para a planta.
5. Preenchimento com **uma cor por família** (o motor agrupa por cor e detecta retângulo sem código).
6. Famílias não comercializadas (pavilhões B e E, TL, Portaria etc.) podem ficar na planta; o manifesto as marca como ignoradas.
7. PDF exportado **com texto como texto** (não converter em curvas). Uma página.

## 4. Manifesto da edição (`motor-planta/manifestos/<slug>.json`)

Tudo que é decisão humana fica aqui. Preenchido pela IA junto com o usuário.

```json
{
  "edicao": { "slug": "megaleite-2027", "titulo": "Megaleite 2027", "ano": 2027 },
  "planta": { "arquivo": "H:/.../MEGALEITE 2026 - PLANTA BAIXA - ALT 01.pdf", "versao": "ALT 01" },
  "ignorar_familias": ["B", "E"],
  "combos": { "nomes": ["COMBO 01", "COMBO 02", "COMBO 03", "COMBO 04"], "precos": [5500, 8350, 10500, 18000] },
  "familias": {
    "C": { "tag": "CAMAROTES",            "tipo": "fixo",       "preco": 18800,   "area_padrao": 20 },
    "D": { "tag": "PRÉ-MONTADO 40M²",     "tipo": "fixo",       "preco": 37600,   "area_padrao": 40 },
    "F": { "tag": "ESPAÇO CRIADORES",     "tipo": "fixo",       "preco": 12000,   "area_padrao": 16 },
    "G": { "tag": "PRAÇA DE ALIMENTAÇÃO", "tipo": "fixo",       "preco": 0,       "area_padrao": 25 },
    "L": { "tag": "ÁREA LIVRE",           "tipo": "area_livre", "preco_m2": 425 },
    "M": { "tag": "MAQUINÁRIOS",          "tipo": "fixo",       "preco": 20002.5, "area_padrao": 105, "area_planta_ignorar": true },
    "P": { "tag": "PRÉ-MONTADOS",         "tipo": "fixo",       "preco": 23500,   "area_padrao": 25 },
    "R": { "tag": "RUBIS",                "tipo": "area_livre", "preco_m2": 400, "area_padrao": 25 }
  },
  "estandes": {
    "L-16": { "area": 40, "obs": "Pode usar +40 m² (7x5) nos fundos sem custo" },
    "L-17": { "area": 40, "obs": "Pode usar +40 m² (7x5) nos fundos sem custo" },
    "L-18": { "area": 40, "obs": "Pode usar +40 m² (7x5) nos fundos sem custo" }
  },
  "renomear": { "L-00": "L-20" }
}
```

- `area_padrao`: usado na validação (estande da família com m² diferente → alerta).
- `area_planta_ignorar`: para M, o m² escrito na planta (25) não é o comercial (105).
- `estandes`: sobrescritas pontuais (área, observação exibida no mapa).
- `renomear`: transição enquanto a planta ainda não segue a convenção.

## 5. Motor (Python) — módulos e responsabilidades

Pasta `motor-planta/` (não é importada pelo Vite; não entra no bundle).

| Módulo | Faz | Função pura? |
| --- | --- | --- |
| `extrair.py` | Abre o PDF (PyMuPDF), devolve palavras com posição, retângulos preenchidos com cor, tamanho da página | I/O na borda; parse puro |
| `associar.py` | Casa cada código com o retângulo que o contém e com o m²/medida abaixo; agrupa por família e cor | **sim** |
| `validar.py` | Aplica as regras da seção 3 + manifesto; gera lista de alertas com severidade (`erro`, `aviso`) | **sim** |
| `comparar.py` | Diff entre dois `mapa.json` (novos, removidos, renomeados por posição, área alterada, movidos) | **sim** |
| `gerar_mapa.py` | `mapa.json` (viewBox + polígonos por estande com `codigo`, `stand_nr`, `familia`, `area`, `obs`) e `fundo.png` (página rasterizada com os retângulos dos estandes pintados de branco) | render na borda |
| `gerar_planilha.py` | `planilha.json` no formato `CategoriaSetup[]` da planilha + áreas por `stand_nr` + SQL de seed/sync (mesmo molde de `scripts/seed-megaleite-2027.sql`) | **sim** |
| `relatorio.py` | `relatorio.md` e `diff.md` legíveis para o usuário | sim |
| `cli.py` | `python -m motor_planta <manifesto> [--anterior saida/x/mapa.json]` | orquestra |

Regra de normalização de código (única, testada): `P-01` (planta) ⇄ `P 01` (`stand_nr` do sistema, gerado por `buildStandNr`). O motor sempre grava **os dois** no `mapa.json`.

Alertas de validação (mínimo):

- código duplicado · sem hífen · dígitos ≠ 2 · família fora do manifesto e não ignorada
- numeração com buraco · não começa em 01 · `X-00`
- m² divergente de `area_padrao` · duas medidas no mesmo estande · sem m² em família `area_livre`
- código sem retângulo · retângulo (cor de família) sem código · dois códigos no mesmo retângulo
- contagem por família ≠ contagem da planilha existente (quando informada)

## 6. Lado do sistema (React + Supabase)

### 6.1 Dados

Nova tabela `planilha_mapa` (uma linha por edição; versões antigas ficam por histórico):

```sql
CREATE TABLE public.planilha_mapa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id   uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  versao      text NOT NULL,              -- "ALT 01"
  ativo       boolean NOT NULL DEFAULT true,
  view_box    text NOT NULL,              -- "0 0 1190 842"
  fundo_path  text,                       -- bucket edicao-docs: <edicaoId>/mapa-fundo.png
  estandes    jsonb NOT NULL,             -- [{codigo, stand_nr, familia, pontos:[[x,y]...], area, obs}]
  gerado_em   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX planilha_mapa_um_ativo ON public.planilha_mapa (edicao_id) WHERE ativo;
```

Por que JSON e não SVG no storage: o bucket `edicao-docs` só aceita PDF/JPEG/PNG/WEBP
(Bloco 26) e SVG pode carregar script. O fundo vai como **PNG** (permitido) e os
estandes são desenhados pelo React a partir do JSON. Nenhum código estranho é injetado.

### 6.2 RLS (projetada antes da tela — seção 4 do padrão)

- `ENABLE ROW LEVEL SECURITY` em `planilha_mapa`.
- Policy `master_isolation` idêntica à de `planilha_configuracoes` (join edição → evento; `is_master() OR master_user_id IS NULL`).
- **SELECT** para `authenticated` dentro da regra acima (equipe de vendas). **INSERT/UPDATE/DELETE** só para master (`is_master()`), pois quem publica o mapa é o dono; visitante/temporário nunca escreve.
- Nenhuma policy `USING (true)`.
- Teste de segurança: usuário não-master não lê mapa de evento exclusivo master; usuário comum não consegue inserir.

### 6.3 Código

Segue o padrão hooks + orquestrador + components por módulo:

| Arquivo | Papel |
| --- | --- |
| `services/mapaVendasService.ts` | `getMapaAtivo(edicaoId)`, `publicarMapa(...)`, URL assinada do fundo. Único ponto que toca `supabase`. |
| `utils/mapaCalc.ts` | **Funções puras**: `normalizarCodigo`, `statusDoEstande(estande, planilha)`, `corPorStatus`, `resumoPorFamilia`. 90%+ de cobertura. |
| `hooks/useMapaVendas.ts` | Carrega mapa + estandes da planilha (`planilhaVendasService`), assina realtime de `planilha_vendas_estandes` (já publicado), expõe estado. |
| `components/mapa/MapaSvg.tsx` | `<svg viewBox>` com `<image>` do fundo + `<polygon>` por estande, cor por status, clique → painel. Pan/zoom simples. |
| `components/mapa/PainelEstande.tsx` | Cliente, tipo de venda, valor, área, observação (ex.: bônus L-16..18). |
| `components/mapa/LegendaCores + ResumoFamilias.tsx` | Cores e contagem por família (vendidos / livres). |
| `pages/MapaVendas.tsx` | Orquestrador. Rota `/mapa-vendas/:edicaoId` em `App.tsx` (ProtectedRoute). Link a partir da planilha. |

Status e cor (definidos em `mapaCalc.ts`, uma fonte só):

| Status | Regra (linha da planilha) | Cor |
| --- | --- | --- |
| livre | `tipo_venda = 'DISPONÍVEL'` e sem cliente | cinza claro |
| reservado | cliente preenchido (`cliente_id` ou `cliente_nome_livre`) mas sem `x`/`*` | amarelo |
| vendido | `x` na planilha = `tipo_venda` sem `*` (STAND PADRÃO ou COMBO N) | verde (#00B050, igual à planilha) |
| cortesia/permuta | `*` na planilha = `tipo_venda` termina com `*` | azul (#00B0F0, igual à planilha) |
| sem planilha | código do mapa não existe em `planilha_vendas_estandes` | vermelho (alerta de sincronização) |

Regra simples confirmada pelo usuário (17/09): **qualquer `x` ou `*` ocupa o estande no mapa.**
`valor_pago` não muda a cor; aparece só no painel do estande (pago / a receber).

Cores exatas passam pelo skill `dataviz` na implementação (legível em tema claro/escuro).

### 6.4 Publicação do mapa

Enquanto a IA não tem login no sistema: o motor gera `saida/<edicao>/publicar.sql`
(insere/atualiza `planilha_mapa`) e o usuário roda no SQL Editor; o `fundo.png` sobe
pela tela da edição (campo novo "Fundo do mapa", reusando `edicaoDocsService`).
Fase posterior: botão "Importar mapa" na própria página, lendo o `mapa.json` do disco.

## 7. Testes (nascem com o código)

- **Motor (pytest, já instalado):** fixtures com PDFs mínimos gerados em teste (PyMuPDF cria PDF) cobrindo cada regra de validação, o diff e a normalização. A planta real do Megaleite entra como teste de regressão (contagens conhecidas: 139 estandes, 8 famílias).
- **App (vitest):** `mapaCalc.test.ts` (status, cor, normalização, resumo — todos os casos-limite), `mapaVendasService.test.ts` com banco mockado (payload e erro), e o teste de RLS (papel restrito não lê/escreve).
- CI atual roda `vitest`; adicionar job de `pytest` para `motor-planta/`.

## 8. Plano de entrega (commits pequenos, um por passo)

| # | Entrega | Quem |
| --- | --- | --- |
| 0 | Esta especificação + manifesto do Megaleite 2027 | forte ✅ f452f7d |
| 1 | Motor: `extrair` + `associar` + `normalizar` com testes-molde | forte ✅ aa85615 |
| 2 | Motor: `validar` (regras) + `relatorio` | forte ✅ aa85615 (8 regras, feitas junto por serem pequenas) |
| 3 | Motor: `comparar` (diff) | forte ✅ aa85615 |
| 4 | Motor: `gerar_mapa` (`mapa.json` + `fundo.png`) e `gerar_planilha` (JSON + SQL) | forte ✅ aa85615 / 4c0901a |
| 5 | Migration `planilha_mapa` + RLS + teste de segurança + `mapaVendasService` | forte ✅ 318a405 (RLS provada em Postgres local) |
| 6 | `mapaCalc.ts` + testes | forte ✅ 318a405 |
| 7 | Hook, componentes e página (rota, link na planilha) | agente menor (sonnet) ✅ revisado pelo forte (472 testes, build ok) |
| 8 | Publicar piloto Megaleite 2027; atualizar `docs/contexto/estado-producao.md` e memória | forte |

Cada passo termina com `npm test` (e `pytest` no motor) verdes e commit reportado com hash + versão.

## 9. Pendências / perguntas abertas

- [ ] Rodar `scripts/seed-megaleite-2027.sql` no Supabase (usuário) — o mapa depende da planilha existir.
- [x] `L-00` → `L-20` resolvido via `renomear` no manifesto (planta pode ficar como está).
- [x] Família **PR = Patrocinadores** (20 na pista, preço zero) — decidido 17/09, incluída no manifesto e no seed.
- [x] "Vendido" = `x`; cortesia = `*`; ambos ocupam. `valor_pago` só no painel. (confirmado 17/09)
- [ ] Quando o mapa for aberto a clientes (futuro): nova policy de leitura sem preço + página pública separada. Fora deste escopo.
