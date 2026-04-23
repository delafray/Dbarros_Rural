/**
 * cardapiosExportService.ts
 *
 * Junta itens de menus A4 + banners, detecta duplicados (nome normalizado),
 * atribui um código único por item distinto, gera CSV com BOM UTF-8
 * (abre nativo no Excel BR) e dispara download.
 */

import { cardapioService } from './cardapioService';
import { menuA4Service } from './menuA4Service';
import type { CardapioGroup } from '../utils/cardapioParser';

type Origem = 'A4' | 'Banner';

interface RawItem {
  origem: Origem;
  empresa: string;
  titulo: string;
  categoria: string;
  item: string;
  valor: string;
  descricao: string;
}

interface ExportRow extends RawItem {
  codigo: string;
  repetido: number; // quantas vezes esse item aparece no total
}

/** Normaliza nome do item pra deduplicação (lowercase, sem acento, trim) */
function normalizeName(s: string): string {
  return (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** Escapa valor pro CSV (separador ; padrão Excel BR) */
function csvEscape(v: string | number): string {
  const s = String(v ?? '');
  if (/[;"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function flatten(
  menus: Array<{ empresa?: string; titulo?: string; itens?: CardapioGroup[] }>,
  origem: Origem
): RawItem[] {
  const out: RawItem[] = [];
  for (const m of menus) {
    const empresa = (m.empresa || '').trim();
    const titulo  = (m.titulo  || '').trim();
    for (const grupo of m.itens || []) {
      const categoria = (grupo.categoria || '').trim();
      for (const it of grupo.itens || []) {
        out.push({
          origem,
          empresa,
          titulo,
          categoria,
          item: (it.item || '').trim(),
          valor: (it.valor || '').trim(),
          descricao: (it.descricao || '').trim(),
        });
      }
    }
  }
  return out;
}

/** Carrega tudo, dedupa, atribui códigos e gera o CSV string. */
async function buildCsv(): Promise<string> {
  const [banners, a4s] = await Promise.all([
    cardapioService.listar(),
    menuA4Service.listar(),
  ]);

  const raw: RawItem[] = [
    ...flatten(a4s as any[], 'A4'),
    ...flatten(banners as any[], 'Banner'),
  ];

  // Conta ocorrências por nome normalizado
  const counts = new Map<string, number>();
  for (const r of raw) {
    const key = normalizeName(r.item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  // Atribui códigos por nome único, em ordem alfabética pra estabilidade
  const uniqueKeys = Array.from(counts.keys()).sort();
  const codeByKey = new Map<string, string>();
  uniqueKeys.forEach((k, i) => {
    codeByKey.set(k, String(i + 1).padStart(4, '0'));
  });

  // Monta linhas finais, ordena por origem → empresa → categoria → item
  const rows: ExportRow[] = raw
    .map((r) => ({
      ...r,
      codigo: codeByKey.get(normalizeName(r.item)) || '',
      repetido: counts.get(normalizeName(r.item)) || 1,
    }))
    .sort((a, b) => {
      if (a.origem !== b.origem) return a.origem.localeCompare(b.origem);
      if (a.empresa !== b.empresa) return a.empresa.localeCompare(b.empresa, 'pt-BR');
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria, 'pt-BR');
      return a.item.localeCompare(b.item, 'pt-BR');
    });

  const header = [
    'Código',
    'Origem',
    'Empresa',
    'Título',
    'Categoria',
    'Item',
    'Valor',
    'Descrição',
    'Repetido (vezes)',
    'Duplicado',
  ];

  const lines: string[] = [header.map(csvEscape).join(';')];
  for (const r of rows) {
    lines.push(
      [
        r.codigo,
        r.origem,
        r.empresa,
        r.titulo,
        r.categoria,
        r.item,
        r.valor,
        r.descricao,
        r.repetido,
        r.repetido > 1 ? 'SIM' : '',
      ]
        .map(csvEscape)
        .join(';')
    );
  }

  return '\uFEFF' + lines.join('\r\n');
}

/** Gera o CSV e dispara o download no browser. */
export async function exportCardapiosCsv(): Promise<void> {
  const csv = await buildCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);

  const now = new Date();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const link = document.createElement('a');
  link.href = url;
  link.download = `cardapios_${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
