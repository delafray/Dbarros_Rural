# Import do catálogo REAL do Prosperitas (análise completa — 04/08/2026)

> **⚠️ ESCOPO (usuário, 04/08)**: este import é **exclusivamente a seção
> ESTRUTURA** (RF-055). Julgamento (por raça), Diversos "e outros que vão
> chegar" têm itens próprios que NÃO vêm do Prosperitas — chegarão das
> planilhas de custos reais e de relatos futuros. Grupos/espaços/descritivo
> (RF-056/057/058) vivem dentro de Estrutura; não estender este catálogo às
> outras seções.

> Contexto: os 58 produtos do seed (Bloco 17) são INVENÇÃO da IA a partir das
> planilhas. O catálogo REAL é o do Prosperitas (340 produtos, 13 grupos,
> 5 unidades) e vem do dump MySQL do sistema Grails antigo. Esta página guarda
> TODA a análise feita para gerar o SQL de import — nada precisa ser re-analisado.

## 1. Fonte dos dados

- **Dump**: `C:\Users\ronal\Documents\Antigravity\_OLD-2026_05_05\sistema (3)\backup.sql`
  (332 MB, MySQL 5.7, encoding **latin1**, 26/03/2026). A cópia
  `sistema (3) - Copia\backup.sql` é **idêntica** (cmp ok). A da raiz
  `_OLD-2026_05_05\backup.sql` é de 25/03 (488 bytes menor) — usar a de 26/03.
