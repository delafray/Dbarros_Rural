# Pesquisa de Licenças — Bibliotecas de Grade/Planilha Web (2025/2026)

**Data:** 01/08/2026  
**Objetivo:** Comparar licenças, preços e restrições de 6 bibliotecas populares para grids/planilhas

---

## 1. Handsontable

| Atributo | Detalhes |
|----------|----------|
| **Licença** | Hobby (gratuita, pessoal/exploratório); Annual Subscription ou Perpetual License (comercial) |
| **Preço USD** | A partir de $999/dev/ano (Standard); $1.299/dev/ano (Priority); Enterprise customizado |
| **Uso Comercial Interno** | NÃO (Hobby license proibida); requer plano pago |
| **Restrição Relevante** | Nenhuma restrição severa de features; diferença está em suporte (Priority vs Standard) |
| **Fonte Oficial** | https://handsontable.com/pricing |

---

## 2. AG Grid Enterprise

| Atributo | Detalhes |
|----------|----------|
| **Licença** | Community (free, MIT, production-ok); Enterprise (comercial, requer license) |
| **Preço USD** | $999/dev/ano (aproximado); Single App ~$995–$1.295/dev/ano; Multiple Apps ~$1.495–$1.995/dev/ano |
| **Restrição Relevante** | **Row Grouping, Clipboard/Range Selection avançado, Server-Side Row Model, Charts integrados** são Enterprise-only |
| **Community inclui** | Core features (filtro simples, sort, paginação básica, edição celular) |
| **Fonte Oficial** | https://www.ag-grid.com/react-data-grid/community-vs-enterprise/ |

---

## 3. SheetJS

| Atributo | Detalhes |
|----------|----------|
| **Licença** | Community Edition (Apache 2.0, open-source, free); Pro (comercial) |
| **Preço USD** | Community: Free; Pro: sem preço explícito publicado (contato necessário) |
| **Community inclui** | Read/write XLSX, CSV, formatos comuns; 95% dos casos de uso |
| **Pro adiciona** | Streaming, ODS/Numbers melhorado, formatação avançada, templates, imagens/gráficos, fórmulas, PivotTables |
| **Restrição Relevante** | Pro requerido para features avançadas (charts, fórmulas complexas, PivotTables); Community é robusto para leitura/escrita básica |
| **Fonte Oficial** | https://sheetjs.com/pro/ |

---

## 4. Jspreadsheet

| Atributo | Detalhes |
|----------|----------|
| **Licença** | CE (MIT, open-source, comercial-ok); Pro (comercial) |
| **Preço USD** | CE: Free; Pro a partir de $249/mês ($2.499/ano, até 5 devs) |
| **CE inclui** | Spread básico; deploy em production sem license |
| **Pro adiciona** | Fórmulas, XLSX import/export, colaboração real-time, AI, extensões (PDF export, Google Sheets, ChatGPT) |
| **Restrição Relevante** | XLSX import/export e colaboração real-time requerem Pro |
| **Tiers Pro** | Enterprise ($2.499/ano, 5 devs); Ultimate ($4.499/ano, 6-10 devs); Tailored (10+, custom) |
| **Fonte Oficial** | https://jspreadsheet.com/pricing |

---

## 5. Univer

| Atributo | Detalhes |
|----------|----------|
| **Licença** | Core SDK (Apache 2.0, open-source); Pro (Univer Commercial License, opcional) |
| **Preço USD** | OSS: Free; Pro: sem preço explícito publicado (contato necessário) |
| **Core inclui** | Spreadsheet, word processor, presentation; API OSS total |
| **Pro adiciona** | Server-backed, full-featured para enterprise; limites removidos (watermark, import size, collaboration quotas) |
| **Restrição Relevante** | OSS free opera com watermark, limites de tamanho/colaboração; Pro remove limites para production |
| **Uso Comercial OSS** | Sim (Apache 2.0 permite comercial) |
| **Fonte Oficial** | https://docs.univer.ai/guides/pro/license |

---

## 6. MUI X Data Grid

| Atributo | Detalhes |
|----------|----------|
| **Licença** | Community (MIT, free); Pro ($299/ano/dev); Premium ($599/ano/dev) |
| **Preço USD** | Free: $0; Pro: $299/ano (≈$25/mês); Premium: $599/ano (≈$50/mês) |
| **Community inclui** | 40+ componentes free; grid básico (sem edição, sem clipboard paste) |
| **Pro adiciona** | Cell/row editing, clipboard paste, column resizing/pinning, multi-filter/sort, date range picker |
| **Premium adiciona** | Row grouping, aggregation, Excel export, master-detail, tree data, virtualization de coluna |
| **Restrição Relevante** | **Edição de células e clipboard paste requerem Pro; row grouping/aggregation requerem Premium** |
| **Fonte Oficial** | https://mui.com/pricing/ |

---

## Resumo Comparativo

| Biblioteca | Preço Inicial | Comercial Grátis | Restrição Crítica |
|-----------|--------------|-----------------|-------------------|
| **Handsontable** | $999/dev/ano | Não | Nenhuma (suporte diferencia) |
| **AG Grid** | $999/dev/ano | Sim (Community) | Row grouping, advanced clipboard → Enterprise |
| **SheetJS** | Free | Sim (Community) | Fórmulas, charts, PivotTables → Pro |
| **Jspreadsheet** | Free | Sim (CE) | XLSX, colaboração → Pro ($2.499+/ano) |
| **Univer** | Free | Sim (OSS) | Limites removidos → Pro (preço desconhecido) |
| **MUI X** | Free | Sim (Community) | Edição/clipboard → Pro; row grouping → Premium |

---

## Observações Finais

1. **Mais barato com features completas:** Jspreadsheet CE ou Univer OSS (free, comercial permitido)
2. **Melhor relação custo/benefício pago:** MUI X Data Grid ($299/ano Pro) por USD/feature
3. **Sem surpresa de restrição:** Handsontable e AG Grid Enterprise documentam tudo; SheetJS e Univer não publicam preços Pro
4. **Community viável:** AG Grid, Jspreadsheet, Univer, MUI oferecem tiers gratuitos sólidos para uso comercial interno
5. **Edição/clipboard crítico:** Se necessário editar células + paste em Excel, MUI Pro ($299/ano) é mais acessível que alternativas

---

**Fontes Consultadas:**
- [Handsontable Pricing](https://handsontable.com/pricing)
- [AG Grid React: Community vs Enterprise](https://www.ag-grid.com/react-data-grid/community-vs-enterprise/)
- [SheetJS Pro](https://sheetjs.com/pro/)
- [Jspreadsheet Pricing](https://jspreadsheet.com/pricing)
- [Univer Pro Guide](https://docs.univer.ai/guides/pro/license)
- [MUI X Pricing](https://mui.com/pricing/)
