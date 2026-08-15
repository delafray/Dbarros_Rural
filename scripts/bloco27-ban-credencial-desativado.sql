-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 27 — Banir a credencial ao desativar usuário (auditoria F12, Parte D4)
-- Problema: desativar um usuário mudava só public.users.is_active — a senha
-- continuava logando direto contra a API de Auth por fora do app. Esta RPC
-- espelha a desativação em auth.users.banned_until (mecanismo oficial do
-- GoTrue: login recusado enquanto banned_until estiver no futuro).
-- Só admin executa. O app ja chama set_user_ban em updateUser/terminateTempUser.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.set_user_ban(target_user_id uuid, banned boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  -- Só admin do sistema pode banir/desbanir
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (SELECT auth.uid()) AND u.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem banir/reativar credenciais';
  END IF;

  UPDATE auth.users
  SET banned_until = CASE WHEN banned THEN 'infinity'::timestamptz ELSE NULL END
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_ban(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_user_ban(uuid, boolean) TO authenticated;

COMMIT;

-- ── (Opcional) Alinhar credenciais já desativadas: banir quem está inativo ───
-- Rode se quiser aplicar o ban retroativo aos usuários hoje inativos:
-- UPDATE auth.users a
-- SET banned_until = 'infinity'::timestamptz
-- FROM public.users u
-- WHERE u.id = a.id AND u.is_active = false;

-- ── Verificação: usuários inativos e o estado do ban ─────────────────────────
SELECT u.name, u.email, u.is_active, a.banned_until
FROM public.users u
JOIN auth.users a ON a.id = u.id
WHERE u.is_active = false
ORDER BY u.name;
