# Schema Supabase/Postgres para Módulo Financeiro — Pesquisa Técnica

**Data:** 2026-08-01  
**Escopo:** Módulo de controle de gastos de eventos (React + TypeScript + Supabase/Postgres)  
**Entidades:** itens de necessidade, pedidos de orçamento, cotações por fornecedor, contratações, pagamentos

---

## 1. Valores Monetários: `NUMERIC(12,2)` vs Inteiro de Centavos

### Consenso atual

Existem duas abordagens seguras e ambas têm adeptos sólidos:

| Critério | `NUMERIC(12,2)` | `BIGINT` (centavos) |
|---|---|---|
| Precisão | Exata (sem ponto flutuante) | Exata (inteiro puro) |
| Storage | ~10 bytes por valor | 8 bytes por valor |
| Performance | Levemente mais lento | Mais rápido |
| Legibilidade no banco | Natural (`1234.56`) | Exige divisão por 100 na leitura |
| Risco com JS | Retornado como **string** pelo driver `pg` | Se `BIGINT`, também como **string** no driver `pg` |
| Faixa | Até 10 dígitos + 2 decimais = ~R$ 9.999.999.999,99 | `BIGINT` max: ~92 quadrilhões de centavos |
| Frações de centavo | Suportadas se aumentar escala | Não suportadas sem mudar tipo |

**O que jamais usar:** `FLOAT`, `DOUBLE PRECISION` ou o tipo nativo `MONEY` do Postgres.
- `FLOAT`: `0.1 + 0.2 = 0.30000000000000004` — inaceitável para financeiro.
- `MONEY`: vinculado ao `locale` do servidor; não portável; rejeitado pela comunidade há anos.

### Armadilha crítica com JavaScript/Supabase

O driver `pg` (usado internamente pelo Supabase JS client) **retorna `NUMERIC` e `BIGINT` como strings**, não como `number`, para preservar precisão. Exemplos:

```js
// Retorno do Supabase client:
{ valor: "1234.56" }   // NUMERIC → string
{ centavos: "123456" } // BIGINT → string

// NUNCA faça:
Number("1234.56")    // OK para valores pequenos, mas perde precisão em valores grandes
parseFloat("1234.56") // Idem

// Faça:
import Currency from "currency.js"
const valor = Currency("1234.56") // seguro
```

Para abordagem com centavos + BIGINT, pode-se registrar parser customizado:
```js
// Só se tiver certeza que valores cabem em Number seguro (< 2^53)
import { types } from "pg"
types.setTypeParser(20, (val) => parseInt(val, 10)) // OID 20 = int8/bigint
```

### Recomendação para este projeto

**`NUMERIC(12,2)`** — razões:
1. BRL não tem sub-centavo; escala 2 é suficiente.
2. Leitura humana no banco sem conversão.
3. R$ 9,99 bilhões por campo cobre qualquer evento rural.
4. Já que o JS vai receber string de qualquer forma, a "vantagem de performance" do BIGINT desaparece no layer de aplicação.
5. Usar `currency.js` ou `Intl.NumberFormat` no frontend para exibição.

```sql
-- Coluna padrão para todos os valores monetários do módulo:
valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0)
```

