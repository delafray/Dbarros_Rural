# Gap Analysis — Ferramentas de Produção Executiva de Shows vs. Documentação Atual

> **Data:** 2026-08-01
> **Objetivo:** Identificar conceitos, módulos e campos presentes em ferramentas profissionais de produção de shows/festivais que **não estão cobertos** na documentação atual do módulo de centro de custo (pesquisas 01 a 33).
> **Escopo investigado:** Prism.fm, Eventric Master Tour, BackstagePRO, In2event, Accredit Solutions, FestivalPro, TicketFairy, TourManager.info, ZapSign (documentos eventos BR).

---

## Metodologia

A documentação atual cobre: ~40 categorias de custo rural, fluxo orçado → cotado → contratado → realizado, compostos (bar, estande) com rateio, planilha bloqueada para fornecedor cotar, sugestão de fornecedor por histórico, checklist de criação com obrigações legais e prazos-alerta, e precificação com break-even.

Os gaps abaixo são apenas o que **falta** — funcionalidades/conceitos que as ferramentas pesquisadas possuem e que o nosso módulo ainda não contempla.

---

## GAP 1 — Settlement (Borderô Pós-Show) — estrutura de acerto financeiro com artista

**O que as ferramentas fazem (Prism.fm, Master Tour, TourManager.info):**

As ferramentas profissionais de shows operam com um ciclo de acerto pós-evento chamado _settlement_:

1. **Deal sheet** — documento que define a estrutura contratual do artista antes do show:
   - *Flat Guarantee*: cachê fixo independente de público
   - *Versus Deal*: cachê versus percentual do NBOR (Net Box Office Receipts), prevalece o maior
   - *Promoter Profit Deal*: garantia + percentual do NBOR após despesas e lucro do promotor
   - *Bonus Deal*: bônus ao atingir milestone de ingressos vendidos

2. **Campos financeiros do borderô:**
   - GBOR (Gross Box Office Receipts) — receita bruta de ingresso
   - NBOR — GBOR menos impostos, taxas de plataforma e facility fees
   - House Nut — despesas fixas do promotor que são deduzidas antes da divisão
   - Split Point — NBOR menos house nut; ponto a partir do qual o artista entra na divisão
   - Walkaway — valor final pago ao artista após depósitos, retenções e withholding

3. **Etapas do processo:**
   - Pre-settlement enviado antes do show (revisão antecipada de despesas)
   - Ticket audit no fechamento dos portões
   - Settlement final com assinatura do tour manager do artista
   - Merchandise settlement separado (controle de comissão sobre merch vendido)

4. **Documentos arquivados no settlement:**
   - Relatório de presença (attendance report)
   - Seat maps com premium seat lift
   - Time sheets da equipe de labor
   - Receitas de catering e compras de produção
   - Scans de notas fiscais e comprovantes

**Gap no nosso sistema:** A documentação atual registra o custo do cachê do artista como item de centro de custo (categoria "shows/artistas"), mas não modela o ciclo de settlement: não há campos para GBOR/NBOR, deals estruturados, split point, ou o fluxo de pré-settlement → ticket audit → walkaway. Para eventos rurais médios/grandes com artistas sertanejos contratados por cachê fixo, o settlement simplificado (cachê − depósitos já pagos = saldo a pagar no dia) já justifica um mini-módulo.

**Fontes:**
- https://tourmanager.info/show-settlement/
- https://www.platinumroad.com/post/understanding-show-settlement-what-comedians-agents-and-managers-need-to-know
- https://prism.fm/why-prism-for-venues-and-promoters/
- https://artshacker.com/common-deal-structures-for-touring-groups/

---

## GAP 2 — Advancement (Avanço) — checklist de confirmação pré-show com artista/rider

**O que as ferramentas fazem (Master Tour, Prism.fm, TourManager.info):**

O _advancement_ é o processo de confirmação feito 3 dias a 3 semanas antes do show entre o tour manager do artista e o produtor do evento. É o equivalente operacional do "alinhamento final". Os campos cobertos:

