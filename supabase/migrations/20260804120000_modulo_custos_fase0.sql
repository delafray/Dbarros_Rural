-- ════════════════════════════════════════════════════════════════════════════
-- MÓDULO CENTRO DE CUSTO DO EVENTO — Fase 0 (fundação completa do banco)
-- ════════════════════════════════════════════════════════════════════════════
-- APLICADO EM PRODUÇÃO em 04/08/2026 pelo usuário, em 14 blocos unitários
-- verificados um a um (protocolo do PLANO-EXECUCAO.md). Este arquivo é o
-- REGISTRO CONSOLIDADO do estado aplicado — idempotente (pode rodar de novo
-- num banco novo para recriar tudo).
--
-- Origem: MODULO-CUSTOS/PESQUISA-MODULO-CUSTOS/69-plano-implantacao-banco.md
-- Correções feitas durante a aplicação (documentadas no log de decisões):
--   1. unaccent não é IMMUTABLE → wrapper custos_unaccent() para a coluna GENERATED;
--   2. busca: operador % (similarity) falhava termo curto × nome longo →
--      word_similarity(termo, nome) >= 0.4 + LIKE de prefixo;
--   3. custos_item_faces ficou sem policy na partilha 13a/b/c → policy própria;
--   4. RLS habilitada NA CRIAÇÃO de cada tabela (deny-all até as policies),
--      para nada ficar exposto via API durante a construção;
--   5. RPC atômica preenche user_id; view do projetista usa filtro embutido
--      (security definer do owner) em vez de security_invoker.
--
-- Conteúdo: 24 tabelas, 7 enums, 10 funções, triggers (baseline imutável,
-- sentinela de rateio, auditoria JSONB, anti-preço do projetista), 72 policies
-- de RLS por papel (admin/gestor/projetista/visitante/vendedor), busca
-- "Mercado Livre" (unaccent + pg_trgm + FTS português + sinônimos + popularidade)
-- e seeds (23 categorias, 5 espaços-template).
--
-- ═══ BLOCO 1 — Extensões, enums e helpers de papel ═══════════════════════════
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
    ('ativa','cancelada','aditada','concluida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE custos_driver_rateio AS ENUM
    ('quantidade','valor','percentual','direto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE custos_face_status AS ENUM ('embutido','a_parte','na');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE custos_status_pagamento AS ENUM
    ('previsto','agendado','pago','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.custos_papel()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN u.is_admin THEN 'admin'
    WHEN COALESCE(u.can_manage_tags,false) THEN 'gestor'
    WHEN COALESCE(u.is_projetista,false) THEN 'projetista'
    WHEN COALESCE(u.is_visitor,false)    THEN 'visitante'
    ELSE 'vendedor'
  END
  FROM public.users u WHERE u.id = (SELECT auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.custos_papel() TO authenticated;

CREATE OR REPLACE FUNCTION public.custos_eh_gestor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.custos_papel() IN ('admin','gestor') $$;
GRANT EXECUTE ON FUNCTION public.custos_eh_gestor() TO authenticated;

-- ═══ BLOCO 2 — Ajustes aditivos em eventos_edicoes ═══════════════════════════
DO $$ BEGIN
  CREATE TYPE custos_status_edicao AS ENUM
    ('rascunho','simulacao','confirmada','encerrada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.eventos_edicoes
  ADD COLUMN IF NOT EXISTS status_custos custos_status_edicao NOT NULL DEFAULT 'rascunho';
ALTER TABLE public.eventos_edicoes
  ADD COLUMN IF NOT EXISTS custos_baseline_congelado_em timestamptz;

DO $$
DECLARE v_orfas int;
BEGIN
  SELECT count(*) INTO v_orfas FROM public.eventos_edicoes WHERE evento_id IS NULL;
  IF v_orfas > 0 THEN
    RAISE NOTICE 'ATENCAO: % edicao(oes) sem evento_id. NOT NULL adiado.', v_orfas;
  ELSE
    ALTER TABLE public.eventos_edicoes ALTER COLUMN evento_id SET NOT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_eventos_edicoes_evento_id
  ON public.eventos_edicoes(evento_id);

-- ═══ BLOCO 3 — RPC de criação atômica pai+edição ═════════════════════════════
CREATE OR REPLACE FUNCTION public.custos_criar_evento_com_edicao(
  p_nome_evento   text,
  p_titulo_edicao text,
  p_ano           int,
  p_status        custos_status_edicao DEFAULT 'rascunho',
  p_evento_id     uuid DEFAULT NULL
)
RETURNS TABLE (evento_id uuid, edicao_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_evento_id uuid; v_edicao_id uuid; v_uid uuid;
BEGIN
  IF NOT public.custos_eh_gestor() THEN
    RAISE EXCEPTION 'Sem permissao: apenas admin/gestor criam evento com edicao';
  END IF;
  v_uid := (SELECT auth.uid());
  IF p_evento_id IS NULL THEN
    INSERT INTO public.eventos (nome, user_id) VALUES (p_nome_evento, v_uid)
    RETURNING id INTO v_evento_id;
  ELSE
    v_evento_id := p_evento_id;
    IF NOT EXISTS (SELECT 1 FROM public.eventos e WHERE e.id = v_evento_id) THEN
      RAISE EXCEPTION 'evento_id % inexistente', v_evento_id;
    END IF;
  END IF;
  INSERT INTO public.eventos_edicoes (evento_id, titulo, ano, status_custos, user_id)
  VALUES (v_evento_id, p_titulo_edicao, p_ano, p_status, v_uid)
  RETURNING id INTO v_edicao_id;
  RETURN QUERY SELECT v_evento_id, v_edicao_id;
END $$;
GRANT EXECUTE ON FUNCTION public.custos_criar_evento_com_edicao TO authenticated;

-- ═══ BLOCO 4 — Helpers de visibilidade por edição (coração da RLS) ═══════════
CREATE OR REPLACE FUNCTION public.custos_pode_ver_edicao(p_edicao_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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
    ELSE false
  END
$$;
GRANT EXECUTE ON FUNCTION public.custos_pode_ver_edicao(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.custos_pode_escrever_edicao(p_edicao_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.custos_eh_gestor() $$;
GRANT EXECUTE ON FUNCTION public.custos_pode_escrever_edicao(uuid) TO authenticated;

-- ═══ BLOCO 5 — Tabelas EMPRESA: categorias, fornecedores, N:N ════════════════
CREATE TABLE IF NOT EXISTS public.custos_categorias (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL UNIQUE,
  slug         text NOT NULL UNIQUE,
  pacote_unico boolean NOT NULL DEFAULT false,
  ordem        int NOT NULL DEFAULT 0,
  ativo        boolean NOT NULL DEFAULT true,
  criado_em    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.custos_fornecedores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj          text UNIQUE,
  razao_social  text NOT NULL,
  nome_fantasia text,
  email         text,
  telefone      text,
  cidade        text,
  uf            text CHECK (uf IS NULL OR char_length(uf)=2),
  km_base       numeric(10,2) CHECK (km_base IS NULL OR km_base >= 0),
  observacoes   text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custos_forn_cnpj_14dig CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$')
);
CREATE TABLE IF NOT EXISTS public.custos_fornecedor_categorias (
  fornecedor_id uuid NOT NULL REFERENCES public.custos_fornecedores(id) ON DELETE CASCADE,
  categoria_id  uuid NOT NULL REFERENCES public.custos_categorias(id)   ON DELETE CASCADE,
  PRIMARY KEY (fornecedor_id, categoria_id)
);
ALTER TABLE public.custos_categorias            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_fornecedores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_fornecedor_categorias ENABLE ROW LEVEL SECURITY;

-- ═══ BLOCO 6 — Catálogo de produtos + busca "Mercado Livre" (RF-049) ═════════
DO $$
DECLARE v_schema text;
BEGIN
  SELECT n.nspname INTO v_schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'unaccent';
  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.custos_unaccent(text)
     RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
     AS $f$ SELECT %I.unaccent(%L::regdictionary, $1) $f$',
    v_schema, v_schema || '.unaccent');
END $$;

CREATE TABLE IF NOT EXISTS public.custos_produtos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL,
  descricao      text,
  unidade        text NOT NULL DEFAULT 'un',
  categoria_id   uuid REFERENCES public.custos_categorias(id) ON DELETE SET NULL,
  frequencia_uso int NOT NULL DEFAULT 0,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  busca_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese'::regconfig,
      public.custos_unaccent(coalesce(nome,'') || ' ' || coalesce(descricao,'')))
  ) STORED
);
CREATE INDEX IF NOT EXISTS idx_custos_produtos_tsv  ON public.custos_produtos USING gin (busca_tsv);
CREATE INDEX IF NOT EXISTS idx_custos_produtos_trgm ON public.custos_produtos USING gin (nome gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.custos_produto_sinonimos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.custos_produtos(id) ON DELETE CASCADE,
  termo      text NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_id, termo)
);
CREATE INDEX IF NOT EXISTS idx_custos_sinonimos_trgm
  ON public.custos_produto_sinonimos USING gin (termo gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.custos_produto_equivalencias (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id      uuid NOT NULL REFERENCES public.custos_produtos(id)     ON DELETE CASCADE,
  fornecedor_id   uuid NOT NULL REFERENCES public.custos_fornecedores(id) ON DELETE CASCADE,
  nome_fornecedor text NOT NULL,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fornecedor_id, nome_fornecedor)
);

CREATE OR REPLACE FUNCTION public.custos_buscar_produtos(p_termo text, p_limite int DEFAULT 20)
RETURNS TABLE (id uuid, nome text, unidade text, frequencia_uso int, score real)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  WITH q AS (SELECT public.custos_unaccent(lower(trim(p_termo))) AS t)
  SELECT p.id, p.nome, p.unidade, p.frequencia_uso,
         (ts_rank(p.busca_tsv, plainto_tsquery('portuguese',(SELECT t FROM q)))
          + word_similarity((SELECT t FROM q), public.custos_unaccent(lower(p.nome)))
          + least(p.frequencia_uso,100)::real/200.0) AS score
  FROM public.custos_produtos p
  WHERE p.ativo
    AND (
      p.busca_tsv @@ plainto_tsquery('portuguese',(SELECT t FROM q))
      OR word_similarity((SELECT t FROM q), public.custos_unaccent(lower(p.nome))) >= 0.4
      OR public.custos_unaccent(lower(p.nome)) LIKE (SELECT t FROM q) || '%'
      OR EXISTS (SELECT 1 FROM public.custos_produto_sinonimos s
                 WHERE s.produto_id = p.id
                   AND ( word_similarity((SELECT t FROM q), public.custos_unaccent(lower(s.termo))) >= 0.4
                         OR public.custos_unaccent(lower(s.termo)) LIKE (SELECT t FROM q) || '%' ))
    )
  ORDER BY score DESC, p.frequencia_uso DESC
  LIMIT p_limite
$$;
GRANT EXECUTE ON FUNCTION public.custos_buscar_produtos(text,int) TO authenticated;

ALTER TABLE public.custos_produtos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_produto_sinonimos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_produto_equivalencias ENABLE ROW LEVEL SECURITY;

-- ═══ BLOCO 7 — Biblioteca de espaços-template (RF-050) ═══════════════════════
CREATE TABLE IF NOT EXISTS public.custos_espacos_template (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL UNIQUE,
  descricao  text,
  porte      text,
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.custos_espaco_template_itens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid NOT NULL REFERENCES public.custos_espacos_template(id) ON DELETE CASCADE,
  produto_id   uuid REFERENCES public.custos_produtos(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.custos_categorias(id) ON DELETE SET NULL,
  descricao    text NOT NULL,
  quantidade   numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  formato      text,
  ordem        int NOT NULL DEFAULT 0,
  criado_em    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custos_esp_tpl_itens_tpl
  ON public.custos_espaco_template_itens(template_id);
ALTER TABLE public.custos_espacos_template      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_espaco_template_itens ENABLE ROW LEVEL SECURITY;

-- ═══ BLOCO 8 — Perfil da edição + checklist ══════════════════════════════════
CREATE TABLE IF NOT EXISTS public.custos_perfil_edicao (
  edicao_id         uuid PRIMARY KEY REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  local_publico     boolean,
  publico_esperado  int CHECK (publico_esperado IS NULL OR publico_esperado >= 0),
  tem_animais       boolean NOT NULL DEFAULT false,
  tem_show          boolean NOT NULL DEFAULT false,
  vende_alcool      boolean NOT NULL DEFAULT false,
  cobra_ingresso    boolean NOT NULL DEFAULT false,
  tem_estruturas    boolean NOT NULL DEFAULT false,
  local_fechado     boolean NOT NULL DEFAULT false,
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.custos_checklist_respostas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id     uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  chave         text NOT NULL,
  marcado       boolean NOT NULL DEFAULT false,
  quantidade    numeric(12,3) CHECK (quantidade IS NULL OR quantidade >= 0),
  modalidade    text,
  prazo_limite  date,
  observacao    text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edicao_id, chave)
);
CREATE INDEX IF NOT EXISTS idx_custos_checklist_edicao
  ON public.custos_checklist_respostas(edicao_id);
ALTER TABLE public.custos_perfil_edicao       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_checklist_respostas ENABLE ROW LEVEL SECURITY;

-- ═══ BLOCO 9 — Compostos, itens (3 gavetas, baseline) e 7 faces ══════════════
CREATE TABLE IF NOT EXISTS public.custos_compostos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id    uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  template_id  uuid REFERENCES public.custos_espacos_template(id) ON DELETE SET NULL,
  nome         text NOT NULL,
  porte        text,
  quantidade   numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  criado_em    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custos_compostos_edicao ON public.custos_compostos(edicao_id);

CREATE TABLE IF NOT EXISTS public.custos_itens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id     uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  composto_id   uuid REFERENCES public.custos_compostos(id) ON DELETE SET NULL,
  categoria_id  uuid REFERENCES public.custos_categorias(id) ON DELETE SET NULL,
  produto_id    uuid REFERENCES public.custos_produtos(id)   ON DELETE SET NULL,
  descricao     text NOT NULL,
  formato       text,
  quantidade    numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  unidade       text NOT NULL DEFAULT 'un',
  porte         text,
  alocacao      text NOT NULL DEFAULT 'direto'
                CHECK (alocacao IN ('direto','medivel','verba_fechada')),
  driver_rateio custos_driver_rateio NOT NULL DEFAULT 'quantidade',
  percentual_rateio numeric(5,2) CHECK (percentual_rateio IS NULL OR percentual_rateio BETWEEN 0 AND 100),
  avulso        boolean NOT NULL DEFAULT false,
  prazo_limite  date,
  status        custos_status_item NOT NULL DEFAULT 'rascunho',
  preco_unitario_orcado numeric(12,2) CHECK (preco_unitario_orcado IS NULL OR preco_unitario_orcado >= 0),
  total_orcado numeric(12,2) GENERATED ALWAYS AS
    (coalesce(preco_unitario_orcado,0) * quantidade) STORED,
  baseline_preco_unitario numeric(12,2) CHECK (baseline_preco_unitario IS NULL OR baseline_preco_unitario >= 0),
  baseline_quantidade     numeric(12,3) CHECK (baseline_quantidade IS NULL OR baseline_quantidade > 0),
  baseline_congelado_em   timestamptz,
  criado_por    uuid REFERENCES public.users(id),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custos_itens_edicao    ON public.custos_itens(edicao_id);
CREATE INDEX IF NOT EXISTS idx_custos_itens_composto  ON public.custos_itens(composto_id);
CREATE INDEX IF NOT EXISTS idx_custos_itens_categoria ON public.custos_itens(categoria_id);

CREATE TABLE IF NOT EXISTS public.custos_item_faces (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id   uuid NOT NULL REFERENCES public.custos_itens(id) ON DELETE CASCADE,
  face      int  NOT NULL CHECK (face BETWEEN 1 AND 7),
  situacao  custos_face_status NOT NULL DEFAULT 'na',
  base_calculo text,
  valor     numeric(12,2) CHECK (valor IS NULL OR valor >= 0),
  UNIQUE (item_id, face)
);
ALTER TABLE public.custos_compostos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_itens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_item_faces ENABLE ROW LEVEL SECURITY;

-- ═══ BLOCO 10 — Pedidos, cotações, contratações, pagamentos, rateio ══════════
CREATE TABLE IF NOT EXISTS public.custos_pedidos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id  uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  categoria_id uuid REFERENCES public.custos_categorias(id) ON DELETE SET NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custos_pedidos_edicao ON public.custos_pedidos(edicao_id);

CREATE TABLE IF NOT EXISTS public.custos_pedido_itens (
  pedido_id uuid NOT NULL REFERENCES public.custos_pedidos(id) ON DELETE CASCADE,
  item_id   uuid NOT NULL REFERENCES public.custos_itens(id)   ON DELETE CASCADE,
  quantidade numeric(12,3) NOT NULL CHECK (quantidade > 0),
  PRIMARY KEY (pedido_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.custos_cotacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id     uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  pedido_id     uuid NOT NULL REFERENCES public.custos_pedidos(id)  ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.custos_fornecedores(id) ON DELETE RESTRICT,
  status        custos_status_cotacao NOT NULL DEFAULT 'rascunho',
  frete         numeric(12,2) CHECK (frete IS NULL OR frete >= 0),
  validade      date,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pedido_id, fornecedor_id)
);
CREATE INDEX IF NOT EXISTS idx_custos_cotacoes_edicao ON public.custos_cotacoes(edicao_id);

CREATE TABLE IF NOT EXISTS public.custos_cotacao_linhas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id     uuid NOT NULL REFERENCES public.custos_cotacoes(id) ON DELETE CASCADE,
  item_id        uuid NOT NULL REFERENCES public.custos_itens(id)    ON DELETE CASCADE,
  quantidade     numeric(12,3) NOT NULL CHECK (quantidade > 0),
  preco_unitario numeric(12,2) NOT NULL CHECK (preco_unitario >= 0),
  total          numeric(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  UNIQUE (cotacao_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.custos_cotacao_exclusoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.custos_cotacoes(id) ON DELETE CASCADE,
  chave      text NOT NULL,
  incluso    boolean,
  valor_extra numeric(12,2) CHECK (valor_extra IS NULL OR valor_extra >= 0),
  observacao text,
  UNIQUE (cotacao_id, chave)
);

CREATE TABLE IF NOT EXISTS public.custos_contratacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id     uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.custos_fornecedores(id) ON DELETE RESTRICT,
  cotacao_id    uuid REFERENCES public.custos_cotacoes(id) ON DELETE SET NULL,
  status        custos_status_contratacao NOT NULL DEFAULT 'ativa',
  motivo_cancelamento text,
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
  CHECK (parcela_num <= parcelas_total)
);
CREATE INDEX IF NOT EXISTS idx_custos_pagamentos_edicao ON public.custos_pagamentos(edicao_id);

CREATE TABLE IF NOT EXISTS public.custos_rateio (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES public.custos_itens(id)     ON DELETE CASCADE,
  composto_id uuid NOT NULL REFERENCES public.custos_compostos(id) ON DELETE CASCADE,
  peso        numeric(9,6) NOT NULL CHECK (peso >= 0),
  parcela     numeric(12,2) NOT NULL CHECK (parcela >= 0),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, composto_id)
);
ALTER TABLE public.custos_pedidos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_pedido_itens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_cotacoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_cotacao_linhas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_cotacao_exclusoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_contratacoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_contratacao_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_pagamentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_rateio             ENABLE ROW LEVEL SECURITY;

-- ═══ BLOCO 11 — Triggers: baseline imutável + sentinela do rateio ════════════
CREATE OR REPLACE FUNCTION public.custos_fn_congelar_baseline()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'orcado' AND (OLD.status IS DISTINCT FROM 'orcado')
     AND NEW.baseline_preco_unitario IS NULL THEN
    NEW.baseline_preco_unitario := NEW.preco_unitario_orcado;
    NEW.baseline_quantidade     := NEW.quantidade;
    NEW.baseline_congelado_em   := now();
  END IF;
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

CREATE OR REPLACE FUNCTION public.custos_fn_checar_rateio()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_item uuid; v_soma numeric(14,4); v_valor numeric(14,4);
BEGIN
  v_item := COALESCE(NEW.item_id, OLD.item_id);
  SELECT COALESCE(sum(parcela),0) INTO v_soma FROM public.custos_rateio WHERE item_id=v_item;
  SELECT COALESCE(total_orcado,0) INTO v_valor FROM public.custos_itens WHERE id=v_item;
  IF v_valor > 0 AND abs(v_soma - v_valor) > 0.05 THEN
    RAISE WARNING 'Rateio do item % nao fecha: soma=% valor=%', v_item, v_soma, v_valor;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS tg_custos_rateio_check ON public.custos_rateio;
CREATE TRIGGER tg_custos_rateio_check
  AFTER INSERT OR UPDATE OR DELETE ON public.custos_rateio
  FOR EACH ROW EXECUTE FUNCTION public.custos_fn_checar_rateio();

-- ═══ BLOCO 12 — Auditoria JSONB ══════════════════════════════════════════════
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
ALTER TABLE public.custos_audit ENABLE ROW LEVEL SECURITY;

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

-- ═══ BLOCO 13a — Policies das tabelas EMPRESA ════════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'custos_categorias','custos_fornecedores','custos_fornecedor_categorias',
    'custos_produtos','custos_produto_sinonimos','custos_produto_equivalencias',
    'custos_espacos_template','custos_espaco_template_itens'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_sel ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT TO authenticated
                    USING (public.custos_papel() IN (''admin'',''gestor'',''projetista''))', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_ins ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT TO authenticated
                    WITH CHECK (public.custos_eh_gestor())', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_upd ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE TO authenticated
                    USING (public.custos_eh_gestor()) WITH CHECK (public.custos_eh_gestor())', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_del ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE TO authenticated
                    USING (public.custos_papel() = ''admin'')', t);
  END LOOP;
END $$;

-- ═══ BLOCO 13b — Policies das tabelas de EDIÇÃO ══════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'custos_perfil_edicao','custos_checklist_respostas','custos_compostos','custos_pedidos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_sel ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT TO authenticated
      USING (public.custos_eh_gestor()
             OR (public.custos_papel() = ''visitante''
                 AND public.custos_pode_ver_edicao(edicao_id)))', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_ins ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT TO authenticated
      WITH CHECK (public.custos_pode_escrever_edicao(edicao_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_upd ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE TO authenticated
      USING (public.custos_pode_escrever_edicao(edicao_id))
      WITH CHECK (public.custos_pode_escrever_edicao(edicao_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_del ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE TO authenticated
      USING (public.custos_pode_escrever_edicao(edicao_id))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS custos_itens_sel ON public.custos_itens;
CREATE POLICY custos_itens_sel ON public.custos_itens
  FOR SELECT TO authenticated
  USING ( public.custos_eh_gestor()
          OR (public.custos_papel() = 'visitante'
              AND public.custos_pode_ver_edicao(edicao_id)) );
DROP POLICY IF EXISTS custos_itens_ins ON public.custos_itens;
CREATE POLICY custos_itens_ins ON public.custos_itens
  FOR INSERT TO authenticated
  WITH CHECK ( public.custos_pode_escrever_edicao(edicao_id)
               OR (public.custos_papel() = 'projetista'
                   AND public.custos_pode_ver_edicao(edicao_id)) );
DROP POLICY IF EXISTS custos_itens_upd ON public.custos_itens;
CREATE POLICY custos_itens_upd ON public.custos_itens
  FOR UPDATE TO authenticated
  USING ( public.custos_pode_escrever_edicao(edicao_id)
          OR (public.custos_papel() = 'projetista'
              AND public.custos_pode_ver_edicao(edicao_id)) )
  WITH CHECK ( public.custos_pode_escrever_edicao(edicao_id)
               OR (public.custos_papel() = 'projetista'
                   AND public.custos_pode_ver_edicao(edicao_id)) );
DROP POLICY IF EXISTS custos_itens_del ON public.custos_itens;
CREATE POLICY custos_itens_del ON public.custos_itens
  FOR DELETE TO authenticated
  USING (public.custos_pode_escrever_edicao(edicao_id));

DROP POLICY IF EXISTS custos_pedido_itens_sel ON public.custos_pedido_itens;
CREATE POLICY custos_pedido_itens_sel ON public.custos_pedido_itens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custos_pedidos p
                 WHERE p.id = pedido_id
                   AND (public.custos_eh_gestor()
                        OR (public.custos_papel() = 'visitante'
                            AND public.custos_pode_ver_edicao(p.edicao_id)))));
DROP POLICY IF EXISTS custos_pedido_itens_all ON public.custos_pedido_itens;
CREATE POLICY custos_pedido_itens_all ON public.custos_pedido_itens
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custos_pedidos p
                 WHERE p.id = pedido_id AND public.custos_pode_escrever_edicao(p.edicao_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.custos_pedidos p
                 WHERE p.id = pedido_id AND public.custos_pode_escrever_edicao(p.edicao_id)));

-- ═══ BLOCO 13c — View do projetista, trava anti-preço e tabelas sensíveis ════
DROP VIEW IF EXISTS public.custos_itens_descritivo;
CREATE VIEW public.custos_itens_descritivo AS
  SELECT i.id, i.edicao_id, i.composto_id, i.categoria_id, i.produto_id,
         i.descricao, i.formato, i.quantidade, i.unidade, i.porte, i.alocacao,
         i.avulso, i.prazo_limite, i.status, i.criado_em, i.atualizado_em
  FROM public.custos_itens i
  WHERE public.custos_eh_gestor()
     OR (public.custos_papel() IN ('projetista','visitante')
         AND public.custos_pode_ver_edicao(i.edicao_id));
GRANT SELECT ON public.custos_itens_descritivo TO authenticated;

CREATE OR REPLACE FUNCTION public.custos_fn_projetista_sem_preco()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.custos_papel() = 'projetista' THEN
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

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['custos_cotacoes','custos_contratacoes','custos_pagamentos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_sel ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT TO authenticated
      USING (public.custos_eh_gestor())', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_ins ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT TO authenticated
      WITH CHECK (public.custos_pode_escrever_edicao(edicao_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_upd ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE TO authenticated
      USING (public.custos_pode_escrever_edicao(edicao_id))
      WITH CHECK (public.custos_pode_escrever_edicao(edicao_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_del ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE TO authenticated
      USING (public.custos_pode_escrever_edicao(edicao_id))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS custos_pagamentos_upd ON public.custos_pagamentos;
CREATE POLICY custos_pagamentos_upd ON public.custos_pagamentos
  FOR UPDATE TO authenticated
  USING (public.custos_pode_escrever_edicao(edicao_id) AND status <> 'pago')
  WITH CHECK (public.custos_pode_escrever_edicao(edicao_id));

DROP POLICY IF EXISTS custos_cotacao_linhas_all ON public.custos_cotacao_linhas;
CREATE POLICY custos_cotacao_linhas_all ON public.custos_cotacao_linhas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custos_cotacoes c
                 WHERE c.id = cotacao_id AND public.custos_pode_escrever_edicao(c.edicao_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.custos_cotacoes c
                 WHERE c.id = cotacao_id AND public.custos_pode_escrever_edicao(c.edicao_id)));

DROP POLICY IF EXISTS custos_cotacao_exclusoes_all ON public.custos_cotacao_exclusoes;
CREATE POLICY custos_cotacao_exclusoes_all ON public.custos_cotacao_exclusoes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custos_cotacoes c
                 WHERE c.id = cotacao_id AND public.custos_pode_escrever_edicao(c.edicao_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.custos_cotacoes c
                 WHERE c.id = cotacao_id AND public.custos_pode_escrever_edicao(c.edicao_id)));

DROP POLICY IF EXISTS custos_contratacao_linhas_all ON public.custos_contratacao_linhas;
CREATE POLICY custos_contratacao_linhas_all ON public.custos_contratacao_linhas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custos_contratacoes k
                 WHERE k.id = contratacao_id AND public.custos_pode_escrever_edicao(k.edicao_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.custos_contratacoes k
                 WHERE k.id = contratacao_id AND public.custos_pode_escrever_edicao(k.edicao_id)));

DROP POLICY IF EXISTS custos_rateio_all ON public.custos_rateio;
CREATE POLICY custos_rateio_all ON public.custos_rateio
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custos_itens i
                 WHERE i.id = item_id AND public.custos_pode_escrever_edicao(i.edicao_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.custos_itens i
                 WHERE i.id = item_id AND public.custos_pode_escrever_edicao(i.edicao_id)));

DROP POLICY IF EXISTS custos_item_faces_all ON public.custos_item_faces;
CREATE POLICY custos_item_faces_all ON public.custos_item_faces
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custos_itens i
                 WHERE i.id = item_id AND public.custos_pode_escrever_edicao(i.edicao_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.custos_itens i
                 WHERE i.id = item_id AND public.custos_pode_escrever_edicao(i.edicao_id)));

DROP POLICY IF EXISTS custos_audit_sel ON public.custos_audit;
CREATE POLICY custos_audit_sel ON public.custos_audit
  FOR SELECT TO authenticated USING (public.custos_eh_gestor());

-- ═══ BLOCO 14 — Seeds: categorias + espaços-template ═════════════════════════
INSERT INTO public.custos_categorias (nome, slug, pacote_unico, ordem) VALUES
 ('Tendas e Coberturas',        'tendas',            false, 10),
 ('Piso e Revestimento',        'piso',              false, 20),
 ('Estruturas / Arquibancada / Arena', 'estruturas', false, 30),
 ('Elétrica e Energia',         'eletrica',          false, 40),
 ('Som, Luz e Telão',           'som-luz-telao',     false, 50),
 ('Mobiliário',                 'mobiliario',        false, 60),
 ('Marcenaria e Cenografia',    'marcenaria',        false, 70),
 ('Programação Visual',         'programacao-visual', true, 80),
 ('Decoração e Paisagismo',     'decoracao',         false, 90),
 ('Sanitários e Higiene',       'sanitarios',        false, 100),
 ('Limpeza e Resíduos',         'limpeza',           false, 110),
 ('Segurança e Brigada',        'seguranca',         false, 120),
 ('Alimentação e Bar',          'alimentacao',       false, 130),
 ('Hospedagem e Transporte',    'hospedagem',        false, 140),
 ('Animais e Manejo',           'animais',           false, 150),
 ('RH e Equipe',                'rh-equipe',         false, 160),
 ('Internet e TI',              'internet-ti',       false, 170),
 ('Manutenção',                 'manutencao',        false, 180),
 ('Saúde e Posto Médico',       'saude',             false, 190),
 ('Taxas, Licenças e Seguros',  'taxas-legais',      false, 200),
 ('Divulgação e Marketing',     'divulgacao',        false, 210),
 ('Shows e Atrações',           'shows',             false, 220),
 ('Outros',                     'outros',            false, 999)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.custos_espacos_template (nome, descricao) VALUES
 ('CAEX', 'Central de Atendimento ao Expositor'),
 ('Porta-malas', 'Espaço porta-malas'),
 ('Bar', 'Bar do evento (balcão, refrigeração, piso, elétrica...)'),
 ('Stand básico', 'Modelo de stand padrão (tenda, piso, mesa, cadeiras, testeira, iluminação)'),
 ('Stand customizado', 'Modelo de stand sob medida')
ON CONFLICT (nome) DO NOTHING;
