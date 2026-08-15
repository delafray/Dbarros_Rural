# 41 — Metodologia de Decomposição de Custos de Serviço

> Pesquisa para o módulo de centro de custo de eventos rurais (rodeios, exposições
> agropecuárias com julgamento de gado, torneio leiteiro). Objetivo: descobrir como
> orçamentistas profissionais **decompõem um serviço em componentes de custo** (o
> conceito de composição / BOM de serviço) e propor um **template universal de
> decomposição** que o sistema aplique automaticamente a cada área de custo.

---

## 0. O problema que motiva esta pesquisa

O dono do negócio deixou claro que **tudo que ele cita são exemplos, não regras fixas**:

- "Limpeza não é só mão de obra, **tem material**."
- "A tenda tem deslocamento, mas esse **já vem embutido no preço do fornecedor**."
- "O tambor de leite do torneio eu **contrato à parte**."

A conclusão prática: cada área de custo (limpeza, tenda, som, julgamento, torneio,
segurança, etc.) é na verdade uma **cesta de componentes**. O erro clássico de
orçamento é enxergar só a "face visível" (a mão de obra da limpeza, o valor da tenda)
e esquecer as outras faces (o material, o consumível, a logística, a taxa). O sistema
precisa **forçar a verificação de todas as faces** — perguntar automaticamente "e o
material? e o consumível? e a logística?" — em vez de confiar na memória do orçamentista.

Isto é exatamente o que as metodologias profissionais fazem: transformam um serviço
numa **composição de custos** (uma lista estruturada de insumos), não num número solto.

---

## 1. Estruturas-padrão de composição de custos de serviço

### 1.1 SINAPI — composição de custo unitário (construção civil)

A **SINAPI** (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil,
Caixa + IBGE) é a maior base pública brasileira de referência de preços. O conceito
central dela é a **composição de custo unitário**: cada serviço não tem um "preço", tem
uma **lista detalhada de todos os insumos necessários para executá-lo**, organizada para
calcular o custo por unidade (m², m³, unidade).

A composição SINAPI soma os custos de:

1. **Mão de obra** — por categoria profissional (pedreiro, eletricista, armador…), medida
   pela **parcela de tempo** (coeficiente de quantidade) que cada profissional dedica ao
   serviço;
2. **Materiais** — cada insumo com código único, descrição, unidade e preço médio por UF;
3. **Equipamentos** — máquinas/ferramentas necessárias;
4. **Transporte** — deslocamento de insumos;
5. **Administração local** — overhead da execução.

> **Lição para o nosso módulo:** o custo de um serviço = Σ (coeficiente × preço unitário)
> de cada insumo. O que o dono chama de "componente" é exatamente o **insumo** da SINAPI.
> Nenhuma área é um número único; é sempre uma soma de faces.

Fontes:
- Manual de Metodologias e Conceitos SINAPI (Caixa): https://www.caixa.gov.br/Downloads/sinapi-metodologia/Livro_SINAPI_Metodologias_Conceitos.pdf
- "O que é e como funciona a tabela SINAPI" (OrçaFascio): https://www.orcafascio.com/papodeengenheiro/o-que-e-e-como-funciona-a-tabela-sinapi
- "SINAPI no orçamento da obra" (Sienge): https://sienge.com.br/blog/tabela-sinapi-no-orcamento-da-obra/
- Composição SINAPI (i9 Orçamentos): https://www.i9orcamentos.com.br/composicao-sinapi/

### 1.2 IN 05/2017 — Planilha de Custos e Formação de Preços (serviços com mão de obra)

A **Instrução Normativa SEGES/MP nº 05/2017** (atualizada pela IN 07/2018; recepcionada
pela Lei 14.133/2021 via IN SEGES 98/2022) é a **melhor referência para serviços**, porque
padroniza a decomposição de um serviço terceirizado contínuo em **6 módulos**. Ela é o
"BOM de serviço" do setor público brasileiro:

