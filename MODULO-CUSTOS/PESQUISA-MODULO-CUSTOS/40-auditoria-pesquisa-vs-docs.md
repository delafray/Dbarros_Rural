# 40 — Auditoria: Pesquisa vs. Documentação (03-REQUISITOS + 05-CHECKLIST)

**Data:** 2026-08-01
**Auditor:** Claude Sonnet 4.6 via Claude Code
**Fontes analisadas:** 33 relatórios em `PESQUISA-MODULO-CUSTOS/` × `DOC-MODULO-CUSTOS/03-REQUISITOS.md` e `DOC-MODULO-CUSTOS/05-CHECKLIST-CRIACAO-EVENTO.md`

---

## METODOLOGIA

Para cada achado abaixo foi verificado:
1. O conteúdo está presente no relatório de pesquisa indicado?
2. Há linha correspondente no 03-REQUISITOS (RF/RNF) ou no 05-CHECKLIST?
3. Se não, o achado é relevante para um centro de custo de evento rural?

Somente achados sem correspondência na documentação foram listados.

---

## SEÇÃO 1 — ITENS DE CUSTO NÃO ABSORVIDOS PELO CHECKLIST-05

### Bloco 1.A — Do rel. 07 (taxonomia ~120 itens): categorias inteiras ausentes

**1-A-1 · Categoria ANIMAIS (cat. 4 do rel. 07) — sem entrada no checklist-05**

O rel. 07 detalha uma categoria completa de animais com sub-itens não contemplados:

| Item ausente | Unidade | Faixa de custo |
|---|---|---|
| Locação de touro de rodeio (extra, além do pacote) | animal × diária | R$ 200–800/animal/dia |
| Alimentação de bovinos (ração + capim) | animal × diária | R$ 15–40/animal/dia |
| Água para animais (frete de pipa se necessário) | m³ | R$ 5–15/m³ |
| Curral de recepção/quarentena | und | R$ 500–2.000 |
| Veterinário de viagem (acompanha tropa no transporte longo) | diária | R$ 400–1.200/diária |
| Ferragem + material veterinário emergência | kit | R$ 200–800 |
| Vermífugos e medicamentos preventivos | und | variável |

O checklist-05 menciona "animais" apenas para acionar providências legais (GTA, veterinário RT, defesa agropecuária). Não existe entrada para os CUSTOS OPERACIONAIS dos próprios animais (alimentação, curral, saúde durante o evento).

**1-A-2 · Transporte de animais (boiadeiro) — subsistema completo ausente**

O rel. 07 (seç. 4.2) documenta sistema de frete por tipo de caminhão com faixas reais:

| Veículo | Capacidade | Faixa de custo |
|---|---|---|
| Caminhão toco | ~16 bovinos | R$ 4–6/km |
| Caminhão truck | ~23 bovinos | R$ 5–8/km |
| Carreta simples | ~33 bovinos | R$ 7–12/km |
| Julieta (carreta dupla) | ~41 bovinos | R$ 10–16/km |
| Treminhão | ~80 bovinos | R$ 15–25/km |

Nota: boiadeiro cobra por km total (ida+volta da origem, não do destino). Nenhum desses itens ou essa lógica aparece na documentação.

**1-A-3 · Expositores agropecuários (cat. 10 do rel. 07) — parcialmente ausente**

O checklist-05 tem a pergunta "Área de expositores?" (linha única), mas não mapeia os custos derivados:

| Item ausente | Unidade | Faixa de custo |
|---|---|---|
| Montagem de baia de exposição bovino | und | R$ 200–800/baia |
| Pavilhão de máquinas/implementos | m² | R$ 30–80/m² |
| Palhada/serragem para baias | m³ | R$ 80–200/m³ |
| Limpeza de baias durante exposição | baia × dia | R$ 50–150/baia/dia |
| Análise de leite (laboratório — torneio leiteiro) | amostra | variável |
| Energia para estande expositor (ramal elétrico) | und | variável |

