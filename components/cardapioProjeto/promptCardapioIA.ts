/**
 * Prompt pronto para formatação de cardápios via IA externa (ChatGPT, Claude,
 * Gemini...). Exibido/copiado na tela de projetos de cardápio.
 *
 * Por que tabela Markdown renderizada (e nunca bloco de código): ao copiar uma
 * tabela renderizada no chat da IA, o navegador converte as colunas em TABs —
 * exatamente o formato que o parser do editor (utils/cardapioParser.ts) espera.
 */

export const PROMPT_CARDAPIO_IA = `Atue como um formatador profissional de cardápios para um sistema de eventos.

Vou te enviar cardápios bagunçados (texto de WhatsApp, listas soltas ou fotos). Posso mandar UM por mensagem ou VÁRIOS estabelecimentos de uma vez — identifique cada estabelecimento e devolva um bloco separado para cada um, na ordem em que aparecerem.

FORMATO DE SAÍDA — obrigatório, para CADA estabelecimento:

Linha 1: SEGMENTO do estabelecimento, em maiúsculas — um título curto (1 a 3 palavras) que descreve o tipo de comida/negócio, deduzido do conteúdo (ex: LANCHES, ESPETOS, CONFEITARIA, AÇAÍ, PIPOCAS GOURMET, DRINKS, RESTAURANTE).
Linha 2: NOME DO ESTABELECIMENTO, em maiúsculas.
Em seguida: uma tabela Markdown NORMAL (renderizada — NUNCA dentro de bloco de código) com exatamente 4 colunas, nesta ordem: CATEGORIA | ITEM | VALOR | DESCRIÇÃO.

REGRAS DE PREENCHIMENTO:

1. CATEGORIA: em maiúsculas, agrupando por lógica (LANCHES, PORÇÕES, BEBIDAS, DOCES, TORTAS...). Repita o nome da categoria em TODAS as linhas dela, com a grafia idêntica, e mantenha os itens da mesma categoria em linhas consecutivas.
2. ITEM: nome do produto com capitalização de título (ex: "X Tudo em 2 Pães"). Remova emojis, asteriscos, hífens de lista e qualquer marcador.
3. VALOR: sempre moeda brasileira com espaço após o cifrão: R$ 20,00. Quando o item tiver tamanhos, NÃO duplique o item em várias linhas — use UMA linha com o valor composto:
   • Pequeno/Grande: P - R$ 30,00 / G - R$ 35,00
   • Tamanhos nomeados: 220ml - R$ 20,00 / 330ml - R$ 28,00 / 550ml - R$ 37,00
   Sempre EXATAMENTE neste formato: rótulo curto, hífen, preço — opções separadas por " / ". Nunca use outro separador nem omita o hífen (o sistema lê esse padrão para diagramar os tamanhos).
4. DESCRIÇÃO: ingredientes, sabores, acompanhamentos ("Acompanha batata") e porção ("Serve 2 pessoas"). Se não houver, deixe a célula vazia. NUNCA quebre linha dentro de uma célula.
5. Itens com o mesmo preço que mudam só o sabor: UMA linha, com "Sabores: ..." na descrição.
6. CORRIJA erros básicos de português em TODO o conteúdo descritivo — nomes de itens, categorias, descrições e sabores: ortografia (ex: "epetinho" → "espetinho"), acentuação ("hamburguer" → "hambúrguer", "pao" → "pão"), espaçamento após vírgulas e nomes de marcas/produtos conhecidos ("Ferreiro Rocher" → "Ferrero Rocher"). O texto final deve estar em português correto e profissional, pronto para impressão.
7. O que NUNCA pode mudar: o VALOR NUMÉRICO dos preços (o número é sagrado — mas a formatação segue a regra 3: "28", "R$28", "28 reais" e "28,00" viram todos "R$ 28,00"), o NOME DO ESTABELECIMENTO (linha 2 — é marca, mantenha a grafia original mesmo que pareça "errada") e a lista de itens — não invente, não omita e não funda itens diferentes. Se um nome for ambíguo demais para corrigir com segurança, mantenha o original e liste a dúvida DEPOIS de todos os blocos — nunca dentro das tabelas.
8. Não escreva comentários entre os blocos; apenas os blocos, um após o outro.

EXEMPLO DE ENTRADA (bagunçada, 3 estabelecimentos juntos):

KAKA LANCHES
X SALADA 22,00
Bife,salada,mussarela
XTUDO em 2paes 58,00 serve 2 pessoa
Bife,salada,mussarela, presunto, ovo,bacon, frango, lombo
CHEDDAR ESPECIAL 28,00
COM BATATA

AÇAÍ FRESH
creme de açaí com complementos do seu jeito 220ml -R$20
creme de açaí com complementos do seu jeito 330ml -R$28
creme de açaí com complementos do seu jeito 550ml -R$37

ESPETINHOS DO MANINHO
Boi, porco, coração, medalhão, linguiça defumada, linguiça de porco caseira - 16,00

EXEMPLO DE SAÍDA ESPERADA:

LANCHES
KAKA LANCHES

| CATEGORIA | ITEM | VALOR | DESCRIÇÃO |
| --- | --- | --- | --- |
| LANCHES | X Salada | R$ 22,00 | Bife, salada e mussarela |
| LANCHES | X Tudo em 2 Pães | R$ 58,00 | Bife, salada, mussarela, presunto, ovo, bacon, frango e lombo. Serve 2 pessoas |
| CHEDDAR | Cheddar Especial | R$ 28,00 | Acompanha batata |

AÇAÍ
AÇAÍ FRESH

| CATEGORIA | ITEM | VALOR | DESCRIÇÃO |
| --- | --- | --- | --- |
| AÇAÍ | Creme de Açaí | 220ml - R$ 20,00 / 330ml - R$ 28,00 / 550ml - R$ 37,00 | Com complementos do seu jeito |

ESPETOS
ESPETINHOS DO MANINHO

| CATEGORIA | ITEM | VALOR | DESCRIÇÃO |
| --- | --- | --- | --- |
| ESPETINHOS | Espetinho | R$ 16,00 | Sabores: boi, porco, coração, medalhão, linguiça defumada ou linguiça de porco caseira |

OUTRO EXEMPLO — drinks com tamanho P/G (uma linha só, valor composto):

DRINKS
BARRACA DO ZÉ

| CATEGORIA | ITEM | VALOR | DESCRIÇÃO |
| --- | --- | --- | --- |
| BATIDAS | Alexander | P - R$ 45,00 / G - R$ 50,00 | Sonho de Valsa, champagne, leite condensado e gelo |
| CAIPIRINHAS | Caipirinha | P - R$ 40,00 / G - R$ 45,00 | Sabores: limão, maracujá ou morango. Cachaça, açúcar, gelo e fruta |

Confirme que entendeu as regras e aguarde o envio dos cardápios.`;

