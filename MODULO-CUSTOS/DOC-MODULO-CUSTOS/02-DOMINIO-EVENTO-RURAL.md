# 02 — Domínio: como funciona um evento rural na prática

> Seção A registra o **relato do usuário** (01/08/2026) — é a fonte primária.
> Seção B consolida fatos do domínio levantados na pesquisa (com apontadores
> para os relatórios). Novos relatos do usuário entram na seção A com data.

## A. Relato do usuário (01/08/2026)

- A empresa **organiza** o evento. Os gestores precisam dar o preço do evento —
  uma **previsão de orçamento**.
- São **N fornecedores com múltiplos produtos**. Exemplos de necessidades:
  piso em deck, tenda, elétrica, mobiliário, programação visual.
- **O agrupamento é uma decisão de negócio**: há empresa que fornece tudo isso
  junto num endereço, mas pode ficar mais barato contratar tenda + piso com uma
  e a elétrica com outra. O mesmo conjunto de itens pode ser reunido num pedido
  de orçamento único ou fatiado — **esse agrupamento tem de acontecer no
  sistema, com tipos**.
- Descritivos como no Prosperitas: "preciso de 300 metros de piso, 40 mesas,
  500 cadeiras" — quantidade + especificação.
- **Partes técnicas obrigatórias**: seguro do evento, ART. E há itens que
  **não se agrupam nem se cotam** com fornecedor: o pedido no **corpo de
  bombeiros** se faz direto no órgão.
- **Julgadores** (especialistas contratados): precisam de **transporte,
  alimentação e hospedagem mais especializada** (hotel). Esses custos têm de
  ser previstos.
- **Peões**: contratar **empresa de alimentação** para eles; não podem ficar
  separados dos animais por muito tempo → **hospedagem temporária no local do
  evento**. Se o local tem estrutura, ok; se não tem, contratar **banheiro
  temporário**.
- Itens "não tão obrigatórios" (condicionais): **segurança, equipe de limpeza**.
- Resumo do usuário: "a complexidade de fazer um evento rural é danado, são
  muitas empresas envolvidas (...) é um caos, mas nós fazemos em planilhas."

### Acréscimo do usuário (01/08/2026, mesma sessão)

- Ao **criar um evento**, o sistema deve mandar o gestor **ticar** o que se
  aplica: "ART? Corpo de bombeiros? Licença ambiental? Terá custo de locação
  do espaço? entre outros" — há mais coisas a pensar antes de criar um evento
  do que só ART e bombeiros. → virou **RF-020**; lista candidata completa em
  `05-CHECKLIST-CRIACAO-EVENTO.md`.

### Acréscimo do usuário (01/08/2026 — áreas que os eventos têm em geral)

> Lista de EXEMPLOS (não fechada): praças de alimentação; julgamento de gado
> e/ou cavalos; estrutura; limpeza; **manutenção**; em alguns casos torneios
> leiteiros; **bem-estar**; **fazendinha**; **estacionamento**; regras do
> estado; **organização**; **programação visual — "que geralmente a gente deixa
> em uma única empresa"**; divulgação; shows; **palco grande/médio/pequeno;
> cantores grandes/médios/pequenos**.

- Programação visual como pacote de fornecedor único → virou RF-024.
- Porte (G/M/P) de palcos e cantores → virou RF-025.
- Lacunas da pesquisa detectadas nesse relato (fazendinha, estacionamento,
  manutenção geral, organização, bem-estar): adicionadas ao checklist 05 com
  origem "usuário"; ver Q-015/Q-016.

### Acréscimo do usuário (01/08/2026 — fluxo de cadastro de fornecedores)

- "O cadastro não será manual. Os fornecedores entregam tudo em **PDF**, a
  gente joga no Excel e por lá tiramos uma base. O sistema vai ter de **gerar
  um .xls bloqueado** deixando apenas o fornecedor digitar os dados cadastrais;
  se já tiver no banco, faça o **autocomplete**; e a **validação será o CNPJ**,
  caso não tenha o mesmo cadastrado." → RF-027/RF-028.

### Acréscimo do usuário (01/08/2026 — cotação via planilha e sugestão de fornecedores)

