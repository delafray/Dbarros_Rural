# Plano: Stands de Área Livre (Venda por m²)

> Arquivo vivo — atualizado a cada nova informação recebida.
> Status: 🟡 Coletando requisitos

---

## Contexto

O sistema atual foi desenvolvido para **stands de área fixa**: cada categoria tem preço fixo
(standBase + combos). O stand tem tamanho predefinido e preço predefinido.

O novo requisito é suportar **eventos de área livre**:
- Stands vendidos **por metro quadrado**
- Cada stand pode ter **tamanho diferente** (m²) definido individualmente
- O preço por m² é uma **referência da categoria**, mas pode ser **sobrescrito por stand** (área privilegiada = preço/m² maior)
- Tamanho e preço podem **variar a qualquer momento**

**Problema central identificado:**
Na tela de configuração atual, cada categoria gera N stands idênticos (mesmo preço). Para área livre,
cada stand tem tamanho e preço únicos. Cadastrar como categorias separadas (1 categoria = 1 stand)
tornaria a lista inútil — seria mais fácil usar Excel.

---

## Sistema Atual — O que já existe

### Tabela `planilha_vendas_estandes`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | PK |
| `stand_nr` | TEXT | Número/nome do stand (ex: "P 01") |
| `config_id` | UUID FK | Referência à configuração da planilha |
| `cliente_id` | UUID FK | Cliente comprador |
| `cliente_nome_livre` | TEXT | Cliente sem cadastro |
| `tipo_venda` | TEXT | "DISPONÍVEL", "STAND PADRÃO", "COMBO 01", "COMBO 01*" |
| `desconto` | NUMERIC | Desconto em reais (centavos) |
| `valor_pago` | NUMERIC | Valor já pago (centavos) |
| `opcionais_selecionados` | JSONB | `{ "Nome": "x" \| "*" \| "" }` |
| `observacoes` | TEXT | Observações livres |

### `CategoriaSetup` (JSONB em `planilha_configuracoes.categorias_config`)
```typescript
interface CategoriaSetup {
    tag: string;           // ID único (ex: "PADRÃO 64M")
    prefix: string;        // Prefixo do stand_nr (ex: "P")
    cor: string;           // Cor visual
    count: number;         // Quantidade de stands gerados
    standBase?: number;    // Preço fixo base (centavos)
    combos?: number[];     // Preços dos combos (centavos)
    comboNames?: string[]; // Nomes dos combos
    ordem?: number;
    is_stand?: boolean;    // false = não é stand (ex: merchandising)
}
```

### Cálculo atual (fixo)
```
totalVenda = precoDoCombo(categoria, tipo_venda) + totalOpcionais - desconto
```

### Como os stands são gerados
`syncEstandes()` lê categorias → para cada categoria gera `count` stands com `stand_nr = prefix + sequencial`.
Stands vazios podem ser deletados ao reduzir count. Stands com dados são preservados.

### Pontos de edição individual (TempPlanilha.tsx)
- `desconto` — inline editável
- `valor_pago` — inline editável
- `cliente_id` / `cliente_nome_livre` — popup de seleção
- `tipo_venda` — toggle cíclico (DISPONÍVEL → COMBO 01 → COMBO 01* → DISPONÍVEL)
- `opcionais_selecionados` — toggle por item
- `observacoes` — modal

---

## Requisitos Coletados

### ✅ Info 1
- Venda por m²: cada stand tem área (m²) própria
- Preço/m² definido por categoria como referência
- Stand em área privilegiada pode ter preço/m² diferente (sobrescrito individualmente)
- Tamanho e preço variáveis a qualquer momento

### ✅ Info 2 (screenshot ConfiguracaoVendas)
- Um evento pode ter **múltiplas categorias misturadas**: algumas fixas, algumas área livre
- A lista de categorias **deve continuar existindo** — a categoria define agrupamento, cor, prefixo e quantidade
- O que muda por categoria: modo de precificação (`fixo` vs `area_livre`)
- Para área livre: categoria define `preco_m2` de referência + count de stands
- Cada stand gerado herda o `preco_m2` da categoria, mas pode ter seu próprio (override)
- As colunas BASE/COMBO 01/COMBO 02/COMBO 03 não fazem sentido para área livre
  → precisam ser substituídas por coluna `Preço/m²` na configuração

### ✅ Info 3 (fluxo de geração — screenshot + descrição)
- A tela de `ConfiguracaoVendas` é **aproveitada** — não substituída
- Na linha de categoria: adicionar um **flag/toggle "Área Livre"**
- Quando marcado como área livre:
  - As colunas BASE/COMBO somem para essa linha
  - Aparece campo `Preço/m²` de referência
  - Aparece um **botão "Gerar Planilha AL"** (ou similar) na linha
