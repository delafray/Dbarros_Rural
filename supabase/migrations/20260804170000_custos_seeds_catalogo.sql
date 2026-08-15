-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 17 — SEEDS: catálogo de produtos + sinônimos + descritivos dos espaços
-- ════════════════════════════════════════════════════════════════════════════
-- Produtos extraídos das PLANILHAS REAIS do usuário (Perdizes 2024, Cláudio,
-- Previsão) com unidades e popularidade inicial. Stand 5x5 exatamente como o
-- usuário descreveu: tenda + piso + mobiliário + testeira c/ programação
-- visual + elétrica. Idempotente (roda 2x sem duplicar).

-- ── 17.1 Catálogo de produtos ────────────────────────────────────────────────
INSERT INTO public.custos_produtos (nome, descricao, unidade, frequencia_uso, categoria_id)
SELECT v.nome, v.descricao, v.unidade, v.freq,
       (SELECT id FROM public.custos_categorias c WHERE c.slug = v.cat)
FROM (VALUES
  -- Tendas e coberturas
  ('Tenda 5x5',                  'Piramidal 5x5m',                    'un',      900, 'tendas'),
  ('Tenda 8x8',                  'Piramidal 8x8m',                    'un',      300, 'tendas'),
  ('Tenda 10x10',                'Piramidal 10x10m',                  'un',      800, 'tendas'),
  ('Tenda 3x3 com balcão',       'Para praça de alimentação',         'un',      400, 'tendas'),
  ('Fechamento de tenda',        'Lateral em lona',                   'un',      300, 'tendas'),
  -- Piso
  ('Piso deck',                  'Piso modular plástico/madeira',     'm2',      700, 'piso'),
  ('Carpete',                    'Forração para stand',               'm2',      500, 'piso'),
  ('Tablado / palco',            'Estrutura metálica com deck',       'm2',      300, 'piso'),
  -- Mobiliário
  ('Cadeira simples branca',     'Plástica empilhável',               'un',      990, 'mobiliario'),
  ('Mesa plástica',              'Quadrada com 4 lugares',            'un',      800, 'mobiliario'),
  ('Jogo mesa + 4 cadeiras',     'Conjunto plástico',                 'un',      600, 'mobiliario'),
  ('Balcão modular',             'Alumínio, módulo 2m',               'un',      400, 'mobiliario'),
  -- Marcenaria / cenografia
  ('Testeira de metalon',        'Estrutura para identificação do stand', 'un', 700, 'marcenaria'),
  -- Programação visual
  ('Lona impressa',              'Impressão digital em lona',         'm2',      800, 'programacao-visual'),
  ('Adesivo impresso',           'Recorte/impressão adesiva',         'm2',      500, 'programacao-visual'),
  ('Blimp instalado',            'Balão inflável de logomarca',       'un',      600, 'programacao-visual'),
  ('Galhardete de poste',        '1,30 x 0,80m',                      'un',      500, 'programacao-visual'),
  ('Placa de pista',             '1,30 x 0,80m',                      'un',      400, 'programacao-visual'),
  ('Placa de sinalização',       'Sinalização interna do evento',     'un',      500, 'programacao-visual'),
  -- Elétrica
  ('Ponto de tomada',            'Instalação de tomada no stand',     'un',      800, 'eletrica'),
  ('Iluminação de stand',        'Spot/refletor instalado',           'un',      700, 'eletrica'),
  ('Gerador 250 kVA',            'Diária com combustível',            'diaria',  500, 'eletrica'),
  ('Torre de iluminação',        'Locação diária',                    'diaria',  300, 'eletrica'),
  ('Material elétrico',          'Cabos, disjuntores, diversos',      'vb',      400, 'eletrica'),
  -- Som / luz / telão
  ('Som do parque',              'Sonorização geral + locução',       'evento',  600, 'som-luz-telao'),
  ('Telão de LED',               'Painel P4 outdoor',                 'm2',      400, 'som-luz-telao'),
  ('Iluminação de palco',        'Kit show',                          'evento',  300, 'som-luz-telao'),
  -- Estruturas
  ('Arquibancada',               'Metro linear montado',              'm',       300, 'estruturas'),
  ('Fechamento gradil',          'Metro linear',                      'm',       400, 'estruturas'),
  ('Pórtico de entrada',         'Estrutura + lona',                  'un',      300, 'estruturas'),
  ('Brete / curral',             'Estrutura de manejo',               'un',      300, 'estruturas'),
  -- Sanitários
  ('Banheiro químico',           'Standard, diária com limpeza',      'diaria',  700, 'sanitarios'),
  ('Banheiro químico PCD',       'Acessível NBR 9050',                'diaria',  400, 'sanitarios'),
  ('Contêiner sanitário',        '6-12 vasos com pia',                'evento',  200, 'sanitarios'),
  -- Animais
  ('Maravalha',                  'Cama de animais',                   'm3',      600, 'animais'),
  ('Silagem saco 30kg',          'Alimentação bovinos',               'saco',    400, 'animais'),
  ('Feno',                       'Fardo',                             'fardo',   400, 'animais'),
  ('Kit faixas e rosetas',       'Premiação julgamento - padrão associação', 'kit', 300, 'animais'),
  ('Troféu',                     'Premiação',                         'un',      300, 'animais'),
  -- RH / equipe
  ('Diária de limpeza',          'Auxiliar de limpeza',               'diaria',  700, 'rh-equipe'),
  ('Diária de segurança',        'Vigilante/controlador',             'diaria',  700, 'rh-equipe'),
  ('Marmitex',                   'Refeição da equipe',                'un',      800, 'rh-equipe'),
  ('Eletricista de plantão',     'Diária',                            'diaria',  400, 'rh-equipe'),
  ('Bombeiro hidráulico',        'Diária',                            'diaria',  300, 'rh-equipe'),
  -- Julgamento (kit pessoa)
  ('Pró-labore de jurado',       'Por julgamento/diária',             'diaria',  500, 'hospedagem'),
  ('Hospedagem (diária hotel)',  'Hotel conveniado',                  'diaria',  500, 'hospedagem'),
  ('Alimentação (refeição)',     'Por pessoa',                        'un',      500, 'hospedagem'),
  ('Km rodado',                  'Deslocamento',                      'km',      500, 'hospedagem'),
  -- Diversos
  ('Internet do evento',         'Link dedicado/Starlink',            'evento',  400, 'internet-ti'),
  ('Caçamba de entulho',         'Locação diária',                    'diaria',  400, 'limpeza'),
  ('Contratação de fazendinha',  'Atração infantil completa',         'evento',  300, 'shows'),
  ('RT do evento',               'Responsável técnico',               'evento',  400, 'taxas-legais'),
  ('Projeto bombeiros + AVCB',   'Projeto + taxas',                   'evento',  400, 'taxas-legais'),
  ('Seguro do evento',           'RC + Lei 10.519',                   'evento',  400, 'taxas-legais'),
  ('ART de estrutura',           'Por estrutura',                     'un',      400, 'taxas-legais'),
  ('Impulsionamento redes',      'Campanha digital',                  'vb',      400, 'divulgacao'),
  ('Panfletagem',                'Distribuição',                      'vb',      300, 'divulgacao'),
  ('Inserção em rádio',          'Spot 30s',                          'semana',  300, 'divulgacao')
) AS v(nome, descricao, unidade, freq, cat)
WHERE NOT EXISTS (SELECT 1 FROM public.custos_produtos p WHERE p.nome = v.nome);