**1-A-4 · Categoria DIVULGAÇÃO E MARKETING (cat. 7 do rel. 07) — totalmente ausente**

O checklist-05 menciona "programação visual" (item no bloco 3) mas não cobre o conjunto de custo de divulgação e marketing:

| Item ausente | Unidade | Faixa de custo |
|---|---|---|
| Cartazes/banners impressos | m² | R$ 15–50/m² |
| Distribuição de panfletos | 1.000 und | R$ 80–200/1.000 |
| Anúncio rádio local | semana | R$ 200–1.500/semana |
| Anúncio TV local | inserção | R$ 500–5.000/inserção |
| Impulsionamento redes sociais | campanha | R$ 500–5.000 |
| Fotógrafo profissional | evento | R$ 800–4.000 |
| Filmagem e edição de vídeo | evento | R$ 1.000–8.000 |
| Produção de programação impressa (folder) | und | R$ 300–1.500 |

**1-A-5 · Pacote companhia de rodeio — item de alto valor sem entrada**

O rel. 07 (seç. 4.1 e notas do desenvolvedor) documenta que a maioria dos eventos contrata uma **companhia de rodeio em pacote único** (arena + touros + cavalos + equipe + premiação), com valores reais:

- R$ 30.000–200.000/evento (médio a grande)
- Inclui: arena completa, ~40 touros aptos, cavalos de crina, diretor, 2 juízes, 3 salva-vidas a pé, 2 a cavalo, 2 porteiros, locutor oficial e comentarista, premiação, fivelas, camisetas, seguro dos profissionais

O checklist-05 não tem uma entrada "Contratará companhia de rodeio? → pacote único × itens individuais" — essa bifurcação é fundamental para o modelo de dados (RF-002/003).

---

### Bloco 1.B — Do rel. 25 (36 itens de limpeza): a maioria ausente

O rel. 25 lista 36 itens de custo de limpeza categorizados (seç. 8). O checklist-05 tem uma única linha: "Equipe de limpeza?" sem nenhum desdobramento de custo.

**Itens relevantes do rel. 25 não cobertos:**

| # no rel. | Item ausente | Unidade | Faixa ref. |
|---|---|---|---|
| 4 | Auxiliar limpeza de curral/baia (c/ adicional insalubridade) | profissional × dia | CLT + 20% de insalubridade |
| 6–8 | Adicionais de insalubridade (banheiro 40%, curral 20%) e de domingo (100%) | profissional × dia | % sobre SM |
| 22 | Manutenção de banheiro químico (visita técnica) | visita × unidade | R$ 80–150/visita |
| 24 | Caçamba de resíduos 6–8 m³ | und × evento | R$ 800–1.400 |
| 26 | Caminhão compactador (passagem noturna) | passagem | R$ 800–2.000/coleta |
| 27 | Contêiner de coleta seletiva 240L | und × evento | PNRS obrigatória |
| 28–29 | Lavadora de alta pressão / soprador industrial | dia | R$ 150–300/dia |
| 33 | Limpeza pós-evento (serviço completo separado) | evento | R$ 1.500–8.000 |
| 34 | Destinação resíduos orgânicos (esterco animal) | tonelada | exige manifesto |
| 35–36 | Cooperativa de catadores / manifesto de transporte | evento/documento | obrigatório em RS e DF |

**Números importantes do rel. 25 não referenciados:**
- Empresa terceirizada custa R$ 180–350/auxiliar/dia (inclui encargos) — muito acima da diária CLT pura
- Dimensionamento: 1 auxiliar por 150–250 pessoas (área aberta + banheiros + praça alimentação combinados)
- Limpeza representa 3–5% do orçamento total do evento (referência para estimativa automática)
- 0,5 kg de resíduo por pessoa/dia em evento rural com alimentação (0,8–1,2 kg com churrasco e bebidas em lata)

---

### Bloco 1.C — Do rel. 28 (38 itens de RH): maioria ausente

