import fs from 'fs';
const buf = fs.readFileSync(process.argv[2]);
const s = buf.toString('latin1');
// Extrai texto de streams nao comprimidos e info basica
const paginas = (s.match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log('Paginas:', paginas, '| Tamanho:', (buf.length/1024).toFixed(0), 'KB');
// Tenta achar texto simples (Tj/TJ) — se comprimido, mostra produtor
const prod = s.match(/\/Producer\s*\(([^)]{0,80})/); const crea = s.match(/\/Creator\s*\(([^)]{0,80})/);
console.log('Producer:', prod?.[1] || '?', '| Creator:', crea?.[1] || '?');
