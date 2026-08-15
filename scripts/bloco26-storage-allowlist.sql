-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 26 — Allowlist de upload no SERVIDOR (auditoria F12, Parte D3)
-- A validação no front (utils/uploadValidation.ts) é defesa em profundidade;
-- a trava REAL é aqui: cada bucket recusa MIME fora da lista e arquivo acima
-- do limite, mesmo que alguém fale direto com o endpoint (sem passar pelo app).
-- Seguro rodar mais de uma vez (só faz UPDATE das colunas de config).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Fotos da galeria: imagens + vídeo curto (100 MB)
UPDATE storage.buckets
SET file_size_limit = 104857600,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime']
WHERE id = 'photos';

-- Documentos de edição: PDF + imagem (25 MB)
UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp']
WHERE id = 'edicao-docs';

-- Fundos/chancelas de cardápio: só imagem (15 MB).
-- O bucket pode se chamar 'cardapio-assets' ou 'assets' — cobre os dois.
UPDATE storage.buckets
SET file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id IN ('cardapio-assets','assets');

COMMIT;

-- ── Verificação: confira os limites e tipos por bucket ───────────────────────
SELECT id, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY id;