O rel. 28 lista 38 itens de custo de RH temporário (seç. 6). O checklist-05 menciona limpeza, segurança e manutenção como áreas genéricas, mas não mapeia os custos de RH.

**Itens e categorias ausentes:**

| Categoria | Itens ausentes no checklist | Faixa ref. |
|---|---|---|
| Alimentação da equipe | Marmita/quentinha, café da manhã, ceia pós-show, água para staff | R$ 18–30/refeição (interior) |
| Transporte da equipe | Frete ônibus 40-50 pax, micro-ônibus, van, vale-transporte staff local, custo/km | R$ 1.800–3.500/dia (ônibus) |
| Uniforme e identificação | Camiseta personalizada, colete identificador, crachá PVC/papel | R$ 70–150/kit completo |
| EPIs por função | EPI montador, EPI limpeza, EPI segurança, EPI garçom | R$ 30–200/pessoa |
| Infraestrutura de staff | Banheiro químico staff, tenda de descanso, armários temporários, rádio comunicador | R$ 800–2.000/evento (tenda) |
| Hospedagem de staff de fora | Pousada simples compartilhada, hospedagem coletiva improvisada | R$ 80–150/pessoa/noite |
| Encargos e adicionais | Adicional noturno (20–25%), hora extra (+50%), encargos CLT intermitente (+50–80%) | % sobre base |
| Gerador de apoio ao staff | Gerador exclusivo (iluminação, carregadores) | R$ 300–800/dia |

**Regra prática do rel. 28 não referenciada:** orçar mínimo 30–40% a mais sobre a diária base para cobrir encargos + alimentação + transporte + uniforme. Para evento rural/interior, adicionar obrigatoriamente hospedagem e frete (facilmente R$ 80–150/pessoa/dia extras).

---

### Bloco 1.D — Do rel. 26 (segurança): itens críticos ausentes

O rel. 26 lista 26 itens de custo de segurança (seç. 7). O checklist-05 tem "Segurança? Brigadistas?" (item genérico). Os seguintes custos não aparecem:

| Item ausente | Unidade | Ref. |
|---|---|---|
| Segurança patrimonial — fase de montagem (diurno/noturno) | diária/posto | R$ 12.500–18.000 para 17 dias (1 posto 24h) |
| Vigilante — curral/área de animais | diária/pessoa | Diurno + noturno; custo esquecido |
| Vigilante — ronda noturna interna (pós encerramento público) | diária/pessoa | Madrugada pós-show |
| Câmeras CFTV temporárias (aluguel) | und × evento | custo não coberto |
| Policiamento PM (taxa ou hora extra) | evento ou hora/PM | pode atingir R$ 60.000+ |
| Projeto de segurança (DPF) | evento | obrigatório para +3.000 pessoas (Lei 14.967/2024) |

**Achado crítico:** o checklist-05 não diferencia as FASES de segurança (montagem × evento × desmontagem). O rel. 26 (seç. 5) demonstra que segurança da montagem (7–21 dias antes) é custo real que organizadores frequentemente esquecem — equipamentos de palco, grades de arena e geradores ficam expostos 24h/dia sem público.

---

### Bloco 1.E — Do rel. 23 (operação de caixas): subsistema inteiro ausente

O checklist-05 menciona "Sistema de cobrança?" com uma descrição geral mas não mapeia os itens de custo da tesouraria e cobrança (rel. 23, seç. 8):

| Item ausente | Unidade | Faixa ref. |
|---|---|---|
| Container/guichê bilheteria — aluguel | und × evento | R$ 800–2.000 |
| Nobreak PDV (800–1.200VA) | und | R$ 600–1.200 (compra) |
| Gaveta de dinheiro automática | und | R$ 300–450 |
| Impressora térmica de fichas/comprovantes | und | R$ 400–800 |
| Fundo de troco por caixa | R$/caixa | R$ 200–1.000 |
| Taxa de adquirência sobre vendas | % s/ faturamento | 0,57–3,79% (PIX a crédito) |
| Fichas papel de segurança — impressão | 1.000 und | R$ 80–150 |
| Perdas estimadas (fichas não resgatadas) | % do emitido | 2–8% |
| Pulseiras RFID (cashless) | und | R$ 3–15/unidade |
| Cofre portátil | und | R$ 200–800 |
| Tesoureiro-chefe | evento | R$ 400–700 |
| Conferente de caixa | evento | R$ 200–350 |
| Seguro de valores do evento | % do valor segurado | variável |