- Guia da migração antiga: `PROSPERITAS\backupBD.md`. Script da época:
  `PROSPERITAS\prosperitas\scripts\migrar_fixo.js` (nota "tendas não estão no
  backup" está DEFASADA — o dump de 26/03 TEM as tendas ids 1–13).
- Fonte alternativa mais fresca (se quiser dados pós-março): Supabase do
  Prosperitas, projeto `wxzxspqebbhkbrrhhakq`, credenciais em
  `PROSPERITAS\prosperitas\.env.local`.

## 2. O que o dump contém (verificado por grep)

| Tabela MySQL | Registros | Uso |
|---|---|---|
| `produto` | **340** (1 INSERT, tuplas separadas por `),(`) | catálogo |
| `produto_grupo` | **13** | grupos (Montagem, Elétrica...) |
| `unidade_medida` | **5** (Unidade/Unid., Metro quadrado/m², Metro/m, Segundo/s, Metro cúbico/m³) | unidades |
| `produto_subgrupo` | 0 (vazia) | ignorar |
| `item_descritivo` | ~200K (27 INSERTs) | contar por `produto_id` → **frequencia_uso real (RF-049)** |

## 3. Ordem das colunas nas tuplas (extraída dos CREATE TABLE do dump)

- **produto** (18 cols): `id, version, consumo_kva, custo, data_inclusao,
  data_ultima_alteracao, descricao, finalidade, grupo_id, id_ext, subgrupo_id,
  tenant_id, unidade_id, usuario_id, usuario_inclusao_id, valor_locacao,
  observacao, nao_cadastrado`
  - interessam: idx0 id · idx2 **consumo_kva** (→ RF-022!) · idx3 custo ·
    idx6 descricao (=nome) · idx8 grupo_id · idx12 unidade_id ·
    idx15 valor_locacao · idx16 observacao
  - amostra: `(1,2,NULL,NULL,NULL,'2025-12-15 12:18:19','Tenda piramidal 3,00x3,00m',0,1,NULL,NULL,1,1,17,NULL,340.00,NULL,NULL)`
- **produto_grupo** (12 cols): `id, version, data_inclusao,
  data_ultima_alteracao, descricao, id_ext, tenant_id, usuario_id,
  usuario_inclusao_id, tabela, ordem, tipo_list` — interessam idx0 id,
  idx4 descricao (=nome), idx10 ordem
- **unidade_medida** (10 cols): `id, version, data_inclusao,
  data_ultima_alteracao, descricao, id_ext, tenant_id, unidade, usuario_id,
  usuario_inclusao_id` — interessam idx0 id, idx4 descricao (=nome),
  idx7 unidade (=sigla: `Unid.`, `m²`, `m`, `s`, `m³`)
- **item_descritivo** (18 cols): `id, version, data_inclusao,
  data_ultima_alteracao, id_ext, observacao, produto_id, tenant_id,
  usuario_id, usuario_inclusao_id, formato, local, projeto_id, quantidade,
  valor_item, desc_item, grupo_id, unidade_id` — interessa idx6 **produto_id**
  (contar ocorrências não-NULL por produto)

## 4. Os 13 grupos e o de-para grupo → categoria rural (decisão IA, ajustável)

| id | Grupo Prosperitas | → slug `custos_categorias` |
|---|---|---|
| 1 | Tenda / Telhado | `tendas` |
| 2 | Piso / Revestimento | `piso` |
| 3 | Montagem | `estruturas` |
| 4 | Marcenaria | `marcenaria` |
| 5 | Mobiliário | `mobiliario` |
| 6 | Eletro / Eletrônico | `eletrica` |
| 7 | Paisagismo | `decoracao` |
| 8 | Box Truss | `estruturas` |
| 9 | Tecido | `decoracao` |
| 10 | Serralheria | `estruturas` |
| 11 | Impressão Digital | `programacao-visual` |
| 12 | Elétrica | `eletrica` |
| 13 | Outros | `outros` |

Base: Q-020↗ (categorias rurais substituem os 13 grupos, em tabela
configurável). O grupo original é PRESERVADO em tabela própria; a categoria é
o lado de cotação.

## 5. Desenho do destino (tabelas novas + alterações)

Schema em produção (migration `20260804120000_modulo_custos_fase0.sql`):
`custos_produtos` (uuid, nome, descricao, unidade text, categoria_id,
frequencia_uso, ativo, busca_tsv GENERATED com `custos_unaccent`) — linhas
201-216; `custos_categorias` (23 seeds, slug UNIQUE) — linha 154; RLS padrão
EMPRESA (sel: admin/gestor/projetista; ins/upd: gestor; del: admin) — Bloco
13a, linhas 565-585.

**Criar** (com RLS padrão EMPRESA idêntico ao Bloco 13a):
1. `custos_unidades` — id uuid, nome text NOT NULL, sigla text NOT NULL UNIQUE,
   prosperitas_id int UNIQUE, ativo bool default true, criado_em. Seeds: as 5
   do dump + as siglas já usadas nos seeds atuais (`un`,`m2`,`diaria`,`evento`,
   `vb`,`kit`,`saco`,`fardo`,`m3`,`km`,`semana`,`m`) para consistência.
2. `custos_produto_grupos` — id uuid, nome text NOT NULL UNIQUE, ordem int,
   prosperitas_id int UNIQUE, ativo bool, criado_em. Seeds: os 13 grupos.

**Alterar `custos_produtos`** (ADD COLUMN IF NOT EXISTS):
- `grupo_id` uuid REFERENCES custos_produto_grupos ON DELETE SET NULL
- `unidade_id` uuid REFERENCES custos_unidades ON DELETE SET NULL
- `preco_locacao` numeric(12,2) CHECK (>= 0) — vem de `valor_locacao`
- `preco_custo` numeric(12,2) CHECK (>= 0) — vem de `custo`
- `consumo_kva` numeric(10,2) CHECK (>= 0) — liga com RF-022
- `observacao` text
- `prosperitas_id` int UNIQUE — chave de idempotência/dedup do import
- `origem` text NOT NULL DEFAULT 'manual' — marcar `'prosperitas'` no import;
  fazer UPDATE marcando os 58 do seed como `'seed'` (decidir depois se purga)

**Import dos 340 produtos**: nome=descricao, categoria via de-para do grupo,
`unidade` text = slug ASCII da sigla (`Unid.`→`un`, `m²`→`m2`, `m³`→`m3`,
`m`→`m`, `s`→`s`, NULL→`un`), frequencia_uso = contagem em item_descritivo
(cap opcional: a busca já faz `least(freq,100)`), ativo=true.
Idempotente: `ON CONFLICT (prosperitas_id) DO NOTHING` + guarda por nome.

## 6. Armadilhas do dump (parser)

- **Encoding latin1** → ler como latin1 e emitir UTF-8 (acentos: Mobiliário,
  Elétrica, m²).
- Escapes MySQL dentro de strings: `\'` → `''` (Postgres), `\"` → `"` (o
  backupBD.md risco 9 diz que há `\"` literal poluindo nomes — REMOVER a
  barra), `\\` → `\`. Parser de tuplas tem de respeitar aspas (não fazer
  split ingênuo por vírgula).
- As linhas INSERT são gigantes (uma linha por tabela; item_descritivo em 27
  linhas) — processar por streaming/linha, não carregar 332 MB de uma vez se
  possível (ou carregar, é aceitável em Node).
- `nao_cadastrado` bit: `_binary ''`/`_binary '\0'` — ignorar (não importa).

## 7. Entregável e modo de trabalho

- Script gerador: `scripts/gerar-import-prosperitas.mjs` (Node puro, sem deps)
  → lê o dump → escreve `scripts/import-prosperitas-catalogo.sql`.
- O SQL segue o modo do módulo: **bloco unitário** que o usuário aplica no
  Supabase SQL Editor e confirma. Idempotente (roda 2x sem duplicar).
- Verificações no fim do bloco: `SELECT count(*)` esperando 13 grupos, 5+
  unidades, 340 produtos com origem='prosperitas'; amostra com acento correto.
- NÃO mexe nos seeds existentes além do UPDATE de `origem='seed'`; NÃO deleta
  nada (purga dos 58 inventados = decisão do usuário, pendente).

## Status

- [x] Análise completa (este doc)
- [x] Gerador + SQL produzidos (Haiku gerou; Fable revisou e corrigiu 5
      defeitos: `p.descricao`/`p.prosperitas_id` inexistentes no alias,
      policies INVENTADAS pelo Haiku (`auth.jwt()`/'supadmin') trocadas pelo
      padrão real do Bloco 13a, seeds de unidade perdendo `prosperitas_id`
      na dedup, e caminho do dump apontando para a cópia de 25/03)
- [x] **Correção da spec**: o dump é **UTF-8**, não latin1 (verificado por
      bytes: `c3 ba` = "ú") — a seção 6 estava errada nesse ponto
- [x] Arquivos: `scripts/gerar-import-prosperitas.mjs` (gerador) e
      `scripts/import-prosperitas-catalogo.sql` (bloco, 38 KB, idempotente,
      340 produtos + 13 grupos + 13 unidades + frequência real de uso
      calculada dos ~200K item_descritivo — 321 produtos com uso)
- [x] **Usuário aplicou e confirmou (04/08/2026)**: 13 grupos, 13 unidades,
      340 produtos origem='prosperitas', 58 origem='seed' preservados
- [x] Registrado no log 04 (04/08/2026)

Notas do bloco final: `NULLIF(x,0)` zera→NULL em preços/kVA (preço 0 real não
existe no dump); produto sem grupo cai em 'outros'; nada é deletado — os 58
produtos do seed ficam marcados `origem='seed'` (purga = decisão do usuário).