- Ao clicar no botão: abre uma **nova planilha dedicada** para aquela categoria de área livre
  - Esta planilha tem N linhas (N = count da categoria)
  - Cada linha = 1 stand para configurar individualmente (m², preço/m², nome, etc.)
- **A planilha de área livre é SEPARADA da planilha padrão** (não misturada)
- Detalhes de como será a planilha de área livre → ver Info 4

### ✅ Info 4 (aparência da planilha de área livre — screenshot TempPlanilha)
- Visual **idêntico ao da planilha padrão**: tag pequena no canto esquerdo, prefixo + número sequencial, status DISPONÍVEL
- Estrutura base: coluna STAND (tag + prefixo + nº) + coluna CLIENTE + colunas de venda

### ✅ Info 5 (colunas específicas da planilha AL)
Colunas na ordem:
1. **STAND** — tag pequena + prefixo + nº (igual planilha padrão)
2. **CLIENTE** — seleção de cliente (igual planilha padrão)
3. **METRAGEM (m²)** — campo editável inline: tamanho do stand em m²
4. **PREÇO BASE (R$/m²)** — campo editável inline: preço por m² do stand
   - Pré-preenchido com o valor de referência da categoria (`preco_m2` da `CategoriaSetup`)
   - Editável por stand (override individual para áreas privilegiadas)
5. **TOTAL BASE** — calculado: `metragem × preço_m²` (atualiza em tempo real)
   - Editável manualmente (override)
6. **COMBO 01, COMBO 02, ...** — valores sugeridos calculados por stand (ver Info 6)

**Comportamento de guarda de dados:**
- Se o usuário alterar qualquer campo e tentar **navegar para fora** (trocar de página, fechar aba):
  → exibir alerta/modal: *"Você tem alterações não salvas. Deseja sair mesmo assim?"*
- Implementar via `useBlocker` (React Router v6) ou listener `beforeunload`
- Campos alterados ficam em estado "dirty" até salvar

### ✅ Info 6 (combos na planilha AL — cálculo por m²)
Os combos funcionam diferente do modelo fixo. Para área livre:

**Configuração (nível da categoria em `ConfiguracaoVendas`):**
- Cada combo tem um **valor adicional fixo** (add-on), ex: COMBO 01 = +R$4.500
- Esse adicional é independente do m² — é um valor fixo da categoria

**Cálculo por stand (na planilha AL):**
```
base_total    = metragem × preco_m2          (ex: 100m² × R$325 = R$32.500)
COMBO 01 total = base_total + adicional_c01   (ex: R$32.500 + R$4.500 = R$37.000)
COMBO 02 total = base_total + adicional_c02
...
```

**Comportamento na planilha:**
- Sistema calcula e **pré-preenche** o valor sugerido de cada combo por linha
- Valores ficam **editáveis** (override manual por stand)
- Ao alterar metragem ou preço/m², os combos são **recalculados automaticamente**
  (a menos que o usuário já tenha feito override manual)
- ⚠️ "analisando linha por linha" = cada stand tem seus próprios valores calculados independentemente

### ✅ Info 7 (arredondamento)
- Ao calcular o total base e os combos, o sistema pode gerar valores "quebrados"
  - Ex: 27m² × R$325 = R$8.775 (não arredondado)
- O usuário quer poder **arredondar** o valor sugerido
  - Ex: R$8.775 → arredonda para R$8.800
- O arredondamento se aplica ao **total base E a todos os combos** em cascata
  - Ex: base arredondado = R$8.800 → COMBO 01 = R$8.800 + R$4.500 = R$13.300 (também arredondado)
- **Implementação:** botão "⟳ Arredondar" por linha — múltiplo fixo de **R$50**
  - Ex: R$8.130 → R$8.150 | R$8.120 → R$8.100
  - Lógica: `Math.round(valor / 5000) * 5000` (em centavos)
- Os valores arredondados ficam como **override manual** — não são recalculados ao mudar m²
- Ao alterar m² em uma linha que já tem override: célula do total (e combos) fica com **fundo vermelho** indicando valor desatualizado
- Para resolver: clicar "⟳ Arredondar" novamente recalcula + arredonda + remove o fundo vermelho

**Impacto na `CategoriaSetup` (JSONB — sem migration):**
```typescript
// Ao invés de combos: [32500, 37000, 42000] (valores absolutos)
// Área livre usa adicionais: [0, 4500, 9500] (valores a somar ao base calculado)
combos_adicionais?: number[]; // adicional fixo de cada combo (centavos)
```