---

### Bloco 1.F — Do rel. 30 (manutenção durante evento): custos sistematicamente esquecidos

O checklist-05 menciona "Equipe de manutenção de plantão?" com uma descrição parcial (rel. 30 não foi totalmente absorvido):

| Item ausente do checklist | Unidade | Faixa ref. |
|---|---|---|
| Areia de rodeio — reposição | kg/dia | R$ 0,80–1,20/kg |
| Trator/nivelamento da arena | hora | R$ 250–400/hora |
| Agregado/brita (preenchimento buracos) | ton | R$ 80–150/ton |
| Gás de cozinha (botijão) | botijão | R$ 110–150 |
| Gelo — reposição contínua | kg | R$ 12–15/kg |
| Gerador exclusivo para apoio ao staff | kVA/dia | R$ 300–800/dia |
| Kit de peças reserva | % do orçamento | ~7% do valor do equipamento |

**Dados do rel. 27 (ciclo operacional) sobre combustível de gerador não referenciados:**
- Consumo: 50–120 litros de diesel/hora para geradores de 250–500 kVA
- Evento de 8h noturnas = 400–960 litros/gerador
- Múltiplos geradores: >3.000 litros/noite de show
- **O custo de combustível nos dias de montagem e ensaio é frequentemente esquecido** — é calculado só para o dia do show

---

## SEÇÃO 2 — NÚMEROS E PROPORÇÕES ÚTEIS NÃO REFERENCIADOS NA DOC

### Dimensionamentos quantitativos do rel. 25 (limpeza):
- Produtividade por tipo de área (IN 05/2017 MPOG): áreas internas 800–1.200 m²/profissional; praça de alimentação 300–600 m²; baias 80–150 m²
- Referência de ratio: 1 auxiliar/150–250 pessoas (evento rural)
- 1 banheirista por 4–6 cabines químicas ou bloco até 150 m²
- Limpeza pós-evento custa 50–100% a mais de profissionais por 1–2 dias extras

### Escalas de evento do rel. 07:
- Pequeno (rodeio amador): R$ 34.000–100.000
- Médio (festa regional 3 dias): R$ 200.000–600.000
- Grande (exposição estadual 5+ dias): R$ 1 mi–5 mi
- Nacional (Barretos/Exponorte): R$ 11 mi–50 mi

### Taxas de adquirência do rel. 23:
- Ton PIX: 0%, débito: 0,57%, crédito à vista: 0,75%
- Cielo PIX: 0,99%, débito: 1,99%, crédito: 3,49%

### Distribuição do orçamento por fase (rel. 27):
| Fase | % do orçamento total |
|---|---|
| Pré-produção e montagem | 25–35% |
| Operação | 40–55% |
| Desmontagem e pós | 10–20% |
| Regulatório e financeiro | 5–10% |

### Precificação de estandes (rel. 29):
- Expointer 2026: R$ 83–490/m² dependendo do setor
- Feiras de porte médio: R$ 600–1.500/m² (locação do espaço)
- Agrishow 2025: R$ 2.340/m² para estande completo
- Location premium: +30–50% para corredor principal; +20–30% para esquina
- Margem mínima recomendada para eventos: 20–30% sobre custo total

### Seguros (rel. 07 — divergência com o checklist-05):
- O checklist-05 afirma "seguro de vida mínimo R$ 100 mil/profissional" (Lei 10.519)
- O rel. 07 (seç. 3) documenta que o mínimo atual praticado é **R$ 200.000/profissional** (o texto da lei original era R$ 100k mas a "prática atual" do mercado é R$ 200k)
- Atenção: verificar se a lei foi atualizada ou se é convenção de mercado

