# 64 — Deliberação Q-021: o que compõe o custo do estande (e o que fica na verba fechada)

> **Data:** 02/08/2026
> **Autor:** decisão como DONO da organizadora (não como técnico)
> **Responde:** Q-021 (rateio sempre por quantidade? verba fechada entra como?),
> conversa com RF-032/033/034 (composto + rateio + custo base) e RF-040 (break-even).
> **Fora de escopo:** receita/venda (RF-009). Aqui só falamos de CUSTO para precificar.

---

## 1. A decisão em uma frase

**O custo do estande = custos DIRETOS (as peças daquele estande) + INDIRETOS
MEDÍVEIS (que têm uma quantidade que o estande consome: piso, energia, m² de
área). VERBA FECHADA que não tem quantidade natural NÃO entra no custo do estande —
fica como custo geral do evento e é recuperada pela margem/break-even (RF-040).**

Ou seja: o número que eu mostro ao cliente ("seu estande custa R$ X") é honesto,
explicável item a item, e *conservador por baixo* — mas o evento inteiro só fecha
no azul porque o break-even do RF-040 já cobre a verba fechada por cima. São duas
contas que se conversam, não uma só.

---

## 2. Por que NÃO jogar tudo rateado no estande

A tentação de "não deixar nada de fora" é ratear frete, ART, gerador e cachê em
cada estande. Isso quebra três coisas que eu, como dono, não posso perder:

1. **Transparência na negociação.** Se o expositor pergunta "por que R$ 9.000?",
   eu preciso responder "tenda R$ 2.400, piso 25 m² R$ 600, mesa+4 cadeiras
   R$ 300..." — coisas que ele VÊ no estande. No dia em que a resposta for
   "...mais R$ 380 do cachê do Gusttavo Lima", perdi a venda e a credibilidade.
   O cliente do estande não comprou o show.

2. **Simplicidade para o gestor leigo (RNF-004).** Ratear cachê por estande exige
   escolher um critério arbitrário (por m²? por faturamento esperado? por
   estande?). Cada critério dá um número diferente e nenhum é "certo". O preço do
   estande vira loteria e o gestor não sabe defender de onde veio.

3. **O número fica instável.** Verba fechada é grande e indivisível. Se eu tinha
   20 estandes e caio para 15, o rateio do gerador por estande sobe 33% — e o
   preço "de tabela" do mesmo estande muda no meio da feira. Custo de peça é
   estável; custo de verba fechada rateada balança com o denominador.

---

## 3. Por que NÃO ignorar a verba fechada (o outro erro)

Se a verba fechada some do cálculo, eu precifico o estande só pela peça, aplico
markup em cima e ACHO que tenho margem — mas o cachê, o gerador e a ART continuam
existindo e vão sair do meu lucro. É exatamente o "azul para o vermelho" do rel. 29
(erro clássico 7.1: os custos "sem dono" somam 15–25% do orçamento).

A verba fechada **não é ignorada** — ela é responsabilidade do **break-even do
evento (RF-040)**, não do preço unitário do estande. É lá que ela tem de aparecer,
inteira, como custo fixo do evento a ser diluído no conjunto da receita.

---

## 4. A régua prática: as 3 gavetas de todo custo (usa RF-051)

Todo item, ao ser lançado, cai em UMA destas gavetas. É a mesma lógica das 7 faces
do RF-051 (Embutido / À parte / N/A), agora aplicada à precificação:

| Gaveta | Critério (a pergunta que o sistema faz) | Onde entra | Exemplo |
|---|---|---|---|
| **A. Direto** | "É uma peça deste estande específico?" | Custo do estande, 100% | tenda 5×5, mesa, 4 cadeiras, testeira, iluminação |
| **B. Indireto MEDÍVEL** | "Tem uma quantidade que EU CONSIGO dizer quanto este estande consome?" | Custo do estande, **rateado pela quantidade** (RF-033) | piso (25 de 1.000 m² = 2,5%), energia (kVA do estande / kVA total), área de solo (m²) |
| **C. Verba fechada / geral** | "Beneficia o evento todo e NÃO tem quantidade natural por estande?" | **Fora** do custo do estande → custo geral do evento → break-even RF-040 | frete da carreta, ART geral das estruturas, cachê do show, gerador principal, seguro do evento, ECAD, alvará |

**Regra de ouro do rateio (resposta direta à Q-021):** rateio **automático só
existe na gaveta B**, e é sempre proporcional à **quantidade medível** (m², kVA,
unidades). Se o item não tem uma quantidade natural que o estande consome, ele
**não é rateado** — vai para a gaveta C. Não inventamos critério de rateio para
verba fechada. Isso responde "itens sem quantidade comum entram no rateio como?":
**não entram no rateio do composto; entram no break-even do evento.**

> Nuance honesta sobre os exemplos da pergunta:
> - **Frete da carreta que serve 20 stands + bar:** é gaveta C por padrão (verba
>   fechada, não tem "quantidade de frete por estande"). Mas se o gestor QUISER,
>   pode marcar como B e ratear pelo nº de estruturas atendidas (21) — é uma
>   escolha manual, opt-in, nunca automática. O RF-052 (frete incluso?) já obriga
>   a decidir isso na cotação.
> - **ART:** cobre todas as estruturas → gaveta C (custo geral). Não pulveriza.
> - **Gerador e cachê:** gaveta C sempre. Beneficiam o evento inteiro.

