# MISSÃO NOTURNA — 05/08/2026 ~01:25 (agendada pelo usuário em 04/08 ~23:30)

> Ordem do usuário: "este sistema está uma bagunça... vc vai entender o que os
> eventos rurais precisam para serem PRECIFICADOS... de manhã quero um resumo."
> Execução 100% automática durante a madrugada; janela desta sessão fica ativa.

## O que fazer (nesta ordem)

### Etapa A — Lançar UM agente FABLE orquestrador (Agent tool, model: fable)

O orquestrador recebe este arquivo como briefing e comanda tudo. Ele NÃO
altera código, NÃO aplica SQL, NÃO commita em arquivos de produto — só lê,
pesquisa e escreve os entregáveis abaixo.

### Etapa B — Fase de LEITURA: 12 agentes (8 Sonnet + 4 Haiku), distribuição:

- **Sonnet 1**: `MODULO-CUSTOS/DOC-MODULO-CUSTOS/00–03` inteiros (regras,
  visão, domínio com TODOS os relatos, 59 RFs/14 RNFs).
- **Sonnet 2**: `04-PERGUNTAS-E-DECISOES.md` inteiro (~45 decisões) +
  `05-CHECKLIST` + `06-PONTOS-CEGOS`.
- **Sonnet 3**: `LEIA-PRIMEIRO-RETOMADA.md`, `RECOMECO-2026-08-04.md`,
  `PLANO-EXECUCAO.md` (as 2 partes), `IMPORT-CATALOGO-PROSPERITAS.md`.
- **Sonnet 4**: OS PEDIDOS DE HOJE: `git log --since="2026-08-04" --stat` na
  branch `feature-modulo-custos` + as linhas de 04/08 do log de decisões —
  extrair O QUE O USUÁRIO PEDIU COM AS PALAVRAS DELE (espaços padrão ×
  exclusivo; tela de Cadastros com voltar; port LITERAL da tela do
  Prosperitas "estou acostumado"; gestão de produtos com trava e histórico;
  "like descartado em todas as fases"; import = SÓ Estrutura, "Julgamento,
  Diversos e outros vão chegar").
- **Sonnet 5**: relatórios de precificação/financeiro: PESQUISA 04, 10, 13,
  29, 40, 64, 67, 68.
- **Sonnet 6**: deliberações e adversarial: 61–66 + 39 (auditoria).
- **Sonnet 7**: espaços reais: 72–78 + planilhas reais (seções do 02).
- **Sonnet 8**: decomposição por dentro: 41–53 (7 faces, consumíveis, bar,
  letras miúdas, all-in).
- **Haiku 1**: relatórios 01–08 (resumir achados-chave).
- **Haiku 2**: relatórios 09–20.
- **Haiku 3**: relatórios 21–33 (julgadores, operação).
- **Haiku 4**: relatórios 34–38, 54–60.

Cada leitor devolve: (a) o que o usuário quer de verdade; (b) o que ele
VALIDOU como bom (não tocar: tela do descritivo portada, duas zonas,
catálogo real, busca RF-049); (c) o que está confuso/bagunçado/contraditório;
(d) o que FALTA para PRECIFICAR um evento rural ponta a ponta.

### Etapa C — Fase de PESQUISA WEB: 8 agentes Haiku (após consolidar a leitura)

O orquestrador identifica as lacunas da consolidação e despacha 8 Haiku com
WebSearch focados em **precificação de eventos rurais** (temas candidatos —
ajustar pelas lacunas reais): formação de preço/margem de organizadoras;
precificação de estande por m² no agronegócio BR; benchmarks de patrocínio/
mídias (blimp, galhardete, backdrop); custo-base × preço de venda de espaços;
modelos de participação % sobre faturamento (o "Participação Dbarros");
break-even de eventos; reajustes anuais de estruturas 2025/2026; o que
organizadoras cobram além do estande. Salvar como relatórios numerados
**79+** em `MODULO-CUSTOS/PESQUISA-MODULO-CUSTOS/` (padrão dos existentes).

### Etapa D — ENTREGÁVEL DA MANHÃ (o que o usuário vai ler)

**`MODULO-CUSTOS/RESUMO-MANHA-2026-08-05.md`** — em português claro, direto:
1. **O que você quer do sistema** (síntese fiel dos SEUS pedidos, com citações);
2. **O que já está bom e fica** (validado por você);
3. **Onde está a bagunça** (contradições, sobras da v1, fluxo confuso — com
   franqueza e apontando arquivo/tela);
4. **O que falta para PRECIFICAR um evento rural** (o coração: do custo ao
   preço — amarrando RF-034/040/046/054, seções Julgamento/Estrutura/Diversos
   e os achados novos da pesquisa web);
5. **Proposta de ordem de trabalho** (curta, opinativa) para as fases R4/R5.
Máx. ~3 páginas. Commitar SÓ este arquivo + relatórios 79+ (docs, nada de código).

## Regras
- Não editar código, não aplicar SQL, não mexer nos seeds/banco.
- Custos: leitores/pesquisadores são Sonnet/Haiku conforme acima; UM Fable só.
- Se algo falhar, degradar com elegância: entregar o resumo com o que tiver.