- **Técnico:** confirmação de PA, monitores, backline, rigging, input list, mapa de palco
- **Logística:** horário de abertura dos portões de serviço, load-in do artista, soundcheck, horário de show, curfew (horário limite de término)
- **Hospitalidade (ver GAP 3):** confirmação do rider de hospitalidade
- **Transfer:** tipo de veículo, horário de pickup no hotel, rota aeroporto → hotel → venue, estacionamento de ônibus/van de tour
- **Credenciamento (ver GAP 4):** número de passes necessários por categoria
- **Financial:** confirmação de quem assina o settlement e onde fica o escritório de settlement no dia
- **Documentos anexados:** rider técnico, rider de hospitalidade, pass sheet (lista de credenciais)

O Prism.fm chama este módulo de "Advance consolidado com informações do show".

**Gap no nosso sistema:** O checklist de criação atual cobre obrigações legais e prazos com órgãos públicos, mas não modela o advancement com artistas: não há entidade "Advance" com campos de confirmação por departamento (técnico, logística, hospitalidade, transfer) nem rastreamento de status de confirmação por item.

**Fontes:**
- https://bandzoogle.com/blog/how-to-advance-your-shows-the-right-way
- https://tourmanager.info/festival-advance/
- https://www.nationalmusicacademy.com.au/post/advancing-your-show

---

## GAP 3 — Rider de Hospitalidade — módulo de gestão de demandas do artista (camarim, catering, transfer)

**O que as ferramentas fazem (FestivalPro, CoCo Backstage, Stagent):**

O _hospitality rider_ é um documento separado do rider técnico que especifica:

- **Camarim:** lista de itens por sala (espelhos, cabideiros, sofá, iluminação, banheiro privativo, vaporizador, ferro de passar)
- **Catering por refeição:** café da manhã, almoço, jantar, pós-show; quantidade de pessoas (artista + banda + crew + suporte); restrições dietéticas (vegetariano, vegano, alérgico a glúten, restrições religiosas, alergias graves)
- **Bebidas:** especificações de marca, temperatura, quantidade
- **Bus stock:** itens para abastecer o ônibus/van de tour durante a viagem
- **Transfer:** tipo de veículo solicitado (SUV, van, ônibus), horários de pickup, rota, responsável pelo motorista
- **Hotel:** categoria mínima, tipo de quarto (single/double), amenities, distância máxima do venue, early check-in/late check-out
- **Guest list:** número de cortesias por categoria (artista, crew, assessoria, imprensa), quem autoriza adições de última hora
- **Passes backstage:** quantidades por zona de acesso (palco, camarim, área de produção, press)

No FestivalPro, cada artista no line-up tem seu rider de hospitalidade vinculado ao cronograma; o gestor de hospitalidade usa a lista agregada de todas as demands para fazer o pedido de catering em volume.

**Gap no nosso sistema:** A documentação atual não contempla rider de hospitalidade como entidade gerenciada. O custo de catering de artistas entra provavelmente como item genérico de "alimentação". Não há modelo de dados para restrições dietéticas por pessoa, itens por camarim, ou vínculo transfer → custo de transporte do artista.

**Fontes:**
- https://www.festivalpro.com/festival-management/3916/news/2025/8/5/Hospitality-Planning-and-Management-for-Larger-Music-Festival-Backstage-Zones.html
- https://tourmanager.info/hospitality-rider/
- http://www.cocohospitality.com/artist-dressing-room

---

## GAP 4 — Credenciamento — módulo de controle de acesso por zonas e categorias de credencial

**O que as ferramentas fazem (In2event, Accredit Solutions, Worknet Eventos):**

Sistemas de credenciamento profissional gerenciam:

- **Categorias de credencial:** staff, crew artístico, imprensa, VIP, patrocinador, veterinário, árbitro, expositor, fornecedor, autoridade pública — cada uma com cor/formato físico distinto
- **Zonas de acesso:** palco, backstage, camarim, área de produção, área de imprensa, VIP, arena, área de exposição animal, área de credenciamento — cada zona com lista de categorias autorizadas
- **Dados por pessoa credenciada:** nome, CPF/RG, empresa/artista que representa, função, foto, zona de acesso, validade do passe (dia único × todos os dias × período específico)
- **Fluxo de aprovação:** solicitação → revisão → aprovação → emissão de badge/QR code
- **Controle de entrada:** leitura de QR code nas catracas/pontos de acesso, log de entrada/saída por pessoa
- **Tickets de refeição:** vinculados à credencial (normalmente 3 por dia por pessoa credenciada), usados para controle de consumo no catering de backstage
- **Relatórios:** presença real por zona, horário de pico, pessoas ainda no evento