---

## 5. Como isso conversa com o RF-040 (break-even)

As duas contas se encaixam assim, e é isso que fecha o evento no azul:

```
CONTA 1 — preço de tabela do estande (o que eu mostro ao cliente):
    custo do estande = Gaveta A + Gaveta B
    preço sugerido   = custo do estande × markup     ← negociável, transparente

CONTA 2 — sanidade do evento (o que me protege do vermelho, RF-040):
    custo geral (Gaveta C: frete + ART + gerador + cachê + seguro + taxas)
    break-even em estandes = custo geral do evento ÷ margem média por estande
    → "preciso vender no mínimo N estandes (ou mix estande+ingresso+patrocínio)
       para a verba fechada se pagar"
```

O markup da Conta 1 **precisa ser calibrado** para que a soma das margens de todos
os estandes (+ ingressos + patrocínio) cubra a Conta 2. Se o break-even do RF-040
disser "preciso de margem total de R$ 300 mil e meu mix só gera R$ 220 mil", eu
**subo o markup** — não empurro a verba fechada para dentro do custo unitário. O
custo unitário continua honesto; quem carrega a verba fechada é a margem, de forma
transparente e sob meu controle.

---

## 6. Exemplo numérico — estande 5×5 (25 m²)

Cenário: evento com 20 estandes + 1 bar; 1.000 m² de piso no total;
gerador principal, cachê do show e ART cobrindo tudo.

**Gaveta A — direto (peças do estande):**

| Item | Fornecedor | Valor |
|---|---|---|
| Tenda 5×5 | A | R$ 2.400 |
| Mesa + 4 cadeiras | B | R$ 300 |
| Testeira metalon + prog. visual | C | R$ 900 |
| Iluminação central + testeira | D | R$ 500 |
| **Subtotal direto** | | **R$ 4.100** |

**Gaveta B — indireto medível (rateado por quantidade — RF-033):**

| Item | Base | Conta | Valor |
|---|---|---|---|
| Piso | 25 m² de 1.000 m² = **2,5%** de R$ 30.000 | 0,025 × 30.000 | R$ 750 |
| Energia | 2 kVA de 200 kVA úteis = **1%** de R$ 40.000 (locação seca do painel/distribuição) | 0,01 × 40.000 | R$ 400 |
| **Subtotal indireto medível** | | | **R$ 1.150** |

> **CUSTO DO ESTANDE (o que mostro ao cliente) = 4.100 + 1.150 = R$ 5.250.**
> Explicável linha a linha. É o RF-034 entregue.

**Gaveta C — verba fechada (NÃO entra no estande; vai ao break-even RF-040):**

| Item | Valor | Por que fora do estande |
|---|---|---|
| Frete carreta de tendas (20 stands + bar) | R$ 6.000 | sem quantidade natural por estande |
| ART geral das estruturas | R$ 3.500 | cobre tudo, indivisível |
| Gerador principal + combustível | R$ 18.000 | beneficia o evento inteiro |
| Cachê do show | R$ 120.000 | ninguém compra estande pelo show |
| Seguro + alvará + ECAD | R$ 22.500 | custo geral |
| **Verba fechada total** | **R$ 170.000** | → break-even RF-040 |

**Fechando as duas contas:**

- Preço de tabela do estande: R$ 5.250 × markup 2,0 = **R$ 10.500**
  (margem bruta de R$ 5.250 por estande).
- Break-even da verba fechada (RF-040): R$ 170.000 ÷ R$ 5.250 de margem/estande
  = **~33 estandes-equivalentes**. Como só tenho 20 estandes, **os estandes
  sozinhos NÃO pagam a verba fechada** — e é isso que o número me avisa a tempo:
  o show e o gerador têm de ser cobertos por **ingressos + patrocínio**, ou eu
  **subo o markup / repenso o cachê**. Sem essa conta, eu venderia estande a
  R$ 10.500 achando que estou no azul e descobriria o buraco na semana do evento.

---

## 7. Resumo da decisão (para o log)

1. **Custo do estande = Direto + Indireto medível rateado por quantidade.** Só
   isso vira o "custo base para precificar" (RF-034) e o preço de tabela.
2. **Rateio automático só na gaveta B, sempre por quantidade** (m², kVA, unidade).
   Verba fechada **não é rateada por default** (resposta à Q-021).
3. **Verba fechada (frete, ART, gerador, cachê, seguro, taxas) = custo geral do
   evento**, recuperada pela margem via **break-even do RF-040**, não empurrada
   para o preço unitário.
4. **Escape hatch manual:** o gestor pode, item a item, promover uma verba para
   rateio (ex.: frete por nº de estruturas), mas é **opt-in e visível**, nunca
   automático — casa com o RF-052 (checklist de exclusões: frete incluso?).
5. **As duas contas se calibram pelo markup:** o custo unitário fica honesto e
   defensável; a verba fechada é carregada pela margem, sob controle do dono.

> **Impacto nos requisitos:** confirma RF-033 (rateio por quantidade) como regra
> da gaveta B; confirma RF-034 (custo base = A+B); dá a semântica de "custos
> indiretos" do RF-040 (= gaveta C, não gaveta B). Sugere um **atributo por item
> de custo: `alocacao ∈ {direto, indireto_rateavel, verba_fechada}`** — herda a
> lógica das 7 faces do RF-051. Q-021 pode ser marcada como respondida.