---

## SEÇÃO 3 — RECOMENDAÇÕES DOS RELATÓRIOS NÃO VIRADAS EM RF/RNF

### 3.A — Do rel. 10 (Previsto × Comprometido × Realizado): recomendações técnicas não absorvidas

O rel. 10 recomenda um conjunto específico de colunas e indicadores (seç. 6). Vários não têm correspondência nos requisitos:

| Recomendação do rel. 10 | Status na doc |
|---|---|
| **Orçado Revisado** como campo distinto do Orçado Original (aditivos aprovados vs. baseline imutável) | Parcialmente no RNF-010, mas sem distinção Revisado vs. Original |
| **Campo "Estimativa s/ contrato"** para itens orçados mas sem fornecedor ainda | Ausente como campo explícito |
| **Contingência como linha separada e visível** (10% default, com saldo disponível) | Ausente |
| **Status por item** com cores: orçado (cinza) → contratado (azul) → parcialmente pago (amarelo) → pago (verde) → em alerta (vermelho) | Ausente |
| **Indicador "Comprometimento" = Contratado/Orçado × 100** | Ausente |
| **Fórmula EAC = Σ Realizado + Σ(Contratado − Realizado) + Σ Estimativa não contratada** | Ausente como requisito formal |

### 3.B — Do rel. 02 (UX para usuários de Excel): princípios não virados em RNF

O rel. 02 identifica 5–6 causas de fracasso de sistemas que tentam substituir planilhas. O RNF-001 captura "grade estilo planilha" mas não captura:

- **Autofill com alça de arrasto** (arrastar para copiar/estender séries)
- **Ctrl+Z multi-nível** (histórico de desfazer comparável ao Excel)
- **Copiar da grade devolve TSV** (ida e volta com o Excel, não só importação)
- **Congelamento de linhas/colunas** (header e coluna de item fixos ao rolar)
- **Formatação condicional** (células com valor > orçado em vermelho)

### 3.C — Do rel. 27 (ciclo operacional): recomendação de custo por fase não absorvida

O rel. 27 (seç. 6 e 7) recomenda que o módulo suporte **registro de custo por fase** (montagem, operação, desmontagem, liquidação), não apenas por categoria. Nenhum RF/RNF menciona essa dimensão temporal dos custos.

Impacto: sem essa distinção, o gestor não sabe que 25–35% do orçamento é consumido ANTES do evento começar.

### 3.D — Do rel. 29 (precificação): recomendações de output não absorvidas

O rel. 29 (seç. 8) recomenda que o módulo entregue:

| Output recomendado | Status na doc |
|---|---|
| **Custo direto + custo indireto rateado por estande** | O RF-033/034 cobre rateio de custo de compostos, mas não menciona rateio de custos indiretos (segurança, limpeza, taxas) nos estandes |
| **Break-even em ingressos** (custos fixos ÷ margem de contribuição/ingresso) | Ausente |
| **Dashboard de precificação** com simulação de markup 2×/2,5×/3× | Ausente |
| **Coeficiente de localização** (campo livre para o operador aplicar ágio de posição) | Ausente |
| **Aviso sobre impostos que "comem" a margem**: ISS (2–5%) + ECAD (~10% receita bruta) + plataforma de ingressos (7,99–12%) | Ausente |

### 3.E — Do rel. 13 (aprovação leve): fluxo de alertas por alçada

O rel. 13 recomenda aprovação por alçada via notificação, não bloqueio — e o RF-019 já captura alertas em 80%/100% do orçado. Porém o rel. 13 adiciona:

- **Campo de limite por categoria** (não só por total do evento)
- **Auto-aprovação para gastos dentro do limite** (sem ação manual do gestor)
- **Contingência como "linha de reserva"** que o gerente pode usar sem pedir aprovação

### 3.F — Do rel. 11 (gestão de fornecedores): campo de raio de atuação

