-- ✅ APLICADA EM PRODUÇÃO em 02/07/2026 (após deploy do login com colunas mínimas).
-- Verificada por teste ao vivo: anon não lê mais temp_password_plain.
--
-- SEGURANÇA (confirmado por teste em 02/07/2026): a tabela users é legível pelo
-- role anon (policy TO public), incluindo a coluna temp_password_plain — ou seja,
-- a senha em texto claro de qualquer visitante temporário fica exposta a qualquer
-- pessoa na internet, sem login.
--
-- Correção: privilégio de SELECT em nível de COLUNA para o anon. O login
-- pré-auth só precisa de: id, email, name, is_active, expires_at (o código novo
-- em authService.login já busca exatamente estas). Usuários autenticados não
-- são afetados.

REVOKE SELECT ON public.users FROM anon;

GRANT SELECT (id, email, name, is_active, expires_at) ON public.users TO anon;

-- Verificação (opcional): rodar depois de aplicar. Deve dar erro de permissão:
--   SET LOCAL ROLE anon; SELECT temp_password_plain FROM public.users LIMIT 1;