| Módulo | Conteúdo | Analogia no nosso módulo |
|---|---|---|
| **Módulo 1 — Composição da Remuneração** | Salário-base, adicionais, periculosidade/insalubridade | Valor "bruto" da mão de obra |
| **Módulo 2 — Encargos e Benefícios** | Encargos sociais (INSS, FGTS…), 13º, férias, VT, VA, plano de saúde | Impostos/encargos sobre a mão de obra |
| **Módulo 3 — Provisão para Rescisão** | Aviso prévio, multa FGTS, indenizações | Provisões / contingências |
| **Módulo 4 — Custo de Reposição do Profissional (substituto)** | Cobertura de férias, ausências, faltas | Redundância / cobertura operacional |
| **Módulo 5 — Insumos Diversos** | **Uniformes, Materiais, Equipamentos (com depreciação), EPI, Outros** | **Material + consumível + equipamento** |
| **Módulo 6 — Custos Indiretos, Tributos e Lucro** | Overhead da empresa (BDI), tributos sobre faturamento, lucro | **Overhead + taxas/impostos + margem** |

Pontos-chave para a nossa metodologia:

- O **Módulo 5** é a prova de que "serviço = mão de obra + insumos": ele isola
  explicitamente **uniformes, materiais, equipamentos e depreciação** como faces separadas
  da mão de obra. É exatamente o "e o material?" que o dono cita na limpeza.
- **Depreciação de equipamento** entra rateada (contábil/fiscal): equipamento que dura
  vários eventos não é lançado inteiro num evento; entra a fração de vida útil consumida.
- O **Módulo 6** separa três coisas que leigos misturam: **overhead (custos indiretos da
  empresa), tributos sobre o preço e lucro**. No nosso caso: taxa do fornecedor, imposto e
  margem são faces distintas.
- Os valores do Módulo 5 são expressos como **valor mensal por posto/empregado** — ou seja,
  o insumo é **rateado proporcionalmente** à unidade de medida do serviço (ver seção 3).

Fontes:
- IN 05/2017 (texto oficial, Portal de Compras Gov): https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-no-5-de-26-de-maio-de-2017-atualizada
- "Como elaborar e julgar a planilha de preços" (Zênite): https://zenite.com.br/zenite_online/planilha-precos-servicos/
- Manual do Modelo de Planilhas de Custos do STJ (detalha módulos 1 a 6): https://transparencia.stj.jus.br/wp-content/uploads/Manual_do_Modelo_de_Planilhas_de_Custos_do_STJ.pdf
- "Entendendo a planilha de custos: Módulo 5" (Licitação e Contrato): https://www.licitacaoecontrato.com.br/assets/lecComenta/entendendo-a-planilha-de-custos-modulo520082018.pdf
- Referencial técnico — planilha de custos (EGov DF): https://www.egov.df.gov.br/wp-content/uploads/2026/03/Livro-Planilha-de-custos-e-formacao-de-precos.pdf
- Modelo de planilha (IDG): https://idg.org.br/download/arquivo/Anexo+I+A+-+Planilha+de+Composi%C3%A7%C3%A3o+e+Forma%C3%A7%C3%A3o+de+Pre%C3%A7os_0.pdf?id=2753

### 1.3 BOM de manufatura (Bill of Materials) — o mesmo conceito, outro setor

O **BOM (Bill of Materials)** da indústria confirma que a decomposição é universal. Um
BOM completo NÃO é só a lista de peças; a análise de custo de BOM soma:

- **Materiais/componentes diretos** (geralmente a maior fatia);
- **Mão de obra direta** (setup, montagem, inspeção, embalagem = tempo × valor/hora);
- **Equipamentos e ferramental** (moldes, gabaritos, desgaste);
- **Overhead** (aluguel, energia, depreciação de máquina, manutenção — rateado por unidade);
- **Logística/frete** (frete de entrada, taxas, impostos aduaneiros, transporte);
- **Perdas e refugo** (scrap — perda de material no processo).

> Alerta explícito da literatura de BOM: *"organizações que focam só no custo de material,
> ignorando mão de obra, overhead e logística, inevitavelmente produzem cálculos falhos"* —
> exatamente o risco que o dono quer evitar.