**Gap no nosso sistema:** O arquivo 27 (ciclo operacional) menciona "credenciamento de toda a equipe" na véspera, mas como evento do cronograma, não como módulo. Não há entidade Credencial com campos de zona de acesso, categoria, dados pessoais ou controle de ingresso de refeição. Para eventos rurais médios, o credenciamento é geralmente feito em planilha paralela — integrá-lo ao centro de custo permitiria, por exemplo, calcular automaticamente o custo de catering de backstage a partir da quantidade de credenciais emitidas.

**Fontes:**
- https://in2event.com/accreditation-access-zones/
- https://www.accredit-solutions.com/events/
- https://www.workneteventos.com.br/

---

## GAP 5 — Ordem do Dia / Day Sheet — cronograma de minuto a minuto do dia do evento

**O que as ferramentas fazem (Master Tour, Prism.fm, TicketFairy):**

A _ordem do dia_ (equivalente ao _day sheet_ ou _run of show_) é um documento operacional distinto do cronograma de produção (Gantt). Cobre apenas o dia D e inclui:

- **Coluna de horários:** minutagem exata de cada atividade
- **Abertura de área de montagem** (hora em que a equipe de serviço pode entrar)
- **Load-in do artista** (chegada do caminhão de equipamentos do artista)
- **Soundcheck** (horário, duração, ordem dos artistas no line-up)
- **Abertura dos portões ao público**
- **Abertura das atrações de apoio** (rodeio, exposição, praça de alimentação)
- **Apresentações no palco** com horário de início e término de cada atração
- **Intervalos técnicos** (changeover entre artistas)
- **Horário de encerramento** e curfew
- **Load-out** (início da desmontagem)
- **Responsável por cada bloco:** nome e rádio/celular de contato
- **Emergências:** hospital mais próximo, bombeiros, plantão médico — impresso no rodapé

**Gap no nosso sistema:** O módulo atual registra datas do evento (início e fim) e, pelo arquivo 27, a linha do tempo de montagem/desmontagem em fases. Mas não há entidade "Ordem do Dia" com timeline de minutos do dia D, nem vínculo entre esta timeline e os custos de hora extra de equipes (ex.: soundcheck atrasado → hora extra do técnico de som).

**Fontes:**
- https://www.avmakers.com.br/blog/ordem-do-dia-como-ela-te-ajuda-e-como-fazer-uma-parte-i
- https://www.ticketfairy.com/blog/creating-a-master-festival-production-schedule
- https://likedobrasil.com/como-funciona-a-ordem-do-dia-nas-gravacoes-tudo-o-que-voce-precisa-saber/

---

## GAP 6 — Cronograma Físico (Gantt) amarrado a custos — dependências de tarefas com impacto financeiro

**O que as ferramentas fazem (ProjectManager, Asana, Smartsheet, TicketFairy):**

Ferramentas profissionais de produção de festival usam cronogramas Gantt com:

- **Tarefas com atributos triplos:** prazo + responsável + dependências (tarefa B só começa depois que A terminar)
- **Marcos críticos:** datas-gatilho que liberam pagamentos (ex.: depósito de artista pago D-60 → artist confirmado → articulação de rider começa)
- **Departamentos como raias (swimlanes):** Talento & Programação, Produção & Operações, Marketing & Ingressos, Patrocínio & Fornecedores, Jurídico/Documentação
- **Integração custo × tarefa:** a cada tarefa um centro de custo associado; ao atrasar a tarefa, o sistema alerta sobre impacto no custo (hora extra, multa contratual, realocação de equipe)
- **Sequência de load-in:** cercas → palco → áudio → iluminação (dependências de ordem física)
- **Integração com orçamento:** o cronograma indica quando cada custo se torna comprometido (assinatura do contrato) e quando é realizado (pagamento)

**Gap no nosso sistema:** A pesquisa 10 cobre o fluxo Previsto → Comprometido → Realizado com base financeira sólida, e o arquivo 27 descreve a linha do tempo de montagem por fase. Mas não há uma entidade "Tarefa de Produção" com dependências, responsável e vínculo direto a um item de custo. O Gantt vive em ferramenta separada (Excel, Asana) e não dialoga com o centro de custo — isso é o gap mais comum apontado pelas ferramentas pesquisadas.

