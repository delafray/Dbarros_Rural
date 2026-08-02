# Pesquisa: Templates Públicos de Orçamento de Eventos

**Data:** 01/08/2026  
**Objetivo:** Catalogar padrões de colunas, categorias e recursos em 6-10 templates públicos de orçamento de eventos (português e inglês) para alinhar o módulo de custos com expectativas de mercado.

---

## 1. Colunas Padrão Identificadas

### Colunas Essenciais (>80% dos templates)
1. **Descrição do Item / Item** — nome/descrição do gasto
2. **Categoria** — agrupamento de despesa (venue, catering, decoração, etc.)
3. **Quantidade / Qtd** — unidades ou serviços
4. **Valor Unitário** — preço por unidade
5. **Custo Estimado / Valor Orçado** — projeção inicial
6. **Custo Real / Custo Atual / Gasto Realizado** — despesa efetiva
7. **Diferença / Variância / Desvio** — real vs. estimado (calculado)
8. **Status de Pagamento / Pago?** — sim/não, data, forma
9. **Fornecedor / Vendor** — nome da empresa/pessoa
10. **Observações / Notas** — campo livre

### Colunas Secundárias (40-60%)
- **Data de Cotação** / **Data Limite para Confirmação**
- **Contato do Fornecedor** / **Telefone/Email**
- **Referência / ID Orçamento**
- **% de Diferença** (variância percentual)
- **Status** (cotado, confirmado, negociado, pago, cancelado)

---

## 2. Categorias de Gasto Pré-populadas

### Padrão Universal (> 90%)
1. **Venue / Local / Espaço** — aluguel de salão/espaço
2. **Catering / Alimentação** — comida e bebidas
3. **Decoração / Decor** — flores, arranjos, iluminação
4. **Entretenimento / Entertainment** — DJ, banda, animação
5. **Pessoal / Staffing / Mão de Obra** — equipe, garçons
6. **Transporte / Travel** — deslocamento de equipe/convidados
7. **Marketing / Publicidade** — divulgação, convites
8. **Equipamento / Equipment / AV** — áudio, vídeo, projetor
9. **Fotografia / Photography / Vídeo**
10. **Diversos / Miscellaneous / Outros** — contingências

### Variações por Tipo de Evento
- **Casamento:** Noivos, Fotógrafo, Florista, Convite, Transporte nupcial
- **Conferência/Workshop:** Palestrante, Material didático, Certificados, Sala de imprensa
- **Festas/Reuniões:** Bolo, Decoração, Música, Presentes

---

## 3. Cálculo de Desvio (Real vs. Estimado)

### Fórmula Padrão
```
Variância = Custo Real - Custo Estimado
% Variância = (Custo Real - Custo Estimado) / Custo Estimado × 100
```

### Interpretação Visual
- **Verde:** Dentro do orçamento (diferença ≤ 0 ou ≤ 5%)
- **Amarelo:** Alerta (5-15%)
- **Vermelho:** Acima (> 15%)

### Sumário Automático
Maioria dos templates inclui linha **TOTAL** com soma automática de:
- Total Estimado
- Total Realizado
- Variância Total (R$ e %)
- Orçamento Restante

---

## 4. Recursos Extras Mais Comuns

### Dashboards / Resumos (60%)
- **Card/Box: Orçamento Total → Gasto Realizado → Diferença**
- Linha de progresso visual (barra de porcentagem)
- Saldo restante

### Gráficos (50%)
- **Pizza:** Distribuição percentual de gasto por categoria
- **Barra:** Estimado vs. Real por categoria
- **Linha:** Curva de gasto ao longo do tempo (se com datas)

### Análise Extra (40%)
- **Resumo por Categoria:** subtotais de estimado/real/diferença
- **Itens sem Fornecedor:** alertas para cotações pendentes
- **Itens não Pagos:** rastreamento de pendências
- **ROI/Margem:** para eventos com receita (ingressos, patrocínios)

---

## 5. Padrões de Receita (Quando Aplicável)

Alguns templates (Vertex42, HubSpot, Smartsheet) também rastreiam:
- **Ingressos / Ticket Sales**
- **Patrocínios / Sponsors**
- **Vendas de Mercadoria / Merchandise**
- **Doações / Donations**

Resultado: **Lucro/Prejuízo = Receita Total - Despesa Total**

---

## 6. Nomes de Coluna: Português vs. Inglês

