# RESUMO DA MANHÃ — 05/08/2026 (missão noturna)

> Produzido durante a noite por 12 agentes de leitura (toda a documentação + 78 relatórios
> de pesquisa + git log de 04/08) e 8 agentes de pesquisa web (relatórios novos 79–86).
> Nada de código, SQL ou banco foi tocado. Só este resumo e os relatórios 79–86 são novos.

---

## 1) O que você quer do sistema (com as suas palavras)

Destilando tudo que você disse até aqui, o pedido real é um só: **substituir as ~40
planilhas desconectadas de cada evento por um lugar único que parece planilha mas pensa
sozinho** — e que te proteja da "amnésia de orçamentista" ("o problema é o que eu não
estou lembrando").

Os pedidos de 04/08, nas suas palavras:

- **Port literal do Prosperitas**: "a tela deve ser CÓPIA do Prosperitas — port LITERAL
  do código... **estou acostumado a usar ele**". Feito e aprovado.
- **Espaço padrão × exclusivo (regra do molde)**: "dentro do evento NÃO se pode cadastrar
  espaço padrão"; "pode editar o espaço padrão sim, **mas fica salvo apenas para aquele
  evento**". O molde só nasce e se edita em Cadastros.
- **Tela de Cadastros com voltar**: hub próprio em `/custos/cadastros` ("← Voltar"),
  nascendo com Produtos e Espaços padrão — "vou colocar outros itens" (lista aberta).
- **Gestão de produtos**: "se tiver algum produto em algum evento **não posso excluir**...
  entende?" — exclusão bloqueada com contagem de uso, desativação reversível, e renomear
  grava histórico antes (o nome original nunca se perde).
- **Busca sem LIKE**: "**o like seria descartado em todas as fases**" — busca RF-049
  (unaccent + trigram + FTS + sinônimos + popularidade real), validada com 'toldo' → tenda.
- **Escopo do import**: "esta estrutura que você importou **é exclusivamente de
  estruturas. Ainda teremos os julgamentos, os diversos, entre outros que vão chegar**" —
  ou seja, Estrutura está de pé; Julgamento (por raça) e Diversos ainda vão receber
  conteúdo próprio, de planilhas e relatos seus.
- **Espaços refeitos do real**: "os espaços de hoje estão todos errados — recrie com base
  nas suas pesquisas" → 13 templates recriados das 96 planilhas reais (rel. 72–78).

E o objetivo de negócio que amarra tudo: chegar na conversa com o cliente **armado com
números** ("ano passado custou 1, o seu pode custar 1,25" — RF-046) e saber o custo real
de cada espaço para decidir o preço ("a faixa do azul para o vermelho é apenas não
precificar do jeito certo").

## 2) O que já está bom e fica

- **Tela do descritivo portada do Prosperitas** (`EspacoDescritivo` + `ProdutoAutocomplete`,
  RF-057/058): teclado, badge, cores idênticos. Você aprovou: "o front end ficou muito bom".
- **Aba Espaços em duas zonas** (RF-056): biblioteca de padrões em cima (vitrine + Setar),
  espaços do evento embaixo (cópias editáveis por evento). Regra do molde aplicada.
- **Catálogo real Prosperitas**: 340 produtos, 13 grupos, frequência de uso real dos
  ~200K descritivos — nada inventado. Você conferiu no Supabase.
- **Busca RF-049** ponta a ponta com o catálogo real (Bloco 23: sinônimos migrados para
  os produtos reais; `normalizarTexto` no front — nada compara texto sensível a acento).
- **Gestão de produtos RF-059** operacional (trava de exclusão + histórico de nome imutável).
- **Motor e banco da v1**: 24+ tabelas, ~72 policies RLS, `custosCalc.ts` (3 gavetas,
  rateio com invariante de conservação — nenhum centavo some —, EAC), xlsx de cotação
  travado ida-e-volta, ~310 testes verdes. Demo Agroleite Perdizes bate no centavo
  (R$ 348.211,22, inclusive achando R$ 16.000 de erro no Excel original).
- **Decisões fechadas que não se reabrem**: custo ancora na edição/ano (Q-001, sobreviveu
  a 7 ataques adversariais); 3 gavetas de custo direto/medível/verba (Q-021, placar 4×1);
  vocabulário "Evento + Ano" na UI (nunca "edição"); kit de sinalização obrigatória
  sempre gerado (PC-32 — "são essas coisas que mandam do azul para o vermelho").

## 3) Onde está a bagunça (com franqueza)

1. **A v1 foi construída de trás pra frente** — dashboard e wizard antes do fluxo real de
   uso. Você mesmo já reconheceu isso no RECOMECO-2026-08-04.md. A "carroceria" da UI v1
   existe no código, testada, mas com aprovação revogada na prática. E há contradição
   entre documentos: o PLANO-EXECUCAO.md diz que "o início foi definido" (cadastros-base
   primeiro), o RECOMECO diz que isso é hipótese da IA a validar com você. **R5 está sem
   partida porque só você sabe qual é o seu "início".**
2. **Julgamento e Diversos são seções vazias.** Existem no banco, mas sem itens. Os 58
   seeds antigos (marmitex, pró-labore de jurado, maravalha...) são o embrião dessas
   seções mas estão sem `secao_id` e sem decisão de purga (IMPORT-CATALOGO-PROSPERITAS.md,
   seção 7 — pendente). O kit do jurado (RF-023) está confirmado no papel e inexistente no banco.
3. **Contradições numéricas perigosas nos docs**: seguro Lei 10.519 aparece como
   R$ 100 mil (05-CHECKLIST) e R$ 200 mil (rel. 07/40); ECAD como 5% (05) e ~10% (rel. 29).
   E a ART tem 3 comportamentos incompatíveis em 4 lugares (item avulso × cotável × trâmite
   de órgão — rel. 39, achado A-05). Precisam de veredito antes de virar código.
4. **Premissas técnicas furadas nas deliberações** (rel. 65): `evento_id` é NULLABLE em
   `eventos_edicoes` e a criação atômica pai+edição não existe na UI; a RLS real isola por
   `master_user_id`, não por edição — herdar isso no módulo de custos exporia custos entre
   eventos. São pré-condições, não detalhes.
5. **Registro incompleto de 04/08**: o hub de Cadastros é "lista aberta" sem Q-nnn dizendo
   o que entra; Porta-malas ficou vazio sem registro formal; "bem-estar" (Q-015) ficou
   como área genérica por decisão da IA, não sua; `promoverCompostoATemplate` existe no
   código sem UI (pode confundir quem retomar).
6. **Ciclo pós-contrato ausente** (rel. 39, A-01): depois de "Contratado" o modelo não diz
   o que acontece em cancelamento, aditivo, inadimplência, encerramento. Evento real dá errado.
7. **Ruído na própria pesquisa**: das "96 planilhas", algumas são formulário vazio, lista
   de contatos ou logo ilegível (rel. 73/74/75) — o denominador está inflado; e o grupo
   Marcenaria aparece nos descritivos mas não existe no catálogo de preços.

## 4) O que falta para PRECIFICAR um evento rural (o coração)

Hoje o sistema calcula **custo de estrutura**. Precificar ponta a ponta é: custo do espaço
→ preço de venda → conta do evento inteiro fechando. A cadeia tem 5 elos, e 4 estão abertos:

**Elo 1 — Custo completo do espaço (RF-034, meio pronto).** O motor rateia (gavetas A+B),
mas: Julgamento e Diversos vazios; as "letras miúdas" não entram (frete/hospedagem/
alimentação de equipe de fornecedor — 15–30% do orçamento em evento rural, rel. 41–53);
as 7 faces (RF-051) e as exclusões all-in (RF-052) estão confirmadas no papel e ausentes
na prática; espaço sem descritivo dá custo zero sem nenhum alerta. E falta o custo real
de produção: suas planilhas têm o preço de venda (propostas 1088, 1062...), não o custo —
o rel. 78 mostrou que esse lado vive na sua cabeça.

**Elo 2 — Custo → preço (não existe).** Nenhuma tela converte custo em preço. A pesquisa
nova dá as réguas: markup 1,3×–2,0× sobre custo operacional de espaços (rel. 80/82);
margens diferentes por natureza — locação bruta (tenda) suporta 110–260% de markup,
montagem 30–50% (rel. 82); preço não-linear por tamanho (tenda 3x3 ≈ R$ 33–55/m²/dia,
10x10 ≈ R$ 7–10 — rel. 82); mercado agro cobra R$ 600–1.200/m² de área livre e
R$ 400–700/m² de montagem básica (rel. 80). A tela mínima é: custo do composto + simulação
de markup (2×/2,5×/3×) + coeficiente de localização (+15–30% esquina/corredor).

**Elo 3 — Break-even do evento (RF-040, status `pesquisa`).** A gaveta C (cachê, gerador,
ART, ECAD, seguro, impostos) precisa ser coberta pela margem dos vendáveis. O rel. 84
traz o método: break-even multi-receita (padrão observado ~40% bilheteria / 35% estandes /
20% patrocínio / 5% concessões), regra prática receita ≥ 2× custo, contingência explícita
(20% em 1ª edição, 10% consolidado). E o rel. 79 avisa: impostos e taxas (ISS 2–5%, ECAD,
plataforma 10–12%) comem 15–29% da receita — calcular DEPOIS do markup, senão a margem some.

**Elo 4 — Vendáveis além do estande (invisíveis hoje).** Você já vende blimp, galhardete,
backdrop e rádio-feira (está nas suas planilhas), mas nada disso é entidade no sistema.
Referências novas: blimp R$ 3–12 mil, galhardete R$ 450–2.500, cotas Diamante≈2×Ouro≈3×Prata
(rel. 81); receitas acessórias — energia por kVA (R$ 200/kVA excedente), credenciais,
taxa de montadora, inscrição de animais R$ 190–230 (rel. 86) — somam R$ 127–227 mil numa
feira média. A "Participação Dbarros 20–25% do faturamento" está na faixa saudável de
mercado (15–25%, rel. 83) e merece virar campo do sistema com linha própria no PDF
(RF-054), não conta de cabeça. Isso NÃO contraria o "puramente gastos" (RF-009): basta
um campo de *receita esperada por vendável* para fechar o break-even — sem virar financeiro.

**Elo 5 — Memória que alimenta o próximo ano (RF-046/037, não construídos).** A previsão
"0,75 → 1 → 1,25" precisa de: snapshot de encerramento (RF-037), importação do histórico
(Q-010, aberta) e um fator de reajuste — a pesquisa nova fundamenta **1,065 (+6,5% a.a.)**
como default, intervalo 1,045–1,085, com energia elétrica como outlier de +8,7% (rel. 85).
Falta também definir onde vive a simulação pré-contrato (edição-rascunho) sem poluir a série.

## 5) Proposta de ordem de trabalho (R4/R5) — opinativa

1. **R4a — Destravar Julgamento e Diversos com o que já existe**: classificar os 58 seeds
   embrionários nas seções (proposta pronta para seu SIM/NÃO), montar o kit do jurado
   (RF-023) por raça e resolver a purga pendente. Custo baixo, destrava o custo completo.
2. **R4b — Vereditos rápidos seus (30 min)**: seguro 100 × 200 mil; ECAD 5 × 10%;
   ART (avulso × cotável × trâmite); Porta-malas; "outros itens" do hub de Cadastros.
   Sem isso, qualquer código nasce errado.
3. **R5a — Você narra o "início"** (uma sessão): como você começa um evento na vida real.
   É a única pendência que SÓ você resolve; o wizard inteiro depende dela.
4. **R5b — Tela "Custo → Preço" do espaço** (RF-034 + markup + localização): o maior valor
   pelo menor esforço — o motor já calcula o custo; falta só a tela que mostra e simula.
5. **R5c — Break-even do evento** (RF-040 + vendáveis de mídia + participação % + contingência
   explícita): fecha a conta do evento inteiro. Promover RF-040 de `pesquisa` a confirmado.
6. **R6 (antes de qualquer merge) — Pré-condições técnicas**: `evento_id NOT NULL` +
   criação atômica pai/edição + RLS por edição escrita do zero + status rascunho de edição.
   São as 4 pendências do rel. 65 que sustentam tudo acima.
7. **Depois**: encerramento/snapshot (RF-037) → importação do histórico (Q-010) → previsão
   RF-046 com fator 1,065 → PDF ao cliente (RF-054). Nessa ordem, cada etapa alimenta a seguinte.

---

*Relatórios novos desta noite: 79 (margem de organizadoras), 80 (R$/m² de estande no agro),
81 (patrocínio e mídias), 82 (custo × preço de espaços), 83 (participação % sobre
faturamento), 84 (break-even na prática), 85 (reajustes 2025→2026), 86 (receitas além do
estande) — todos em `MODULO-CUSTOS/PESQUISA-MODULO-CUSTOS/` com fontes e URLs.*
