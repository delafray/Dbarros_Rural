# 69 — Plano de Implantação do Banco (Centro de Custo do Evento)

> Data: 04/08/2026 · Papel: Arquiteto de Dados do módulo. Trabalho LOCAL, sem internet.
> Alvo: DDL completo + RLS + triggers + busca RF-049, dividido em **BLOCOS UNITÁRIOS**
> pequenos, sequenciais, aplicáveis e verificáveis isoladamente no painel Supabase.
> Decisão do usuário (04/08): o SQL vai em blocos pequenos, nunca "arquivo monstro" —
> a IA para, entrega o bloco, o usuário aplica e roda a query de verificação, confirma,
> a IA segue para o próximo.

## Como usar este documento

- Cada **Bloco N** é auto-contido e **idempotente** (`IF NOT EXISTS` / `CREATE OR REPLACE`
  onde possível), com **dependências declaradas** e uma **query de verificação** no fim
  ("rode isto e me diga o resultado").
- Prefixo `custos_` em TODAS as tabelas novas do módulo (evita colisão com o schema atual;
  o `grep` do dev separa o módulo em 1 comando).
- Todo valor monetário: `NUMERIC(12,2) NOT NULL CHECK (>= 0)`. Quantidade: `NUMERIC(12,3)`.
  Nunca `float`/`money` (rel. 12 §1).
- Raiz de custo: **`edicao_id NOT NULL` → `eventos_edicoes(id)`** (Q-001, rel. 61/65).
  Cadastros de nível empresa (fornecedores, produtos, sinônimos, equivalências, biblioteca
  de espaços-template) NÃO descem para a edição — são globais.
- Ordem obrigatória: extensões/helpers → tabelas empresa → tabelas de edição → junções →
  RLS → triggers → busca. Não pular blocos (as FKs quebram).

---

## Pré-condições que herdamos do schema atual (rel. 65 — NÃO IGNORAR)

| Achado | Estado hoje | O que este plano faz |
|---|---|---|
| `eventos_edicoes.evento_id` é **NULLABLE** | edição órfã de pai é inserível | **Bloco 2** torna `NOT NULL` (após checagem de dados) |
| **Sem criação atômica pai+edição** | existe evento sem edição → custo não tem onde ancorar | **Bloco 3**: RPC `custos_criar_evento_com_edicao` |
| RLS `master_isolation` **não lê `users.edicao_id`** | visitante vê todas as edições não-master | **NÃO copiar.** Bloco 4 escreve RLS por edição de verdade (`custos_pode_ver_edicao`) |
| Falta estado **simulação/rascunho** de edição | RF-046 poluiria a série com orçamentos abortados | **Bloco 2** adiciona `eventos_edicoes.status_custos` ('rascunho'/'simulacao'/'confirmada'/'encerrada') |
| "40 planilhas" = 1 evento, não 40 anos | — | migração é 40→1 edição (RF-047); nada estrutural a fazer aqui |

O que **muda no schema existente** (sem quebrar): só 2 colunas aditivas em `eventos_edicoes`
(`status_custos`, `custos_baseline_congelado_em`) e o `NOT NULL` em `evento_id`. Nenhuma
tabela atual é dropada ou renomeada; nenhuma policy atual é tocada (as novas policies são só
das tabelas `custos_*`).

---

## Mapa das tabelas (23 tabelas + 4 enums)

**Nível EMPRESA (global, sem `edicao_id`):**
1. `custos_categorias` — categorias de cotação rurais (Q-020↗, configurável pelo admin)
2. `custos_fornecedores` — CNPJ como chave de dedup (RF-010/027/028)
3. `custos_fornecedor_categorias` — N:N fornecedor×categoria (RF-010)
4. `custos_produtos` — catálogo da empresa (RF-044); busca RF-049
5. `custos_produto_sinonimos` — sinônimos p/ busca ("toldo"→tenda) (RF-049)
6. `custos_produto_equivalencias` — de-para fornecedor×catálogo (RF-045)
7. `custos_espacos_template` — biblioteca de ~30 espaços-template (RF-050)
8. `custos_espaco_template_itens` — itens de cada template (descritivo do espaço)

**Nível EDIÇÃO (raiz `edicao_id NOT NULL`):**
9. `custos_perfil_edicao` — perfil/modularidade (RF-042, camada 0; público esperado Q-005)
10. `custos_checklist_respostas` — questionário/checklist ticado por edição (RF-020/021/041)
11. `custos_compostos` — instâncias de composto na edição (bar, estande...) (RF-032)
12. `custos_itens` — item de necessidade (a grade, porta do Prosperitas RF-031); 3 gavetas de alocação (Q-021)
13. `custos_item_faces` — as 7 faces por item (embutido/à parte/N/A) (RF-051)
14. `custos_pedidos` — pedidos de orçamento (agrupamento) (RF-002/003)
15. `custos_pedido_itens` — N:N item×pedido, com desmarca por modal (RF-036)
16. `custos_cotacoes` — cotação (cabeçalho) de 1 fornecedor sobre 1 pedido (RF-011/029)
17. `custos_cotacao_linhas` — preço de 1 item por 1 fornecedor (split award) (RF-011)
18. `custos_cotacao_exclusoes` — checklist all-in / exclusões (RF-052)
19. `custos_contratacoes` — award/compromisso firmado (contratado) (RF-008/038)
20. `custos_contratacao_linhas` — linhas contratadas (split por linha/quantidade)
21. `custos_pagamentos` — pagamento com parcelas/vencimento (Q-009); realizado (RF-008)
22. `custos_rateio` — parcela rateada de item→composto (RF-033/034, driver rel. 63)
23. `custos_audit` — auditoria JSONB genérica (rel. 12 §4)

**Enums (Bloco 1):** `custos_status_item`, `custos_status_cotacao`, `custos_status_contratacao`,
`custos_driver_rateio`, `custos_face_status`, `custos_status_pagamento`.

**Total: 23 tabelas + 6 enums, entregues em 14 blocos SQL.**

---

## BLOCO 1 — Extensões, enums e helpers de papel (fundação, sem dependências)

Cria as extensões de busca, os enums e os helpers de papel. **Não copia `master_isolation`.**
Papéis derivados das colunas existentes de `users`: `is_admin`, `can_manage_tags` (master →
tratado como gestor pleno aqui), `is_projetista`, `is_visitor`. "Vendedor" = usuário
autenticado sem nenhuma das flags acima (Q-002: NÃO vê custos).

