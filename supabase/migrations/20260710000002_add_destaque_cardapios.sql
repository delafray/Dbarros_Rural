-- Flag "destaque" (marcação única por projeto): o cardápio/menu marcado
-- aparece PRIMEIRO na primeira página do A3 Duplo.
-- Substitui o pin hardcoded da empresa 'BAR' que existia no A3DuploCanvas.

ALTER TABLE public.cardapios
    ADD COLUMN IF NOT EXISTS destaque boolean NOT NULL DEFAULT false;
ALTER TABLE public.menus_a4
    ADD COLUMN IF NOT EXISTS destaque boolean NOT NULL DEFAULT false;

-- Garante no banco que só existe UM destaque por projeto em cada tabela
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cardapios_destaque_por_projeto
    ON public.cardapios(projeto_id) WHERE destaque;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_menus_a4_destaque_por_projeto
    ON public.menus_a4(projeto_id) WHERE destaque;

-- Preserva o comportamento antigo: a empresa BAR (se existir) já nasce marcada.
-- DISTINCT ON garante no máximo 1 por projeto mesmo com "BAR" duplicado.
UPDATE public.cardapios SET destaque = true
 WHERE id IN (
    SELECT DISTINCT ON (projeto_id) id
      FROM public.cardapios
     WHERE upper(trim(empresa)) = 'BAR'
       AND projeto_id IS NOT NULL
       AND projeto_id NOT IN (
           SELECT projeto_id FROM public.cardapios
            WHERE destaque AND projeto_id IS NOT NULL)
     ORDER BY projeto_id, created_at
 );
UPDATE public.menus_a4 SET destaque = true
 WHERE id IN (
    SELECT DISTINCT ON (projeto_id) id
      FROM public.menus_a4
     WHERE upper(trim(empresa)) = 'BAR'
       AND projeto_id IS NOT NULL
       AND projeto_id NOT IN (
           SELECT projeto_id FROM public.menus_a4
            WHERE destaque AND projeto_id IS NOT NULL)
     ORDER BY projeto_id, created_at
 );