O rel. 11 (seç. 1, Bloco 3) recomenda campo "Raio de atuação (km)" ou "Municípios atendidos" no cadastro de fornecedor, porque fornecedor de capital em evento rural cobra frete proibitivo. O RF-010/030 não menciona esse atributo.

---

## SEÇÃO 4 — CONTRADIÇÕES ENTRE RELATÓRIOS E DOCUMENTAÇÃO

### 4.1 Seguro de vida — valor mínimo

- **05-CHECKLIST**: "mín. R$ 100 mil/profissional" (fonte: rel. 06/07)
- **Rel. 07, seç. 2.1, nota**: "seguro de vida/invalidez de no mínimo R$ 100.000 (lei) a R$ 200.000 (prática atual)"
- **Rel. 07, seç. 3**: tabela normativa da Lei 10.519/2002 diz "Mínimo R$ 200.000 por participante"

**Contradição real:** o checklist cita R$ 100 mil mas o próprio rel. 07 que é citado como fonte mostra R$ 200 mil na tabela normativa. Investigar se houve atualização legal ou se o rel. 07 errou ao citar a "prática atual" sem distingui-la do mínimo legal.

### 4.2 ECAD — % sobre qual base

- **05-CHECKLIST** (bloco 1): "5% bilheteria; gratuito paga sobre custos musicais" (fonte rel. 06/07)
- **Rel. 29, seç. 6**: "ECAD (~10% da receita bruta)" — percentual diferente

Os dois percentuais diferentes coexistem na pesquisa sem reconciliação. O ECAD tem tabela própria por tipo de evento e modalidade; a documentação simplificou em dois números que não são consistentes entre si.

### 4.3 Proporção de banheiros — norma citada inconsistente

- **05-CHECKLIST** (bloco 2): "1 para cada 50 pessoas/turno"
- **Rel. 25, seç. 7.1**: "1 unidade por 50 pessoas por período de 4 horas" — consistente
- **Rel. 18, seç. 1**: "1 para 50 pessoas (padrão sem open bar); 1 para 30–40 com álcool intensivo; lei Recife: 1/200; lei Curitiba: 1/250"

A documentação capturou apenas o padrão geral. A variação por consumo de bebida (+1/30–40 com open bar) e as normas municipais mais permissivas (1/200 Recife) não foram registradas — o que pode levar a superdimensionamento ou subdimensionamento dependendo do tipo do evento.

### 4.4 Cashless — recomendação de uso

- **05-CHECKLIST** (bloco 3, sistema de cobrança): descreve cashless RFID como "única opção confiável sem sinal"
- **Rel. 24, seç. 1**: cashless opera offline com saldo no chip — correto
- **Rel. 24, seç. 1 (contras)**: "30–50% do público rural não é bancarizado" — sem cartão/PIX, o visitante não consegue carregar saldo sem caixa em espécie, e o Reclame Aqui registrou 1.772 reclamações contra a Zig (junho/2025) com índice de resolução de 64,9%

O checklist descreve cashless como solução quase-universal ("única opção confiável") sem registrar as ressalvas do rel. 24 sobre público não-bancarizado e riscos de fornecedor.

---

## SEÇÃO 5 — LACUNAS TRANSVERSAIS (não atribuíveis a um relatório único)

### 5.1 Fase de desmontagem e liquidação financeira — sem item no checklist

O rel. 27 (seç. 3 e 4) documenta custos da fase pós-evento que não aparecem em lugar nenhum na documentação:

| Custo pós-evento (rel. 27) | Ausente da doc? |
|---|---|
| Recuperação do solo/grama (R$ 2–4/m² limpeza; R$ 50–150k/hectare replantio) | Sim |
| Dias extras de ocupação do terreno (multa por atraso na desmontagem) | Sim |
| Avarias em equipamentos alugados | Sim |
| Descarte de resíduos especiais (óleo de gerador, borracha, cabos) — multa ambiental | Sim |
| ISS sobre ingresso (2–5%) e sobre repasse ao artista (retenção IRPF/ISS) | Sim (ECAD mencionado, ISS não) |
| Acessibilidade — adequações estruturais obrigatórias (Lei 10.098/2000) | Sim |