```sql
-- ── 1.1 Extensões de busca (RF-049) ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS unaccent;   -- remove acento: "café" = "cafe"
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigramas: typo "cadera" ~ "cadeira"

-- ── 1.2 Enums do módulo ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE custos_status_item AS ENUM
    ('rascunho','orcado','cotado','contratado','realizado','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE custos_status_cotacao AS ENUM
    ('rascunho','enviada','recebida','vencida','descartada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE custos_status_contratacao AS ENUM
    ('ativa','cancelada','aditada','concluida');   -- Q-025 ciclo de vida
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE custos_driver_rateio AS ENUM
    ('quantidade','valor','percentual','direto');  -- rel. 63
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE custos_face_status AS ENUM ('embutido','a_parte','na');  -- RF-051
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE custos_status_pagamento AS ENUM
    ('previsto','agendado','pago','cancelado');    -- Q-009
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 1.3 Helper de papel (cacheado por query, SECURITY DEFINER) ────────────────
-- Retorna o papel do usuario logado. NÃO herda master_isolation.
CREATE OR REPLACE FUNCTION public.custos_papel()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN u.is_admin THEN 'admin'
    WHEN COALESCE(u.can_manage_tags,false) THEN 'gestor'  -- master = gestor pleno no módulo
    WHEN COALESCE(u.is_projetista,false) THEN 'projetista'
    WHEN COALESCE(u.is_visitor,false)    THEN 'visitante'
    ELSE 'vendedor'                                        -- Q-002: NÃO vê custos
  END
  FROM public.users u
  WHERE u.id = (SELECT auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.custos_papel() TO authenticated;

-- Papel gestor pleno (CRUD de custos): admin + gestor
CREATE OR REPLACE FUNCTION public.custos_eh_gestor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.custos_papel() IN ('admin','gestor') $$;
GRANT EXECUTE ON FUNCTION public.custos_eh_gestor() TO authenticated;
```

**Verificação Bloco 1:**
```sql
SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm');           -- 2 linhas
SELECT typname FROM pg_type WHERE typname LIKE 'custos_%' ORDER BY 1;               -- 6 enums
SELECT public.custos_papel();  -- deve retornar seu papel (ex.: 'admin')
```
Esperado: 2 extensões, 6 enums, e o papel do usuário logado.

---

## BLOCO 2 — Ajuste do schema EXISTENTE (aditivo, não quebra nada)

Dependência: nenhuma nova. Toca só `eventos_edicoes`. Rodar a checagem de dados ANTES do
`NOT NULL` — se houver edição órfã, o bloco avisa em vez de falhar.

```sql
-- ── 2.1 Estado de custos por edição (simulação/rascunho — rel. 65 Ataque 5) ──
DO $$ BEGIN
  CREATE TYPE custos_status_edicao AS ENUM
    ('rascunho','simulacao','confirmada','encerrada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.eventos_edicoes
  ADD COLUMN IF NOT EXISTS status_custos custos_status_edicao NOT NULL DEFAULT 'rascunho';

ALTER TABLE public.eventos_edicoes
  ADD COLUMN IF NOT EXISTS custos_baseline_congelado_em timestamptz;

-- ── 2.2 evento_id NOT NULL (rel. 65 Ataque 1) — só depois de checar órfãs ─────
-- Checagem: se retornar >0, resolver as órfãs (associar a um pai) ANTES do ALTER.
DO $$
DECLARE v_orfas int;
BEGIN
  SELECT count(*) INTO v_orfas FROM public.eventos_edicoes WHERE evento_id IS NULL;
  IF v_orfas > 0 THEN
    RAISE NOTICE 'ATENCAO: % edicao(oes) sem evento_id. NOT NULL adiado — resolver antes.', v_orfas;
  ELSE
    ALTER TABLE public.eventos_edicoes ALTER COLUMN evento_id SET NOT NULL;
    RAISE NOTICE 'evento_id agora e NOT NULL.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_eventos_edicoes_evento_id
  ON public.eventos_edicoes(evento_id);
```

**Verificação Bloco 2:**
```sql
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name='eventos_edicoes'
  AND column_name IN ('evento_id','status_custos','custos_baseline_congelado_em');
SELECT count(*) AS edicoes_orfas FROM public.eventos_edicoes WHERE evento_id IS NULL;
```
Esperado: `status_custos` e `custos_baseline_congelado_em` presentes; `edicoes_orfas = 0` e
`evento_id.is_nullable = NO` (se havia órfãs, o NOTICE apareceu — resolver e rerodar 2.2).

---

## BLOCO 3 — RPC de criação atômica pai+edição (rel. 65 Ataque 1)

Dependência: Bloco 2. Garante que nunca exista pai sem edição nem edição sem pai. É o único
caminho autorizado para abrir um centro de custo. `SECURITY DEFINER` + checagem de papel
dentro da função (não confia só na RLS).

```sql
CREATE OR REPLACE FUNCTION public.custos_criar_evento_com_edicao(
  p_nome_evento   text,
  p_titulo_edicao text,
  p_ano           int,
  p_status        custos_status_edicao DEFAULT 'rascunho',
  p_evento_id     uuid DEFAULT NULL   -- se informado, cria só a edição nesse pai
)
RETURNS TABLE (evento_id uuid, edicao_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_evento_id uuid; v_edicao_id uuid;
BEGIN
  IF NOT public.custos_eh_gestor() THEN
    RAISE EXCEPTION 'Sem permissao: apenas admin/gestor criam evento com edicao';
  END IF;

  IF p_evento_id IS NULL THEN
    INSERT INTO public.eventos (nome) VALUES (p_nome_evento) RETURNING id INTO v_evento_id;
  ELSE
    v_evento_id := p_evento_id;
    IF NOT EXISTS (SELECT 1 FROM public.eventos WHERE id = v_evento_id) THEN
      RAISE EXCEPTION 'evento_id % inexistente', v_evento_id;
    END IF;
  END IF;

  INSERT INTO public.eventos_edicoes (evento_id, titulo, ano, status_custos)
  VALUES (v_evento_id, p_titulo_edicao, p_ano, p_status)
  RETURNING id INTO v_edicao_id;

  RETURN QUERY SELECT v_evento_id, v_edicao_id;
END $$;
GRANT EXECUTE ON FUNCTION public.custos_criar_evento_com_edicao TO authenticated;
```

**Verificação Bloco 3:**
```sql
SELECT * FROM public.custos_criar_evento_com_edicao('TESTE Rodeio','TESTE 2026',2026,'simulacao');
-- devolve (evento_id, edicao_id). Confira que nasceram os 2:
SELECT e.id AS pai, ee.id AS edicao, ee.status_custos
FROM public.eventos e JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
WHERE e.nome = 'TESTE Rodeio';
-- Limpeza do teste:
DELETE FROM public.eventos WHERE nome = 'TESTE Rodeio';  -- cascade apaga a edicao
```
Esperado: 1 par pai+edição criado atomicamente; após o DELETE, some tudo.

---

## BLOCO 4 — Helper de visibilidade por edição (o coração da RLS)