- O sistema gera o **xls da cotação travado nos itens**, deixando o fornecedor
  digitar só o **valor unitário**; "a planilha faz a auto-soma". A planilha já
  sai com os dados cadastrais do fornecedor; depois a gente **importa** os
  valores de volta.
- Ao pedir para gerar um pedido de orçamento com base no que preciso (ex.:
  tenda, piso para tenda, decoração para tenda, elétrica para as tendas), se
  **já teve fornecedor que ofereceu isso antes e "casou certinho", o sistema
  vai me mostrar quais são** — o mecanismo exato de casamento "a gente pensa
  depois" (→ Q-019).
- Também há **itens muito mais simples e especializados** — ART, por exemplo:
  "provavelmente terei um ou dois fornecedores". (Nuance sobre o RF-004: a ART
  TEM fornecedor — engenheiro/empresa — diferente do corpo de bombeiros, que
  segue trâmite direto com o órgão.)

### Acréscimo do usuário (01/08/2026 — itens COMPOSTOS e rateio de custos)

- No Prosperitas "eu tenho toda uma cadeia a seguir para criar um descritivo —
  **no nosso sistema tem de ser mais fácil**".
- Fluxo: criei o evento → respondi as perguntas originais (checklist RF-020) →
  **teremos os itens compostos**.
- **Exemplo 1 — o BAR**: o descritivo do bar tem tudo que existe no bar:
  balcão, tomadas, piso, freezer, entre outras coisas. **Mas tudo é
  categorizado no orçamento**: quem faz o piso não necessariamente é quem faz
  o balcão. E "**vou precisar do custo do bar separado**": na hora de cotar, o
  bar tem 100 m de piso, mas o fornecedor vai fazer 1.000 m — **apenas 10%
  desse custo tem de ir para o bar** (rateio proporcional).
- **Exemplo 2 — o ESTANDE** (custo base para precificar a VENDA): "quanto
  custa este estande, que pode variar com a venda, mas eu preciso saber o
  custo para eu precificar a venda". Composição do estande: 1 tenda 5x5, piso
  de 25 m², 1 mesa, 4 cadeiras, 1 testeira de metalon com programação visual,
  iluminação central e na testeira — "**veja, tudo fornecedor diferente, mas eu
  tenho que ter um valor base**".

**Implicação central**: o item de custo tem DUAS dimensões — pertence a um
**composto** (bar, estande, arena...) E a uma **categoria de cotação**
(piso, marcenaria, elétrica...). A cotação consolida por categoria/fornecedor
(1.000 m de piso somando todos os compostos); o custo volta **rateado** para
cada composto na proporção da sua quantidade (bar = 100 m = 10%). O custo
total do composto (soma das parcelas rateadas) é o **valor base** usado para
precificar a venda — a venda em si segue fora do escopo (RF-009), mas o custo
base é entregue pelo módulo.

**Nota sobre a pesquisa**: o rel. 03 recomendou NÃO transferir "composição de
insumos" da construção civil — o relato do usuário mostra que uma **versão
leve de composição é necessária** (composto → itens por categoria), sem chegar
ao nível SINAPI (coeficientes de consumo). Registrado no log de decisões.

### Acréscimo do usuário (01/08/2026 — o FLUXO imaginado, "Centro de Custo do Evento")

> Como o usuário imagina a experiência, na ordem:

1. Estou em **"Centro de Custo do Evento"** → **Novo evento**.
2. **Tela 1**: mostra **todos os custos obrigatórios governamentais** — ART,
   corpo de bombeiros, licenças...
3. **Tela 2**: **cadastrar as variáveis** (= compostos): stands 5x5, 10x10 —
   "deixando eu à vontade para excluir ou incluir depois".
4. **Tela 3**: uma **listagem** — "se tiver variáveis, serão as primeiras" —
   e vou ticando e preenchendo: qual o tipo de banheiro do público; limpeza
   → coloco **30 pessoas/dia**; internet; **sistema de cobrança → caixas
   fixos 2, ambulantes 5** — "essas coisas".
5. Resultado: "tem de ser fácil, depois, abrir uma **planilha linda que pode
   ser agrupada e desagrupada**". Exemplo: na listagem aparecem vários itens
   da categoria **piso** → clico nela → **abre um modal com todos os itens
   selecionados** → "mas **eu não quero os dos stands**" (desmarco o piso dos
   stands e o agrupamento de cotação sai sem eles).

