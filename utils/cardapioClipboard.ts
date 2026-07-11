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
 * retornamos null e o paste normal (texto puro com Tabs) acontece.
 */

const SELETOR_BLOCOS = 'p, div, h1, h2, h3, h4, h5, h6, li';

/** Texto limpo de um nó (espaços colapsados). */
function textoDe(el: Element | HTMLElement): string {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

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
  //    re-parseia só esse trecho e coleta os blocos-folha na ordem.
  const idxTable = html.search(/<table/i);
  const antes = new DOMParser().parseFromString(html.slice(0, idxTable), 'text/html');
  const blocos = antes.body.querySelectorAll(SELETOR_BLOCOS);
  if (blocos.length > 0) {
    blocos.forEach((b) => {
      // só blocos-folha (sem sub-blocos), para não duplicar texto aninhado
      if (!b.querySelector(SELETOR_BLOCOS)) {
        const t = textoDe(b);
        if (t) lines.push(t);
      }
    });
  } else {
    const t = textoDe(antes.body);
    if (t) lines.push(t);
  }

  // 2) Linhas das tabelas: cada <tr> vira colunas separadas por Tab.
  tables.forEach((table) => {
    table.querySelectorAll('tr').forEach((tr) => {
      const cells = Array.from(tr.children).map((cell) => textoDe(cell));
      if (cells.some((c) => c.length > 0)) {
        lines.push(cells.join('\t'));
      }
    });
  });

  return lines.length > 0 ? lines.join('\n') : null;
}