Dependência: Bloco 1. Este é o helper que **substitui** `master_isolation`. Centraliza a
regra "posso ver esta edição?" em UMA função (rel. 65 Ataque 6: não colar o join 20 vezes).

Regra (Q-002/026):
- **admin/gestor**: vê TODAS as edições (CRUD pleno).
- **projetista**: vê a edição a que está ligado (`users.edicao_id`), mas SEM valores (Bloco 13 trata os valores via views/RLS de coluna).
- **visitante**: vê APENAS a edição de `users.edicao_id` (contido de verdade — corrige o furo do rel. 65). Nunca escreve.
- **vendedor**: NÃO vê nada de custos (função retorna false).

```sql
-- Posso VER (SELECT) linhas desta edicao?
CREATE OR REPLACE FUNCTION public.custos_pode_ver_edicao(p_edicao_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE public.custos_papel()
    WHEN 'admin'  THEN true
    WHEN 'gestor' THEN true
    WHEN 'projetista' THEN EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid()) AND u.edicao_id = p_edicao_id )
    WHEN 'visitante' THEN EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid()) AND u.edicao_id = p_edicao_id )
    ELSE false   -- vendedor: nada
  END
$$;
GRANT EXECUTE ON FUNCTION public.custos_pode_ver_edicao(uuid) TO authenticated;

-- Posso ESCREVER (INSERT/UPDATE/DELETE) nesta edicao? So gestor pleno.
CREATE OR REPLACE FUNCTION public.custos_pode_escrever_edicao(p_edicao_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.custos_eh_gestor() $$;  -- projetista escreve so descritivo (Bloco 13)
GRANT EXECUTE ON FUNCTION public.custos_pode_escrever_edicao(uuid) TO authenticated;
```

**Verificação Bloco 4:**
```sql
-- Como admin/gestor deve dar true para qualquer edicao existente:
SELECT public.custos_pode_ver_edicao( (SELECT id FROM public.eventos_edicoes LIMIT 1) ) AS ver,
       public.custos_pode_escrever_edicao( (SELECT id FROM public.eventos_edicoes LIMIT 1) ) AS escrever;
```
Esperado (logado como admin): `ver=true, escrever=true`. O teste como visitante/vendedor é
feito no Bloco 14 (testes automatizados) e manualmente no fim.

---

## BLOCO 5 — Tabelas EMPRESA: categorias, fornecedores, N:N

Dependência: Bloco 1. Cadastros globais (não têm `edicao_id`).

```sql
-- ── 5.1 Categorias de cotação (Q-020↗ configuravel pelo admin) ───────────────
CREATE TABLE IF NOT EXISTS public.custos_categorias (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL UNIQUE,
  slug         text NOT NULL UNIQUE,
  pacote_unico boolean NOT NULL DEFAULT false,  -- RF-024 (programacao visual etc.)
  ordem        int NOT NULL DEFAULT 0,
  ativo        boolean NOT NULL DEFAULT true,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

-- ── 5.2 Fornecedores (CNPJ = chave de dedup, RF-010/027/028) ─────────────────
CREATE TABLE IF NOT EXISTS public.custos_fornecedores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj          text UNIQUE,                    -- pode ser NULL (MEI/pessoa) mas unico se houver
  razao_social  text NOT NULL,
  nome_fantasia text,
  email         text,
  telefone      text,
  cidade        text,
  uf            text CHECK (uf IS NULL OR char_length(uf)=2),
  km_base       numeric(10,2) CHECK (km_base IS NULL OR km_base >= 0), -- p/ frete RF-052
  observacoes   text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custos_forn_cnpj_14dig CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$')
);

-- ── 5.3 N:N fornecedor x categoria (um fornecedor atende varias) ─────────────
CREATE TABLE IF NOT EXISTS public.custos_fornecedor_categorias (
  fornecedor_id uuid NOT NULL REFERENCES public.custos_fornecedores(id) ON DELETE CASCADE,
  categoria_id  uuid NOT NULL REFERENCES public.custos_categorias(id)   ON DELETE CASCADE,
  PRIMARY KEY (fornecedor_id, categoria_id)
);
```

**Verificação Bloco 5:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('custos_categorias','custos_fornecedores','custos_fornecedor_categorias');
-- 3 linhas. Teste de dedup CNPJ:
INSERT INTO public.custos_fornecedores (cnpj, razao_social) VALUES ('11222333000181','Teste A');
-- rodar de novo deve falhar por UNIQUE:
-- INSERT INTO public.custos_fornecedores (cnpj, razao_social) VALUES ('11222333000181','Teste B');
DELETE FROM public.custos_fornecedores WHERE cnpj='11222333000181';
```
Esperado: 3 tabelas; 2º insert do mesmo CNPJ é rejeitado (UNIQUE).

---

## BLOCO 6 — Catálogo de produtos + sinônimos + equivalências + busca RF-049

Dependência: Blocos 1, 5. Aqui vive a busca "estilo Mercado Livre" (RF-049): coluna
`tsvector` em português + índice GIN trigram para typo + tabela de sinônimos consultada na
query + ranking por `frequencia_uso`. **Decisão RF-049:** usar tabela de sinônimos própria
(mais simples e editável que dicionário FTS custom no Supabase, que exige arquivos no
servidor — indisponível no managed Postgres).

```sql
-- ── 6.1 Catalogo de produtos (RF-044) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custos_produtos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL,
  descricao      text,
  unidade        text NOT NULL DEFAULT 'un',      -- un, m, m2, kg, diaria...
  categoria_id   uuid REFERENCES public.custos_categorias(id) ON DELETE SET NULL,
  frequencia_uso int NOT NULL DEFAULT 0,          -- ranking do autocomplete (RF-031/049)
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  -- Coluna de busca FTS pt-BR, gerada e sempre em dia:
  busca_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', unaccent(coalesce(nome,'') || ' ' || coalesce(descricao,'')))
  ) STORED
);
-- Índice FTS (tokenizacao/radicais) e trigram (typo/prefixo):
CREATE INDEX IF NOT EXISTS idx_custos_produtos_tsv  ON public.custos_produtos USING gin (busca_tsv);
CREATE INDEX IF NOT EXISTS idx_custos_produtos_trgm ON public.custos_produtos USING gin (nome gin_trgm_ops);

-- ── 6.2 Sinonimos ("toldo 10x10" -> tenda) (RF-049) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.custos_produto_sinonimos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.custos_produtos(id) ON DELETE CASCADE,
  termo      text NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_id, termo)
);
CREATE INDEX IF NOT EXISTS idx_custos_sinonimos_trgm
  ON public.custos_produto_sinonimos USING gin (termo gin_trgm_ops);