- "Nossa, difícil viu. Mas vamos montando aqui." — complexidade reconhecida;
  levantamento continua.
- Item de domínio NOVO citado: **sistema de cobrança** (caixas fixos +
  vendedores ambulantes) — não constava na pesquisa nem no checklist; adicionado.
- O nome "**Centro de Custo do Evento**" é um forte candidato a nome do módulo
  (sinaliza resposta à Q-003 — aguardando confirmação).

### Acréscimo do usuário (01/08/2026 — sinalização de compliance É custo, e a falta é multa)

- "São essas coisas que vão me mandar do azul para o vermelho: se eu não
  colocar **identificação de saídas de emergência — que tem de estar no
  custo** —, esses **avisos claros**, **cardápio bem identificável com valores
  bem definidos**, **placas de proibido fumar em local fechado**, **proibida
  venda de álcool e tabaco para menores** — isso pode dar **multas severas**."
- Veredito implícito: PC-32 (álcool/tabaco) e a sinalização de emergência
  estão ✅ CONFIRMADOS como itens de custo obrigatórios → RF-041.
- Item NOVO: **cardápio/tabela de preços visível e legível com preços
  definidos** (CDC + Lei 10.962/2004 — afixação de preços; fiscalização
  PROCON) — vale para bar, praça de alimentação e qualquer ponto de venda.

### Acréscimo do usuário (01/08/2026 — MODULARIDADE por perfil de evento)

- "Às vezes vamos fazer um evento em uma **fazenda, um dia de pesquisa**, com
  vários agrônomos e zootecnistas — é **área privada, poucas coisas a
  resolver**. Mas às vezes pode ser **no meio da Avenida Paulista, onde tudo é
  preciso**. Então este sistema tem de ser **modular, simples — a complexidade
  vai ficar no backend**."
- Implicação: os blocos de obrigações/custos NÃO são fixos — o **perfil do
  evento** (local público × privado, porte/público, tem animais?, tem show?,
  tem venda?, tem cobrança de ingresso?) determina o que a Tela 1 e o
  questionário mostram. Dia de campo na fazenda ≈ meia dúzia de itens; evento
  urbano grande ≈ tudo. → RF-042.

### Acréscimo do usuário (01/08/2026 — 15 minutos, projetista, catálogo de produtos e o "de-para")

- "Eu me imagino fazendo o cadastro **do início ao fim em coisa de 15
  minutos**." → meta de UX do fluxo de criação (RNF-013).
- Depois do cadastro: "aí vou pedir **o projetista** para fazer os projetos do
  stand, onde ele vai fazer o **descritivo** conforme combinamos" (módulo
  portado do Prosperitas — RF-031). O sistema já tem o papel `is_projetista`
  na tabela de usuários.
- O problema do descritivo do fornecedor grande: "não vai casar com o meu —
  ele vai mandar **'cadeira Amanda'**, mas no meu sistema vai ter **'cadeira
  simples branca'**. Hummm, você tem de ter o **cadastro de produtos**."
- Fluxo definido: "**eu vou mandar o Excel, o fornecedor tem de trabalhar em
  cima daquilo**. Se o fornecedor falar que não tem [o produto], **eu cadastro
  aqui e mando para ele. Simples assim.**" — ou seja: o catálogo é NOSSO e o
  controle é nosso; o fornecedor não tem portal — a rodada é sempre via
  planilha, e equivalências/variantes são cadastradas do nosso lado e
  reenviadas.

### Acréscimo do usuário (01/08/2026 — resposta ao veredito da IA: prazo, testes e a previsão que abre a conversa)

- **Prazo**: "fiz em 5 meses uns 9 sistemas, tenho uns 100 users plugados
  trabalhando sem reclamar — eu falei como teria de ser e você [IA] fez."
  → estimativas de construção devem assumir desenvolvimento assistido por IA,
  não régua tradicional.
- **Ordem de implementação decidida**: "em primeiro lugar, vamos **criar todas
  as tabelas**; vamos **cobrir com testes automáticos 90% do código desde o
  início** — sei que custa mais, mas é o que me garante **não retornar ao
  sistema por bug bobo**." Importar planilha ou TXT e exportar: "sei que não é
  problema."