**Impacto na tabela `planilha_vendas_estandes` (migration necessária):**
```sql
ADD COLUMN area_m2 NUMERIC,                -- metragem do stand
ADD COLUMN preco_m2_override NUMERIC,      -- preço/m² individual (NULL = usa da categoria)
ADD COLUMN total_override NUMERIC,         -- total manual (NULL = usa calculado)
ADD COLUMN combo_overrides JSONB           -- { "COMBO 01": 38000, ... } overrides manuais
```

---

### ✅ Info 8 (comportamento na planilha principal — TempPlanilha)

**Na tela ConfiguracaoVendas:**
- Categoria marcada como área livre: colunas BASE/COMBO ficam **cinzas/desabilitadas** visualmente
- Motivo: os preços reais estão na sub-planilha AL, não aqui
- O resto da linha (TAG, PREFIXO, QTD, STAND?, IMAGENS) funciona normalmente

**Na TempPlanilha (planilha principal):**
- Stands de área livre aparecem **no mesmo lugar** que qualquer outro stand, respeitando a ordenação existente (`ordem` da categoria)
- **Comportamento idêntico** aos outros stands: seleção de cliente, toggle de combos, desconto, valor pago, observações — tudo igual
- A única diferença é a **fonte do preço**: em vez de vir da categoria (standBase/combos fixos), vem dos valores calculados e salvos na sub-planilha AL (area_m2 × preco_m2 + adicionais de combo)
- O `calculateRow()` para stands AL lerá `total_override` e `combo_overrides` do próprio stand

**Visual da célula STAND para área livre (Info 9):**
- Célula atual: tag pequena (ex: "PADRÃO 64M") + stand_nr grande (ex: "P 01")
- Para área livre: tag pequena (ex: "LIVRE") + **metragem ao lado da tag** (ex: "100") + stand_nr grande (ex: "L 01")
- Sem a unidade "m²" para economizar espaço
- Resultado visual: tag "LIVRE" · "100" em pequeno, e "L 01" em destaque
- A metragem é **somente leitura** na planilha principal — editável apenas na sub-planilha AL
- Se o stand ainda não tiver m² configurado (area_m2 = null): mostrar "—" no lugar do número

**Fluxo completo:**
```
ConfiguracaoVendas → marca categoria como AL → define preco_m2 referência + adicionais de combo
     ↓ botão "Planilha AL"
PlanilhaAreaLivre → define m² por stand → calcula/arredonda → salva total_override + combo_overrides
     ↓ volta para
TempPlanilha → stand AL aparece normalmente → combos disponíveis → preço = valor salvo na AL
```

### ✅ Info 10 (proteção de contagem na categoria AL)

Mesmo comportamento do `syncEstandes()` existente, mas para área livre:

- Ao **reduzir o count** de uma categoria AL em `ConfiguracaoVendas`, o sistema verifica qual é o último stand que tem dado configurado (`area_m2` ou `total_override` preenchido)
- Não permite reduzir abaixo desse índice
- Exemplo: categoria com 20 stands, stand 15 tem `area_m2` configurado → pode reduzir até 15, não menos
- Para reduzir além, o usuário precisa primeiro limpar os dados do stand (desmarcar/resetar) na sub-planilha AL

**Implementação:** `syncEstandes()` (ou equivalente para AL) ao receber novo count menor, consulta o maior índice de stand com `area_m2 IS NOT NULL OR total_override IS NOT NULL` → esse é o `minCount` que bloqueia a redução.

### ✅ Info 11 (proteção contra exclusão/desmarcação da categoria AL)

**No `ConfiguracaoVendas`:**
- Uma vez que a categoria está marcada como área livre **e a sub-planilha AL foi acessada/salva**, o toggle e o botão X ficam **bloqueados** (ícone cinza, não clicáveis)
- Motivo: evitar exclusão acidental de dados já configurados na sub-planilha

**Na `PlanilhaAreaLivre` (dentro da sub-planilha):**
- Exibir dois botões de ação destrutiva: **"Desmarcar Área Livre"** e **"Excluir Categoria"**
- Esses botões ficam **habilitados apenas se nenhum stand tiver dado configurado** (`area_m2 IS NULL AND total_override IS NULL` em todos os stands)
- Se houver dados, o usuário precisa limpar cada stand manualmente antes de conseguir desmarcar/excluir
- UX: confirmação modal antes de executar ("Tem certeza? Esta ação irá remover a configuração AL desta categoria.")

---

## Abordagem Técnica Definida

