# Ações no Supabase — só você pode fazer (01/08/2026)

> Origem: auditoria de 6 subagentes (ver memória `seguranca-e-testes-2026-08`).
> O que dava para corrigir em código já foi feito na branch `seguranca-e-testes-2026-08`.
> Este arquivo é o que depende do **painel do Supabase (SQL Editor)** ou da **CLI** — não dá para fazer por código.
>
> **Como usar:** rode primeiro os blocos de DIAGNÓSTICO (só leitura, não mudam nada).
> Só rode os blocos de CORREÇÃO depois de ver o resultado do diagnóstico correspondente.
> Faça um por vez e confira. Nada aqui altera senha de usuário existente.

---

## 🔴 1. Visitante consegue ler o CPF dos clientes (LGPD)

A policy `Visitantes podem ler clientes` (migration `20260228_visitor_read_clientes`) foi criada
**antes** da coluna `cpf_responsavel` (`20260316`). Como RLS filtra linha, não coluna, o visitante
passou a ler o CPF junto. O código agrava usando `select('*')` em `clientesService`.

### Diagnóstico (só leitura)
```sql
-- Ver as policies atuais da tabela clientes:
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clientes'
ORDER BY policyname;
```

### Correção — decisão de produto (precisa da sua escolha)
RLS não consegue esconder **uma coluna** de um role e mostrar para outro na mesma tabela.
A forma limpa é uma **VIEW sem as colunas sensíveis** para o visitante. Duas opções:

**Opção A (recomendada) — remover o acesso direto do visitante e servir por VIEW sem PII.**
Requer também um pequeno ajuste no app (fazer o visitante ler `clientes_visitante` em vez de `clientes`).
Me avise que eu faço a parte do código.
```sql
-- 1) Remove a leitura direta do visitante na tabela crua:
DROP POLICY IF EXISTS "Visitantes podem ler clientes" ON public.clientes;

-- 2) View sem CPF/telefone-sensível (ajuste as colunas conforme o que o painel do visitante precisa):
CREATE OR REPLACE VIEW public.clientes_visitante AS
SELECT id, nome_completo, razao_social, nome_fantasia, tipo_pessoa, responsavel_empresa
FROM public.clientes;
-- (NÃO inclua cpf_responsavel nem cnpj/telefones aqui)

GRANT SELECT ON public.clientes_visitante TO authenticated;
```

**Opção B (rápida, se o visitante NÃO precisa de dado nenhum de cliente):**
```sql
DROP POLICY IF EXISTS "Visitantes podem ler clientes" ON public.clientes;
DROP POLICY IF EXISTS "Visitantes podem ler contatos" ON public.contatos;
```
Só faça a B se tiver certeza de que nenhuma tela usada por visitante mostra dados de cliente.

---

## 🔴 2. `atendimentos_historico` provavelmente sem RLS

Essa tabela **não aparece** na migration de isolamento master (`20260310000001`). Se o RLS estiver
desligado, qualquer autenticado (inclusive visitante) lê/escreve o histórico de atendimentos de
**todos os eventos**.

### Diagnóstico (só leitura)
```sql
SELECT relrowsecurity AS rls_ligado
FROM pg_class WHERE relname = 'atendimentos_historico';

SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'atendimentos_historico';
```
Se `rls_ligado = false` ou não aparecer policy, aplique a correção.

### Correção (espelha o padrão de `atendimentos`, join por `atendimento_id`)
```sql
ALTER TABLE public.atendimentos_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_isolation" ON public.atendimentos_historico;

CREATE POLICY "master_isolation" ON public.atendimentos_historico
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.atendimentos a ON a.edicao_id = ee.id
     WHERE a.id = atendimento_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.atendimentos a ON a.edicao_id = ee.id
     WHERE a.id = atendimento_id) IS NULL
  );
```

---

## 🟠 3. Confirmar que a senha em texto claro (`temp_password_plain`) segue protegida

A migration `20260702000002` restringiu o role `anon` a ler só `id, email, name, is_active, expires_at`
da tabela `users`. Se esse grant tiver sido revertido (ex.: por um restore que recria a policy),
`temp_password_plain` volta a ficar legível sem login.

