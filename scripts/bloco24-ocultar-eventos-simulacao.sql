-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 24 — Ocultar eventos de teste/simulação do sistema principal (05/08)
-- Pedido: "tem alguns eventos que entraram na produção... ocultar no
-- dashboard e em eventos até a gente validar".
-- O front passa a esconder edições com status_custos='simulacao' (Dashboard,
-- Eventos, Todos os Eventos, Controle). Eventos criados pelo wizard do
-- Centro de Custo JÁ nascem 'simulacao'; este bloco só corrige o DEMO
-- (Agroleite Perdizes, semeado como 'confirmada') e lista o resultado.
-- Validar depois = mudar o status para 'confirmada' (o evento reaparece).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE public.eventos_edicoes ed
SET status_custos = 'simulacao'
FROM public.eventos e
WHERE e.id = ed.evento_id
  AND e.nome = 'Agroleite Perdizes'
  AND ed.titulo = 'ExpoLeite Perdizes 2024';

COMMIT;

-- ── Verificação: TUDO que ficará OCULTO no Dashboard/Eventos ─────────────────
-- Confira se a lista bate com os eventos de teste que você quer sumir.
-- (Se aparecer algum evento REAL aqui, me avise — reverto com um UPDATE.)
SELECT e.nome AS evento, ed.titulo, ed.ano, ed.status_custos
FROM public.eventos_edicoes ed
JOIN public.eventos e ON e.id = ed.evento_id
WHERE ed.status_custos = 'simulacao'
ORDER BY e.nome, ed.ano;