### Princípio
**Aproveitar as telas existentes + criar nova tela de configuração AL.**
- `ConfiguracaoVendas`: toggle área livre por categoria + colunas cinzas + botão de acesso à sub-planilha AL
- `PlanilhaAreaLivre` (nova tela): configura m², preço/m², calcula totais e combos por stand
- `TempPlanilha`: sem alteração de comportamento — só o `calculateRow()` muda para ler preços do stand (não da categoria) quando é área livre

### Mudanças por camada

#### 1. `CategoriaSetup` — novo campo (sem migration, é JSONB)
```typescript
interface CategoriaSetup {
    // ... campos existentes ...
    tipo_precificacao?: 'fixo' | 'area_livre'; // default = 'fixo'
    preco_m2?: number;  // preço por m² de referência (centavos) — só para area_livre
}
```

#### 2. Migration — novos campos em `planilha_vendas_estandes`
```sql
ALTER TABLE public.planilha_vendas_estandes
ADD COLUMN IF NOT EXISTS area_m2 NUMERIC,          -- tamanho do stand em m²
ADD COLUMN IF NOT EXISTS preco_m2_override NUMERIC; -- preço/m² individual (NULL = usa da categoria)
```

#### 3. `ConfiguracaoVendas.tsx` — linha ~235 (updateCat) e renderização da tabela
- Adicionar toggle `fixo / área livre` por linha de categoria
- Quando `area_livre`: ocultar colunas BASE/COMBO, mostrar coluna `Preço/m²`
- Quando `fixo`: comportamento atual inalterado

#### 4. `TempPlanilha.tsx` — cálculo e colunas
- `calculateRow()` (linha ~443): se stand é area_livre → `precoBase = area_m2 × (preco_m2_override ?? cat.preco_m2)`
- Adicionar 2 colunas editáveis inline para stands de área livre: `m²` e `R$/m²`
- Stands fixos: comportamento atual inalterado

#### 5. `planilhaVendasService.ts`
- Atualizar tipo `PlanilhaEstande` com `area_m2` e `preco_m2_override`
- `updateEstande()` já aceita `Partial<PlanilhaEstande>` → funciona sem alteração
- `syncEstandes()` / `generateEstandes()` — stands de área livre gerados com `area_m2 = null` (para preencher depois)

---

## Perguntas em Aberto

1. ✅ **Edição do m² na TempPlanilha:** permitida mesmo após a venda. Ao salvar alteração de m², exibir **modal de aviso proeminente**: *"Atenção! A metragem deste stand foi alterada. Você deve informar todas as diretorias sobre esta mudança."* — botão de confirmação obrigatório para fechar.
2. ✅ `tipo_venda` para área livre: **idêntico aos fixos** — toggle DISPONÍVEL → STAND PADRÃO → COMBO 01 → COMBO 02... Os valores de cada tipo vêm dos `combo_overrides` salvos na sub-planilha AL.
3. ✅ **Opcionais para área livre:** idênticos aos fixos — compra avulsa (adiciona ao preço) ou marcação `*` para "incluso no combo" (manual). Sistema de imagens reage igual (blimp exige logo, faixa exige imagem, etc.).
4. ✅ **Acesso à sub-planilha AL:** botão **"Configurar Área Livre"** na barra preta do cabeçalho (junto com "+ Adicionar Combo" / "− Remover Combo"), aparece quando há uma categoria AL selecionada. Acesso apenas pelo `ConfiguracaoVendas`.
5. ✅ **Stand_nr para área livre:** gerado automaticamente — prefixo + sequencial igual aos fixos (ex: "L 01", "L 02"...). Visual na TempPlanilha: tag pequena + metragem ao lado (mesma fonte, cor mais escura para destacar) + stand_nr em destaque. Funcionamento idêntico aos demais.

---

## Arquivos Impactados

| Arquivo | Tipo de mudança |
|---|---|
| `pages/ConfiguracaoVendas.tsx` | Toggle fixo/área livre por categoria + coluna Preço/m² |
| `pages/TempPlanilha.tsx` | Colunas m² e R$/m² editáveis + novo cálculo |
| `services/planilhaVendasService.ts` | Tipos atualizados |
| `supabase/migrations/20260310_add_area_livre_to_estandes.sql` | Novos campos no banco |

---

## Notas Técnicas

- Preços em **centavos** (NUMERIC inteiro) — manter padrão
- `categorias_config` é JSONB → campos novos na `CategoriaSetup` não precisam de migration
- Realtime habilitado em `planilha_vendas_estandes` — edições em m² e preço/m² refletem em tempo real
- `updateEstande()` já usa `Partial<PlanilhaEstande>` — funciona para novos campos após migration
- Stands fixos e área livre podem coexistir na mesma planilha sem conflito
