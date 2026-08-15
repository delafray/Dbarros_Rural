# DOC — Módulo de Custos do Evento (documentação viva)

> **FASE ATUAL: PLANEJAMENTO. Nenhuma linha de código será escrita até o
> usuário autorizar explicitamente o início da implementação.**
>
> Esta pasta é a **fonte única da verdade** do módulo. O levantamento vai durar
> várias sessões: o usuário vai lembrando do que o sistema precisa cobrir aos
> poucos, e **todo requisito novo entra aqui com data e status** — nada fica só
> na conversa.

## Como usar esta pasta (regras para a IA e para o usuário)

1. **Toda vez que o usuário disser algo que o sistema deve cobrir**, registrar
   em `03-REQUISITOS.md` como RF/RNF numerado, com data e o texto da decisão.
   **REGRA (usuário, 01/08/2026): tudo que o usuário cita são EXEMPLOS, nunca
   listas fechadas.** Ao documentar, tratar os itens citados como semente,
   completar com o que a pesquisa/domínio indicar (marcando a origem de cada
   item) e deixar toda lista explicitamente ABERTA/extensível.
2. **Toda dúvida** vira pergunta numerada (Q-nnn) em `04-PERGUNTAS-E-DECISOES.md`.
   Quando o usuário responder, a pergunta migra para o log de decisões — com
   data e resposta. Perguntas nunca são apagadas.
3. **Nada é implementado** enquanto o status geral for PLANEJAMENTO. Quando o
   usuário der o "pode começar", o plano técnico (`../PLANO-MODULO-CUSTOS-EVENTO.md`)
   é revisado contra esta documentação e só então vira execução.
4. Ao final de cada sessão de levantamento, atualizar a data em "Última sessão"
   abaixo.
5. **Papel ATIVO da IA (pedido do usuário, 01/08/2026)**: não apenas registrar
   o que o usuário lembra — a cada avanço, cruzar o que existe e **propor os
   pontos cegos** (o que ninguém lembrou) em `06-PONTOS-CEGOS-A-VALIDAR.md`.
   "No final tem de ser super simples de montar, mas sabemos que tudo por
   baixo é extremamente complexo" — a IA carrega a complexidade, o usuário
   valida.
6. **AUTORIDADE DE DECISÃO delegada à IA (usuário, 02/08/2026)**: "não sou eu
   quem dá ok — você define o que precisa ou não de mim". A IA decide tudo que
   é derivável do contexto/pesquisa (registrando no log com justificativa);
   só pergunta ao usuário o que **só ele sabe** (fatos do negócio dele); e se
   o usuário apontar um caminho que os fatos contradizem, a IA **traz os fatos
   em vez de obedecer calado** — "se eu disser sim e vc viu que fui pro
   caminho errado, nem pergunte".
7. **MODO DE CONSTRUÇÃO — IA como GUARDIÃ DA ESPECIFICAÇÃO (usuário,
   02/08/2026)**: "quem vai fazer o sistema sou eu, mas tudo que eu fizer já
   deve ter tudo contemplado — eu vou compor o projeto, mas você tem de me
   lembrar de tudo." Na construção, o usuário pede peça por peça, e a IA, a
   CADA pedido, ANTES de executar: (a) cruza o pedido com os RFs, decisões e
   pesquisa; (b) avisa o que já existe pronto para reaproveitar (ex.: "cadastro
   de produtos" → o Prosperitas já tem tudo, é port — RF-031/044); (c) lembra
   os requisitos amarrados ao pedido (ex.: "relatório" → tem de sair em xls,
   RF-047; "cotação" → campos de exclusões RF-052); (d) aponta o que o pedido
   esquece. **Nunca executar "cru" um pedido que a documentação enriquece.**

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `01-VISAO-E-ESCOPO.md` | O que o módulo é, o que NÃO é, para quem, critério de sucesso |
| `02-DOMINIO-EVENTO-RURAL.md` | Como o negócio funciona na prática (relato do usuário) + fatos do domínio (obrigações legais, custos típicos) |
| `03-REQUISITOS.md` | Requisitos funcionais (RF) e não-funcionais (RNF) numerados, com data e status |
| `04-PERGUNTAS-E-DECISOES.md` | Perguntas abertas (Q-nnn) e log de decisões tomadas |
| `05-CHECKLIST-CRIACAO-EVENTO.md` | Questionário "tica o que se aplica" na criação do evento (RF-020) — lista candidata aguardando validação do usuário |
| `06-PONTOS-CEGOS-A-VALIDAR.md` | O que NINGUÉM lembrou ainda — análise ativa da IA (PC-01…PC-27), aguardando veredito do usuário item a item |

## Documentos relacionados (fora desta pasta)

- `../PLANO-MODULO-CUSTOS-EVENTO.md` — rascunho técnico (9 fases, 9 tabelas).
  **Subordinado a esta documentação**: será revisado quando o levantamento fechar.
- `../PESQUISA-MODULO-CUSTOS/01…20-*.md` — 20 relatórios de pesquisa de mercado,
  domínio, UX e técnica (3 Opus, 10 Sonnet, 7 Haiku em 01/08/2026).

## Status

- **Fase:** 🚀 **CONSTRUÇÃO** (autorizada em 04/08/2026)
- **Levantamento:** 01–02/08/2026 (52 RFs + 14 RNFs, decisões estruturais tomadas)
- **Modo de execução:** IA executa tudo com ~90% de testes; **SQL em blocos
  unitários** — IA entrega bloco → usuário aplica no Supabase → confirma →
  próximo bloco. Branch `feature-modulo-custos`, commits pequenos verificados.
- **Pesquisa:** 68+ relatórios em `../PESQUISA-MODULO-CUSTOS/`
- **Pendência ativa:** absorver os relatórios 41–60 no checklist `05` (pode
  ocorrer durante a construção, ao semear os dados)