-- ── 17.2 Sinônimos (RF-049: "toldo" acha tenda) ──────────────────────────────
INSERT INTO public.custos_produto_sinonimos (produto_id, termo)
SELECT p.id, v.termo
FROM (VALUES
  ('Tenda 5x5',            'toldo 5x5'),
  ('Tenda 10x10',          'toldo 10x10'),
  ('Banheiro químico',     'sanitario quimico'),
  ('Blimp instalado',      'balao inflavel'),
  ('Maravalha',            'serragem'),
  ('Marmitex',             'quentinha'),
  ('Testeira de metalon',  'faixa de testeira'),
  ('Lona impressa',        'banner'),
  ('Piso deck',            'assoalho')
) AS v(nome, termo)
JOIN public.custos_produtos p ON p.nome = v.nome
ON CONFLICT (produto_id, termo) DO NOTHING;

-- ── 17.3 Descritivo-padrão dos espaços (o Stand 5x5 do usuário!) ─────────────
INSERT INTO public.custos_espaco_template_itens
  (template_id, produto_id, categoria_id, descricao, quantidade, formato, ordem)
SELECT t.id,
       (SELECT id FROM public.custos_produtos pr WHERE pr.nome = v.produto),
       (SELECT id FROM public.custos_categorias c WHERE c.slug = v.cat),
       v.descricao, v.qtd, v.formato, v.ordem