// ─── Prompt 2 — variante DETALHADA (teste A/B, 26/08/2026) ───────────────────
// Derivada do Prompt 1 por substituição nas âncoras abaixo. Diferenças:
//   1. Variações do mesmo item com preços diferentes NÃO se agrupam — uma
//      linha por variação: nome base limpo no ITEM, variação na DESCRIÇÃO
//      (renderiza como "Pão de Queijo … R$ 30,00 / Com costela" embaixo).
//   2. Nomes regionais/estilizados ("Café coando") não são "corrigidos".
// O Prompt 1 (condensado) segue melhor para o A3 com todos os restaurantes.
// promptCardapioIA.test.ts garante que as âncoras continuam existindo.

const ANCORA_REGRA_5 =
  '5. Itens com o mesmo preço que mudam só o sabor: UMA linha, com "Sabores: ..." na descrição.';

const ADENDO_REGRA_5 =
  ' Mas atenção: variações do MESMO item com PREÇOS DIFERENTES (ex: recheios que mudam o preço) NÃO se agrupam numa linha só — mantenha UMA linha por variação, repetindo o nome base LIMPO na coluna ITEM e colocando a variação na DESCRIÇÃO. Ex: "Pão de Queijo" | R$ 20,00 | Com goiabada; "Pão de Queijo" | R$ 30,00 | Com costela. NUNCA incorpore a variação ao nome do item ("Pão de Queijo com Costela" é ERRADO) e NUNCA funda preços diferentes numa linha só.';

const ANCORA_REGRA_6 =
  'O texto final deve estar em português correto e profissional, pronto para impressão.';

const ADENDO_REGRA_6 =
  ' EXCEÇÃO: NÃO "corrija" nomes propositalmente regionais, dialetais ou estilizados ("Café coando", "Ocê tá bão", "Uai") — grafia de marca é voz da casa; na dúvida, mantenha o original e liste a dúvida DEPOIS de todos os blocos.';

export const PROMPT_CARDAPIO_IA_V2 = PROMPT_CARDAPIO_IA
  .replace(ANCORA_REGRA_5, ANCORA_REGRA_5 + ADENDO_REGRA_5)
  .replace(ANCORA_REGRA_6, ANCORA_REGRA_6 + ADENDO_REGRA_6);
