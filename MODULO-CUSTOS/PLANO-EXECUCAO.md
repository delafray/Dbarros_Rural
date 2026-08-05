# PLANO DE EXECUÇÃO — Centro de Custo do Evento

> **Parte 1 (abaixo): RECOMEÇO — plano vigente (04/08/2026, sessão da noite).**
> **Parte 2 (final): plano da v1 — EXECUTADO, mantido como referência.**

---

# PARTE 1 — PLANO DO RECOMEÇO (vigente)

> Origem: usuário decidiu recomeçar pelo "início certo" (`RECOMECO-2026-08-04.md`).
> Início definido até agora: **cadastros-base e ESPAÇOS primeiro** — catálogo
> real do Prosperitas + biblioteca de espaços das planilhas reais + tela de
> descritivo idêntica ao Prosperitas modificado (RF-056/057/058). Tudo que a
> v1 construiu por baixo (banco, motor, testes) é aproveitado.
> Regra dos blocos SQL mantida: um bloco por vez — **nunca dois pendentes**.

## Fases do recomeço

| Fase | Entrega | Estado |
|---|---|---|
| **R0. Dados reais no banco** | Import do catálogo Prosperitas (340 produtos, 13 grupos, unidades, frequência real) ✅ APLICADO · **Bloco 19** (grupo nos descritivos) · **Bloco 20** (13 templates reais das 96 planilhas, 84 itens) | ✅ import · ⏳ Bloco 19 → depois Bloco 20 (nesta ordem, um por vez) |
| **R1. Port literal da tela de descritivo** (RF-057/058) | `ProdutoAutocomplete` + `EspacoDescritivo` por seções de grupo, cópia fiel do Prosperitas modificado (estilos/teclado/badge Nx idênticos, cores do tema original); autocomplete = filtro local imediato + busca RF-049 mesclada (utils/descritivoSugestoes, 19 testes) + incremento de `frequencia_uso` na seleção | ✅ CONSTRUÍDO 04/08 (commits R1) — testar com Blocos 19/20 aplicados |
| **R2. Aba Espaços em duas zonas** (RF-056) | `EspacosTab` reescrita: padrões da biblioteca em cima ("Setar neste evento" = instancia cópia editável, copiando grupo_id), espaços do evento abaixo (setados + exclusivos, badge de origem); descritivo abre nas duas zonas; 265 testes, build ok | ✅ CONSTRUÍDO 04/08 — **na tela, exige Blocos 19/20 aplicados** (grupo_id/grupos) |
| **R3. Limpeza seletiva do catálogo seed** | **Bloco 21** entregue: desativa (ativo=false, reversível) 12 seeds estruturais com equivalente real VERIFICADO; mantém os sem equivalente (mobiliário plástico, blimp, galhardete, gerador...) e todos os não-estruturais | ⏳ bloco aguardando aplicação (depois do 19 e 20) |
| **R4. Seções além da Estrutura** | Julgamento (por raça: jurados, kit RF-023, premiação, taxas de associação) e Diversos como conteúdo da grade por seção (RF-055); itens virão das planilhas de custos reais e de relatos "que vão chegar" (lista aberta) | aguarda insumos do usuário |
| **R5. Redesenho do fluxo do evento** | Rever o wizard/fluxo da v1 a partir do início certo completo — **pendente o usuário descrever a ordem certa de uso ponta a ponta** (pergunta do RECOMEÇO, respondida só em parte: espaços primeiro) | aguarda o usuário |

## O que NÃO muda no recomeço

Banco/motor/testes da v1 (25 tabelas, 76 policies, custosCalc, parseBR,
xlsx travado, busca); v2 registrada (PDF cliente RF-054, snapshot RF-037,
previsão RF-046, de-para UI RF-045, feed, ABC); modo de trabalho (IA executa,
blocos unitários, commits pequenos, ~90% cobertura, guardiã da especificação).

---

# PARTE 2 — PLANO DA v1 (EXECUTADO em 04/08/2026; referência)

> Consolidação do Fable sobre os 3 planos Opus
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
