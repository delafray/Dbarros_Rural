# 67 — Arbitragem Q-021 (adversarial): rateio de verba fechada — A × B × síntese

**Data:** 02/08/2026
**Papel:** árbitro técnico-adversarial. Duas deliberações divergiram (63 "matemática" e
64 "dono/precificação"). Este documento testa as duas com números concretos e decide.
**Amarra:** RF-032/033/034 (composto + rateio + custo base), RF-040 (break-even),
RF-051 (7 faces), RF-052 (all-in / frete incluso?), RNF-004/013 (leigo, 15 min).

---

## 0. As duas posições, sem caricatura

- **A (63):** campo `driver_rateio ∈ {quantidade, valor, percentual, direto}` por item, com
  DEFAULT automático. Frete e ART amarrados a uma categoria estrutural → default `valor` →
  **entram no custo do estande** sem o gestor fazer nada. Cachê/taxas → `direto` (evento).
- **B (64):** três gavetas `{direto, indireto_rateável, verba_fechada}`. Rateio automático só
  na gaveta B (quantidade medível: m², kVA, unidade). Frete, ART, gerador, cachê →
  gaveta C (custo geral do evento), **fora do estande**, cobertos pela margem/break-even
  (RF-040). Promover verba para rateio é **opt-in manual**, nunca default.

O núcleo da briga é UMA célula: **frete e ART, por default, entram ou não no preço do
estande?** A diz SIM (via driver `valor`); B diz NÃO (gaveta C).

---

## 1. Cenário — frete de R$ 8.000 (carreta traz tendas de 20 stands + bar)

**Modelo A (default `valor`, base = valor de tenda por composto).** Suponha cada stand com
R$ 2.400 de tenda e o bar com R$ 4.800. Base total = 20×2.400 + 4.800 = 52.800.
Frete por stand = 8.000 × (2.400/52.800) = **R$ 363,64**. Bar puxa R$ 727,27. Fecha exato.

**Modelo B (gaveta C).** Frete = R$ 8.000 no custo geral do evento; preço do stand não muda;
break-even absorve.

**O choque — 5 stands não vendem.** O frete de R$ 8.000 foi **contratado** (a carreta já
rodou): é custo afundado, não cai porque o stand não vendeu.
- **A, se o preço já foi fechado com quem comprou:** os 15 vendidos pagaram R$ 363,64 cada =
  R$ 5.454; **faltam R$ 2.545** de frete dos 5 encalhados — que A tinha jogado no custo
  unitário e agora ninguém cobre. O preço de tabela **subestimou** o frete real por stand
  vendido. Se A recalcula o rateio sobre 15 (denominador menor), o preço de tabela **sobe
  33% no meio da feira** — exatamente o vício que B denuncia (64 §2.3): verba fechada rateada
  balança com o denominador.
- **B:** o frete estava no break-even do evento. 5 stands a menos = menos margem para cobrir
  o mesmo R$ 8.000 → o break-even **avisa** que faltou cobertura, mas o **preço de tabela do
  stand não mexeu** e ninguém renegocia com quem já comprou.

**Veredito do cenário 1: B.** Verba fechada indivisível + denominador instável = o rateio
automático de A produz um preço que ou fica furado (subcobre) ou oscila (recobre). B mantém
o preço estável e transfere a instabilidade para onde ela é gerenciável (o break-even).

---

## 2. Cenário — ART de R$ 3.000 sobre TODAS as estruturas

**A (default `valor`, base = valor estrutural por composto):** pulveriza R$ 3.000 em 21
estruturas proporcional ao valor estrutural. Stand médio leva ~R$ 130.
**B (gaveta C):** R$ 3.000 no custo geral; break-even.

Aqui A é *matematicamente* defensável (a ART é da estrutura). Mas RF-004 diz que a ART é
**um item cotável com fornecedor** (engenheiro), valor único e indivisível por natureza
jurídica — é UMA ART do evento, não "ART por stand". Ratear R$ 130 de ART em cada stand não
descreve nada que o expositor reconheça, e some/reaparece conforme entram/saem estruturas
(mesmo problema do §1). **Veredito do cenário 2: B**, com a mesma lógica do frete.

---

## 3. Cenário — o gestor leigo consegue EXPLICAR o preço ao expositor?

Pergunta do expositor: *"por que meu stand custa R$ X?"*

- **B:** "Tenda R$ 2.400, piso 25 m² R$ 600, mesa+4 cadeiras R$ 300, testeira R$ 900,
  iluminação R$ 500, energia R$ 400." **Tudo coisa que ele VÊ no stand.** Frete/ART/cachê
  não aparecem na fatura dele — estão na margem. Resposta 100% defensável (64 §2.1).