**Fontes:**
- https://www.ticketfairy.com/blog/creating-a-master-festival-production-schedule
- https://www.ticketfairy.com/blog/2025/07/07/project-management-tools-and-techniques-for-festival-planning/
- https://monday.com/blog/project-management/gantt-chart-for-event-planning/

---

## GAP 7 — Gestão Documental do Evento — repositório centralizado com alertas de vencimento

**O que as ferramentas fazem (BackstagePRO, ZapSign, NC Soluções):**

Produtoras profissionais mantêm um repositório digital único por evento com:

- **Contratos:** artistas, fornecedores, patrocinadores, co-promotores — com campos de valor, vencimento de cada obrigação e status de assinatura
- **Licenças e alvarás:** alvará municipal (prefeitura), AVCB (Bombeiros), licença sanitária, licença ambiental, autorização agropecuária — cada uma com campo de validade e alerta de vencimento
- **ARTs/RRTs:** por estrutura (palco, arquibancada, tenda, torre); vinculadas ao fornecedor que executou
- **Apólices de seguro:** responsabilidade civil do evento, seguro de vida dos profissionais do rodeio (Lei 10.519/2002 exige mín. R$ 100k/pessoa), seguro de cancelamento
- **Notas fiscais:** vinculadas a cada item de custo realizado
- **GTAs (Guias de Trânsito Animal):** por lote de animais, com data de emissão e trajeto
- **Documentos de artistas:** contratos, riders, pass sheets, notas fiscais de cachê (ou RPA)
- **Controle de acesso:** quem pode ver/editar cada documento (produtor, cliente, contador, advogado)
- **Alertas automáticos:** D-90, D-60, D-30, D-15 antes do evento para cada licença ainda pendente

**Gap no nosso sistema:** O arquivo 06 lista as obrigações legais com prazos (excelente), e o arquivo 19 cobre ART/seguro com detalhe. Mas a documentação descreve os documentos como *itens de checklist*, não como *entidades armazenadas*. Não há modelo de dados para um repositório documental: sem campos de arquivo digital anexado, data de validade, órgão emissor, status (pendente/obtido/vencido) e alerta de vencimento vinculado ao calendário do evento.

**Fontes:**
- https://blog.zapsign.com.br/documentos-para-eventos/
- https://backstageproapp.com.br/erp-para-eventos-solucao-completa-gestao-produtora/
- https://www.ativalocacao.com.br/dicas/como-tirar-alvara-para-eventos/

---

## GAP 8 — Rastreamento de Múltiplos Fluxos de Receita do Evento (além de ingressos)

**O que as ferramentas fazem (BackstagePRO, Prism.fm):**

Ferramentas de ERP para eventos modelam receita multicamadas:

- **Ingressos** (GBOR → NBOR após deduções fiscais e tarifas de plataforma)
- **Camarotes e áreas VIP** (receita separada com estrutura de custo própria)
- **Patrocínio** (por cota: Diamante/Ouro/Prata com contrapartidas e entregáveis rastreados)
- **Concessões/fornecedores** (percentual sobre faturamento ou aluguel fixo de área)
- **Estandes de expositores** (aluguel de espaço, coberto em pesquisa 29, mas sem receita × custo por estande)
- **Merchandising** (comissão sobre vendas; em shows, "soft merch" vs "hard merch" têm percentuais distintos)
- **Bar e praça de alimentação própria** (diferente de concessão: a produtora opera e tem custo + receita direto)

**Gap no nosso sistema:** A pesquisa 29 cobre precificação de estandes e break-even do evento. Mas não há modelagem de cada fonte de receita como entidade com suas próprias deduções (ex.: NBOR de ingressos com desconto de ISS, taxa Sympla, ECAD; ou comissão de concessão com dedução do custo de montagem do ponto). O vínculo receita → custo → margem por fonte é o que falta para um demonstrativo de resultado do evento.

**Fontes:**
- https://backstageproapp.com.br/erp-para-eventos-solucao-completa-gestao-produtora/
- https://prism.fm/blog/live-music-events/5-top-live-event-management-software-features/
- https://www.ticketfairy.com/blog/deal-or-no-deal-navigating-booking-contracts-settlements-for-venues-in-2026

---

## GAP 9 — Rider Técnico como Entidade — vínculo entre especificações técnicas e custo de produção