Fontes:
- BOM and Cost Structure Analysis (Umbrex): https://umbrex.com/resources/industry-analyses/how-to-analyze-a-manufacturing-company/bill-of-materials-bom-and-cost-structure-analysis/
- BOM Cost Analysis (Deskera): https://www.deskera.com/blog/bom-cost-analysis/
- What is BOM cost management (LightSource): https://lightsource.ai/blog/bom-cost-management

### 1.4 Orçamento de eventos — as mesmas faces, vocabulário de eventos

A literatura de orçamento de eventos corporativos e esportivos reforça as mesmas faces e,
crucialmente, alerta para os **"custos invisíveis"**: montagem e desmontagem (que exigem
equipe + equipamento + logística próprios), horas extras, transporte/traslado, sinalização,
energia, segurança e limpeza, além de mudanças de escopo. Custos são ainda classificados
em **fixos** (independem do porte: aluguel de espaço, equipamento) e **variáveis** (mudam
com o porte: alimentação, credenciamento, mão de obra).

Fontes:
- "Otimizando o orçamento de eventos corporativos" (Gofun): https://www.gofuneventos.com.br/post/otimizando-o-or%C3%A7amento-de-eventos-corporativos-custos-de-eventos-empresariais-na-pr%C3%A1tica
- "Guia de organização e gestão de gastos" (Caju): https://blog.caju.com.br/beneficios/eventos-corporativos-guia-de-organizacao-e-gestao-de-gastos/
- "Como fazer orçamento de evento corporativo" (Netshow.me): https://netshow.me/blog/orcamento-de-evento-corporativo/
- "Custos para evento esportivo" (Atletis): https://www.atletis.com.br/custos-evento-esportivo

---

## 2. Custo EMBUTIDO no fornecedor vs. CONTRATADO à parte

Esta é a distinção que o dono levantou (tenda com deslocamento embutido; tambor de leite à
parte). As metodologias tratam isso com dois conceitos:

### 2.1 Escopo do fornecedor / "landed cost" (custo posto)

No BOM/procurement, cada item de fornecedor tem um **preço + termos**: o custo relevante é
o **landed cost / custo posto**, que já inclui frete, taxas e impostos que o fornecedor
embute no preço entregue. Quando o custo está **embutido**, ele NÃO deve ser somado de novo
como linha separada — sob pena de dupla contagem.

Na literatura de eventos, isso aparece como a recomendação de **"comparar não só o preço,
mas o que cada proposta inclui"**: um orçamento mais caro pode já embutir montagem, frete e
garantias que o barato cobra à parte. Consolidar tudo num fornecedor (ex.: PA+luz+LED)
reduz 15-20% e elimina fragmentação — mas exige saber **o que está dentro do preço**.

### 2.2 Implicação para o template: cada face precisa de um "status de inclusão"

Para cada componente de uma área de custo, o sistema deve registrar **um de três estados**:

- **EMBUTIDO** — já está no preço do fornecedor daquela linha (ex.: deslocamento da tenda).
  Não gera lançamento novo; apenas fica **registrado como incluído** para evitar dupla
  contagem e para transparência ("a tenda já inclui frete").
- **À PARTE** — contratado separadamente, de outro fornecedor ou como item próprio (ex.:
  tambor de leite do torneio). **Gera uma linha de custo própria**.
- **NÃO SE APLICA** — aquela face não existe para esta área (ex.: "material" numa taxa de
  julgamento que é puro serviço).

> Regra de ouro anti-erro: o sistema pergunta sobre TODAS as faces sempre; o orçamentista
> só pode responder "embutido", "à parte (R$ X)" ou "não se aplica" — nunca deixar em
> branco. Assim nada é esquecido e nada é contado duas vezes.

Fontes: Umbrex/Deskera (landed cost e termos de fornecedor, seção 1.3); Boocx / Doity
sobre comparar escopo de propostas de evento:
- https://boocx.com/blog/planejamento/5-erros-comuns-no-orcamento-de-eventos-corporativos/
- https://doity.com.br/blog/planilha-de-orcamento-para-eventos/
- "Como escolher fornecedores para eventos": https://boocx.com/blog/fornecedores/como-escolher-fornecedores-para-eventos-sem-dor-de-cabeca/

---

## 3. Consumíveis proporcionais (por pessoa, por dia, por uso)

