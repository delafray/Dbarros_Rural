# Pesquisa: Bibliotecas JavaScript para Import de Excel/CSV no Navegador (2026)

## 1. SheetJS (xlsx) Community Edition

### Status de Manutenção
- **Distribuição**: Mudança controversa de npm para CDN próprio (abril 2025)
- **Versão npm**: 0.18.5 (desatualizada; versão real é 0.20.2 via CDN)
- **CDN Oficial**: https://cdn.sheetjs.com/ (distribuição autorizada)
- **Razão da mudança**: npm impôs 2FA obrigatório, questões legais entre SheetJS LLC e npm Inc.

### Vulnerabilidades Conhecidas
- **CVE-2024-22363**: Prototype Pollution via arquivo crafted (Community Edition)
- **CVE-2023-30533**: Regular Expression Denial of Service (ReDoS) antes da v0.20.2
- **Status**: Vulnerabilidades ainda presentes na versão 0.18.5 do npm
- **Recomendação**: Usar v0.20.2+ via CDN oficial ou ignorar avisos npm se usar versão aceitável

### Licença, Tamanho e Compatibilidade
- **Licença**: Apache 2.0 (Community Edition) / Proprietary (Pro)
- **Tamanho**: ~7.8M downloads/semana (maior adoção)
- **Browser**: Sim, roda completamente no navegador
- **Formatos**: XLSX, XLS, ODS, CSV (20+ formatos)
- **Fonte**: https://www.npmjs.com/package/xlsx

### Riscos
- Polêmica na distribuição; usuários confusos sobre "qual é a versão real"
- npm registry desatualizado e vulnerável
- Dependência de CDN externo https://cdn.sheetjs.com/
- Mudança unilateral de licença e distribuição causa atrito comunitário