**O que as ferramentas fazem (Stagent, Prism.fm, In2event):**

O rider técnico é tratado como entidade do sistema — não apenas como PDF anexado:

- **Input list:** instrumentos, canais de mesa e DIs necessários (vínculo direto com custo de aluguel de equipamento de som)
- **Mapa de palco:** posicionamento de amplificadores, monitores, pedestais (base para ART do engenheiro)
- **Backline solicitado:** instrumentos que o local deve fornecer (vs. artista traz) — diretamente um item de custo cotado
- **Requerimentos de iluminação:** número de fixtures por tipo, DMX, followspot (define custo de sistema de luz)
- **Vídeo/LED:** especificações de tela, resolução, sinal de entrada
- **Energia:** consumo total em kVA, número de fases necessárias (impacta dimensionamento do gerador)
- **Internet/conectividade:** velocidade mínima, número de conexões dedicadas (custo de link dedicado)

**Gap no nosso sistema:** O rider técnico hoje entra como "arquivo anexado ao contrato do artista". Não há campos estruturados que alimentem automaticamente itens de custo (ex.: artista pede 80 kVA → sistema alerta que o gerador contratado tem apenas 60 kVA e cria cotação para upgrade).

**Fontes:**
- https://www.somaovivo.org/artigos/planejando-e-organizando-seu-evento-parte-1-o-rider-tecnico-o-input-list-e-o-mapa-de-palco/
- https://opalcodigital.com.br/site/mapa-de-palco-rider-tecnico-e-input-list-sua-banda-possui/
- https://algohits.com/blog/passo-a-passo-como-montar-um-rider-tecnico-para-shows/

---

## GAP 10 — Gestão de Guest List — controle de cortesias e seu impacto financeiro

**O que as ferramentas fazem (Prism.fm, GuestlistOnline, In2event):**

A guest list (lista de convidados/cortesias) é gerenciada como módulo separado por ter impacto direto na receita:

- **Categorias de cortesia:** artista (contratual, previsto no deal), crew (contratual), imprensa (autorizada pelo marketing), VIP/parceiro (aprovação do produtor), autoridade pública (protocolo), staff
- **Controle de quantidade:** cada artista tem um número máximo de cortesias no contrato; o sistema alerta quando o limite é atingido
- **Conversão em custo:** cada cortesia = receita de ingresso perdida; o sistema calcula "valor de face das cortesias emitidas" como custo de oportunidade
- **Deadline de submissão:** o artista deve enviar a guest list até X horas antes do show; alertas automáticos
- **Controle no portão:** integração com credenciamento (QR code) para confirmar que apenas os aprovados entram
- **Relatório pós-show:** cortesias usadas × emitidas (permite renegociar contratos futuros)

**Gap no nosso sistema:** Cortesia não aparece como entidade na documentação atual — nem como custo de oportunidade no cálculo de NBOR, nem como item de controle operacional.

**Fontes:**
- https://prism.fm/why-prism-for-venues-and-promoters/
- https://tourmanager.info/festival-advance/
- https://www.guestlistonline.com/blog/best-venue-management-software-compared

---

## Resumo dos Gaps por Prioridade para Eventos Rurais

| # | Gap | Impacto direto no centro de custo? | Prioridade sugerida |
|---|---|---|---|
| 1 | Settlement (borderô) | Alto — saldo do cachê no dia do show | Alta |
| 2 | Advancement (checklist pré-show) | Médio — evita surpresas de custo | Média |
| 3 | Rider de hospitalidade | Médio — catering e transfer de artista são custos reais | Média |
| 4 | Credenciamento | Baixo-Médio — vínculo com custo de catering de backstage | Média |
| 5 | Ordem do dia (day sheet) | Baixo — operacional; custo de hora extra em caso de atraso | Baixa |
| 6 | Gantt amarrado a custos | Alto — rastrear quando cada custo é comprometido | Alta |
| 7 | Gestão documental | Médio — licenças vencidas geram multas | Média |
| 8 | Múltiplos fluxos de receita | Alto — DRE completo do evento por fonte | Alta |
| 9 | Rider técnico estruturado | Médio — rider alimenta itens de custo automaticamente | Baixa |
| 10 | Guest list / cortesias | Baixo-Médio — custo de oportunidade sobre NBOR | Baixa |
