# 🔄 PROTOCOLO DE RETOMADA — Módulo Centro de Custo do Evento

> **PARA A IA**: quando o usuário disser algo como "vamos voltar ao nosso novo
> módulo", "voltar ao módulo de custos", "continuar o centro de custo" —
> **este arquivo é o ponto de entrada**. Siga o protocolo abaixo ANTES de
> responder qualquer coisa de conteúdo.

## Protocolo de carga de contexto (ordem obrigatória)

1. **Ler os 7 arquivos de `DOC-MODULO-CUSTOS/` INTEIROS, nesta ordem**:
   `00-INDICE` (regras do processo, 6 regras — inclui autoridade de decisão
   delegada) → `01-VISAO` → `02-DOMINIO` (todos os relatos do usuário, datados)
   → `03-REQUISITOS` (52 RFs + 14 RNFs) → `04-PERGUNTAS-E-DECISOES` (log de
   ~30 decisões + triagem final) → `05-CHECKLIST` (5 camadas) →
   `06-PONTOS-CEGOS`.
2. **Ler `PLANO-MODULO-CUSTOS-EVENTO.md`** sabendo que está DEFASADO — é
   rascunho subordinado, será reescrito antes de implementar.
3. **Pesquisa (68 relatórios em `PESQUISA-MODULO-CUSTOS/`): NÃO ler tudo** —
   usar o mapa temático abaixo e abrir sob demanda quando o assunto surgir.
4. Só então responder ao usuário, demonstrando o estado (ele vai testar se o
   contexto voltou).

## Mapa temático da pesquisa (abrir sob demanda)

| Tema | Relatórios |
|---|---|
| Modelo de dados / procurement / schema / RLS | 01, 12, 39, 61, 62, 65 |
| UX planilha / paste Excel / import | 02, 08, 09, 15, 17, 20 |
| Domínio rural: custos, legal, julgadores | 03, 06, 07, 16, 18, 19, 21, 22, 36 |
| Cotações / fornecedores / mapa comparativo | 05, 11, 45, 53 |
| Financeiro: previsto×realizado, precificação, aprovação | 04, 10, 13, 29, 64, 67, 68 |
| Operação: caixas, cashless, limpeza, segurança, RH, ciclo | 23–28, 30–33 |
| Decomposição por dentro (7 faces, consumíveis, áreas) | 41–52, 54–60 |
| Gaps e auditorias | 34–38, 40 |
| Deliberações do tribunal (Q-001, Q-021) | 61–68 |

## Estado congelado em 02/08/2026

- **Fase**: PLANEJAMENTO ENCERRADO NA PRÁTICA — levantamento maduro, aguardando
  o usuário decidir QUANDO construir. **Implementação NÃO autorizada.**
- **52 RFs + 14 RNFs**, todas as decisões estruturais tomadas (edição como raiz;
  3 gavetas de alocação; 5 camadas de criação; port do Prosperitas código+dados;
  busca estilo Mercado Livre em Postgres puro; planilha travada ida-e-volta).
- **Perguntas em aberto — só 3, nenhuma bloqueante**: Q-010 (planilhas da
  migração — perguntar na implementação), Q-015 ("bem-estar" = ?), Q-027
  ("caex" = ?).
- **Pendências de trabalho da IA** (fazer quando a retomada apontar para
  construção): (a) absorver relatórios 41–60 no checklist 05; (b) reescrever o
  plano técnico contra os 52 RFs + achados de RLS do rel. 65 (policies por
  edição reais; `evento_id NOT NULL`; criação atômica pai+edição; estado
  simulação).
- **Regras de trabalho com o usuário** (detalhes no 00-INDICE e na memória
  persistente): tudo que ele cita são EXEMPLOS (completar, nunca fechar
  listas); IA decide o derivável e registra no log; perguntar só o que SÓ ele
  sabe; corrigir com fatos mesmo se ele disser "sim"; commits pequenos
  verificados; teste ~90% + todas as tabelas primeiro quando construir; prazo
  calibrado por dev assistido por IA (9 sistemas/5 meses).

## Modo de construção (quando começar): IA = GUARDIÃ DA ESPECIFICAÇÃO

Regra do usuário (02/08/2026): **ele compõe o projeto pedindo peça por peça;
a IA lembra de tudo.** A cada pedido, ANTES de executar: cruzar com os RFs e
decisões → avisar o que já existe para reaproveitar (ex.: cadastro de produtos
= port do Prosperitas, RF-031/044) → lembrar requisitos amarrados (relatório →
sai em xls, RF-047; cotação → exclusões RF-052; grade → 7 faces RF-051) →
apontar o que o pedido esquece. Nunca executar "cru" um pedido que a
documentação enriquece. (Regra 7 do `DOC-MODULO-CUSTOS/00-INDICE.md`.)

## Roteiro sugerido para a sessão de retomada

1. Confirmar com o usuário o objetivo da sessão: despejar mais requisitos ×
   fechar pendências × partir para o plano/construção.
2. Se for construção: executar as 2 pendências de trabalho acima ANTES de
   qualquer código, apresentar o plano revisado, e só começar com autorização
   explícita — branch `feature-modulo-custos`, Fase 0 = todas as tabelas + RLS
   + testes.