O caso do "material da limpeza" e do "tambor de leite" mostra que muitos custos **escalam
com uma base**, não são valores fixos. As metodologias tratam isso assim:

- **SINAPI:** usa **coeficientes de consumo** — quantidade de insumo por unidade de serviço
  (ex.: X kg de cimento por m²). O custo total = coeficiente × quantidade × preço unitário.
- **IN 05/2017 (Módulo 5):** materiais e insumos são lançados como **valor mensal por posto**
  — ou seja, o consumo é **rateado pela unidade operacional** (posto de trabalho, mês).
- **Depreciação de equipamento:** o equipamento reutilizável entra pela **fração de vida útil
  consumida** no evento, não pelo valor cheio.

### Bases de rateio recomendadas para o nosso módulo

Cada consumível deve ter uma **base de proporcionalidade** explícita:

| Base | Fórmula | Exemplos no evento rural |
|---|---|---|
| **Por pessoa** | qtd. pessoas × consumo unitário | material de limpeza por banheiro/público; alimentação da equipe |
| **Por dia / duração** | nº de dias × custo diário | diária de equipamento, combustível de gerador, mão de obra |
| **Por uso / ocorrência** | nº de usos × custo por uso | tambor de leite por rodada do torneio; brinde por premiação |
| **Por unidade física** | qtd. (m², cabeça de gado, box) × custo unit. | limpeza por m²; ração/manejo por cabeça no julgamento |
| **Por fração de vida útil** | (uso no evento ÷ vida útil) × valor do bem | depreciação de equipamento próprio reutilizável |
| **Fixo** | valor único, não escala | taxa de licença; cachê fixo do jurado |

> O sistema deve pedir, para cada consumível, **a base + o coeficiente + o preço unitário**,
> e calcular sozinho. Isso evita o erro de lançar valor "chutado" que não acompanha o porte
> do evento.

Fontes: SINAPI (coeficientes, seção 1.1); IN 05/2017 Módulo 5 (valor mensal por posto,
depreciação, seção 1.2); referencial EGov DF (seção 1.2).

---

## 4. RECOMENDAÇÃO — Template Universal de Decomposição (as 7 faces)

Consolidando SINAPI + IN 05/2017 + BOM + orçamento de eventos, toda **área de custo** do
módulo deve ser verificada contra estas **7 faces**. O sistema apresenta cada face como uma
pergunta obrigatória, com os três status possíveis (Embutido / À parte R$ / Não se aplica):

| # | Face | Pergunta que o sistema faz | Origem metodológica |
|---|---|---|---|
| **1** | **Mão de obra** | "Quem executa? Quantas pessoas × dias/horas × valor?" | SINAPI, IN05 M1-M4, BOM |
| **2** | **Materiais** (bens que ficam / são aplicados) | "Que material é preciso? (produtos, peças, estrutura)" | SINAPI, IN05 M5, BOM |
| **3** | **Consumíveis** (gastam-se por uso, proporcionais) | "E o consumível? Por pessoa, por dia ou por uso? Qual a base?" | SINAPI coef., IN05 M5, seção 3 |
| **4** | **Equipamentos** (uso/aluguel/depreciação) | "Precisa de equipamento? Aluga, é próprio (depreciação) ou do fornecedor?" | SINAPI, IN05 M5, BOM |
| **5** | **Logística / Mobilização** (frete, deslocamento, montagem/desmontagem) | "E a logística? Frete e montagem estão embutidos no fornecedor ou à parte?" | Eventos (custos invisíveis), BOM (landed cost) |
| **6** | **Taxas / Tributos / Licenças** | "Tem taxa, imposto ou licença sobre isto?" | IN05 M6, BOM |
| **7** | **Overhead / Margem / Contingência** | "Rateio de custo fixo, margem e reserva para imprevisto?" | IN05 M6 (BDI), BOM, provisão M3 |

### Como o template ataca o problema do dono

- Ele nunca mais "esquece o material da limpeza": a **Face 2/3** é obrigatória e pergunta.
- Ele registra o deslocamento da tenda como **Face 5 = EMBUTIDO** — fica documentado sem
  dupla contagem.