-- ── 6.3 Equivalencia fornecedor x catalogo ("cadeira Amanda"=cadeira branca) RF-045 ──
CREATE TABLE IF NOT EXISTS public.custos_produto_equivalencias (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id     uuid NOT NULL REFERENCES public.custos_produtos(id)     ON DELETE CASCADE,
  fornecedor_id  uuid NOT NULL REFERENCES public.custos_fornecedores(id) ON DELETE CASCADE,
  nome_fornecedor text NOT NULL,                 -- como o fornecedor chama
  criado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fornecedor_id, nome_fornecedor)        -- memorizado por fornecedor (RF-045)
);

-- ── 6.4 Função de busca (RF-049): FTS + trigram + sinonimos, ranqueada ────────
CREATE OR REPLACE FUNCTION public.custos_buscar_produtos(p_termo text, p_limite int DEFAULT 20)
RETURNS TABLE (id uuid, nome text, unidade text, frequencia_uso int, score real)
LANGUAGE sql STABLE
AS $$
  WITH q AS (SELECT unaccent(lower(p_termo)) AS t)
  SELECT p.id, p.nome, p.unidade, p.frequencia_uso,
         -- combina: match FTS + similaridade trigram + bônus de popularidade
         (ts_rank(p.busca_tsv, plainto_tsquery('portuguese',(SELECT t FROM q)))
          + similarity(unaccent(lower(p.nome)),(SELECT t FROM q))
          + least(p.frequencia_uso,100)::real/200.0) AS score
  FROM public.custos_produtos p
  WHERE p.ativo
    AND (
      p.busca_tsv @@ plainto_tsquery('portuguese',(SELECT t FROM q))
      OR unaccent(lower(p.nome)) % (SELECT t FROM q)                       -- trigram typo
      OR EXISTS (SELECT 1 FROM public.custos_produto_sinonimos s
                 WHERE s.produto_id=p.id
                   AND unaccent(lower(s.termo)) % (SELECT t FROM q))        -- sinonimo
    )
  ORDER BY score DESC, p.frequencia_uso DESC
  LIMIT p_limite
$$;
GRANT EXECUTE ON FUNCTION public.custos_buscar_produtos(text,int) TO authenticated;
```

**Verificação Bloco 6:**
```sql
INSERT INTO public.custos_produtos (nome,descricao,frequencia_uso)
VALUES ('Cadeira simples branca','plastica empilhavel',990),
       ('Tenda 10x10','piramidal',50);
INSERT INTO public.custos_produto_sinonimos (produto_id,termo)
  SELECT id,'toldo 10x10' FROM public.custos_produtos WHERE nome='Tenda 10x10';
