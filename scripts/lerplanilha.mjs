import ExcelJS from 'exceljs';

const arquivo = process.argv[2];
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(arquivo);
console.log('=== ARQUIVO:', arquivo.split(/[\/]/).pop(), '===');
for (const ws of wb.worksheets) {
  console.log(`\n--- ABA: "${ws.name}" (${ws.rowCount} linhas x ${ws.columnCount} cols) ---`);
  let vazias = 0;
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n > 120) return;
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell, c) => {
      if (c > 12) return;
      let v = cell.value;
      if (v && typeof v === 'object') {
        if (v.result !== undefined) v = v.result;        // formula
        else if (v.richText) v = v.richText.map(r => r.text).join('');
        else if (v instanceof Date) v = v.toISOString().slice(0,10);
      }
      cells.push(v === null || v === undefined ? '' : String(v).slice(0, 40));
    });
    const linha = cells.join(' | ').trim();
    if (linha.replace(/\|/g, '').trim() === '') { vazias++; return; }
    console.log(String(n).padStart(3), '|', linha);
  });
}