FROM (VALUES
  -- STAND BÁSICO 5x5 — como o usuário descreveu: tenda, piso, mobiliário,
  -- testeira com programação visual, elétrica
  ('Stand básico', 'Tenda 5x5',              'tendas',             'Tenda',                      1::numeric,  '5x5',  10),
  ('Stand básico', 'Piso deck',              'piso',               'Piso deck',                  25::numeric, 'm2',   20),
  ('Stand básico', 'Mesa plástica',          'mobiliario',         'Mesa',                       1::numeric,  NULL,   30),
  ('Stand básico', 'Cadeira simples branca', 'mobiliario',         'Cadeiras',                   4::numeric,  NULL,   40),
  ('Stand básico', 'Testeira de metalon',    'marcenaria',         'Testeira de metalon',        1::numeric,  NULL,   50),
  ('Stand básico', 'Lona impressa',          'programacao-visual', 'Programação visual da testeira', 2::numeric, 'm2', 60),
  ('Stand básico', 'Ponto de tomada',        'eletrica',           'Tomadas',                    2::numeric,  NULL,   70),
  ('Stand básico', 'Iluminação de stand',    'eletrica',           'Iluminação central e testeira', 2::numeric, NULL, 80),
  -- STAND CUSTOMIZADO (base maior)
  ('Stand customizado', 'Tenda 10x10',           'tendas',             'Tenda',              1::numeric,   '10x10', 10),
  ('Stand customizado', 'Piso deck',             'piso',               'Piso deck',          100::numeric, 'm2',    20),
  ('Stand customizado', 'Carpete',               'piso',               'Carpete',            100::numeric, 'm2',    30),
  ('Stand customizado', 'Balcão modular',        'mobiliario',         'Balcão',             2::numeric,   NULL,    40),
  ('Stand customizado', 'Testeira de metalon',   'marcenaria',         'Testeira',           2::numeric,   NULL,    50),
  ('Stand customizado', 'Lona impressa',         'programacao-visual', 'Programação visual', 6::numeric,   'm2',    60),
  ('Stand customizado', 'Ponto de tomada',       'eletrica',           'Tomadas',            4::numeric,   NULL,    70),
  ('Stand customizado', 'Iluminação de stand',   'eletrica',           'Iluminação',         4::numeric,   NULL,    80),
  -- BAR (o exemplo do usuário: balcão, tomadas, piso, freezer...)
  ('Bar', 'Tenda 5x5',              'tendas',      'Tenda do bar',        1::numeric,  '5x5', 10),
  ('Bar', 'Piso deck',              'piso',        'Piso',                25::numeric, 'm2',  20),
  ('Bar', 'Balcão modular',         'mobiliario',  'Balcão de atendimento', 2::numeric, NULL, 30),
  ('Bar', 'Ponto de tomada',        'eletrica',    'Tomadas p/ freezers', 4::numeric,  NULL,  40),
  ('Bar', 'Iluminação de stand',    'eletrica',    'Iluminação',          2::numeric,  NULL,  50),
  -- CAEX — Central de Atendimento ao Expositor
  ('CAEX', 'Tenda 5x5',              'tendas',             'Tenda',        1::numeric, '5x5', 10),
  ('CAEX', 'Piso deck',              'piso',               'Piso',         25::numeric,'m2',  20),
  ('CAEX', 'Jogo mesa + 4 cadeiras', 'mobiliario',         'Atendimento',  2::numeric, NULL,  30),
  ('CAEX', 'Testeira de metalon',    'marcenaria',         'Testeira',     1::numeric, NULL,  40),
  ('CAEX', 'Lona impressa',          'programacao-visual', 'Identificação CAEX', 2::numeric, 'm2', 50),
  ('CAEX', 'Ponto de tomada',        'eletrica',           'Tomadas',      2::numeric, NULL,  60),
  -- PORTA-MALAS
  ('Porta-malas', 'Tenda 10x10', 'tendas', 'Tenda',  1::numeric, '10x10', 10),
  ('Porta-malas', 'Piso deck',   'piso',   'Piso',   100::numeric, 'm2',  20)
) AS v(template, produto, cat, descricao, qtd, formato, ordem)
JOIN public.custos_espacos_template t ON t.nome = v.template
WHERE NOT EXISTS (
  SELECT 1 FROM public.custos_espaco_template_itens e
  WHERE e.template_id = t.id AND e.descricao = v.descricao
);