- Ele lança o tambor de leite como **Face 3/4 = À PARTE (R$ X)**, com base "por uso/rodada".
- Cada face aceita **Não se aplica**, então áreas puras (uma taxa de licença) não ficam
  poluídas com faces vazias, mas a decisão é **explícita**, não um esquecimento.

### Regras de implementação sugeridas (para a fase de design)

1. **Toda área de custo = cabeçalho + N componentes**, nunca um valor único.
2. **As 7 faces são sempre exibidas**; status obrigatório (Embutido / À parte / N.A.).
3. **Componente "À parte"** exige: base de rateio (seção 3) + coeficiente + preço unitário →
   o sistema calcula o total.
4. **Componente "Embutido"** guarda referência ao fornecedor/linha que o contém (rastreio
   anti-dupla-contagem).
5. **Equipamento próprio** usa fração de vida útil (depreciação), não valor cheio.
6. **Relatório do evento** mostra o custo por face (quanto foi mão de obra × material ×
   logística × taxa), permitindo achar onde economizar — objetivo citado por toda a
   literatura de eventos.

---

## 5. Fontes consolidadas

**Serviços / composição de custo (Brasil):**
- IN 05/2017 oficial: https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-no-5-de-26-de-maio-de-2017-atualizada
- Planilha de preços (Zênite): https://zenite.com.br/zenite_online/planilha-precos-servicos/
- Manual de Planilhas de Custos STJ: https://transparencia.stj.jus.br/wp-content/uploads/Manual_do_Modelo_de_Planilhas_de_Custos_do_STJ.pdf
- Entendendo a planilha — Módulo 5: https://www.licitacaoecontrato.com.br/assets/lecComenta/entendendo-a-planilha-de-custos-modulo520082018.pdf
- Referencial técnico EGov DF: https://www.egov.df.gov.br/wp-content/uploads/2026/03/Livro-Planilha-de-custos-e-formacao-de-precos.pdf
- Modelo de planilha IDG: https://idg.org.br/download/arquivo/Anexo+I+A+-+Planilha+de+Composi%C3%A7%C3%A3o+e+Forma%C3%A7%C3%A3o+de+Pre%C3%A7os_0.pdf?id=2753
- Terceirização e planilha (Zênite Blog): https://zenite.blog.br/terceirizacao-e-planilha-custos-que-nao-decorrem-de-imposicao-legal/

**SINAPI:**
- Manual de Metodologias e Conceitos (Caixa): https://www.caixa.gov.br/Downloads/sinapi-metodologia/Livro_SINAPI_Metodologias_Conceitos.pdf
- OrçaFascio: https://www.orcafascio.com/papodeengenheiro/o-que-e-e-como-funciona-a-tabela-sinapi
- Sienge: https://sienge.com.br/blog/tabela-sinapi-no-orcamento-da-obra/
- i9 Orçamentos (composição): https://www.i9orcamentos.com.br/composicao-sinapi/

**BOM / custo de serviço (internacional):**
- Umbrex: https://umbrex.com/resources/industry-analyses/how-to-analyze-a-manufacturing-company/bill-of-materials-bom-and-cost-structure-analysis/
- Deskera: https://www.deskera.com/blog/bom-cost-analysis/
- LightSource: https://lightsource.ai/blog/bom-cost-management

**Orçamento de eventos:**
- Gofun: https://www.gofuneventos.com.br/post/otimizando-o-or%C3%A7amento-de-eventos-corporativos-custos-de-eventos-empresariais-na-pr%C3%A1tica
- Caju: https://blog.caju.com.br/beneficios/eventos-corporativos-guia-de-organizacao-e-gestao-de-gastos/
- Netshow.me: https://netshow.me/blog/orcamento-de-evento-corporativo/
- Atletis (evento esportivo): https://www.atletis.com.br/custos-evento-esportivo
- Boocx (erros comuns): https://boocx.com/blog/planejamento/5-erros-comuns-no-orcamento-de-eventos-corporativos/
- Doity (planilha): https://doity.com.br/blog/planilha-de-orcamento-para-eventos/

---

*Pesquisa concluída em 02/08/2026. Documento de referência para o design do módulo de
centro de custo — não altera código.*
