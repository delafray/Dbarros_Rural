// Validação da migração Tailwind CDN → build local.
// Extrai todos os tokens tailwind-like das strings do código-fonte e verifica
// se cada um tem seletor correspondente no CSS compilado em dist/.
// Rodar: node scripts/check-tailwind-coverage.mjs  (após npm run build)
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC_DIRS = ['pages', 'components', 'hooks', 'context', 'src', 'utils'];
const ROOT_FILES = ['App.tsx', 'index.tsx', 'index.html'];

// Prefixos de utilitários tailwind que o app pode usar (heurística ampla)
const TW_PATTERN = /^(?:(?:hover|focus|active|disabled|group-hover|first|last|odd|even|sm|md|lg|xl|2xl|print)[:])*(?:-?(?:m|p)[trblxy]?-|w-|h-|min-w-|min-h-|max-w-|max-h-|text-|font-|bg-|border(?:-|$)|rounded|shadow|flex|grid|gap-|space-[xy]-|items-|justify-|self-|content-|col-|row-|inset-|top-|bottom-|left-|right-|z-|overflow-|whitespace-|break-|truncate$|leading-|tracking-|align-|list-|opacity-|transition|duration-|ease-|delay-|animate-|cursor-|select-|pointer-events-|resize|outline|ring|divide-|placeholder-|underline$|line-through$|no-underline$|uppercase$|lowercase$|capitalize$|italic$|not-italic$|antialiased$|block$|inline|hidden$|relative$|absolute$|fixed$|sticky$|static$|table|sr-only$|invisible$|visible$|object-|aspect-|order-|shrink|grow|basis-|translate-|rotate-|scale-|skew-|transform|origin-|fill-|stroke-)/;

function* walkFiles(dir) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) yield* walkFiles(full);
        else if (/\.(tsx?|html)$/.test(entry) && !/\.test\./.test(entry)) yield full;
    }
}

const files = [...ROOT_FILES];
for (const d of SRC_DIRS) files.push(...walkFiles(d));

const tokens = new Set();
for (const f of files) {
    const content = readFileSync(f, 'utf-8');
    // Todas as strings entre aspas/backticks (mesma abordagem do scanner do tailwind)
    for (const m of content.matchAll(/["'`]([^"'`\n]{1,400})["'`]/g)) {
        for (const raw of m[1].split(/\s+/)) {
            const t = raw.trim();
            if (t && t.length < 60 && TW_PATTERN.test(t) && !t.includes('${')) tokens.add(t);
        }
    }
}

const cssFile = readdirSync('dist/assets').find(f => f.startsWith('index-') && f.endsWith('.css'));
const css = readFileSync(join('dist/assets', cssFile), 'utf-8');

const escapeForCss = (cls) => cls.replace(/([:./\[\]%#(),'!&*>+~=@]|^\d)/g, '\\$1');

const missing = [];
for (const t of [...tokens].sort()) {
    if (!css.includes(`.${escapeForCss(t)}`)) missing.push(t);
}

console.log(`Arquivos escaneados: ${files.length}`);
console.log(`Tokens tailwind-like encontrados no código: ${tokens.size}`);
console.log(`CSS analisado: dist/assets/${cssFile} (${(css.length / 1024).toFixed(1)} KB)`);
if (missing.length === 0) {
    console.log('\nOK — TODAS as classes usadas no código existem no CSS compilado.');
    process.exit(0);
} else {
    console.log(`\nATENÇÃO — ${missing.length} token(s) sem seletor no CSS:`);
    missing.forEach(t => console.log('  -', t));
    process.exit(1);
}