- **A:** a mesma lista **+ R$ 363 de frete + R$ 130 de ART**. Ainda explicável ("é o frete
  da tenda"), mas abre a porta para "e por que EU pago o frete se o vizinho trouxe na mesma
  carreta?" e, no limite do driver `valor` degenerado, para o cachê do show entrar no rateio.
  A defesa fica mais frágil e depende de o gestor entender o driver.

**Veredito do cenário 3: B.** A explicabilidade é o critério que B foi desenhado para ganhar
e ganha. RNF-004 (leigo) pesa a favor de "o preço só contém o que o cliente vê".

---

## 4. Cenário — consistência com RF-052 (frete às vezes embutido, às vezes linha à parte)

RF-052: o frete pode estar **embutido no preço do fornecedor** (tenda "posta no local") ou ser
**linha à parte** (carreta contratada separada).

- **Frete embutido:** em AMBOS os modelos já está dentro do valor da tenda (gaveta A / driver
  `quantidade`) → entra no custo do stand automaticamente. **Empate — os dois tratam igual.**
- **Frete à parte:** é aqui que divergem. **A** o puxa de volta para dentro do stand via
  driver `valor` (default) → resultado **quase igual** ao frete embutido, mas com a
  instabilidade do §1. **B** o manda para gaveta C → resultado **diferente** do frete
  embutido (não entra no preço unitário).

**Análise fria:** A tem uma vantagem real aqui — trata frete-embutido e frete-à-parte de forma
*simétrica* (nos dois casos o frete pesa no stand), evitando que a mera forma de contratação
mude o custo do stand. B introduz uma **assimetria**: o mesmo frete econômico entra no preço
se o fornecedor o embutiu, e sai do preço se foi cotado à parte. Isso é um ponto **contra B**
e a favor de A. É o único cenário onde A vence limpo.

**Veredito do cenário 4: A** (por simetria), mas ver a síntese — dá para ter a simetria sem
importar a instabilidade.

---

## 5. Cenário — qual quebra menos quando o evento muda no meio (add/remove composto)?

Já contratado o frete/ART, o gestor adiciona 3 stands ou remove o bar.

- **A (`valor`):** todo add/remove **muda o denominador** → **recomputa o preço de tabela de
  TODOS os stands**. Quem já comprou tem preço "de tabela" diferente do vizinho novo. Frágil.
- **B (gaveta C):** add/remove de composto **não toca** no frete/ART (estão no evento). O
  preço de tabela de cada stand é função só das SUAS peças + quantidades medíveis — estável.
  Só o break-even se recalcula (e é onde a mudança DEVE aparecer).

**Veredito do cenário 5: B, com folga.** É o argumento mais forte de todos: o preço unitário
não pode depender de quantos vizinhos existem. B isola a volatilidade no lugar certo.

---

## 6. Placar

| Cenário | Vence | Motivo dominante |
|---|---|---|
| 1. Frete R$ 8k, 5 stands encalham | **B** | verba indivisível + denominador instável |
| 2. ART R$ 3k | **B** | item único cotável; pulverizar não descreve nada real |
| 3. Explicar ao expositor | **B** | preço só com o que o cliente vê (RNF-004) |
| 4. RF-052 embutido × à parte | **A** | simetria: forma de contratar não deveria mudar custo |
| 5. Evento muda no meio | **B** | preço unitário não pode depender do nº de vizinhos |

**4 × 1 para B.** Mas o único ponto de A (cenário 4, simetria do frete) é **legítimo e não
coberto por B puro**. A síntese existe justamente para dar a B a simetria de A sem herdar a
instabilidade que reprovou A nos cenários 1/2/5.

---

## 7. VEREDITO: síntese com espinha dorsal B

Adoto **B como default de produção** (três gavetas, verba fechada não rateada por default,
coberta pelo break-even RF-040), **incorporando de A**: (i) o campo por item existe e é
persistido; (ii) o driver `valor` fica disponível como **promoção opt-in** (o escape que B já
previa), e (iii) o **gerador vira exceção nomeada** — quando o RF-022 fornece kVA por composto,
ele é gaveta B por `quantidade`/kVA, não gaveta C. Rejeito de A **apenas** o default que joga
frete/ART no preço automaticamente; mantenho de A a mecânica (o `driver_rateio` é o motor que
implementa as três gavetas — B descreve a política, A descreve a engenharia).

Sobre a assimetria do cenário 4: resolvida **no alerta, não no rateio**. Quando um frete é
cotado À PARTE e cai em gaveta C, o sistema **sinaliza** "este frete NÃO está no preço do
stand — está no break-even" (usa o gatilho do RF-052). O gestor decide com informação; o
default não mente nem oscila. Simetria de *visibilidade*, não de rateio automático.

### Regra final (default único)

> Todo item de custo tem `alocacao ∈ {direto, indireto_rateável, verba_fechada}`, default
> automático: tem quantidade que o composto consome (m²/kVA/unid) → **indireto_rateável**
> (rateio por quantidade, RF-033, entra no custo do estande); é peça do estande →
> **direto**; senão (frete/ART/gerador/cachê/seguro/taxas) → **verba_fechada**, que NÃO entra
> no custo do estande e vai ao break-even do evento (RF-040). Custo do estande (RF-034) =
> direto + indireto_rateável, e SÓ isso. Exceção nomeada: gerador com kVA por composto
> (RF-022) → indireto_rateável. Escape opt-in e visível: promover uma verba_fechada a rateio
> por `valor`/`percentual`, sempre sinalizado (RF-052). Invariante testável (RNF-014):
> Σ(parcelas dos compostos) + Σ(verba_fechada) = Σ(todos os itens) — nenhum centavo some nem
> conta em dobro; frete à parte que fica em verba_fechada dispara aviso "fora do preço do
> stand".
