-- ════════════════════════════════════════════════════════════════════════════
-- DEMO REAL: Agroleite Perdizes 2024 — réplica da planilha de custos original
-- ════════════════════════════════════════════════════════════════════════════
-- Recria no sistema o evento da "Planilha de Custos - Agroleite Perdizes 2024
-- .xlsx", item a item: seções (Julgamento›Girolando / ›Torneio Leiteiro /
-- Estrutura / Diversos), qtd × fator (as DUAS colunas QTDE), e o status:
--   "Valores fechados"    → contratado
--   "Valor provisionado"  → orcado
--   sem valor na planilha → rascunho (preço vazio, "a cotar")
-- Totais esperados: A=40.126,80 · B=148.268,00 · C=159.816,42 · TOTAL=348.211,22
-- Idempotente: se o evento já existir, avisa e não duplica.

DO $$
DECLARE v_ev uuid; v_ed uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.eventos WHERE nome = 'Agroleite Perdizes') THEN
    RAISE NOTICE 'Evento "Agroleite Perdizes" ja existe — nada foi criado.';
    RETURN;
  END IF;

  INSERT INTO public.eventos (nome) VALUES ('Agroleite Perdizes') RETURNING id INTO v_ev;
  INSERT INTO public.eventos_edicoes (evento_id, titulo, ano, status_custos)
  VALUES (v_ev, 'ExpoLeite Perdizes 2024', 2024, 'confirmada') RETURNING id INTO v_ed;

  INSERT INTO public.custos_perfil_edicao
    (edicao_id, publico_esperado, tem_animais, tem_show, vende_alcool, cobra_ingresso, tem_estruturas)
  VALUES (v_ed, 5000, true, true, true, false, true);

  INSERT INTO public.custos_itens
    (edicao_id, secao_id, categoria_id, descricao, formato, quantidade, fator, preco_unitario_orcado, status)
  SELECT v_ed,
         (SELECT id FROM public.custos_secoes  s WHERE s.slug = v.secao),
         (SELECT id FROM public.custos_categorias c WHERE c.slug = v.cat),
         v.descricao, v.formato, v.qtd, v.fator, v.preco, v.st::custos_status_item
  FROM (VALUES
    -- ══ A. JULGAMENTO › GIROLANDO ══════════════════════════════════════════
    -- Nota: na planilha original esta linha tinha QTDE 1|3 mas total 8.000 (pacote
    -- fechado — o "3" era so os dias). O sistema acusou a inconsistencia; fator=1.
    ('julgamento-girolando','hospedagem','Pró Labore Jurado Girolando','Julgamento (pacote fechado, 3 dias)',1::numeric,1::numeric,8000::numeric,'contratado'),
    ('julgamento-girolando','hospedagem','Pró Labore Técnico de Admissão Girolando','Admissão + KM',1,5,800,'contratado'),
    ('julgamento-girolando','hospedagem','Pró Labore Técnico de Sistema Girolando','Sistema',1,3,600,'contratado'),
    ('julgamento-girolando','hospedagem','Hospedagem Jurado - Girolando','Hotel conveniado',1,3,90,'contratado'),
    ('julgamento-girolando','hospedagem','Hospedagem Técnico Admissão - Girolando','Hotel conveniado',1,4,NULL,'rascunho'),
    ('julgamento-girolando','hospedagem','Hospedagem Técnico do Sistema - Girolando','Hotel conveniado',1,10,90,'contratado'),
    ('julgamento-girolando','hospedagem','Alimentação Jurado Girolando','Alimentação',2,3,40,'contratado'),
    ('julgamento-girolando','hospedagem','Alimentação Técnico de Admissão - Girolando','Alimentação',2,5,40,'contratado'),
    ('julgamento-girolando','hospedagem','Alimentação Técnico de Sistema - Girolando','Alimentação',2,3,40,'contratado'),
    ('julgamento-girolando','hospedagem','Deslocamento Jurado - Girolando','Km rodado',240,2,1.76,'contratado'),
    ('julgamento-girolando','hospedagem','Deslocamento Técnico de Admissão - Girolando','Km rodado',500,2,NULL,'rascunho'),
    ('julgamento-girolando','hospedagem','Deslocamento Técnico de Sistema - Girolando','Km rodado',100,2,1.76,'contratado'),
    -- ══ A. JULGAMENTO › TORNEIO LEITEIRO ═══════════════════════════════════
    ('torneio-leiteiro','hospedagem','Pró Labore Responsável Torneio Leiteiro','Diária',6,1,800,'contratado'),
    ('torneio-leiteiro','hospedagem','Hospedagem Responsável Torneio Leiteiro','Hotel conveniado',7,1,NULL,'rascunho'),
    ('torneio-leiteiro','hospedagem','Alimentação Responsável Torneio Leiteiro','Alimentação',6,2,40,'contratado'),
    ('torneio-leiteiro','hospedagem','Deslocamento Responsável Torneio Leiteiro','Km rodado',500,2,NULL,'rascunho'),
    ('torneio-leiteiro','rh-equipe','Alimentação Estagiários','Alimentação',7,20,20,'orcado'),
    ('torneio-leiteiro','animais','Medicamentos','Compra de medicamentos',1,1,NULL,'rascunho'),
    ('torneio-leiteiro','animais','Premiação Torneio Leiteiro','Premiação',1,1,15000,'contratado'),
    -- ══ B. ESTRUTURA ═══════════════════════════════════════════════════════
    ('estrutura','tendas','Tendas Estandes Expositores','Tendas (5x5)',29,1,2761,'contratado'),
    ('estrutura','tendas','Tendas Estandes Expositores - Agricultura','Tendas (10x10)',1,1,NULL,'rascunho'),
    ('estrutura','tendas','Tendas Estandes Expositores - Master','Tendas (10x10)',1,1,7240,'contratado'),
    ('estrutura','tendas','Tendas Fazendinha','Tendas (10x10) 2 fechamentos',2,1,1891,'orcado'),
    ('estrutura','tendas','Tendas pista de julgamento','Tendas (10x10)',12,1,1791,'contratado'),
    ('estrutura','programacao-visual','Blimp''s','Blimp''s instalados',8,1,700,'contratado'),
    ('estrutura','programacao-visual','Galhardetes postes','(1,30 x 0,80)',6,1,350,'contratado'),
    ('estrutura','estruturas','Back Drop / Pórtico estrutura','5,00x2,00x3,00 e 9,00x2,00x3,00',1,1,5000,'contratado'),
    ('estrutura','programacao-visual','Back Drop / Pórtico lona','5,00x2,00x3,00 e 9,00x2,00x3,00',1,1,1485,'contratado'),
    ('estrutura','animais','Silagem - sacos de 30 kgs','Sacos de 30 kgs',1,600,NULL,'rascunho'),
    ('estrutura','animais','Cama para animais - Maravalha','m3 - Permuta Estande Diamante',1,115,100,'contratado'),
    ('estrutura','taxas-legais','RT do Evento','Responsável Técnico',1,1,4000,'contratado'),
    ('estrutura','estruturas','Frete da estrutura','Local de saída - Paraopeba',2,600,5,'contratado'),
    -- ══ C. DIVERSOS ════════════════════════════════════════════════════════
    ('diversos','limpeza','Caçambas','Locação diária',2,7,NULL,'rascunho'),
    ('diversos','eletrica','Gerador','Gerador de energia',1,4,NULL,'rascunho'),
    ('diversos','animais','Kit Faixas/Rosetas - Julgamento/Torneio','Pacote 6 - padrão Associação',1,1,4000,'contratado'),
    ('diversos','animais','Troféus - Julgamento/Torneio','Troféus Torneio Leiteiro',1,1,8162,'contratado'),
    ('diversos','shows','Contratação Fazendinha','Fazendinha Meninada',1,1,17000,'orcado'),
    ('diversos','som-luz-telao','Som','Locação de som de todo o parque',1,1,5000,'contratado'),
    ('diversos','internet-ti','Internet','Internet - Giganet',1,1,800,'contratado'),
    ('diversos','som-luz-telao','Palco Praticável','Palco apresentação',1,1,1300,'contratado'),
    ('diversos','som-luz-telao','Telão LED','Telão LED (4,00x3,00)',1,1,8000,'contratado'),
    ('diversos','som-luz-telao','Iluminação do Palco','Iluminação do palco',1,1,2500,'contratado'),
    ('diversos','shows','Apresentação Cultural','Cantores',3,1,2500,'orcado'),
    ('diversos','outros','Papelaria - diversos - impressão','Artigos de escritório',1,1,500,'orcado'),
    ('diversos','seguranca','Serviço de Segurança','Serviço de segurança',7,6,150,'orcado'),
    ('diversos','rh-equipe','Alimentação Segurança','Uma refeição',1,1,NULL,'rascunho'),
    ('diversos','limpeza','Serviço de Limpeza','Serviço de limpeza',3,7,150,'orcado'),
    ('diversos','rh-equipe','Alimentação Limpeza','Uma refeição',3,7,NULL,'rascunho'),
    ('diversos','manutencao','Eletricista','Serviços diversos',2,7,200,'orcado'),
    ('diversos','eletrica','Material Elétrico','Materiais diversos',1,1,2289.50,'contratado'),
    ('diversos','manutencao','Bombeiro Hidráulico','Serviços diversos',2,7,200,'orcado'),
    ('diversos','eletrica','Energia','Despesa com energia',1,1,4000,'orcado'),
    ('diversos','sanitarios','Água e Esgoto','Despesa com água',1,1,2500,'orcado'),
    ('diversos','taxas-legais','Seguro do Evento','Seguro do evento',1,1,NULL,'rascunho'),
    ('diversos','taxas-legais','Projeto Corpo de Bombeiros - AVCB','Projeto + taxas',1,1,4614.92,'contratado'),
    ('diversos','divulgacao','Divulgação do evento - JR','Instagram',1,1,1000,'contratado'),
    ('diversos','programacao-visual','Comunicação Visual do evento','Sinalização',1,1,NULL,'rascunho'),
    ('diversos','estruturas','Pintura Pavilhões','Pintura pavilhões',1,1,4520,'contratado'),
    ('diversos','outros','Participação Sindicato Rural','10% do faturamento',1,1,20360,'orcado'),
    ('diversos','outros','Participação Dbarros Rural','20% do faturamento',1,1,40720,'orcado'),
    ('diversos','outros','Pagamento Entrada Dbarros Rural','Entrada',1,1,10000,'orcado')
  ) AS v(secao, cat, descricao, formato, qtd, fator, preco, st);

  RAISE NOTICE 'Agroleite Perdizes 2024 criado: edicao %', v_ed;
END $$;
