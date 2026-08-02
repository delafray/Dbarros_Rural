# 63 — Deliberação Q-021: como ratear VERBA FECHADA (itens sem quantidade comum)

**Data:** 2026-08-02
**Escopo:** decisão de regra de rateio para itens de custo cujo valor NÃO acompanha uma
quantidade rateável por composto (frete/mobilização, ART, cachê de show, gerador).
**Amarra com:** RF-032 (compostos), RF-033 (rateio por quantidade), RF-034 (custo base
do composto p/ precificar), RF-051 (7 faces — logística/mobilização é face de cada item),
RF-040/RF-029 (rateio de indiretos p/ precificação), RNF-004/RNF-013 (leigo, simples).

---

## 1. O problema em uma frase

O rateio "normal" do RF-033 funciona porque existe **quantidade comum**: 1.000 m² de piso
somados dos compostos → cada composto leva sua fração pela quantidade que consumiu
(bar 100 m² = 10%). A **verba fechada** quebra isso: é um valor único que beneficia vários
compostos sem uma quantidade natural que os separe. Uma carreta de frete não tem "m²";
uma ART não tem "unidade por estande"; um cachê não pertence a estande nenhum.

Matematicamente: no RF-033 o rateio é `peso_i = q_i / Σq`. Na verba fechada **não existe
`q_i`** — precisamos escolher um **driver de rateio** (a base que substitui a quantidade).

---

## 2. Avaliação das opções

### (a) Rateio proporcional ao VALOR dos itens relacionados de cada composto
`peso_i = valor_relacionado_i / Σ valor_relacionado`.
- **A favor:** matematicamente honesto e AUTOMÁTICO. Frete de tenda que serve 20 stands +
  bar: o custo da tenda em cada composto já é conhecido (veio do rateio por quantidade do
  RF-033), então ratear o frete na proporção do **valor de tenda de cada composto** é exato —
  quem tem mais tenda paga mais frete. É o comportamento que a intuição espera. Zero decisão
  do gestor.
- **Contra:** exige definir "itens relacionados" (o frete é da CATEGORIA tenda → base = valor
  de tenda por composto). Se relacionado a nada específico (cachê, que beneficia o evento
  todo), "valor relacionado" degenera para "valor total do composto", o que é arbitrário
  (por que o estande caro subsidia o show?).
- **Veredito:** ótima para mobilização/frete/ART ligados a UMA categoria; ruim para custo
  que beneficia o evento inteiro.

### (b) Rateio manual por % definido pelo gestor
- **A favor:** máxima flexibilidade; cobre exceções que nenhuma fórmula prevê.
- **Contra:** viola RNF-004 (leigo, "sem fórmula do usuário") e RNF-013 (15 min). Pedir % a
  cada verba fechada é exatamente a fricção que o sistema promete eliminar. Some ≠ 100% vira
  fonte de erro silencioso.
- **Veredito:** necessário como ESCAPE, jamais como default.

### (c) NÃO ratear — verba fechada é custo direto do evento/categoria, fora dos compostos
- **A favor:** simplíssimo e sem arbitrariedade. Correto de verdade para custo que **não
  pertence** a composto nenhum (cachê do show, taxa de bombeiros, seguro do evento).
- **Contra:** **fura o RF-034**. Se o frete e a ART da estrutura ficam "fora", o custo do
  estande fica SUBESTIMADO e o gestor precifica a venda barato demais — o "barato sem frete
  sai caro" (rel. 53) reaparece dentro do próprio sistema. Para custo estrutural, não ratear
  é desonesto com o preço.
- **Veredito:** correto para o que beneficia o evento; perigoso para o que é da estrutura.

### (d) Driver configurável por item com default inteligente
Cada item de custo carrega um campo `driver_rateio` ∈ {quantidade, valor, percentual, direto}.
O sistema **escolhe o default sozinho** a partir da natureza do item (categoria/face) e o
gestor só troca se quiser.
- **A favor:** unifica (a)(b)(c) num só mecanismo. A complexidade fica no backend (RF-042
  "modular, simples — complexidade no backend"); o leigo vê um custo por composto que fecha.
  Cada caso difícil vira "só um driver diferente", não uma regra nova. Casa com RF-051: a face
  5 (logística/mobilização) já existe por item, então "como rateio essa face" é a pergunta
  natural.
- **Contra:** é o mais trabalhoso de implementar e o mais fácil de testar errado — exige
  cobertura de teste forte (RNF-014, ~90%). Precisa de UI que NUNCA obrigue a escolher.
- **Veredito:** é a arquitetura certa. As outras três não são rivais — são os **valores**
  que esse único campo assume.

---

## 3. DECISÃO

**Adotar (d): driver de rateio configurável por item, com default inteligente por natureza
do item.** As opções (a), (b) e (c) NÃO são alternativas concorrentes — são os quatro valores
que o campo `driver_rateio` pode assumir:

| Driver | O que faz | É a opção |
|---|---|---|
| `quantidade` | rateio do RF-033 (`q_i/Σq`) | (padrão dos itens normais) |
| `valor` | `valor_relacionado_i / Σ valor_relacionado` | (a) |
| `percentual` | % fixos digitados pelo gestor | (b) |
| `direto` | não rateia; custo direto do evento/categoria | (c) |