SELECT nome, round(score::numeric,3) FROM public.custos_buscar_produtos('cadera');   -- typo -> cadeira
SELECT nome FROM public.custos_buscar_produtos('toldo');                             -- sinonimo -> Tenda
-- Limpeza:
DELETE FROM public.custos_produtos WHERE nome IN ('Cadeira simples branca','Tenda 10x10');
```
Esperado: "cadera" (com erro) retorna a cadeira; "toldo" retorna a Tenda via sinônimo.

---

## BLOCO 7 — Biblioteca de espaços-template (RF-050) e seus itens

Dependência: Blocos 5, 6. Templates reutilizáveis (Q-022), nível empresa.

```sql
CREATE TABLE IF NOT EXISTS public.custos_espacos_template (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL UNIQUE,               -- "Bar", "Stand basico", "CAEX"...
  descricao  text,
  porte      text,                               -- pequeno/medio/grande (RF-025, lista aberta)
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custos_espaco_template_itens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid NOT NULL REFERENCES public.custos_espacos_template(id) ON DELETE CASCADE,
  produto_id   uuid REFERENCES public.custos_produtos(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.custos_categorias(id) ON DELETE SET NULL,
  descricao    text NOT NULL,                    -- descritivo (o usuario preenche por espaço)
  quantidade   numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  formato      text,                             -- estilo Prosperitas (RF-031)
  ordem        int NOT NULL DEFAULT 0,
  criado_em    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custos_esp_tpl_itens_tpl
  ON public.custos_espaco_template_itens(template_id);
```

**Verificação Bloco 7:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('custos_espacos_template','custos_espaco_template_itens');  -- 2 linhas
```

---

## BLOCO 8 — Perfil da edição + checklist (RF-042/020/021/041)

Dependência: Bloco 2 (`eventos_edicoes`). Primeiras tabelas com raiz `edicao_id NOT NULL`.

```sql
-- ── 8.1 Perfil/modularidade (camada 0, RF-042; publico esperado Q-005) ───────
CREATE TABLE IF NOT EXISTS public.custos_perfil_edicao (
  edicao_id         uuid PRIMARY KEY REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  local_publico     boolean,                     -- publico x privado
  publico_esperado  int CHECK (publico_esperado IS NULL OR publico_esperado >= 0),
  tem_animais       boolean NOT NULL DEFAULT false,
  tem_show          boolean NOT NULL DEFAULT false,
  vende_alcool      boolean NOT NULL DEFAULT false,
  cobra_ingresso    boolean NOT NULL DEFAULT false,
  tem_estruturas    boolean NOT NULL DEFAULT false,
  local_fechado     boolean NOT NULL DEFAULT false,
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

-- ── 8.2 Respostas do checklist/questionario (RF-020/021/041) ─────────────────
CREATE TABLE IF NOT EXISTS public.custos_checklist_respostas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id     uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  chave         text NOT NULL,                   -- ex.: 'art','bombeiros','limpeza','caixas'
  marcado       boolean NOT NULL DEFAULT false,
  quantidade    numeric(12,3) CHECK (quantidade IS NULL OR quantidade >= 0),
  modalidade    text,                            -- ex.: banheiro quimico x conteiner x carreta
  prazo_limite  date,                            -- alerta retroativo (RF-014/021)
  observacao    text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edicao_id, chave)
);
CREATE INDEX IF NOT EXISTS idx_custos_checklist_edicao
  ON public.custos_checklist_respostas(edicao_id);
```

**Verificação Bloco 8:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='custos_perfil_edicao' ORDER BY 1;
SELECT count(*) FROM information_schema.tables WHERE table_name='custos_checklist_respostas';
```

---

## BLOCO 9 — Compostos + itens de necessidade + 7 faces (RF-032/031/051, Q-021)

Dependência: Blocos 2, 5, 6, 8. **Núcleo da grade.** Aqui vivem as 3 gavetas de alocação
(Q-021: `alocacao`) e o baseline imutável (RNF-010).

```sql
-- ── 9.1 Compostos da edicao (instancias de bar, estande...) RF-032 ───────────
CREATE TABLE IF NOT EXISTS public.custos_compostos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id    uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  template_id  uuid REFERENCES public.custos_espacos_template(id) ON DELETE SET NULL,
  nome         text NOT NULL,                    -- "Stand 5x5 #1"
  porte        text,                             -- RF-025
  quantidade   numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  criado_em    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custos_compostos_edicao ON public.custos_compostos(edicao_id);

-- ── 9.2 Itens de necessidade (a grade; porta do Prosperitas RF-031) ──────────
CREATE TABLE IF NOT EXISTS public.custos_itens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id     uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  composto_id   uuid REFERENCES public.custos_compostos(id) ON DELETE SET NULL, -- item pode ser avulso
  categoria_id  uuid REFERENCES public.custos_categorias(id) ON DELETE SET NULL,
  produto_id    uuid REFERENCES public.custos_produtos(id)   ON DELETE SET NULL,
  descricao     text NOT NULL,                   -- descritivo livre (RF-001)
  formato       text,
  quantidade    numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  unidade       text NOT NULL DEFAULT 'un',
  porte         text,                            -- RF-025

  -- 3 GAVETAS DE ALOCACAO (Q-021, rel. 63):
  alocacao      text NOT NULL DEFAULT 'direto'
                CHECK (alocacao IN ('direto','medivel','verba_fechada')),
  driver_rateio custos_driver_rateio NOT NULL DEFAULT 'quantidade',
  percentual_rateio numeric(5,2) CHECK (percentual_rateio IS NULL OR percentual_rateio BETWEEN 0 AND 100),

  avulso        boolean NOT NULL DEFAULT false,  -- RF-004 (bombeiros/seguro nao cotam)
  prazo_limite  date,                            -- providencia com prazo (RF-021)
  status        custos_status_item NOT NULL DEFAULT 'rascunho',

  -- Orcado corrente + total gerado:
  preco_unitario_orcado numeric(12,2) CHECK (preco_unitario_orcado IS NULL OR preco_unitario_orcado >= 0),
  total_orcado numeric(12,2) GENERATED ALWAYS AS
    (coalesce(preco_unitario_orcado,0) * quantidade) STORED,

  -- BASELINE IMUTAVEL (RNF-010; congelado por trigger no Bloco 11):
  baseline_preco_unitario numeric(12,2) CHECK (baseline_preco_unitario IS NULL OR baseline_preco_unitario >= 0),
  baseline_quantidade     numeric(12,3) CHECK (baseline_quantidade IS NULL OR baseline_quantidade > 0),
  baseline_congelado_em   timestamptz,

  criado_por    uuid REFERENCES public.users(id),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custos_itens_edicao   ON public.custos_itens(edicao_id);
CREATE INDEX IF NOT EXISTS idx_custos_itens_composto ON public.custos_itens(composto_id);
CREATE INDEX IF NOT EXISTS idx_custos_itens_categoria ON public.custos_itens(categoria_id);

-- ── 9.3 As 7 faces por item (RF-051) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custos_item_faces (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id   uuid NOT NULL REFERENCES public.custos_itens(id) ON DELETE CASCADE,
  face      int  NOT NULL CHECK (face BETWEEN 1 AND 7),  -- 1 mao de obra ... 7 overhead
  situacao  custos_face_status NOT NULL DEFAULT 'na',
  base_calculo text,                             -- "1-2 kg/pessoa/dia" (consumivel proporcional)
  valor     numeric(12,2) CHECK (valor IS NULL OR valor >= 0),  -- so quando 'a_parte'
  UNIQUE (item_id, face)
);
```

**Verificação Bloco 9:**
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='custos_itens' AND column_name IN
  ('alocacao','driver_rateio','avulso','total_orcado','baseline_preco_unitario');
-- Testa a coluna gerada e o CHECK de alocacao:
SELECT count(*) FROM public.custos_item_faces;  -- 0
```
Esperado: 5 colunas presentes; `total_orcado` é `numeric` gerada.

---

## BLOCO 10 — Pedidos, cotações, exclusões, contratações, pagamentos, rateio

Dependência: Bloco 9 + Bloco 5. Todo o ciclo procurement (rel. 01) ancorado na edição.

```sql
-- ── 10.1 Pedidos de orcamento (agrupamento RF-002/003) ───────────────────────
CREATE TABLE IF NOT EXISTS public.custos_pedidos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id  uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  categoria_id uuid REFERENCES public.custos_categorias(id) ON DELETE SET NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custos_pedidos_edicao ON public.custos_pedidos(edicao_id);

-- N:N item x pedido (item pode estar em 2 pedidos em cotacao - Q-024; modal desmarca RF-036)
CREATE TABLE IF NOT EXISTS public.custos_pedido_itens (
  pedido_id uuid NOT NULL REFERENCES public.custos_pedidos(id) ON DELETE CASCADE,
  item_id   uuid NOT NULL REFERENCES public.custos_itens(id)   ON DELETE CASCADE,
  quantidade numeric(12,3) NOT NULL CHECK (quantidade > 0),   -- qtd consolidada no pedido
  PRIMARY KEY (pedido_id, item_id)
);

-- ── 10.2 Cotacoes (cabecalho, 1 fornecedor por pedido) RF-011/029 ────────────
CREATE TABLE IF NOT EXISTS public.custos_cotacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id     uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  pedido_id     uuid NOT NULL REFERENCES public.custos_pedidos(id)  ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.custos_fornecedores(id) ON DELETE RESTRICT,
  status        custos_status_cotacao NOT NULL DEFAULT 'rascunho',
  frete         numeric(12,2) CHECK (frete IS NULL OR frete >= 0),  -- vazio gera alerta (RF-052)
  validade      date,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pedido_id, fornecedor_id)
);
CREATE INDEX IF NOT EXISTS idx_custos_cotacoes_edicao ON public.custos_cotacoes(edicao_id);

-- Linhas: preco de 1 item por 1 fornecedor (split award RF-011)
CREATE TABLE IF NOT EXISTS public.custos_cotacao_linhas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id     uuid NOT NULL REFERENCES public.custos_cotacoes(id) ON DELETE CASCADE,
  item_id        uuid NOT NULL REFERENCES public.custos_itens(id)    ON DELETE CASCADE,
  quantidade     numeric(12,3) NOT NULL CHECK (quantidade > 0),
  preco_unitario numeric(12,2) NOT NULL CHECK (preco_unitario >= 0),
  total          numeric(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  UNIQUE (cotacao_id, item_id)
);

-- Exclusoes / all-in (RF-052) — checklist transversal da cotacao
CREATE TABLE IF NOT EXISTS public.custos_cotacao_exclusoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.custos_cotacoes(id) ON DELETE CASCADE,
  chave      text NOT NULL,                      -- 'frete','alim_equipe','combustivel','caucao','art'...
  incluso    boolean,                            -- NULL = nao respondido
  valor_extra numeric(12,2) CHECK (valor_extra IS NULL OR valor_extra >= 0),
  observacao text,
  UNIQUE (cotacao_id, chave)
);

-- ── 10.3 Contratacoes (award/contratado RF-008; ciclo Q-025/038) ─────────────
CREATE TABLE IF NOT EXISTS public.custos_contratacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id     uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.custos_fornecedores(id) ON DELETE RESTRICT,
  cotacao_id    uuid REFERENCES public.custos_cotacoes(id) ON DELETE SET NULL,
  status        custos_status_contratacao NOT NULL DEFAULT 'ativa',
  motivo_cancelamento text,                      -- Q-025: cancela com motivo -> feed
  criado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custos_contratacoes_edicao ON public.custos_contratacoes(edicao_id);

CREATE TABLE IF NOT EXISTS public.custos_contratacao_linhas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contratacao_id  uuid NOT NULL REFERENCES public.custos_contratacoes(id) ON DELETE CASCADE,
  item_id         uuid NOT NULL REFERENCES public.custos_itens(id) ON DELETE RESTRICT,
  quantidade      numeric(12,3) NOT NULL CHECK (quantidade > 0),
  preco_unitario  numeric(12,2) NOT NULL CHECK (preco_unitario >= 0),
  total           numeric(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED
);

-- ── 10.4 Pagamentos COM parcelas (Q-009; realizado RF-008) ───────────────────
CREATE TABLE IF NOT EXISTS public.custos_pagamentos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id      uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  contratacao_id uuid REFERENCES public.custos_contratacoes(id) ON DELETE SET NULL,
  parcela_num    int  NOT NULL DEFAULT 1 CHECK (parcela_num >= 1),
  parcelas_total int  NOT NULL DEFAULT 1 CHECK (parcelas_total >= 1),
  valor          numeric(12,2) NOT NULL CHECK (valor >= 0),
  data_vencimento date,
  data_pagamento  date,
  status         custos_status_pagamento NOT NULL DEFAULT 'previsto',
  criado_em      timestamptz NOT NULL DEFAULT now(),
  CHECK (parcela_num <= parcelas_total),
  CHECK (data_pagamento IS NULL OR data_vencimento IS NULL OR data_pagamento >= data_vencimento - 3650)
);
CREATE INDEX IF NOT EXISTS idx_custos_pagamentos_edicao ON public.custos_pagamentos(edicao_id);

-- ── 10.5 Rateio item->composto (RF-033/034, driver rel. 63) ──────────────────
CREATE TABLE IF NOT EXISTS public.custos_rateio (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES public.custos_itens(id)     ON DELETE CASCADE,
  composto_id uuid NOT NULL REFERENCES public.custos_compostos(id) ON DELETE CASCADE,
  peso        numeric(9,6) NOT NULL CHECK (peso >= 0),       -- fracao (0..1)
  parcela     numeric(12,2) NOT NULL CHECK (parcela >= 0),   -- R$ que cabe ao composto
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, composto_id)
);
```

**Verificação Bloco 10:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'custos_%'
  AND table_name IN ('custos_pedidos','custos_pedido_itens','custos_cotacoes',
    'custos_cotacao_linhas','custos_cotacao_exclusoes','custos_contratacoes',
    'custos_contratacao_linhas','custos_pagamentos','custos_rateio')
ORDER BY 1;
```
Esperado: 9 tabelas. Todas as `total` são colunas geradas (não editáveis).

---

## BLOCO 11 — Triggers: baseline, atomicidade da soma, invariante de rateio

Dependência: Blocos 9, 10. Regras de negócio no banco.

```sql
-- ── 11.1 Congela baseline quando o item passa a 'orcado' (RNF-010, imutavel) ─
CREATE OR REPLACE FUNCTION public.custos_fn_congelar_baseline()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'orcado' AND (OLD.status IS DISTINCT FROM 'orcado')
     AND NEW.baseline_preco_unitario IS NULL THEN
    NEW.baseline_preco_unitario := NEW.preco_unitario_orcado;
    NEW.baseline_quantidade     := NEW.quantidade;
    NEW.baseline_congelado_em   := now();
  END IF;
  -- baseline nunca e sobrescrito depois de gravado:
  IF OLD.baseline_congelado_em IS NOT NULL THEN
    NEW.baseline_preco_unitario := OLD.baseline_preco_unitario;
    NEW.baseline_quantidade     := OLD.baseline_quantidade;
    NEW.baseline_congelado_em   := OLD.baseline_congelado_em;
  END IF;
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_custos_baseline ON public.custos_itens;
CREATE TRIGGER tg_custos_baseline BEFORE UPDATE ON public.custos_itens
  FOR EACH ROW EXECUTE FUNCTION public.custos_fn_congelar_baseline();

-- ── 11.2 Invariante de rateio: soma das parcelas de um item = valor do item ──
-- (conservacao rel. 63: nenhum centavo some nem e contado 2x). Constraint deferida via trigger.
CREATE OR REPLACE FUNCTION public.custos_fn_checar_rateio()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_item uuid; v_soma numeric(14,4); v_valor numeric(14,4);
BEGIN
  v_item := COALESCE(NEW.item_id, OLD.item_id);
  SELECT COALESCE(sum(parcela),0) INTO v_soma FROM public.custos_rateio WHERE item_id=v_item;
  SELECT COALESCE(total_orcado,0) INTO v_valor FROM public.custos_itens WHERE id=v_item;
  -- tolerancia de 1 centavo por composto (arredondamento):
  IF v_valor > 0 AND abs(v_soma - v_valor) > 0.05 THEN
    RAISE WARNING 'Rateio do item % nao fecha: soma=% valor=%', v_item, v_soma, v_valor;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS tg_custos_rateio_check ON public.custos_rateio;
CREATE TRIGGER tg_custos_rateio_check
  AFTER INSERT OR UPDATE OR DELETE ON public.custos_rateio
  FOR EACH ROW EXECUTE FUNCTION public.custos_fn_checar_rateio();
```

**Verificação Bloco 11:**
```sql
SELECT tgname FROM pg_trigger WHERE tgname LIKE 'tg_custos_%' ORDER BY 1;  -- 2 triggers
```
Esperado: `tg_custos_baseline`, `tg_custos_rateio_check`. (O congelamento é testado no
Bloco 14 com um item real.)

---

## BLOCO 12 — Auditoria JSONB genérica (rel. 12 §4)

Dependência: Blocos 9, 10. Trigger genérico nas tabelas sensíveis.

```sql
CREATE TABLE IF NOT EXISTS public.custos_audit (
  id            bigserial PRIMARY KEY,
  tabela        text NOT NULL,
  operacao      text NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  registro_id   text,
  dados_antes   jsonb,
  dados_depois  jsonb,
  campos_mudados text[],
  usuario_id    uuid,
  criado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custos_audit_reg ON public.custos_audit(tabela, registro_id);

CREATE OR REPLACE FUNCTION public.custos_fn_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_antes jsonb; v_depois jsonb; v_campos text[]; v_id text;
BEGIN
  IF TG_OP='DELETE' THEN v_antes:=to_jsonb(OLD); v_id:=OLD.id::text;
  ELSIF TG_OP='INSERT' THEN v_depois:=to_jsonb(NEW); v_id:=NEW.id::text;
  ELSE
    v_antes:=to_jsonb(OLD); v_depois:=to_jsonb(NEW); v_id:=NEW.id::text;
    SELECT array_agg(key) INTO v_campos FROM jsonb_each(v_depois) je
      WHERE v_depois->je.key IS DISTINCT FROM v_antes->je.key;
  END IF;
  INSERT INTO public.custos_audit(tabela,operacao,registro_id,dados_antes,dados_depois,campos_mudados,usuario_id)
  VALUES (TG_TABLE_NAME,TG_OP,v_id,v_antes,v_depois,v_campos,(SELECT auth.uid()));
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

-- Aplica nas tabelas sensiveis (dinheiro/estado):
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['custos_itens','custos_cotacoes','custos_cotacao_linhas',
    'custos_contratacoes','custos_contratacao_linhas','custos_pagamentos'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tg_audit_%1$s ON public.%1$s;', t);
    EXECUTE format('CREATE TRIGGER tg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s
                    FOR EACH ROW EXECUTE FUNCTION public.custos_fn_audit();', t);
  END LOOP;
END $$;
```

**Verificação Bloco 12:**
```sql
SELECT count(*) AS triggers_audit FROM pg_trigger WHERE tgname LIKE 'tg_audit_custos_%';  -- 6
```
Esperado: 6 triggers de auditoria.

---

## BLOCO 13 — RLS de TODAS as tabelas custos_* (o mais importante)

Dependência: Blocos 4–12 (as tabelas têm de existir). Habilita RLS e cria policies por
operação. Padrão (Q-002/026):

- **Empresa** (categorias, fornecedores, produtos, sinônimos, equivalências, templates):
  SELECT para admin/gestor/**projetista** (precisa do catálogo, Q-026); escrita só gestor;
  projetista NÃO cria produto (item livre marcado "novo" — regra de app). Vendedor/visitante: nada.
- **Edição** (todas com `edicao_id`): SELECT via `custos_pode_ver_edicao(edicao_id)`;
  escrita via `custos_pode_escrever_edicao(edicao_id)` (só gestor). Visitante da edição LÊ,
  nunca escreve. Vendedor: nada.
- **Projetista SEM ver valores (Q-026):** as tabelas de valor (`custos_cotacoes/_linhas`,
  `custos_contratacoes/_linhas`, `custos_pagamentos`, `custos_rateio` e colunas de preço de
  `custos_itens`) NÃO liberam SELECT ao projetista. Ele lê/escreve descritivo via a **view
  `custos_itens_descritivo`** (sem colunas de preço) + policy de UPDATE restrita às colunas
  não-monetárias (garantida por trigger que rejeita alteração de preço por projetista).

Este bloco é longo; entregue em **3 sub-blocos** na aplicação (13a empresa, 13b edição-gestor,
13c projetista/valores) para caber na regra "bloco pequeno". Modelo repetível por tabela:

```sql
-- ══ 13a — Tabelas EMPRESA (exemplo: custos_produtos; repetir p/ as 8 globais) ══
ALTER TABLE public.custos_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY custos_produtos_sel ON public.custos_produtos
  FOR SELECT TO authenticated
  USING (public.custos_papel() IN ('admin','gestor','projetista'));  -- projetista usa catalogo

CREATE POLICY custos_produtos_ins ON public.custos_produtos
  FOR INSERT TO authenticated WITH CHECK (public.custos_eh_gestor());
CREATE POLICY custos_produtos_upd ON public.custos_produtos
  FOR UPDATE TO authenticated USING (public.custos_eh_gestor()) WITH CHECK (public.custos_eh_gestor());
CREATE POLICY custos_produtos_del ON public.custos_produtos
  FOR DELETE TO authenticated USING (public.custos_papel()='admin');
-- (categorias, fornecedores, fornecedor_categorias, sinonimos, equivalencias,
--  espacos_template, espaco_template_itens: MESMO padrao. Fornecedores/categorias:
--  SELECT tambem so admin/gestor/projetista.)

-- ══ 13b — Tabelas de EDICAO nao-sensiveis (exemplo: custos_itens) ═════════════
ALTER TABLE public.custos_itens ENABLE ROW LEVEL SECURITY;

-- SELECT: quem pode ver a edicao (gestor tudo; projetista/visitante so a sua) —
--         projetista NAO ve preco via a VIEW (13c); a tabela crua fica so p/ gestor:
CREATE POLICY custos_itens_sel ON public.custos_itens
  FOR SELECT TO authenticated
  USING (
    public.custos_eh_gestor()
    OR ( public.custos_papel()='visitante' AND public.custos_pode_ver_edicao(edicao_id) )
  );
-- (projetista NAO entra aqui — ele le via custos_itens_descritivo, sem preco)

CREATE POLICY custos_itens_ins ON public.custos_itens
  FOR INSERT TO authenticated
  WITH CHECK ( public.custos_pode_escrever_edicao(edicao_id)
               OR public.custos_papel()='projetista' );  -- projetista cria item "novo" (sem preco)
CREATE POLICY custos_itens_upd ON public.custos_itens
  FOR UPDATE TO authenticated
  USING ( public.custos_pode_escrever_edicao(edicao_id) OR public.custos_papel()='projetista' )
  WITH CHECK ( public.custos_pode_escrever_edicao(edicao_id) OR public.custos_papel()='projetista' );
CREATE POLICY custos_itens_del ON public.custos_itens
  FOR DELETE TO authenticated USING (public.custos_pode_escrever_edicao(edicao_id));

-- ══ 13c — Projetista sem valores (Q-026): view + guarda de coluna ════════════
-- View de descritivo SEM colunas de preco/baseline:
CREATE OR REPLACE VIEW public.custos_itens_descritivo
WITH (security_invoker = true) AS
  SELECT id, edicao_id, composto_id, categoria_id, produto_id,
         descricao, formato, quantidade, unidade, porte, alocacao, avulso,
         prazo_limite, status, criado_em, atualizado_em
  FROM public.custos_itens;
GRANT SELECT ON public.custos_itens_descritivo TO authenticated;

-- Guarda: projetista nao pode alterar colunas monetarias de custos_itens:
CREATE OR REPLACE FUNCTION public.custos_fn_projetista_sem_preco()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.custos_papel()='projetista' THEN
    IF NEW.preco_unitario_orcado IS DISTINCT FROM OLD.preco_unitario_orcado
       OR NEW.baseline_preco_unitario IS DISTINCT FROM OLD.baseline_preco_unitario THEN
      RAISE EXCEPTION 'Projetista nao altera valores (Q-026)';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_custos_projetista_preco ON public.custos_itens;
CREATE TRIGGER tg_custos_projetista_preco BEFORE UPDATE ON public.custos_itens
  FOR EACH ROW EXECUTE FUNCTION public.custos_fn_projetista_sem_preco();

-- ══ Tabelas SENSIVEIS de valor: SELECT/escrita SO gestor (projetista/visitante fora) ══
-- (custos_cotacoes, custos_cotacao_linhas, custos_cotacao_exclusoes,
--  custos_contratacoes, custos_contratacao_linhas, custos_pagamentos, custos_rateio):
ALTER TABLE public.custos_cotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY custos_cotacoes_sel ON public.custos_cotacoes
  FOR SELECT TO authenticated
  USING ( public.custos_eh_gestor()
          OR ( public.custos_papel()='visitante' AND public.custos_pode_ver_edicao(edicao_id) ) );
CREATE POLICY custos_cotacoes_ins ON public.custos_cotacoes
  FOR INSERT TO authenticated WITH CHECK (public.custos_pode_escrever_edicao(edicao_id));
CREATE POLICY custos_cotacoes_upd ON public.custos_cotacoes
  FOR UPDATE TO authenticated USING (public.custos_pode_escrever_edicao(edicao_id))
  WITH CHECK (public.custos_pode_escrever_edicao(edicao_id));
CREATE POLICY custos_cotacoes_del ON public.custos_cotacoes
  FOR DELETE TO authenticated USING (public.custos_pode_escrever_edicao(edicao_id));
-- (linhas/exclusoes/contratacoes/pagamentos/rateio: MESMO padrao, resolvendo edicao_id
--  por join quando a tabela nao a carrega — ex.: custos_cotacao_linhas via cotacao_id;
--  use um helper custos_pode_ver_por_cotacao(cotacao_id) analogo p/ nao repetir join.)

-- ══ Pagamento imutavel apos pago (Q-025): trava UPDATE de linha ja paga ══
CREATE POLICY custos_pagamentos_upd ON public.custos_pagamentos
  FOR UPDATE TO authenticated
  USING ( public.custos_pode_escrever_edicao(edicao_id) AND status <> 'pago' )
  WITH CHECK ( public.custos_pode_escrever_edicao(edicao_id) );
```

**Verificação Bloco 13:**
```sql
-- Toda tabela custos_* deve estar com RLS habilitada:
SELECT relname, relrowsecurity FROM pg_class
WHERE relname LIKE 'custos_%' AND relkind='r' ORDER BY 1;
-- Nenhuma pode ter relrowsecurity=false.
SELECT tablename, count(*) AS policies FROM pg_policies
WHERE tablename LIKE 'custos_%' GROUP BY 1 ORDER BY 1;
```
Esperado: todas as 23 tabelas com `relrowsecurity=true`; cada uma com ≥ 1 policy (as de
edição/valor com 4). **Nota:** entregar 13a/13b/13c como blocos separados na prática; a
repetição por tabela é mecânica (mesmo template).

---

## BLOCO 14 — Testes automatizados (~90%, RNF-014) — pgTAP + Vitest

Dependência: todos. Não é SQL de produção — é a rede de segurança. Dois níveis:

1. **SQL/pgTAP** (roda no banco): baseline congela e não sobrescreve; visitante de outra
   edição vê 0 linhas; vendedor vê 0; projetista não altera preço; rateio conserva soma;
   `custos_criar_evento_com_edicao` nunca deixa pai sem edição.
2. **Vitest/services** (roda no front): funções puras de rateio (4 drivers do rel. 63),
   cálculo de all-in (RF-052), busca RF-049 (typo/sinônimo/ranking).

Esqueleto pgTAP (aplicável como bloco de verificação manual mesmo sem pgTAP):
```sql
-- Visitante de OUTRA edicao nao ve custos (simular trocando auth.uid via set local role em teste):
-- Esperado: SELECT count(*) FROM custos_itens => 0 para visitante fora da sua edicao.
-- Vendedor: custos_papel()='vendedor' e custos_pode_ver_edicao(x)=false sempre.
```

**Verificação final (rodar logado como cada papel, manualmente no painel):**
```sql
SELECT public.custos_papel();                       -- confirma o papel
SELECT count(*) FROM public.custos_itens;           -- gestor: N; vendedor: 0; visitante: so a sua
```

---

## Resumo de dependências entre blocos

```
1 (extensoes/enums/papel) ─┬─> 5 (empresa) ─> 6 (produtos/busca) ─> 7 (templates)
                           ├─> 4 (visibilidade RLS)
2 (schema existente) ──────┴─> 3 (RPC atomico) ─> 8 (perfil/checklist)
6,7,8 ─> 9 (compostos/itens/faces) ─> 10 (procurement) ─> 11 (triggers) ─> 12 (audit)
4,9,10,11,12 ─> 13 (RLS a/b/c) ─> 14 (testes)
```
Ordem de aplicação: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13(a,b,c) → 14.**

---

## RESPOSTA FINAL

**Tabelas:** 23 (8 empresa + 15 edição, incl. auditoria) + 6 enums + 1 enum de status de edição.
**Blocos SQL:** 14 (o 13 subdivide em 13a/13b/13c na entrega = 16 entregas reais).

**5 pontos mais críticos:**
1. **NÃO copiar `master_isolation`** — ele não lê `users.edicao_id` e vazaria custos de todas
   as edições ao visitante (rel. 65 Ataque 2). RLS nova por edição via `custos_pode_ver_edicao`.
2. **`evento_id NOT NULL` + RPC atômico pai+edição** antes de qualquer custo — sem isso há
   pai sem edição e custo sem âncora (Bloco 2/3).
3. **Projetista sem valores (Q-026)** exige mecanismo real: view sem colunas de preço +
   trigger que rejeita alteração monetária — RLS de linha sozinha não esconde coluna.
4. **Baseline imutável + conservação do rateio** por trigger (RNF-010, rel. 63): baseline
   congela em 'orcado' e nunca sobrescreve; soma das parcelas = valor do item (nada some/dobra).
5. **Busca RF-049 sem dicionário FTS custom** (indisponível no Supabase managed): tabela de
   sinônimos própria + `unaccent`+`pg_trgm`+FTS 'portuguese' + ranking por frequência.

**O que cortar/adiar (v2):** dashboard de fluxo de caixa semanal (Q-009 — schema de parcelas
já entra agora, visualização depois); calculadora de carga kVA (Q-014 — v1 é campo estimado);
snapshot JSONB de encerramento (RF-037 — coluna `custos_baseline_congelado_em` já prepara,
tabela de snapshot fica p/ quando existir "encerrar edição"); envio integrado de planilha ao
fornecedor (Q-008 — v1 gera, gestor envia manual). Nada disso bloqueia o núcleo.
