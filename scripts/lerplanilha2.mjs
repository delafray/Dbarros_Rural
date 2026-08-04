// Leitor universal (.xls antigo, .xlsx, .xlsm) via SheetJS, imune a encoding:
//   listar:  node scripts/lerplanilha2.mjs --lista "PASTA"
//   ler:     node scripts/lerplanilha2.mjs --pasta "PASTA" --i N [maxLinhas]
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
function planilhasDe(dir) {
  return fs.readdirSync(dir)
    .filter(f => /\.(xls|xlsx|xlsm)$/i.test(f))
    .sort((a, b) => a.localeCompare(b));
}

if (args[0] === '--lista') {
  const dir = args[1];
  planilhasDe(dir).forEach((f, i) => console.log(String(i + 1).padStart(3), f));
  process.exit(0);
}

const dir = args[args.indexOf('--pasta') + 1];
const idx = Number(args[args.indexOf('--i') + 1]);
const maxLinhas = Number(args[4 + 1]) || 70;
const arquivos = planilhasDe(dir);
const nome = arquivos[idx - 1];
if (!nome) { console.error('Indice fora da lista (1..' + arquivos.length + ')'); process.exit(1); }

const buf = fs.readFileSync(path.join(dir, nome));
const wb = XLSX.read(buf, { cellDates: true });
console.log('=== [' + idx + '] ' + nome + ' | abas: ' + wb.SheetNames.join(', ') + ' ===');
for (const aba of wb.SheetNames) {
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, raw: false, defval: '' });
  if (linhas.length === 0) continue;
  console.log('\n--- ABA "' + aba + '" (' + linhas.length + ' linhas) ---');
  let mostradas = 0;
  for (let i = 0; i < linhas.length && mostradas < maxLinhas; i++) {
    const texto = linhas[i].slice(0, 10).map(c => String(c).slice(0, 38)).join(' | ').trim();
    if (texto.replace(/\|/g, '').trim() === '') continue;
    console.log(String(i + 1).padStart(3), '|', texto);
    mostradas++;
  }
  if (linhas.length > maxLinhas) console.log('... (aba tem mais linhas)');
}