**Fontes:**
- [Working with Money in Postgres — Crunchy Data](https://www.crunchydata.com/blog/working-with-money-in-postgres)
- [Money Operations with Node.js and PostgreSQL — Medium](https://medium.com/geekculture/money-operations-with-node-js-and-postgresql-91d1f06ff263)
- [Numeric fields returned as text — node-pg-types issue #28](https://github.com/brianc/node-pg-types/issues/28)
- [PostgreSQL, Node.js and floating point values — Medium](https://medium.com/developer-rants/postgresql-node-js-and-those-damn-floating-point-values-d3a39b432b03)

---

## 2. Baseline/Snapshot de Orçamento — Padrões e Trade-offs

### Problema central

Quando um item muda de preço (cotação atualizada, item cancelado, quantidade ajustada), o orçamento aprovado original deve ser preservado para comparação, auditoria e controle de variância.

### Padrão A — Colunas de Baseline na mesma tabela (mais simples)

```sql
CREATE TABLE itens_pedido (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id      UUID NOT NULL REFERENCES pedidos_orcamento(id),
  descricao      TEXT NOT NULL,
  quantidade     NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
  -- Baseline: capturado no momento da aprovação, nunca muda depois
  baseline_preco_unitario  NUMERIC(12,2),
  baseline_quantidade      NUMERIC(10,3),
  baseline_total           NUMERIC(12,2) GENERATED ALWAYS AS
                             (baseline_preco_unitario * baseline_quantidade) STORED,
  -- Valores correntes (atualizáveis)
  preco_unitario NUMERIC(12,2),
  total          NUMERIC(12,2) GENERATED ALWAYS AS
                             (preco_unitario * quantidade) STORED,
  status         TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente','aprovado','cancelado')),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Quando usar:** Módulos pequenos/médios onde cada item tem apenas um baseline (orçamento original aprovado). Mais simples de consultar, sem JOINs extras.

**Limitação:** Se houver múltiplas revisões (replanejamento v1, v2…), não escala bem.

### Padrão B — Tabela de Snapshot separada (recomendado para múltiplas revisões)

```sql
-- Tabela principal (sempre com valores correntes)
CREATE TABLE pedidos_orcamento (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id   UUID NOT NULL REFERENCES eventos(id),
  descricao   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'rascunho'
                CHECK (status IN ('rascunho','submetido','aprovado','revisao','encerrado')),
  criado_por  UUID REFERENCES auth.users(id),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Snapshot imutável capturado na aprovação (ou a cada revisão)
CREATE TABLE pedidos_orcamento_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       UUID NOT NULL REFERENCES pedidos_orcamento(id),
  revisao         INTEGER NOT NULL DEFAULT 1,
  motivo          TEXT,           -- "aprovação inicial", "replanejamento jun/26"
  snapshot_dados  JSONB NOT NULL, -- cópia completa dos itens no momento
  total_snapshot  NUMERIC(12,2) NOT NULL,
  criado_por      UUID REFERENCES auth.users(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pedido_id, revisao)
);
```

O `snapshot_dados` em JSONB guarda o array de itens com preços, quantidades e totais do momento exato — imutável após inserção. A tabela principal continua atualizável.

**Quando usar:** Múltiplas revisões de orçamento, compliance, comparação baseline vs realizado.

### Padrão C — Event Sourcing leve (log de eventos)

Cada mudança no orçamento é um evento append-only:

```sql
CREATE TABLE orcamento_eventos (
  id          BIGSERIAL PRIMARY KEY,
  pedido_id   UUID NOT NULL,
  evento_tipo TEXT NOT NULL, -- 'item_adicionado','preco_alterado','aprovado','cancelado'
  payload     JSONB NOT NULL,
  criado_por  UUID REFERENCES auth.users(id),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

O estado atual é reconstruído via replay dos eventos. Adequado para auditoria total, mas adiciona complexidade de leitura (precisa de projeção/view materializada).

**Quando usar:** Conformidade regulatória estrita; histórico completo de cada mudança; equipes com experiência em event sourcing. **Excesso para eventos rurais de porte médio.**

### Recomendação para este projeto

**Padrão A + B combinados:**
- Colunas `baseline_*` diretamente em `itens_pedido` para o caso comum (1 baseline = orçamento aprovado).
- Tabela de snapshots JSONB opcional para registrar o pedido inteiro no momento da aprovação.
- Trigger simples que popula `baseline_*` automaticamente quando `status` muda de `submetido` para `aprovado` (proteção contra alteração acidental).

```sql
-- Trigger: congela baseline na aprovação
CREATE OR REPLACE FUNCTION fn_congelar_baseline()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    UPDATE itens_pedido
    SET
      baseline_preco_unitario = preco_unitario,
      baseline_quantidade     = quantidade
    WHERE pedido_id = NEW.id
      AND baseline_preco_unitario IS NULL; -- nunca sobrescreve baseline já gravado
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_congelar_baseline
AFTER UPDATE ON pedidos_orcamento
FOR EACH ROW EXECUTE FUNCTION fn_congelar_baseline();
```

**Fontes:**
- [Event Sourcing with Databases — TheCodeForge](https://thecodeforge.io/database/event-sourcing-databases/)
- [Snapshots in Event Sourcing — Kurrent](https://www.kurrent.io/blog/snapshots-in-event-sourcing/)
- [How to Implement Versioned Rows in PostgreSQL](https://postgresql.org/message-id/avble7%241k20%241%40news.hub.org)
- [table_version — PGXN](https://pgxn.org/dist/table_version/)

---

## 3. RLS para Módulo Financeiro

### Princípios gerais

1. **Habilitar RLS em TODAS as tabelas** — desabilitado por padrão no Postgres; o esquecimento foi a causa do CVE-2025-48757.
2. **`(select auth.uid())`** — sempre com `select` envolvendo a chamada de função, para cache por query (não por linha).
3. **Policies separadas por operação** — SELECT/INSERT/UPDATE/DELETE como policies distintas.
4. **Índice na coluna de ownership** — `CREATE INDEX ON tabela (criado_por)` ou `(evento_id)`.
5. **Visitante nunca escreve** — sem policies de INSERT/UPDATE/DELETE para `anon` ou para usuários com papel `visitante`.

### Verificação de papel: JWT claims vs tabela de perfis

| Abordagem | Performance | Atualização imediata | Gestão |
|---|---|---|---|
| JWT `app_metadata.role` | Excelente (0 queries extras) | Não (requer relogin) | Mais difícil de mudar em runtime |
| Tabela `perfis` com `SELECT SECURITY DEFINER` | Boa (1 query cacheada) | Sim (imediata) | Fácil de administrar |
| JWT `app_metadata` + `SECURITY DEFINER` | Excelente | Sim (hook atualiza token) | Melhor dos dois mundos |

**Recomendação para este projeto:** Tabela `perfis` com função `SECURITY DEFINER` cacheada. O projeto já tem perfis de usuário; basta criar a função auxiliar.

```sql
-- Função auxiliar cacheada (avaliada uma vez por query, não por linha)
CREATE OR REPLACE FUNCTION auth_papel()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT papel FROM public.perfis
  WHERE id = (SELECT auth.uid())
$$;
```

### Modelo de policies para tabelas financeiras

```sql
-- ======================================================
-- Exemplo: tabela cotacoes
-- ======================================================
ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;

-- SELECT: admin e gestor veem tudo; vendedor só do seu evento
CREATE POLICY cotacoes_select ON cotacoes
  FOR SELECT TO authenticated
  USING (
    auth_papel() IN ('admin', 'gestor')
    OR evento_id IN (
      SELECT id FROM eventos WHERE criado_por = (SELECT auth.uid())
    )
  );

-- INSERT: somente admin e gestor
CREATE POLICY cotacoes_insert ON cotacoes
  FOR INSERT TO authenticated
  WITH CHECK (auth_papel() IN ('admin', 'gestor'));

-- UPDATE: somente admin e gestor
CREATE POLICY cotacoes_update ON cotacoes
  FOR UPDATE TO authenticated
  USING (auth_papel() IN ('admin', 'gestor'))
  WITH CHECK (auth_papel() IN ('admin', 'gestor'));

-- DELETE: somente admin
CREATE POLICY cotacoes_delete ON cotacoes
  FOR DELETE TO authenticated
  USING (auth_papel() = 'admin');

-- Visitante: nenhuma policy de escrita → bloqueado automaticamente
-- (authenticated sem match em nenhuma policy de write = negado)
```

### Padrão para congelar valores aprovados

Pagamentos e contratações aprovadas não devem ser editadas por ninguém (nem admin via cliente):

```sql
-- Bloquear UPDATE em linhas já aprovadas via policy + trigger
CREATE POLICY pagamentos_update ON pagamentos
  FOR UPDATE TO authenticated
  USING (
    auth_papel() = 'admin'
    AND status NOT IN ('pago', 'cancelado')  -- aprovados são imutáveis
  );
```

### Checklist RLS mínima para módulo financeiro

```
[ ] RLS habilitado em: itens_necessidade, pedidos_orcamento, itens_pedido,
    cotacoes, contratacoes, pagamentos, snapshots
[ ] (select auth.uid()) em TODAS as policies — nunca auth.uid() nu
[ ] Índice em colunas usadas nas policies (evento_id, criado_por, pedido_id)
[ ] Policy SELECT ≠ policy INSERT/UPDATE/DELETE (criadas separadamente)
[ ] Papel 'visitante': apenas policies SELECT em tabelas públicas do evento
[ ] Testar como anon: SELECT deve retornar 0 linhas, INSERT deve retornar erro 403
[ ] Testar como visitante: SELECT permitido, qualquer write = 403
```

**Fontes:**
- [RLS Performance and Best Practices — Supabase Docs](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase RLS Guide 2026 — DesignRevision](https://designrevision.com/blog/supabase-row-level-security)
- [Custom Claims & RBAC — Supabase Docs](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac)
- [Supabase RLS Best Practices — Makerkit](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [CVE-2025-48757 & RLS Pitfalls — VibeAppScanner](https://vibeappscanner.com/supabase-row-level-security)

---

## 4. Auditoria Leve — Quem Mudou o Quê

### Opções disponíveis

| Opção | Como funciona | Onde grava | Status (ago/2026) |
|---|---|---|---|
| `supa_audit` | Trigger por tabela, captura OLD/NEW como JSONB | Tabela `audit.record_version` | **Arquivado** fev/2025; funcional mas sem manutenção |
| `pgAudit` | Extension de log; não usa trigger | Arquivos de log do Postgres | Ativo; mais confiável para compliance |
| Trigger manual genérico | PL/pgSQL customizado | Tabela própria no banco | Flexível; controle total |

### Recomendação: Trigger manual genérico (para este porte)

Para um módulo financeiro em evento rural, o melhor custo-benefício é um **trigger genérico customizado** que grava em tabela própria, capturando apenas o essencial.

#### Tabela de auditoria

```sql
CREATE TABLE audit_financeiro (
  id            BIGSERIAL PRIMARY KEY,
  tabela_schema TEXT NOT NULL,
  tabela_nome   TEXT NOT NULL,
  operacao      TEXT NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  registro_id   TEXT,              -- PK do registro afetado (texto para generalidade)
  dados_antes   JSONB,             -- NULL em INSERT
  dados_depois  JSONB,             -- NULL em DELETE
  campos_mudados TEXT[],           -- lista de colunas que mudaram (UPDATE)
  usuario_id    UUID,              -- auth.uid() no momento da operação
  usuario_email TEXT,              -- denormalizado para legibilidade
  ip_cliente    INET,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas de histórico por registro
CREATE INDEX ON audit_financeiro (tabela_nome, registro_id);
CREATE INDEX ON audit_financeiro (usuario_id);
CREATE INDEX ON audit_financeiro (criado_em);
```

#### Função trigger genérica

```sql
CREATE OR REPLACE FUNCTION fn_audit_financeiro()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_dados_antes  JSONB;
  v_dados_depois JSONB;
  v_campos       TEXT[];
  v_reg_id       TEXT;
  v_key          TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_dados_antes := to_jsonb(OLD);
    v_reg_id      := OLD.id::TEXT;
  ELSIF TG_OP = 'INSERT' THEN
    v_dados_depois := to_jsonb(NEW);
    v_reg_id       := NEW.id::TEXT;
  ELSE -- UPDATE
    v_dados_antes  := to_jsonb(OLD);
    v_dados_depois := to_jsonb(NEW);
    v_reg_id       := NEW.id::TEXT;
    -- Detectar apenas campos que mudaram
    SELECT ARRAY_AGG(key) INTO v_campos
    FROM jsonb_each(v_dados_depois) je
    WHERE v_dados_depois->je.key IS DISTINCT FROM v_dados_antes->je.key;
  END IF;

  INSERT INTO audit_financeiro (
    tabela_schema, tabela_nome, operacao, registro_id,
    dados_antes, dados_depois, campos_mudados,
    usuario_id, ip_cliente
  ) VALUES (
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, v_reg_id,
    v_dados_antes, v_dados_depois, v_campos,
    (SELECT auth.uid()),
    inet_client_addr()
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
```

#### Aplicar o trigger nas tabelas sensíveis

```sql
-- Aplicar em cada tabela financeira sensível
CREATE TRIGGER tg_audit_cotacoes
AFTER INSERT OR UPDATE OR DELETE ON cotacoes
FOR EACH ROW EXECUTE FUNCTION fn_audit_financeiro();

CREATE TRIGGER tg_audit_contratacoes
AFTER INSERT OR UPDATE OR DELETE ON contratacoes
FOR EACH ROW EXECUTE FUNCTION fn_audit_financeiro();

CREATE TRIGGER tg_audit_pagamentos
AFTER INSERT OR UPDATE OR DELETE ON pagamentos
FOR EACH ROW EXECUTE FUNCTION fn_audit_financeiro();
```

#### Consultar histórico de um registro

```sql
SELECT operacao, campos_mudados, dados_antes, dados_depois, usuario_id, criado_em
FROM audit_financeiro
WHERE tabela_nome = 'cotacoes' AND registro_id = 'uuid-aqui'
ORDER BY criado_em;
```

**Nota sobre `supa_audit`:** Embora arquivado, o código está disponível como referência. A função `audit.enable_tracking('public.tabela'::regclass)` usava a mesma abordagem de trigger JSONB. O projeto preferiu encerrar o desenvolvimento mas o padrão sobrevive.

**Fontes:**
- [supa_audit — GitHub Supabase (arquivado fev/2025)](https://github.com/supabase/supa_audit)
- [5mins of Postgres E8: Auditing com supa_audit vs pgAudit — pganalyze](https://pganalyze.com/blog/5mins-postgres-auditing-pgaudit-supabase-supa-audit)
- [How to Implement Audit Logging in PostgreSQL — OneUptime (jan/2026)](https://oneuptime.com/blog/post/2026-01-21-postgresql-audit-logging/view)
- [PGAudit Extension — Supabase Docs](https://supabase.com/docs/guides/database/extensions/pgaudit)

---

## 5. Constraints que Protegem Dinheiro

### CHECK constraints essenciais

```sql
-- Nunca negativo
valor           NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
quantidade      NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
desconto        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (desconto >= 0),

-- Desconto não pode superar valor bruto
CHECK (desconto <= valor_bruto),

-- Percentual entre 0 e 100
percentual      NUMERIC(5,2) CHECK (percentual BETWEEN 0 AND 100),

-- Status controlado por enum
status TEXT NOT NULL DEFAULT 'pendente'
  CHECK (status IN ('pendente','aprovado','pago','cancelado')),

-- Datas coerentes
CHECK (data_vencimento >= data_emissao),
CHECK (data_pagamento IS NULL OR data_pagamento >= data_emissao),
```

### Colunas geradas STORED para totais

Disponíveis desde PostgreSQL 12. Garantem que o total nunca fique dessincronizado do item pai:

```sql
total_bruto NUMERIC(12,2) GENERATED ALWAYS AS
  (quantidade * preco_unitario) STORED,

total_liquido NUMERIC(12,2) GENERATED ALWAYS AS
  (quantidade * preco_unitario - desconto) STORED,

baseline_total NUMERIC(12,2) GENERATED ALWAYS AS
  (baseline_quantidade * baseline_preco_unitario) STORED,
```

**Limitações de colunas geradas:**
- Não podem referenciar outras tabelas (apenas colunas da mesma linha).
- Não podem ser INSERT/UPDATE direto (são sempre computadas).
- Total de um pedido (soma de itens) **não pode ser gerado** — precisa ser calculado no app ou via view/trigger.

### Total do pedido: view ou trigger?

Para somas que cruzam tabelas (total do pedido = soma dos itens), as opções são:

```sql
-- Opção A: View (calculada na leitura — sempre fresca)
CREATE VIEW pedidos_com_total AS
SELECT
  p.*,
  COALESCE(SUM(i.total_liquido), 0) AS total_pedido,
  COALESCE(SUM(i.baseline_total), 0) AS total_baseline
FROM pedidos_orcamento p
LEFT JOIN itens_pedido i ON i.pedido_id = p.id
GROUP BY p.id;

-- Opção B: Coluna desnormalizada + trigger de update (melhor para RLS e performance)
ALTER TABLE pedidos_orcamento ADD COLUMN total_atual NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION fn_recalcular_total_pedido()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE pedidos_orcamento
  SET total_atual = (
    SELECT COALESCE(SUM(total_liquido), 0)
    FROM itens_pedido WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
  )
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER tg_total_pedido
AFTER INSERT OR UPDATE OR DELETE ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_recalcular_total_pedido();
```

**Recomendação:** View para leitura simples; coluna desnormalizada + trigger se a tabela de pedidos for filtrada por total no RLS ou em buscas frequentes.

**Fontes:**
- [PostgreSQL CHECK Constraints — postgresql.org](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Generated Columns in PostgreSQL — DBI Services](https://www.dbi-services.com/blog/generated-columns-in-postgresql/)
- [PostgreSQL Generated Columns — Neon](https://neon.com/postgresql/tutorial/generated-columns)
- [PostgreSQL Deep Dive Part 6 — Money, Casting — Abheist](https://abheist.com/blogs/postgres-money-boolean-and-casting)

---

## 6. Recomendações Finais de Schema

### Decisões consolidadas

| Tópico | Decisão |
|---|---|
| **Tipo monetário** | `NUMERIC(12,2) NOT NULL CHECK (valor >= 0)` |
| **JS/Supabase client** | Tratar como string; usar `currency.js` para operações no frontend |
| **Baseline** | Colunas `baseline_*` na tabela de itens + trigger que congela na aprovação |
| **Múltiplas revisões** | Tabela `pedidos_orcamento_snapshots` com JSONB se necessário |
| **RLS** | `(select auth.uid())` em todas as policies; função `auth_papel()` SECURITY DEFINER |
| **Papel visitante** | Zero policies de INSERT/UPDATE/DELETE — bloqueio natural |
| **Auditoria** | Trigger genérico customizado → tabela `audit_financeiro` com JSONB |
| **Constraints** | CHECK >= 0, CHECK consistência de datas, colunas GENERATED STORED para totais de linha |
| **Total de pedido** | View (simples) ou coluna desnormalizada + trigger (se precisar filtrar/indexar) |

### Ordem de implementação sugerida

1. Criar tabelas base com `NUMERIC(12,2)` e `CHECK >= 0`
2. Habilitar RLS imediatamente (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
3. Criar função `auth_papel()` SECURITY DEFINER
4. Criar policies por operação (SELECT/INSERT/UPDATE/DELETE separadas)
5. Criar trigger de congelamento de baseline
6. Criar trigger de auditoria nas tabelas sensíveis
7. Criar índices nas colunas de policies (evento_id, criado_por)
8. Testar como `anon` e como papel `visitante` antes do primeiro deploy

### Aviso sobre `supa_audit`

O projeto `supa_audit` da Supabase foi **arquivado em fevereiro de 2025** e não recebe mais manutenção. Para novas implementações, preferir trigger manual (seção 4) ou pgAudit se compliance regulatório for exigido.

---

*Pesquisa realizada em 2026-08-01. URLs verificadas nesta data.*