**Referências**:
- [BleepingComputer: npm package with 1.4M downloads ditches npm for own CDN](https://www.bleepingcomputer.com/news/software/npm-package-with-14m-weekly-downloads-ditches-npmjscom-for-own-cdn/)
- [Issue #2667: Why the move away from npm registry?](https://github.com/SheetJS/sheetjs/issues/2667)
- [Issue #3316: Vulnerabilities in NPM/Yarn package registries](https://git.sheetjs.com/sheetjs/sheetjs/issues/3316)
- [CVE-2024-22363 Advisory Database](https://advisories.gitlab.com/pkg/npm/xlsx/CVE-2024-22363/)
- [Snyk Vulnerability Report](https://snyk.io/test/github/SheetJS/js-xlsx/c86472d281be4858e671fa92ad9bdf8e61dfed6c)

---

## 2. ExcelJS

### Status de Manutenção
- **Última release significativa**: Outubro 2023
- **Status oficial**: Inativo (conforme declaração dos maintainers)
- **Bugs críticos**: Comunidade reporta necessidade de fork para corrigir bugs críticos
- **GitHub**: https://github.com/exceljs/exceljs

### Leitura de XLSX no Browser
- **Sim**: Roda completamente no navegador
- **Funcionalidade**: Lê, escreve e manipula XLSX
- **CSV**: Suporte para leitura e escrita de CSV
- **CDN**: Disponível via cdnjs

### Licença, Tamanho e Compatibilidade
- **Licença**: MIT
- **Tamanho**: Menor que SheetJS; uso moderado
- **Browser**: Sim, via bundler ou CDN
- **Node.js**: Sim, com streaming support
- **Força**: Excelente para manipulação de formatação e streaming de arquivos grandes

### Riscos
- Projeto inativo desde 2023; sem atualizações de segurança
- Comunidade aberta a volunteers para manutenção, mas sem maintainer oficial
- Riscos de bugs críticos não serem corrigidos
- Alternativa emergente: @office-kit/xlsx (MIT puro, TypeScript, mantido ativamente)

**Referências**:
- [ExcelJS Official Site](https://exceljs.org/)
- [ExcelJS npm](https://www.npmjs.com/package/exceljs)
- [Discussion #2987: Community Fork & Looking for Maintainers](https://github.com/exceljs/exceljs/discussions/2987)
- [Medium: ExcelJS as alternate for XLSX](https://medium.com/@manishasiram/exceljs-alternate-for-xlsx-package-fc1d36b2e743)
- [npm-compare: xlsx vs exceljs vs read-excel-file](https://npm-compare.com/excel4node,exceljs,read-excel-file,xlsx)

---

## 3. PapaParse (CSV)

### Status de Manutenção
- **Versão atual**: 5.5.4 (atualizada há ~1 mês)
- **Cadência de releases**: Pelo menos 1 nova versão a cada 3 meses
- **Histórico**: Mantido continuamente desde 2012; API v5.x estável desde 2018
- **GitHub**: https://github.com/mholt/PapaParse

### Funcionalidade
- **Especializado**: CSV delimitado apenas (não lê XLSX)
- **Browser**: Sim, totalmente funcional no navegador
- **Web Workers**: Suporte nativo para processamento em background
- **Arquivos grandes**: Graceful handling de arquivos malformados

### Licença, Tamanho e Compatibilidade
- **Licença**: MIT
- **Tamanho**: Leve e eficiente
- **Browser**: Sim, com Web Workers
- **Node.js**: Sim
- **Versão estável**: 5.x desde 2018

### Riscos
- Limitado a CSV; não lê XLSX
- Bug reportado em v5.4.1 (issue #998); v5.5.4 deve estar corrigido
- Dependência de campo específico

**Referências**:
- [PapaParse Official](https://www.papaparse.com/)
- [PapaParse npm](https://www.npmjs.com/package/papaparse)
- [PapaParse GitHub](https://github.com/mholt/PapaParse)
- [PkgPulse: PapaParse vs csv-parse vs fast-csv 2026](https://www.pkgpulse.com/guides/papaparse-vs-csv-parse-vs-fast-csv-parsing-2026)
- [Issue #998: CSV parsing broken in 5.4.1](https://github.com/mholt/PapaParse/issues/998)

---

## 4. Alternativas Emergentes (2026)

### @office-kit/xlsx
- **Status**: Ativo e em desenvolvimento
- **Diferencial**: Pure MIT, TypeScript-first, sem Pro tier, sem features pagas
- **Inspiração**: openpyxl (Python)
- **Browser**: Sim
- **Vantagem**: Alternativa para escapar da polêmica SheetJS
- **GitHub**: https://github.com/office-kit/xlsx

### read-excel-file
- **Funcionalidade**: Focado em leitura (não escrita)
- **Browser**: Web Workers implementation
- **npm**: https://www.npmjs.com/package/read-excel-file
- **Caso de uso**: Upload e parse leve

**Referências**:
- [PkgPulse: SheetJS vs ExcelJS vs node-xlsx 2026](https://www.pkgpulse.com/guides/sheetjs-vs-exceljs-vs-node-xlsx-excel-files-node-2026)
- [FileFormat.com: JavaScript Libraries para Excel](https://products.fileformat.com/spreadsheet/javascript/)

---

## Recomendação Final

| Biblioteca | Uso | Risco | Alternativa |
|---|---|---|---|
| **SheetJS (xlsx)** | Produção hoje; máxima compatibilidade | Polêmica npm/CDN; vulnerabilidades | @office-kit/xlsx |
| **ExcelJS** | Manipulação avançada; projetos greenfield | Inativo desde 2023 | @office-kit/xlsx |
| **PapaParse** | CSV puro em produção | Nenhum; ativo e estável | — |
| **@office-kit/xlsx** | Produção futura; MIT puro | Menor adoção; comunidade menor | SheetJS |

### Para o módulo de custos (import XLSX):
1. **Curto prazo**: SheetJS 0.20.2 via CDN https://cdn.sheetjs.com/ (não npm)
2. **Médio prazo**: Migrar para @office-kit/xlsx quando consolidado
3. **CSV**: PapaParse (estável, ativo, sem riscos)

---

**Pesquisa realizada**: 01/08/2026  
**Período coberto**: 2025-2026
