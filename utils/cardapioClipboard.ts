/**
 * cardapioClipboard.ts
 *
 * Conversão de tabela HTML da área de transferência para o formato texto do
 * cardápio (linhas + colunas separadas por Tab).
 *
 * Por quê: ao copiar uma tabela renderizada de um chat de IA, o clipboard
 * carrega duas versões — HTML (estruturada) e texto puro. Alguns chats geram
 * o texto puro SEM tabs/quebras (tudo emendado), e só o Excel "entendia" a
 * cópia porque lê a versão HTML. Este helper faz o mesmo que o Excel:
 * intercepta o paste e reconstrói o texto a partir do HTML.
 *
 * Os DOIS formatos continuam funcionando: se o clipboard não tiver <table>,
 * retornamos null e o paste normal (texto com Tabs) acontece.
 */

const QUEBRA = ''; // marcador interno de quebra de bloco

/**
 * Converte o HTML colado em texto do cardápio.
 * Retorna null se não houver <table> (deixa o paste normal acontecer).
 */
export function tabelaHtmlParaTexto(html: string): string | null {
  if (!html || !/<table/i.test(html)) return null;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  if (tables.length === 0) return null;

  const lines: string[] = [];

  // 1) Linhas de texto ANTES da primeira tabela (segmento + empresa):
  //    insere um marcador no fim de cada bloco e extrai o texto sem tags.
  const idxTable = html.search(/<table/i);
  const before = html
    .slice(0, idxTable)
    .replace(/<(\/p|\/div|\/h[1-6]|\/li|br[^>]*)>/gi, `$&${QUEBRA}`);
  const div = document.createElement('div');
  div.innerHTML = before;
  const preLines = (div.textContent || '')
    .split(QUEBRA)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  lines.push(...preLines);

  // 2) Linhas das tabelas: cada <tr> vira colunas separadas por Tab.
  tables.forEach((table) => {
    table.querySelectorAll('tr').forEach((tr) => {
      const cells = Array.from(tr.children).map((cell) =>
        (cell.textContent || '').replace(/\s+/g, ' ').trim()
      );
      if (cells.some((c) => c.length > 0)) {
        lines.push(cells.join('\t'));
      }
    });
  });

  return lines.length > 0 ? lines.join('\n') : null;
}
