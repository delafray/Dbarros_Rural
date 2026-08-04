# PLANO DE EXECUÇÃO — Centro de Custo do Evento (v1)

> **OPERATIVO desde 04/08/2026** — consolidação do Fable sobre os 3 planos Opus
> (rel. 69-banco, 70-entrega, 71-qualidade). Substitui `PLANO-MODULO-CUSTOS-EVENTO.md`.
> Modo: IA executa tudo; **SQL vai ao usuário em blocos unitários** (aplica no
> Supabase → confirma → próximo). Branch `feature-modulo-custos`. ~90% de
> cobertura no código novo, medida e travada por config.

## Julgamento do Fable sobre os 3 planos

- **Adotado do plano A (banco)**: 23 tabelas + 6 enums em **14 blocos SQL** com
  verificação por bloco; RLS própria por edição (helper `custos_papel()` das
  flags reais de `users` — NUNCA copiar `master_isolation`); projetista sem
  valores via **view sem colunas de preço**; busca RF-049 por função
  (`unaccent`+`pg_trgm`+FTS pt + tabela de sinônimos + ranking por frequência).
- **Adotado do plano B (entrega)**: 7 fases; port do Prosperitas para a
  estrutura REAL do repo (raiz sem `src/`; singleton `services/supabaseClient`);
  **ExcelJS** para escrita protegida (chunk lazy no vite), Papa Parse p/ TSV,
  DOMPurify; SheetJS CE só como fallback de spike.
- **Adotado do plano C (qualidade)**: cobertura hoje é inauditável → 1º
  entregável é `vitest.config.ts` com thresholds **escopados aos arquivos do
  módulo** (não pune código legado); **reusar `utils/money.ts`** no rateio;
  invariante do rateio protegida por TESTE (não trigger); pré-check de órfãs
  antes de `SET NOT NULL`; rollback escrito por bloco; cortes v2.
- **Divergência arbitrada**: A queria trigger de conservação do rateio; C
  demonstrou fragilidade — fica teste denso + CHECKs simples. Baseline
  imutável continua por trigger (barato e certeiro).

## Cortes para v2 (registrados; schema já prepara onde barato)

Envio integrado de planilha; dashboard de fluxo de caixa semanal (parcelas já
no schema); calculadora kVA; base de custos online; curva ABC; avaliação de
fornecedor; feed narrativo; ranking sofisticado de matching; precificação
avançada. **Núcleo intocável da v1**: grade portada, compostos+rateio, wizard 5
camadas com checklist condicional, cotação por planilha bloqueada com
exclusões/all-in, RLS por edição, 3 camadas O×C×R, snapshot de encerramento,
estado simulação, busca Mercado Livre.

## Fases (cada uma = commits pequenos verificados)

| Fase | Entrega | Testes |
|---|---|---|
| **0. Fundação** | vitest.config + coverage travada; `utils/custosCalc.ts` (totais, 3 gavetas, rateio c/ invariante via money.ts, projeção EAC, desvios); `utils/parseBR.ts` (número/data BR, CNPJ); tipos `types/custos.ts`; **Blocos SQL 1–5** (extensões/enums/helpers, ajustes aditivos no schema existente, catálogo empresa: categorias/fornecedores/produtos/sinônimos/equivalências) | puras ≥95% |
| **1. Grade (port)** | `custosService` + port `ProjetoDescritivoTab`/`ProdutoAutocomplete` → `components/custos/`; página `CentroCusto.tsx`; busca; **Blocos 6–8** (espaços/compostos, itens, faces) | service mockado ≥90% |
| **2. Camadas O×C×R + paste** | colunas orçado/contratado/realizado na grade; paste TSV (Papa Parse) com preview; baseline congelada; **Bloco 9** (baseline/trigger) | parser denso |
| **3. Wizard 5 camadas** | perfil → obrigatórios → estrutura → composição → detalhes; checklist condicional semeado (seeds do checklist 05 + rel. 41–60); prazos-alerta; **Blocos 10–11** (checklist/seeds, providências) | regras de ativação |
| **4. Compostos + rateio** | modal de agrupamento (RF-036), rateio nas 3 gavetas, custo do composto + "gerais a cobrir"; **Bloco 12** (rateio) | invariante Σ==total |
| **5. Cotações + fornecedores** | pedidos, xlsx protegido ida-e-volta (spike ExcelJS primeiro), import por CNPJ, mapa item×fornecedor c/ all-in, split award; **Blocos 13a-c** (RLS completa + views projetista) | round-trip + RLS SQL |
| **6. Dashboard + encerramento** | O×C×R×Projeção×Desvio c/ semáforo, snapshot de encerramento, previsão 0,75→1→1,25, export xls/txt; **Bloco 14** (audit) | fórmulas |

## Protocolo do bloco SQL (regra do usuário)

1. IA entrega o bloco (pequeno, autocontido, idempotente) + query de verificação + rollback.
2. Usuário aplica no painel Supabase, roda a verificação, informa o resultado.
3. IA confere e libera o próximo. **Nunca dois blocos pendentes ao mesmo tempo.**

Detalhes completos: rel. 69 (DDL de tudo), 70 (arquivos por fase), 71 (riscos/DoD).