### Diagnóstico (só leitura)
```sql
SELECT grantee, privilege_type, column_name
FROM information_schema.column_privileges
WHERE table_name = 'users' AND grantee = 'anon'
ORDER BY column_name;
```
**Esperado:** só as 5 colunas acima. Se aparecer `temp_password_plain` (ou `*`), reaplique:
```sql
REVOKE SELECT ON public.users FROM anon;
GRANT SELECT (id, email, name, is_active, expires_at) ON public.users TO anon;
```

---

## 🟠 4. Aplicar a migration pronta que bloqueia visitante de renomear opcionais

O arquivo `supabase/migrations/20260702000003_block_visitors_rename_opcional.sql` está pronto mas
**nunca foi colado**. Enquanto isso, um visitante pode renomear itens opcionais de todos os eventos.
Cole o conteúdo desse arquivo no SQL Editor (ele já está no repositório, íntegro).

### Verificar depois (só leitura)
```sql
-- Deve dar erro "Acesso negado" se você testar logado como visitante.
-- Confirmação de que a função é SECURITY DEFINER e existe:
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'rename_opcional_item';
```

---

## 🟡 5. Tabelas criadas fora das migrations — confirmar RLS

`cardapios`, `menus_a4`, `itens_opcionais`, `photos`, `photo_tags`, `tags`, `tag_categories`,
`system_config` foram criadas direto no Studio (não há `CREATE TABLE` no repositório), então não dá
para saber pelos arquivos se têm RLS.

### Diagnóstico geral (só leitura) — pega QUALQUER tabela pública sem RLS
```sql
SELECT c.relname AS tabela_sem_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
ORDER BY c.relname;
```
Para cada tabela que aparecer e tiver dado sensível, habilite RLS e crie a policy adequada
(as de cardápio podem seguir o modelo `master_isolation` acima, ajustando o join).

---

## 🟡 6. `cardapio_projetos` aberto a qualquer autenticado

A policy `auth_all_cardapio_projetos` usa `USING(true)` — um visitante pode alterar/apagar projetos
de qualquer evento. Se cardápio deve respeitar o isolamento por evento, troque por `master_isolation`.
Baixo teor de PII, então é prioridade menor. Diagnóstico:
```sql
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename = 'cardapio_projetos';
```

---

## 🔧 7. Regenerar `database.types.ts` (some com 4 erros de tsc e ~80 `as any`)

Faltam nos tipos: tabelas `cardapios`, `menus_a4`, `cardapio_projetos`, `photos`, `photo_tags`,
`tags`, `tag_categories`, `system_config`, `user_biometrics` e colunas `responsavel_empresa`/
`cpf_responsavel` (clientes) e `retorno_cancelado_nota` (atendimentos_historico).

```bash
# precisa do Supabase CLI logado; <PROJECT_REF> é o ref do projeto (no dashboard → Settings → General)
npx supabase gen types typescript --project-id <PROJECT_REF> --schema public > database.types.ts
```
Depois disso me avise: eu removo os `// @ts-nocheck` de `cardapioService`/`menuA4Service`/
`cardapioProjetosService` e limpo os `as any` que não forem mais necessários.

---

## 🔧 8. Edge Function `passkey-auth` — avaliar deletar

O app **não usa** essa function (usa a RPC `sign_in_with_passkey`). Ela tem 3 falhas
(challenge do WebAuthn aceito do cliente = bypass; `login-options` sem auth expõe userId;
CORS `*` com service_role). Se confirmar que nada a chama, o mais seguro e barato é removê-la:

```bash
# CLI logada; confirma que existe e apaga
supabase functions list
supabase functions delete passkey-auth
```
Se algum dia quiser reativar biometria por edge function, ela precisa ser reescrita para o servidor
**gerar e guardar** o challenge (não aceitar do cliente). Não reimplante como está.

---

### Ordem sugerida
1 e 2 (LGPD e isolamento) → 3 e 4 (senha e opcionais) → 5 (varredura de RLS) → 7 (tipos) →
8 (edge function) → 6 (cardápio, sem pressa).
