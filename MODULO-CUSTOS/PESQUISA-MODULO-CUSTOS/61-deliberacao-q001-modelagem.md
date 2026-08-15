# 61 — Deliberação Q-001: FK raiz do Centro de Custo (edição × evento-pai)

> Data: 02/08/2026 · Lente: modelagem de dados · Contexto: React+TS+Supabase.
> Escopo: qual FK raiz amarra as ~10 tabelas novas do módulo de custos
> (item_necessidade, pedido_orcamento, cotacao, contrato, pagamento, compostos...).

---

## DECISÃO

**A FK raiz do módulo de custos é `edicao_id` → `eventos_edicoes`.**
O centro de custo pertence a uma EDIÇÃO, não ao evento-pai. Toda tabela nova
carrega `edicao_id NOT NULL` como âncora; o evento-pai é alcançado por join
(`eventos_edicoes.evento_id`), nunca duplicado nas tabelas de custo.

---

## POR QUÊ (o raciocínio de modelagem, em 6 linhas)

1. O orçamento é um fato de um ciclo no tempo: "Rodeio de X **2026**" tem carga,
   fornecedores, cotações e pagamentos próprios — o mesmo item (tenda) tem preço
   diferente por ano. Esse é exatamente o grão de `eventos_edicoes`; ancorar no
   pai forçaria um `ano`/discriminador em CADA tabela para não misturar edições.
2. RF-046 (previsão que abre a conversa) e RF-037 (comparar 2025×2026, copiar como
   base) são comparações **entre edições do mesmo pai** — a query natural é
   `WHERE evento_id = X GROUP BY edicao_id`. Isso só existe limpo se cada custo
   já nasce preso a uma edição; ancorar no pai exigiria reconstruir "qual ano" por fora.
3. O sistema já tratou a edição como grão da operação (`users.edicao_id`); manter o
   módulo de custos no mesmo grão preserva integridade e RLS por edição.

---

## O caso do evento AVULSO (sem recorrência)

Regra: **toda edição precisa de pai; o pai é criado sempre (inclusive para avulsos)**.
Um "dia de campo único" continua sendo `eventos` (1) + `eventos_edicoes` (1). Não se
cria um caminho paralelo "custo direto no evento sem edição" — isso seria um segundo
grão raiz (FK opcional/polimórfica) e é justamente o que encarece mudar depois.

- Se hoje o cadastro de evento avulso já materializa uma edição: nada a fazer, a FK
  cai natural nela.
- Se o cadastro puder criar `eventos` sem `eventos_edicoes`: a criação de evento
  passa a **garantir a edição-pai automática** (edição "única"/default) antes de abrir
  o centro de custo. Custo baixo, e o avulso vira, no futuro, o "ano 1" caso o evento
  se torne recorrente — sem migração de dados.

Consequência: **uma edição sempre tem pai** (integridade referencial trivial, NOT NULL
em ambos os lados) e **nunca há custo órfão** apontando para nível de granularidade errado.

---

## Comparação entre anos e cópia como base (RF-037 / RF-046)

- **Comparar 2025×2026:** com `edicao_id` como raiz, é `JOIN eventos_edicoes USING(evento_id)`
  e `GROUP BY edicao_id`. Direto. No modelo ancorado no pai, "qual ano" não existiria como
  dimensão de primeira classe — teria de virar coluna redundante em cada tabela.
- **Copiar como base:** clonar o centro de custo = `INSERT ... SELECT` de todas as tabelas
  filtrando `edicao_id = origem` e trocando por `edicao_id = destino` (nova edição do mesmo
  pai). O grão único torna o clone um passo mecânico; o snapshot de encerramento (RF-037)
  congela por edição.
- **Previsão instantânea (RF-046):** a série "0,75 → 1,00 → 1,25" é literalmente
  `SUM(...) por edicao_id ORDER BY ano` dentro do mesmo `evento_id`. Nasce de graça.

---

## RLS

- Política por `edicao_id` (padrão do repo, que já isola por edição em `users.edicao_id`):
  o usuário enxerga custos das edições a que tem acesso. Uma única cláusula
  `edicao_id IN (edições permitidas)` protege TODAS as ~10 tabelas — consistente e auditável.
- Ancorar no pai obrigaria a RLS a raciocinar "todas as edições do pai", alargando o escopo
  de visão além do necessário e complicando o caso multiedição/multiusuário.
- Regra do projeto mantida: visitante nunca escreve; NOT NULL em `edicao_id` impede linha
  de custo sem âncora (nenhuma escrita "solta").

---

## Custo de errar (por que edição é o lado seguro)

- **Errar para BAIXO (ancorar no pai e depois precisar por edição):** catastrófico. Todos os
  custos de anos diferentes ficam no mesmo balde; separar depois exige backfill de "qual ano"
  em ~10 tabelas, com dados já misturados e sem discriminador confiável. É migração de dado
  real, arriscada.
- **Errar para CIMA (ancorar na edição e o pai bastar):** barato. Consolidar por pai é só
  remover o `GROUP BY edicao_id` (subir de nível num join que já existe). Descer de nível é
  caro; subir é uma query. Escolhe-se sempre o grão mais fino que o negócio exige — e RF-046/037
  exigem o fino.

---

## Consequências práticas

**Fica FÁCIL:**
- Comparar edições, série histórica, previsão RF-046, snapshot e cópia-como-base (RF-037).
- RLS uniforme por `edicao_id` numa cláusula só.
- Preço do mesmo item por ano (histórico RF-016) sem discriminador extra.
- Integridade: `edicao_id NOT NULL` + FK; zero custo órfão ou de grão ambíguo.

**Fica CHATO (e mitigação):**
- Todo evento — inclusive avulso — precisa de uma edição-pai. Mitigar garantindo a criação
  automática da edição no cadastro do evento (evento sem edição não abre centro de custo).
- Relatórios "do evento inteiro" (todos os anos somados) exigem o join até `eventos` e um
  `GROUP BY evento_id`. É trivial, mas é um passo a mais que não existiria se ancorasse no pai.
- Referências que são naturalmente do PAI (ex.: catálogo de produtos RF-044, cadastro de
  fornecedores RF-010, equivalências RF-045, biblioteca de espaços RF-050) **não** descem para
  a edição: são globais/da empresa e vivem em suas próprias tabelas, referenciadas pelas linhas
  de custo. Só o **centro de custo** (orçado/contratado/realizado) ancora na edição.

---

## Nota de implementação (não normativa)

Todas as tabelas do modelo enxuto do rel. 01 trocam `evento_id` por **`edicao_id`** como raiz:
`item_necessidade`, `pedido_orcamento`, `cotacao`, `contrato`, `pagamento`, compostos e junções.
Fornecedores, produtos, equivalências e biblioteca de espaços permanecem de nível empresa/pai.
