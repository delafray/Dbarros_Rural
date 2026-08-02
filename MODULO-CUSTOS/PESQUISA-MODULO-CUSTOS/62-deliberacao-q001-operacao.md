# 62 — Deliberação Q-001: o custo vive na EDIÇÃO ou no evento-pai?

> Deliberação de OPERAÇÃO (não técnica), 02/08/2026. Perspectiva: gestor de
> eventos rurais tocando o dia a dia (criar, copiar, comparar, encerrar).
> Fontes: `02-DOMINIO`, RF-046 (previsão que abre a conversa), RF-042
> (modularidade por perfil), e o schema atual (`eventos` → `eventos_edicoes`,
> FK `evento_id`; a edição já carrega `ano`, `data_inicio/fim`, `titulo`,
> `ativo`). O nome do módulo é "Centro de Custo do Evento".

## DECISÃO

**O orçamento/custos amarra na EDIÇÃO (`eventos_edicoes`).** Cada centro de
custo pertence a uma edição-ano; o evento-pai (`eventos`) é só o guarda-chuva
que costura as edições para comparar e herdar. A chave de todas as tabelas de
custo é `evento_edicao_id`, nunca `evento_id`.

## Por quê (a lógica da operação)

Um orçamento é sempre de UM evento que vai acontecer numa data, com um preço,
uma negociação e um encerramento próprios. "Rodeio de X" não tem custo — o
"Rodeio de X 2026" tem. Amarrar no pai obrigaria a misturar dinheiro de anos
diferentes na mesma pilha e inventar filtros de ano em cada tela; amarrar na
edição dá a cada ano seu caderno fechado e usa o pai só para o que ele serve:
puxar o ano anterior como base (RF-046), comparar 0,75 → 1 → 1,25 e consolidar
"quanto o Rodeio me custou em 3 anos". A edição já é a entidade viva do sistema
(datas, montagem, planta) e já é onde os cardápios se penduram — custo segue o
mesmo eixo, sem exceção arquitetural.

## Como cada cenário se resolve

| # | Cenário | Com custo na EDIÇÃO (decisão) |
|---|---|---|
| 1 | Rodeio anual, copiar 2025 → 2026 e negociar | Abre "Rodeio X 2026" (nova edição do mesmo pai), botão "copiar custos da edição anterior" clona orçado/compostos; realizado de 2025 fica intacto como âncora do RF-046. **Ganha.** |
| 2 | Dia de campo avulso, talvez único | Vira evento-pai com **uma** edição só. Custo mora na edição igual a todos. Nenhum caso especial — o pai com 1 filho é o padrão degenerado, não uma exceção. **Ganha (modularidade RF-042).** |
| 3 | Dois eventos do mesmo pai no mesmo ano | Suportado de graça: duas edições com mesmo `evento_id` e mesmo `ano` (a edição não é "1 por ano", é "1 por realização"). Cada uma tem seu centro de custo. **Ganha.** |
| 4 | "Quanto o Rodeio me custou nos últimos 3 anos" numa tela | O pai agrega as edições (SUM por `evento_id`) — série anual pronta. Se o custo morasse no pai, essa tela seria *mais fácil*, mas todo o resto (itens, cotações, rateio, realizado) seria por ano de qualquer jeito → o pai teria de ganhar coluna de ano assim mesmo. **Empata na consolidação, ganha no resto.** |
| 5 | Evento cancelado no meio | Marca a **edição** como cancelada (`ativo=false` + status): o orçado/contratado até ali fica arquivado naquele ano, o realizado (sinais, adiantamentos perdidos) é histórico honesto, e o pai segue vivo para o próximo ano. **Ganha** — no pai, cancelar sujaria a série. |

## O que se ganha e o que se perde

**Custo na EDIÇÃO (decisão)**
- Ganha: cada ano é um caderno fechado (criar/copiar/encerrar limpos); RF-046 e
  a comparação plurianual saem naturais; alinha com o schema atual (edição já é
  a entidade operacional, cardápios já se penduram nela); cancelamento não
  contamina o histórico; dois eventos/ano sem gambiarra.
- Perde: a tela "3 anos numa vista" exige um JOIN/agregação pelo pai — trabalho
  do backend, invisível ao gestor. Custo baixo e pontual.

**Custo no EVENTO-PAI (alternativa rejeitada)**
- Ganha: a consolidação plurianual seria uma leitura direta, sem agregação.
- Perde: sem ano nativo, todo custo precisaria de um campo de ano paralelo
  (recriando a edição por fora); copiar "o ano passado" viraria filtrar-e-clonar
  na mão; cancelar um ano mancharia a série do pai; dois eventos no mesmo ano
  colidiriam; e romperia o padrão do sistema (cardápios/datas na edição, custo
  no pai) — duas âncoras para a mesma coisa. **Troca um relatório fácil por um
  dia a dia difícil.**

## Encaminhamento

- Chave das tabelas de custo: `evento_edicao_id` (FK → `eventos_edicoes`).
- Consolidação plurianual = view/agregação por `evento_id` (relatório do dono).
- "Copiar custos da edição anterior" e a âncora histórica do RF-046 leem a
  edição imediatamente anterior do mesmo `evento_id` (ordenar por `ano`).
- Cancelamento de edição: status próprio da edição, não toca o pai.
- Atualizar Q-001 → RESPONDIDA no `04-PERGUNTAS-E-DECISOES.md` (pendente de
  confirmação do usuário).