- **Custos de referência**: ECAD e taxas das grandes prefeituras estão online —
  buscar; "se não estiver, **uma previsão basta**. O cordão do azul para o
  vermelho é curto, mas nem tanto — um custo extra em taxa de bombeiro o
  faturamento aguenta." → o sistema trabalha com estimativas honestas; não
  precisa de precisão perfeita em taxa pequena.
- **A PREVISÃO QUE ABRE A CONVERSA** (requisito novo — RF-046): "vou ter uma
  previsão de custo **no início da conversa** com o dono do evento, com base
  nos custos de um ano atrás. **Não chego sem nada.** Falo: este mesmo evento
  ano passado custou 1; um ano antes custou 0,75; ou seja, **o seu pode chegar
  a 1,25 — mas temos de onde partir**." → estimativa instantânea por histórico
  com tendência (0,75 → 1 → projeção 1,25), usada como âncora de negociação.

### Acréscimo do usuário (01/08/2026 — biblioteca de espaços do Prosperitas e a busca "Mercado Livre")

- "Você vai **estudar o PROSPERITAS, pois de lá vai sair os itens compostos**:
  teremos **~30 espaços** — um caex *(termo a confirmar)*, um porta-malas, um
  bar, um modelo de stand básico, um modelo de stand customizado. **Eu vou
  fazer o descritivo de cada item** (montagem básica, piso, carpete... essas
  coisas). **Você já vai ter montado a estrutura e cadastrado os meus itens.**"
  → responde Q-022 (compostos SÃO templates de biblioteca) e Q-020 (port
  inclui DADOS: itens/produtos e espaços derivados dos projetos do Prosperitas).