| PT (Padrão)       | EN (Padrão)           | Variações Comuns |
|-------------------|-----------------------|------------------|
| Descrição         | Item / Description    | Nome, Detalhe    |
| Categoria         | Category / Type       | Rubrica, Tipo    |
| Qtd               | Quantity / QTY        | Unitário         |
| Valor Unit.       | Unit Cost / Price     | Unitário, Valor  |
| Orçado / Estimado | Estimated / Budgeted  | Projetado, Previsto |
| Realizado / Real  | Actual / Real         | Gasto, Incorrido |
| Variância         | Variance / Difference | Desvio, Diferença |
| Pago?             | Paid / Payment Status | Status, Confirmado |
| Fornecedor        | Vendor / Supplier     | Prestador, Empresa |
| Obs.              | Notes / Remarks       | Comentário       |

---

## 7. Templates Analisados (Fontes)

### Português Brasil
1. **Smart Planilhas** — Planilha Orçamento de Eventos Grátis
   - 10 categorias pré-preenchidas, cálculo automático
   
2. **Planilha-Produtiva / Planilha-Gestão** — 6 templates para Custos Eventos
   - Controle de despesas por evento, suporte a múltiplas moedas
   
3. **YouExec** — Planejador de Eventos (Excel + Google Sheets)
   - Integra orçamento, lista de convidados, agenda, dashboard
   
4. **Jotform** — Formulário de Orçamento para Eventos
   - Captura de dados estruturada com validação

### Inglês
5. **Smartsheet** — Free Event Budget Templates (Simple & Complex)
   - Múltiplos níveis de detalhe, recurso de colaboração em tempo real
   
6. **Vertex42** — Event Budget Template
   - 3 exemplos (scout camp, seminar, bike race), receita + despesa
   
7. **HubSpot** — Event Budget (Bundle de 8 templates)
   - Gráfico "Actual cost by category", resumo YTD, foco em ROI
   
8. **ClickUp** — 11 Free Event Budget Templates
   - Integra task management + orçamento, Gantt + budget combo
   
9. **ProjectManager** — Event Budget Template
   - Dashboard com variance tracking, colaborativo
   
10. **Airtable, Monday.com, Eventbrite** — Templates modernos
    - Interface visual, automações, integração com CRM

### Português Específico (Casamento/Festa)
11. **Planilha-Controle** — Orçamento Casamento
    - Categorias: Noivos, Local, Catering, Florista, Foto/Vídeo, Convite
    
12. **TheGoodocs** — 300+ Modelos de Orçamento (PT + EN)
    - Catálogo gratuito, filtro por tipo de evento

---

## 8. Padrões Identificados (Recomendações para o Sistema)

### ✅ Fazer (Alinhado com Mercado)
1. **Colunas obrigatórias:** Descrição, Categoria, Estimado, Real, Variância, Fornecedor, Status Pagamento
2. **Categorias pré-carregadas:** 10 principais (venue, catering, decor, entertainment, staff, travel, marketing, AV, foto, outros)
3. **Cálculo automático:** Variância (R$ e %), Totais, Saldo
4. **Dashboard mínimo:** Card com Total Orçado / Gasto / Restante + gráfico pizza por categoria
5. **Nomes bilíngues:** Priorizar rótulos em português com fallback em inglês

### ⚠️ Considerar (Diferencial)
- Receita (patrocínios, ingressos) para eventos com receita
- Status de pagamento com integração a contas a pagar
- Histórico de cotações (múltiplas cotações do mesmo item)
- Alertas de desvio (variância > 15%)
- Análise de categoria (qual gasta mais, qual está fora de controle)

### ❌ Não Fazer (Não é Padrão)
- Manutenção de inventário de itens (fora do escopo de orçamento)
- Planejamento de tarefas (separar módulo de orçamento de project management)
- Integração direta com fornecedor (futura, não crítica)

---

## Conclusão

O padrão de mercado é consolidado: **Descrição + Categoria + Qtd + Estimado + Real + Variância + Fornecedor + Notas**. Todos os templates analisados seguem esta estrutura. O diferencial está em:
- **Visualização:** Gráficos automáticos (pizza, barra)
- **Automação:** Cálculos, totalizações, alertas de desvio
- **Integração:** Receita (quando relevante), pagamentos, task lists

Recomenda-se começar com o **núcleo obrigatório** (colunas + categorias + cálculo) e adicionar recursos de visualização conforme MVP.

---

**Última atualização:** 01/08/2026