**DEFAULT (o que acontece se o gestor não decide nada):**

1. Item **tem quantidade por composto** → `quantidade` (RF-033, o caso comum).
2. Item **é verba fechada ligada a UMA categoria/estrutura** (frete/mobilização, ART) →
   `valor`, base = valor daquela categoria em cada composto. **Cai automaticamente dentro do
   custo do estande (RF-034), sem o gestor fazer nada.**
3. Item **é verba fechada que beneficia o evento inteiro** (cachê, taxa de órgão, seguro) →
   `direto`. Fica no custo do evento, **fora** dos compostos — não polui o preço do estande.

Regra de ouro do default: **na dúvida entre `valor` e `direto`, decide a AMARRA do item.**
Se o item aponta para uma categoria que existe nos compostos → `valor` (é estrutural, tem de
entrar no preço). Se não aponta para nenhuma → `direto`.

---

## 4. Os quatro casos-teste

| Caso | Natureza | Driver default | Por quê |
|---|---|---|---|
| **Frete da tenda** (1 carreta serve 20 stands + bar) | verba fechada, ligada à categoria TENDA | `valor` (base = valor de tenda por composto) | quem tem mais tenda montada puxa mais frete; entra no custo do estande — honesto p/ RF-034 |
| **ART do engenheiro** (1 ART cobre todas as estruturas) | verba fechada, ligada às categorias ESTRUTURAIS | `valor` (base = valor estrutural por composto) | é custo da estrutura; tem de pesar no preço do estande. É item cotável simples (RF-004/029) |
| **Cachê do show** | beneficia o evento inteiro | `direto` (custo do evento) | não pertence a composto; ratear no estande subsidiaria o show sem lógica |
| **Gerador** (alimenta tudo) | verba fechada COM driver físico real | `valor` OU, se houver carga por composto, `quantidade` por **kVA** | quando o RF-022 dá o kVA por composto, o gerador rateia por kVA (quantidade real!); sem isso, cai em `valor` |

**Nuance do gerador:** é o caso que mostra por que (d) vence. O gerador **parece** verba
fechada, mas se o levantamento de carga (RF-022) atribui kVA a cada composto, ele volta a ter
quantidade comum e rateia por `quantidade` sobre kVA — o rateio mais justo. O driver
configurável captura isso sem regra especial: é só outra unidade de quantidade.

---

## 5. Regra em pseudocódigo (simples)

```
// ── Escolha do driver (só roda se o gestor não escolheu à mão) ──
função driver_default(item):
    se item.tem_quantidade_por_composto:          // ex.: piso m², kVA
        retorna "quantidade"
    senão se item.categoria_amarrada existe nos compostos:   // frete, ART
        retorna "valor"
    senão:                                          // cachê, taxa de órgão, seguro
        retorna "direto"

// ── Aplicação do rateio de UM item de verba fechada ao conjunto de compostos ──
função ratear(item, compostos):
    escolha item.driver:

      caso "quantidade":                            // RF-033
          total = Σ c.quantidade_do_item  para c em compostos
          para cada c: c.parcela += item.valor * (c.quantidade_do_item / total)

      caso "valor":                                 // opção (a)
          base(c) = valor de item.categoria_amarrada em c   // vem do RF-033 já rateado
          total = Σ base(c)
          se total == 0: cair para "direto"         // guarda: sem base, não inventa rateio
          para cada c: c.parcela += item.valor * (base(c) / total)

      caso "percentual":                            // opção (b) — escape manual
          exigir Σ percentuais == 100 (senão: alerta, não trava — RNF-002)
          para cada c: c.parcela += item.valor * (c.percentual / 100)

      caso "direto":                                // opção (c)
          evento.custo_direto += item.valor         // NÃO entra em composto nenhum

// ── Custo base do composto p/ precificar a venda (RF-034) ──
custo_composto(c) = Σ parcelas rateadas em c        // só o que é do composto
// custo_direto do evento aparece à parte no dashboard (RF-039/040), nunca diluído no estande
```

**Invariantes testáveis (RNF-014, ~90%):**
- Conservação: `Σ parcelas_de_todos_os_compostos + custo_direto == Σ valor_de_todos_os_itens`
  (nenhum centavo some nem é contado duas vezes — o pesadelo do RF-051).
- `valor` com base total 0 nunca divide por zero: degrada para `direto`.
- `percentual` que não soma 100 alerta mas não bloqueia a digitação (RNF-002/003).
- Trocar o driver de um item recomputa e a conservação continua valendo.

---

## 6. Por que isto respeita as duas lentes

- **Matemática:** cada driver é uma média ponderada honesta; a base do peso é sempre uma
  grandeza real (quantidade, valor já rateado, kVA) — nada de número mágico. A invariante de
  conservação garante que o total fecha e que nada é contado em dobro (RF-051).
- **Simplicidade:** o leigo **não escolhe nada** — o default acerta os quatro casos sozinho.
  O custo do estande sai honesto para precificar (RF-034) sem o gestor entender de rateio. A
  complexidade (4 drivers + guardas) fica 100% no backend, exatamente o que o RF-042/RNF-004
  pedem. O `percentual` manual existe só como válvula de escape para o caso raro que a
  natureza não previu.