- **Busca de produtos estilo Mercado Livre** (RF-049), nas palavras dele:
  tokenização; erro de digitação tolerado ("cadera" → cadeira; "cader..." →
  cadeira; "vazo" = "vaso", independente de como esteja cadastrado); sinônimos
  ("o cara não sabe que está cadastrado tenda 10x10, digita **toldo 10x10** e
  vem a tenda"); prefixo incremental ("comecei a digitar cadeir... aparecem as
  cadeiras"); **ranking por popularidade** ("impressão digital é 99% das
  buscas — 'impr...' tem de trazê-la primeiro, mesmo com id menor que
  'impressão em camisa branca'"); **português BR, sem IA** — "acho que no SQL
  tem essa forma de busca; se não tiver, você cria".

### Acréscimo do usuário (02/08/2026 — exemplos são exemplos; explodir os custos internos)

- "Tudo que te passei são **exemplos, não a base do projeto**. Quando falo que
  tem de contemplar limpeza, **não é só mão de obra — tem o custo de
  material**. Quando falo da empresa de tenda, tem o deslocamento — que nem
  entra separado, **já está no custo da contratação**. Tem coisa que eu não
  lembro, como agora lembrei: o **tambor profissional de guardar leite do
  torneio leiteiro — não é barato**. Sei que o leite armazenado e coletado
  paga, mas **é custo, eu tenho de contratar**."
- Dois princípios extraídos: (1) cada área de custo deve ser **decomposta nos
  componentes internos** (mão de obra + material + equipamento + logística);
  (2) o sistema precisa distinguir **o que vem embutido no preço do fornecedor**
  (deslocamento da tenda) do que é **contratado à parte** (tambor de leite) —
  mesmo quando uma receita futura compensa (leite coletado paga, mas o
  desembolso existe e antecede).
- Tambor/latão + tanque de leite reforçam o PC-28 (estrutura do torneio
  leiteiro) com a nuance financeira: desembolso obrigatório, receita
  compensatória depois.

### Planilhas REAIS analisadas (04/08/2026 — Agroleite Perdizes 2024 e Feira de Cláudio)

Fonte: `C:\Users\ronal\OneDrive\Pictures\Screenshots\` (2 xlsx de eventos reais,
R$ 348 mil e R$ 300 mil). O que as planilhas CONFIRMAM do desenho:
- Seções A/B/C com subtotais = nossas categorias/camadas; coluna OBSERVAÇÃO com
  **"Valores fechados" × "Valor provisionado" = exatamente contratado × orçado**
  (a cultura O×C já existia na empresa!);
- **Kit logístico por pessoa em estado puro**: jurado Girolando = pró-labore +
  hospedagem + alimentação + deslocamento por km (RF-023 confirmado na prática);
- Coluna PARTICIPAÇÃO (% do item no total) = curva ABC (RF-017);
- Frete da estrutura como linha própria (600 km × 2 × R$ 5) = verba fechada;
- Itens do checklist todos presentes: maravalha, silagem, fazendinha, AVCB+projeto
  +extintores, caçambas, marmitex do pessoal, sinalização, seguro, RT.

O que as planilhas REVELARAM de novo:
1. **QUANTIDADE EM DOIS FATORES (RF-053)**: as planilhas têm DUAS colunas QTDE —
   "Segurança 7 × 16 diárias × R$ 200", "Alimentação jurado 2 × 3 dias",
   "Deslocamento 240 km × 2 viagens". O schema tinha só `quantidade` → criado
   campo `fator` (Bloco 15). Perder essa semântica achataria a grade.
2. **Variantes do mesmo composto**: "Estandes Expositores" aparece em 4 linhas
   (5x5, 5x5 2 testeiras, 5x5 3 testeiras, 8x8) com qtde própria → o template
   instancia VARIANTES (formato/porte já cobrem).
3. **Custo como % da receita**: "Participação Sindicato 10% do faturamento",
   "Participação Dbarros 20%" — itens proporcionais à receita lançados como
   custo. v1: lança o valor calculado à mão; v2: tipo "percentual da receita".
- Observação do usuário confirmando o modelo: "Estandes Expositores pode ter
  fornecedor de piso e de programação visual diferentes — faço o descritivo e
  preciso agrupar para compor o item e mandar para fornecedores diferentes
  depois" = exatamente composto (RF-032) + modal de agrupamento por categoria
  (RF-036) + rateio de volta (RF-033).

### 3º artefato real + PDFs ao cliente (04/08/2026)

**"Planilha de Previsão de Custos.xlsx"** (o modelo pré-evento) e os **PDFs
enviados aos clientes** (planilha impressa via Excel) revelaram:
1. **A planilha de custos É DOCUMENTO DE CLIENTE**: vai em PDF para o dono do
   evento (sindicato/prefeitura) — modelo de negócio de transparência: a Dbarros
   organiza, mostra os custos, e cobra "Participação Dbarros 20–25% do
   faturamento" + "Pagamento Entrada" (lançados como itens de custo!). → RF-054
   (export PDF formatado para o cliente).
2. **A margem lateral da previsão é a PRECIFICAÇÃO feita à mão**: "VENDA DE
   ESTANDES — 19 estandes × 7.000; 20 blimps × 1.600; 14 galhardetes × 1.000;
   8 rádio-feira × 800; 10 logos back drop × 800; 6 logos pórtico × 1.000;
   % DeBarros 0,25; Total para pagar conta e organizador" → o break-even
   RF-040/034 em estado bruto, e a lista real dos VENDÁVEIS (estandes + mídias:
   blimp, galhardete, spot na rádio-feira, logo em backdrop/pórtico).
3. Previsão com valores vazios = "a cotar"; notas "haverá reajuste de tabela
   para 2025" e seguro "média" → estimativas honestas (RF-048) na prática.
4. **Jurado Nelore** além de Girolando → raças múltiplas por evento (ABCZ).
5. "Taxas Bancárias" como linha própria → PC-09 confirmado pela prática.

### Implicações registradas
- Certas escolhas geram **custos derivados/encadeados** (julgador → transporte
  + hospedagem + alimentação; peão → alimentação + alojamento local; local sem
  estrutura → banheiro químico). O sistema deve ajudar a **lembrar** desses
  desdobramentos.
- O item de necessidade é independente do fornecedor; o **pedido de orçamento
  é uma agregação flexível** que pode ser montada, desmontada e remontada para
  comparar cenários sem perder os itens.

## B. Fatos do domínio (pesquisa 01/08/2026)

### Obrigações legais e prazos (relatórios 06 e 19)
| Providência | Antecedência | Custo típico | Observação |
|---|---|---|---|
| AVCB/PTOT — Corpo de Bombeiros | ~60 dias | R$ 500–3.000 | vistoria em até 30 dias; validade máx. 90 dias |
| ART estruturas temporárias (CREA) | 30–60 dias | taxa R$ 100–300 + honorários R$ 1.900–5.000 | palco, tenda, arquibancada, elétrica |
| Alvará da prefeitura | 15–40 dias | variável | exige ART e AVCB como pré-requisito |
| Seguro Lei 10.519/2002 | antes do evento | R$ 500–1.000+ | vida/invalidez mín. R$ 100 mil por profissional: peões, madrinheiros, salva-vidas, **juízes**, locutores |
| Comunicação à defesa agropecuária estadual | 30 dias | — | indicar veterinário responsável (RT) |
| GTA por animal + cadastro do recinto | 15–30 dias | por animal | mapa de animais até 5 dias úteis após o evento |
| ECAD | antes | ~5% da bilheteria | eventos gratuitos pagam sobre custos musicais |

- Julgadores: sem licença pública obrigatória; credenciamento CNAR para eventos
  chancelados; **entram no seguro obrigatório**.

### Estrutura de custos típica (relatório 07 — base em licitações reais)
- Evento médio de 3 dias: **R$ 224 mil a R$ 620 mil**.
- A "companhia de rodeio" costuma ser contratada como **pacote** (arena +
  touros + equipe técnica + premiação).
- Lei exige: ambulância, médico, veterinário e seguro para todos os
  profissionais de arena.
- Taxonomia completa (10 categorias, 30+ subcategorias, ~120 itens com unidades)
  no relatório `../PESQUISA-MODULO-CUSTOS/07-custos-evento-rural.md`.

### Proporções operacionais por público (relatório 18)
- Banheiros: 1/50 pessoas (1/30-40 com bebida); +5% acessíveis (NBR 9050).
- Ambulância: 1 até 5 mil; 2 entre 5–15 mil; estrutura médica maior acima.
- Brigadistas: norma estadual (ABNT NBR 14.608).
- Gerador: 55–100 kVA (pequeno) a 500+ kVA; margem +20%.

### Julgadores de gado Girolando e Gir (relatórios 21 e 22 — pedidos pelo usuário em 01/08/2026)

> Contexto do usuário: "trabalho muito com eventos onde tem julgadores, são
> pessoas importantes."

- **Girolando**: a associação da raça (ABCG — Girolando, Uberaba-MG) mantém
  **colégio oficial com ~50 jurados credenciados**. O evento solicita o
  julgador **via associação**, com antecedência de **30–90 dias**. Modalidades:
  exposição ranqueada, torneio leiteiro etc., com exigências de
  genealogia/documentação dos animais. Contato: (34) 3331-6000.
- **Gir/Gir Leiteiro**: credenciamento pelo **Colégio de Jurados da ABCZ**
  (~158 jurados; 50 anos de colégio) e ABCGIL. Formação: curso obrigatório de
  4 dias (nota mínima 80%) + internato como auxiliar. Regras: sem conflito de
  interesse, comentário técnico obrigatório ao público. Requisição de jurados:
  produz@abcz.org.br / (34) 3319-3904.
- **Custos**: tabelas de honorários **não são públicas** — orçamento direto com
  a associação. **Praxe do setor: o organizador paga deslocamento, hospedagem
  e alimentação** do julgador (confirma o kit logístico RF-023).
- **Oficialização do evento** (para valer ranking): registro do evento na
  associação + taxas + jurado credenciado + fiscal técnico da raça presente +
  alvará/defesa sanitária em dia. Infraestrutura exigida do organizador: pista
  de julgamento, secretaria de pista, som/microfone, iluminação, equipe técnica.
- **Implicação para o sistema**: julgador é contratação com **antecedência
  própria (30–90 dias → prazo-alerta)** e custo "sob consulta" (item sem preço
  de referência — orçar via associação a cada evento).

### Mercado (relatórios 04 e 16)
- **Nenhum SaaS brasileiro** cobre custos/orçamento de eventos rurais (lacuna
  confirmada). Internacionais não têm comparação de cotações entre fornecedores
  nem a camada "contratado" bem resolvida.