### 5.2 Conta de staff de alimentação durante o evento — ausente

O rel. 27 (seç. 3.4) e rel. 28 (seç. 3.1) documentam que a alimentação de 100–2.000 trabalhadores é um centro de custo real e sistematicamente omitido. Não há RF nem item do checklist para "alimentação da equipe de trabalho durante o evento".

Exemplo do rel. 27: 500 trabalhadores × 2 refeições × 5 dias × R$ 40 = R$ 200.000 só em alimentação de equipe.

### 5.3 Cotas de patrocínio como item de RECEITA que afeta o cálculo de custo líquido

O rel. 29 (seç. 4) documenta o modelo de cotas de patrocínio (Apoio/Bronze/Prata/Ouro/Diamante) com fórmula para calcular a meta de patrocínio:

```
Meta de patrocínio = Custo Total do Evento − Receita de Ingressos − Receita de Estandes
```

O módulo está declarado como "puramente gastos" (RF-009), mas o rel. 29 demonstra que sem a receita de patrocínio o gestor não consegue calcular o custo LÍQUIDO que o evento precisa cobrir. O RF-034 já abre uma brecha ao falar em "custo base para precificação de venda" — o patrocínio é o outro lado. Não é uma contradição, mas uma lacuna de escopo que a pesquisa tornou evidente.

---

## RESUMO DOS ACHADOS POR PRIORIDADE PARA CENTRO DE CUSTO

### ALTA PRIORIDADE (afeta o cálculo financeiro diretamente)

| # | Achado | Relatório | Tipo |
|---|---|---|---|
| P1 | Categoria "Animais" completa ausente do checklist (alimentação, curral, água, frete boiadeiro por tipo de caminhão) | rel. 07 | Item de custo |
| P2 | 36 itens de limpeza do rel. 25 não absorvidos; faltam: caçamba 6–8m³, caminhão compactador, coleta seletiva (PNRS obrigatória), limpeza pós-evento, destinação de esterco com manifesto | rel. 25 | Item de custo |
| P3 | 38 itens de RH do rel. 28 não absorvidos: alimentação, transporte, uniforme, EPI, hospedagem e infraestrutura de staff (≈R$ 80–150 extras/pessoa/dia no interior) | rel. 28 | Item de custo |
| P4 | Segurança em fase de montagem (7–21 noites) e desmontagem totalmente ausente — custo real de R$ 12.500–18.000 para 1 posto 24h/17 dias | rel. 26/27 | Item de custo |
| P5 | Combustível do gerador nos dias de montagem/ensaio (50–120 L/hora; esquecido no orçamento) e reposição de areia da arena (R$ 6.750/evento de 3 dias) | rel. 27/30 | Item de custo |
| P6 | Dashboard de precificação (break-even de ingressos, rateio de indiretos por estande, coeficiente de localização) não virou RF | rel. 29 | Requisito funcional |
| P7 | Colunas do módulo: Orçado Revisado, Estimativa s/ contrato, Contingência separada, Status por cores e EAC fórmula — recomendados pelo rel. 10 e ausentes nos RF/RNF | rel. 10 | Requisito funcional |
| P8 | Contradição: seguro de vida R$ 100k (checklist) vs. R$ 200k (rel. 07 tabela normativa) — risco legal se a empresa usar o valor errado | rel. 07 vs. checklist-05 | Contradição |

### MÉDIA PRIORIDADE

