# Pesquisa: Paste de Excel no Navegador — Estado da Arte

**Data:** 01/08/2026  
**Contexto:** Módulo de gastos estilo planilha (React + TypeScript). Usuários colam blocos de planilhas Excel desorganizadas; o sistema precisa transformar isso em lançamentos estruturados. Tivemos um bug anterior onde conteúdo colado vinha "emendado" — esta pesquisa mapeia as armadilhas e a estratégia ideal.

---

## 1. O que vem no clipboardData

### 1.1 Formatos MIME disponíveis

Quando o usuário copia células de uma planilha, o SO coloca **múltiplos formatos** no clipboard simultaneamente. O `event.clipboardData` expõe todos através de `getData(mimeType)`. Os tipos relevantes:

| MIME type | Conteúdo | Uso |
|---|---|---|
| `text/plain` | TSV (Tab-Separated Values) | Parsing robusto de dados |
| `text/html` | Tabela HTML com estilos inline | Preserva estrutura, mas traz XSS risk |
| `text/rtf` | Rich Text Format | Raramente útil para parsing |

> **Fonte:** [ClipboardEvent: clipboardData property — MDN](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData)  
> **Fonte:** [Clipboard Data — SheetJS Community Edition](https://docs.sheetjs.com/docs/demos/local/clipboard/)

Acesso:

```javascript
document.addEventListener('paste', (e) => {
  e.preventDefault();
  const tsv  = e.clipboardData.getData('text/plain');
  const html = e.clipboardData.getData('text/html');
  // Inspecionar e.clipboardData.types para ver o que veio
});
```

---

### 1.2 Diferenças por aplicativo

| Aplicativo | text/plain | text/html | Observações |
|---|---|---|---|
| **Excel Desktop** | TSV limpo; valores numéricos no locale do SO | Tabela HTML com estilos inline ricos (font, bgcolor, borders) | Também coloca XLS/XLSB binários no clipboard nativo do OS — inacessíveis via web API |
| **Excel Online** | TSV similar ao desktop | HTML mais enxuto; colspan/rowspan para células mescladas | Pode diferir do desktop em número formatado |
| **Google Sheets** | TSV; números sem formatação de moeda | HTML com classes CSS próprias do Google | HTML menos confiável; o TSV é mais limpo |
| **LibreOffice Calc** | TSV | HTML com estilos inline, estrutura semelhante ao Excel | Comportamento pode variar na versão 24.2+ quanto à formatação |

> **Fonte:** [The web's clipboard, and how it stores data of different types — Alex Harri](https://alexharri.com/blog/clipboard)  
> **Fonte:** [24.2 Calc Guide — LibreOffice](https://books.libreoffice.org/en/CG24/CG2404-FormattingData.html)

**Conclusão prática:** Prefira `text/plain` (TSV) como fonte primária de dados; use `text/html` apenas se precisar detectar mesclagem ou estrutura especial. O TSV do `text/plain` é consistente entre os três grandes (Excel, Sheets, LibreOffice).

---

### 1.3 Células mescladas — a armadilha principal

**No TSV (`text/plain`):** células mescladas horizontalmente geram células vazias nas posições subsequentes. `"A\t\tC"` = célula A mesclada com B (B fica vazia), célula C. O TSV **não carrega colspan/rowspan**.

**No HTML (`text/html`):** células mescladas chegam com `colspan="N"` e `rowspan="N"` corretamente. Porém, algumas células à direita/abaixo aparecem como `<td></td>` vazias.

> **Fonte:** Análise da busca web sobre `text/html colspan rowspan merged cells`.

**Estratégia recomendada para células mescladas:**
1. Ler `text/html` e parsear o DOM;
2. Detectar `colspan`/`rowspan` e replicar o valor da célula mesclada nas posições que ela ocupa;
3. Isso elimina as células vazias "fantasmas".

---

### 1.4 Quebra de linha DENTRO de célula (armadilha clássica do bug anterior)

No TSV, uma célula que contém uma quebra de linha é **envolta em aspas duplas**:

```
Descrição	Valor
"Almoço
com cliente"	150,00
```

Parser ingênuo que faz `texto.split('\n')` vai quebrar esta linha em dois "registros", causando exatamente o problema de conteúdo "emendado" que já sofremos.

**Solução:** usar um parser TSV que respeite RFC 4180 — aspas como delimitador de campo multi-linha.

> **Fonte:** [Improve TSV serialization for tab and newline characters — Mathesar GitHub Issue #2811](https://github.com/mathesar-foundation/mathesar/issues/2811)  
> **Fonte:** [How to Parse CSV Files in JavaScript — Dromo.io](https://dromo.io/blog/how-to-parse-csv-files-in-javascript)

---

## 2. Parsing Robusto

### 2.1 Não fazer: split ingênuo

```javascript
// ERRADO — quebra com newlines dentro de células
const rows = text.split('\n').map(r => r.split('\t'));
```

Este foi provavelmente o causador do bug de conteúdo "emendado" em outro módulo.

---

### 2.2 Bibliotecas disponíveis

#### Papa Parse (RECOMENDADO)
- **Versão atual:** 5.5.4 (publicada recentemente em 2026)
- **Tamanho:** ~45 KB minificado
- **Suporte TSV:** sim, com `delimiter: '\t'`
- **Lida com:** campos entre aspas, newlines dentro de células, BOM UTF-8, Web Workers para datasets grandes
- **Auto-detect:** escaneia as primeiras linhas para detectar delimitador

```typescript
import Papa from 'papaparse';

const result = Papa.parse(tsvString, {
  delimiter: '\t',
  quoteChar: '"',
  newline: '',      // auto-detect \r\n, \n, \r
  skipEmptyLines: true,
  header: false,    // retorna array de arrays
});
// result.data: string[][]
// result.errors: array de erros por linha
```

> **Fonte:** [Papa Parse — papaparse.com](https://www.papaparse.com/)  
> **Fonte:** [Papa Parse npm](https://www.npmjs.com/package/papaparse)

#### SheetClip
- Biblioteca minúscula usada pelo Handsontable
- Última versão (0.3.0) publicada **há 9 anos** — abandonada
- Não suporta todos os edge cases de TSV
- **Não recomendada** para novos projetos

> **Fonte:** [sheetclip — npm](https://www.npmjs.com/package/sheetclip)  
> **Fonte:** [Investigate switching from SheetClip to Papa Parse — Handsontable GitHub Issue #1627](https://github.com/handsontable/handsontable/issues/1627)

#### SheetJS (xlsx)
- Capaz de ler diretamente `text/html` ou o binário nativo do Excel (via File API)
- Útil se o usuário fizer upload de `.xlsx` em vez de colar
- Para paste, é overkill — Papa Parse é mais simples

#### Parser próprio
- Evitar. O TSV com RFC 4180 tem edge cases não triviais (aspas escapadas como `""`, mistura de `\r\n` e `\n`, BOM). Reinventar a roda aumenta o risco de bugs.

---

### 2.3 Parsing do HTML (alternativa / complemento)

Quando precisar de informações estruturais (colspan, rowspan, formatação):

```typescript
function parseHtmlTable(html: string): string[][] {
  // 1. Sanitizar primeiro (ver seção 5)
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['table', 'tbody', 'thead', 'tr', 'td', 'th'],
    ALLOWED_ATTR: ['colspan', 'rowspan'],
  });

  const div = document.createElement('div');
  div.innerHTML = clean;

  const rows: string[][] = [];
  div.querySelectorAll('tr').forEach(tr => {
    const cells: string[] = [];
    tr.querySelectorAll('td, th').forEach(td => {
      cells.push(td.textContent?.trim() ?? '');
      // Expandir colspan
      const span = parseInt(td.getAttribute('colspan') ?? '1');
      for (let i = 1; i < span; i++) cells.push('');
    });
    rows.push(cells);
  });
  return rows;
}
```

> **Fonte:** análise de `text/html` com `colspan`/`rowspan`.

---

## 3. Números em Formato Brasileiro e Datas dd/mm

### 3.1 Números brasileiros: "R$ 1.234,56"

O formato usa **ponto como separador de milhar** e **vírgula como separador decimal** — o oposto do JavaScript.

```typescript
function parseBRNumber(raw: string): number | null {
  // Remove R$, espaços e outros prefixos
  const cleaned = raw.replace(/[R$\s]/g, '').trim();

  // Detecta formato BR: tem vírgula (decimal) e/ou ponto (milhar)
  const isBR = /^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)
    || /^\d+,\d+$/.test(cleaned);

  if (isBR) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }

  // Tenta parse padrão (já está em ponto decimal)
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
```

**Casos cobertos:**
- `"R$ 1.234,56"` → `1234.56`
- `"1.234,56"` → `1234.56`
- `"150,00"` → `150.00`
- `"1234.56"` (padrão US) → `1234.56`

> **Fonte:** [Intl.NumberFormat — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)  
> **Fonte:** [Formatting numbers in JavaScript — 30 seconds of code](https://www.30secondsofcode.org/js/s/number-formatting/)

**Detecção de ambiguidade:** `"1.234"` pode ser mil duzentos e trinta e quatro (BR) ou um ponto dois três quatro (US). Estratégia: se o contexto da coluna tiver outros valores com vírgula decimal, assumir BR. Caso contrário, verificar se o valor tem exatamente 3 dígitos após o ponto (milhar) vs. não (decimal).

---

### 3.2 Datas brasileiras: "dd/mm/aaaa"

O JavaScript **não parseia `"15/08/2026"` de forma confiável** — comportamento é undefined entre browsers.

```typescript
function parseBRDate(raw: string): Date | null {
  // Aceita dd/mm/aaaa, dd/mm/aa, dd-mm-aaaa
  const match = raw.trim().match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})$/);
  if (!match) return null;

  const [, day, month, yearRaw] = match;
  const year = yearRaw.length === 2
    ? (parseInt(yearRaw) > 50 ? `19${yearRaw}` : `20${yearRaw}`)
    : yearRaw;

  // Construir ISO para evitar ambiguidade
  const iso = `${year}-${month}-${day}`;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
}
```

> **Fonte:** [Date and time notation in Brazil — Wikipedia](https://en.wikipedia.org/wiki/Date_and_time_notation_in_Brazil)  
> **Fonte:** [How to parse and format a date in JavaScript — byby.dev](https://byby.dev/js-format-date)

---

## 4. UX do Paste: Preview, Mapeamento, Confirmação

### 4.1 Fluxo recomendado (inspirado em Airtable + padrões de UX)

O padrão consolidado da indústria é:

```
PASTE → PARSE → PREVIEW → MAP → VALIDATE → CONFIRM → INSERT
```

**Etapa 1 — PASTE + PARSE:** capturar o evento, parsear com Papa Parse. Mostrar spinner se grande.

**Etapa 2 — PREVIEW (obrigatório):** exibir as primeiras N linhas em uma tabela. O usuário vê exatamente o que foi detectado antes de qualquer ação destrutiva.

**Etapa 3 — MAP colunas (quando necessário):** se as colunas da planilha colada não batem automaticamente com os campos do sistema (Descrição, Valor, Data, Categoria...), exibir um painel de mapeamento. A primeira linha é assumida como header.

- Correspondência automática por similaridade de nome (case-insensitive, sem acentos)
- Fallback: dropdowns para o usuário mapear manualmente
- Modelo: Airtable exibe "Detected field → Destination field" com preview de valores

**Etapa 4 — VALIDATE:** aplicar regras por coluna:
- Coluna "Valor": tentar `parseBRNumber`; marcar em vermelho células que falharem
- Coluna "Data": tentar `parseBRDate`; sinalizar formatos ambíguos
- Linhas de subtotal (detectar por: coluna "Descrição" contém "Total" / "Subtotal" / está vazia + valor maior que os anteriores) — oferecer opção de ignorar

**Etapa 5 — CONFIRM:** botão "Importar N lançamentos". Mostrar contagem de linhas ignoradas (subtotais, linhas em branco, erros).

> **Fonte:** [CSV Upload UI: File Import UX Patterns — CSVBox Blog](https://blog.csvbox.io/file-upload-patterns/)  
> **Fonte:** [Data Imports — Forget Upload, Use Copy and Paste — Martin Drapeau, Medium](https://medium.com/@martindrapeau/data-imports-forget-upload-use-copy-and-paste-4567a7ad01e9)  
> **Fonte:** [How to Import CSV and Excel Data into Airtable — business-automated.com](https://www.business-automated.com/tutorials/how-to-import-csv-excel-into-airtable)

### 4.2 Como Airtable faz

- Preview e tela de tipo de campo como parte do fluxo de importação CSV
- Mapeamentos atrelados aos cabeçalhos do CSV
- Se o arquivo for exportado diferente (colunas renomeadas, ordem diferente), o sistema re-executa a correspondência automática

### 4.3 Como Notion faz

- Para sincronização com Airtable (2024): colar link de view → mapear campos de Airtable para tipos de propriedade do Notion
- Paste direto de tabela: converte para bloco de database simples sem mapeamento

### 4.4 Limitação de tamanho

- Datasets acima de ~100.000 linhas: bypass do clipboard, usar upload de arquivo
- Para volumes menores mas ainda grandes (>1.000 linhas): usar `Papa.parse` com `worker: true` para não travar a UI
- Paginação na preview (mostrar 10-20 linhas, não renderizar tudo no DOM)

> **Fonte:** [How to Paste Large Data in Google Sheets — Bricks](https://www.thebricks.com/resources/guide-how-to-paste-large-data-in-google-sheets)  
> **Fonte:** [Clipboard in React Spreadsheet — Syncfusion](https://ej2.syncfusion.com/react/documentation/spreadsheet/clipboard)

---

## 5. Armadilhas Conhecidas

### 5.1 XSS via text/html (CRÍTICO)

O HTML que vem do Excel/Sheets pode conter JavaScript embutido, iframes, event handlers, ou links maliciosos. Se você inserir `innerHTML = clipboardData.getData('text/html')` diretamente, expõe XSS.

**Vulnerabilidades reais documentadas:**
- `@github/paste-markdown`: conteúdo do clipboard copiado para `div.innerHTML` sem sanitização → XSS (GHSA-gpfj-4j6g-c4w9)
- `x-data-spreadsheet`: XSS por falta de sanitização de valores inseridos em células (CVE-2022-25646)
- `phpspreadsheet`: XSS via propriedades de arquivo ao converter Excel para HTML (CVE-2024-56411)

**Solução:** DOMPurify é a escolha da OWASP e da comunidade.

```typescript
import DOMPurify from 'dompurify';

// Para extrair dados de tabela: só permite elementos de tabela
const safeHtml = DOMPurify.sanitize(rawHtml, {
  ALLOWED_TAGS: ['table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th'],
  ALLOWED_ATTR: ['colspan', 'rowspan'],
});
```

> **Fonte:** [Clipboard-based DOM-XSS — GitHub Security Advisory GHSA-gpfj-4j6g-c4w9](https://github.com/github/paste-markdown/security/advisories/GHSA-gpfj-4j6g-c4w9)  
> **Fonte:** [CVE-2024-56411 — phpspreadsheet XSS](https://advisories.gitlab.com/composer/phpoffice/phpspreadsheet/CVE-2024-56411/)  
> **Fonte:** [DOMPurify — cure53/DOMPurify](https://github.com/cure53/DOMPurify)  
> **Fonte:** [XSS Prevention — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

**Regra:** nunca usar `dangerouslySetInnerHTML` com dados de clipboard sem passar pelo DOMPurify antes.

---

### 5.2 Encoding e BOM

- Excel (especialmente versões antigas) pode colar texto em Windows-1252 disfarçado de UTF-8
- Papa Parse detecta BOM automaticamente; para outros parsers, strip manualmente:

```typescript
const stripped = tsvString.replace(/^﻿/, ''); // remove BOM
```

---

### 5.3 Separadores de linha mistos

Excel usa `\r\n`; Google Sheets usa `\n`; LibreOffice usa `\n`. Um parser que só faz `split('\n')` pode deixar `\r` solto no final dos valores, causando dados "sujos".

Papa Parse lida com isso automaticamente.

---

### 5.4 Células de subtotal no meio

Planilhas reais de gastos frequentemente têm:
- Linhas de agrupamento ("Alimentação:", "Transporte:")
- Subtotais intermediários
- Linha de total geral no final

**Estratégia de detecção:**
```typescript
function isSubtotalRow(row: string[]): boolean {
  const desc = row[0]?.toLowerCase() ?? '';
  const hasKeyword = /total|subtotal|soma|sum/.test(desc);
  const isEmpty = row.filter(c => c.trim()).length <= 1;
  return hasKeyword || isEmpty;
}
```

Oferecer checkbox "Ignorar linhas de subtotal detectadas" no preview.

---

### 5.5 Chrome 133+ e `document.execCommand`

O Handsontable reportou quebra de clipboard operations no Chrome 133+ com certas versões da biblioteca. O problema está no uso de `document.execCommand('paste')` que está sendo depreciado.

**Solução moderna:** usar `event.clipboardData` dentro do handler de `paste`, não `document.execCommand`.

> **Fonte:** [Handsontable clipboard docs](https://handsontable.com/docs/react-data-grid/basic-clipboard/)

---

## 6. Recomendação de Implementação

### 6.1 Formato preferido

**Usar `text/plain` (TSV) como fonte primária de dados.**

Motivos:
- Consistente entre Excel desktop, Excel online, Google Sheets e LibreOffice
- Sem risco XSS
- Mais fácil de parsear e debugar
- Papa Parse o trata perfeitamente

Usar `text/html` **apenas** para:
- Detectar células mescladas (colspan/rowspan) que precisem ser expandidas
- Sempre sanitizar com DOMPurify antes de qualquer processamento

### 6.2 Parser

**Papa Parse** — sem dúvida. É o único parser browser-side maduro, ativamente mantido (v5.5.4 em 2026), e que resolve todos os edge cases (newlines em células, aspas, BOM, múltiplos line endings).

```
npm install papaparse
npm install @types/papaparse  # TypeScript
npm install dompurify
npm install @types/dompurify
```

### 6.3 Fluxo de implementação (resumo)

```
1. Registrar handler global de 'paste' no componente raiz do módulo
2. Prevenir default; capturar text/plain e text/html
3. Parsear TSV com Papa Parse (delimiter: '\t', quoteChar: '"')
4. Se detectar colspan no HTML, expandir células mescladas
5. Mostrar modal de PREVIEW com primeiras 20 linhas
6. Auto-mapear colunas por nome; oferecer ajuste manual se necessário
7. Detectar e destacar linhas de subtotal (checkbox para ignorar)
8. Parsear valores: parseBRNumber() e parseBRDate() por coluna
9. Exibir erros de validação inline (célula vermelha + tooltip)
10. Botão "Confirmar importação de N lançamentos"
11. Inserir no estado / chamar service — nunca direto no DOM
```

### 6.4 Segurança: checklist mínimo

- [ ] Nunca inserir `text/html` do clipboard em `innerHTML` sem DOMPurify
- [ ] Usar `ALLOWED_TAGS` restrito (só elementos de tabela) ao sanitizar
- [ ] Validar tipos de dado no servidor também (segunda passagem)
- [ ] Limitar tamanho máximo: rejeitar graciosamente se `tsvString.length > 5_000_000` (5 MB)

---

## Fontes Principais

- [Clipboard Data — SheetJS](https://docs.sheetjs.com/docs/demos/local/clipboard/)
- [Papa Parse — documentação oficial](https://www.papaparse.com/docs)
- [Papa Parse — npm](https://www.npmjs.com/package/papaparse)
- [SheetClip — npm](https://www.npmjs.com/package/sheetclip)
- [Investigate switching from SheetClip to Papa Parse — Handsontable Issue #1627](https://github.com/handsontable/handsontable/issues/1627)
- [Clipboard in React Spreadsheet — Handsontable Docs](https://handsontable.com/docs/react-data-grid/basic-clipboard/)
- [The web's clipboard — Alex Harri](https://alexharri.com/blog/clipboard)
- [ClipboardEvent.clipboardData — MDN](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData)
- [Element: paste event — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event)
- [How to Paste Excel Data into HTML Table — w3tutorials.net](https://www.w3tutorials.net/blog/paste-excel-data-into-html-table/)
- [Data Imports — Forget Upload, Use Copy and Paste — Martin Drapeau, Medium](https://medium.com/@martindrapeau/data-imports-forget-upload-use-copy-and-paste-4567a7ad01e9)
- [CSV Upload UI: File Import UX Patterns — CSVBox Blog](https://blog.csvbox.io/file-upload-patterns/)
- [How to Parse CSV Files in JavaScript 2026 — Dromo.io](https://dromo.io/blog/how-to-parse-csv-files-in-javascript)
- [Clipboard-based DOM-XSS Advisory — GitHub paste-markdown](https://github.com/github/paste-markdown/security/advisories/GHSA-gpfj-4j6g-c4w9)
- [CVE-2024-56411 — phpspreadsheet XSS](https://advisories.gitlab.com/composer/phpoffice/phpspreadsheet/CVE-2024-56411/)
- [CVE-2022-25646 — x-data-spreadsheet XSS](https://security.snyk.io/vuln/SNYK-JS-XDATASPREADSHEET-2430381)
- [DOMPurify — cure53/DOMPurify](https://github.com/cure53/DOMPurify)
- [XSS Prevention Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Intl.NumberFormat — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [TSV serialization newline/tab issue — Mathesar GitHub Issue #2811](https://github.com/mathesar-foundation/mathesar/issues/2811)
- [Date and time notation in Brazil — Wikipedia](https://en.wikipedia.org/wiki/Date_and_time_notation_in_Brazil)
- [How to Import CSV/Excel into Airtable — business-automated.com](https://www.business-automated.com/tutorials/how-to-import-csv-excel-into-airtable)
- [Securing React Apps with DOMPurify — OpenReplay](https://blog.openreplay.com/securing-react-with-dompurify/)
- [LibreOffice 24.2 Clipboard Behavior — LibreOffice Books](https://books.libreoffice.org/en/CG24/CG2404-FormattingData.html)
- [Clipboard in React Spreadsheet — Syncfusion](https://ej2.syncfusion.com/react/documentation/spreadsheet/clipboard)