| # | Achado | Relatório | Tipo |
|---|---|---|---|
| M1 | Categoria "Divulgação e Marketing" (8 itens: cartaz, rádio, TV, redes, foto, vídeo, folder) totalmente ausente do checklist | rel. 07 | Item de custo |
| M2 | Pacote companhia de rodeio (R$ 30–200k) como item único de alto valor sem entrada; ausência de bifurcação "pacote × itens individuais" no questionário | rel. 07 | Item de custo + modelo de dados |
| M3 | Custo de baias de expositores: montagem, palhada, limpeza diária, análise de leite — checklist tem "Terá área de expositores?" mas sem desdobramento | rel. 07 cat. 10 | Item de custo |
| M4 | Alimentação de 100–2.000 trabalhadores durante o evento — sistematicamente omitida no orçamento (R$ 200k em evento de 5 dias com 500 staff) | rel. 27/28 | Item de custo |
| M5 | Fase pós-evento (recuperação solo, avarias, ISS sobre ingresso, resíduos especiais) sem item no checklist | rel. 27 | Item de custo |
| M6 | Distribuição do orçamento por fase: montagem 25–35%, operação 40–55%, desmontagem 10–20% — referência útil para estimativa automática | rel. 27 | Número de referência |
| M7 | Inconsistência ECAD: 5% (checklist) vs. ~10% (rel. 29) — percentuais diferentes para o mesmo tributo | rel. 06/07 vs. rel. 29 | Contradição |
| M8 | Campo "Raio de atuação" no cadastro de fornecedor ausente dos requisitos — crítico para evento rural (frete proibitivo de fornecedor distante) | rel. 11 | Requisito funcional |

### BAIXA PRIORIDADE

| # | Achado | Relatório | Tipo |
|---|---|---|---|
| B1 | Autofill, Ctrl+Z multi-nível, TSV bidirecional, congelamento e formatação condicional — padrões UX do rel. 02 não virados em RNF | rel. 02 | RNF/UX |
| B2 | Custo por fase no registro de itens (montagem × operação × desmontagem) — dimensão temporal ausente | rel. 27 | Modelo de dados |
| B3 | Cashless RFID descrito como "única opção confiável" mas rel. 24 documenta ressalvas: 30–50% público não-bancarizado e reclamações de fornecedores | rel. 24 vs. checklist-05 | Contradição leve |
| B4 | Cotas de patrocínio (modelo e fórmula da meta) como receita que complementa o custo líquido — escopo limitado pelo RF-009 mas o rel. 29 demonstra a lacuna | rel. 29 | Escopo/decisão |
| B5 | Proporcionalidade de banheiros por consumo de álcool (1/30–40 com open bar vs. 1/50 padrão) e variações municipais (1/200 Recife, 1/250 Curitiba) ausentes | rel. 18/25 | Número de referência |

---

## APÊNDICE — ITENS JÁ ABSORVIDOS (NÃO RELATAR COMO GAP)

Os seguintes temas estão bem cobertos na documentação e NÃO são lacunas:

- Arena, arquibancadas, camarotes, tendas, piso, elétrica, sonorização/iluminação → cobertos no checklist-05 bloco 2
- ART, bombeiros, alvará, ECAD, GTA, seguro, CRMV → cobertos no checklist-05 bloco 1
- Julgadores (kit logístico RF-023), peões (alojamento local RF-006), locutores/salva-vidas → cobertos
- Gerador principal + backup + combustível durante shows + kVA → cobertos no checklist-05 bloco 2
- Internet/Starlink/4G → cobertos no checklist-05 bloco 2
- Estacionamento (preparo, sinalização, orientadores, iluminação) → coberto no checklist-05
- Fazendinha (empresa especializada, autorização sanitária) → coberto
- Praça de alimentação (modelo custo próprio × concessão) → coberto
- Três camadas orçado × contratado × realizado (RF-008) → coberto
- Curva ABC (RF-017), histórico de preços (RF-016) → cobertos
- Manutenção de plantão (eletricista, trator, pipa, combustível gerador shows, kit peças) → parcialmente coberto no checklist-05
- Sistema cashless vs. fichas (texto descritivo) → coberto no checklist-05

---

*Arquivo gerado: 2026-08-01. Revisar quando novos relatórios forem adicionados à pasta.*
