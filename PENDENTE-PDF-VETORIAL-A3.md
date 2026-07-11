# PENDENTE — PDF Vetorial do A3 Duplo (pausado em 10/07/2026)

> **ATUALIZAÇÃO 10/07 22h:** usuário testou o destino **"Salvar como PDF" do
> Chrome** no diálogo de impressão e ficou perfeito — vetorial, com brilhos,
> idêntico à tela. O caso de uso está ATENDIDO por esse caminho; esta feature
> vira melhoria de conveniência (eliminar o risco de alguém escolher o destino
> errado), não mais uma necessidade. Prioridade baixa.

> Feature construída, funcional em parte, mas **desativada da UI a pedido do usuário**
> porque o PDF gerado ainda saiu diferente do preview. Por enquanto o fluxo oficial
> voltou a ser o botão "Imprimir / Salvar PDF" do navegador (aceita o serrilhado).
> Retomar com calma a partir deste documento.

## O problema original

O PDF do A3 gerado via impressão do navegador saía **rasterizado** quando o usuário
usava a impressora virtual **"Microsoft Print to PDF"** (análise do arquivo
"CARDAPIO A3 - POMPEU 2026.pdf": `Producer: Microsoft: Print To PDF`, **0 fontes
embutidas**, milhares de imagens JPEG de 5×5px, 3,9MB, texto serrilhado no zoom).
Com o destino "Salvar como PDF" do Chrome o texto sai vetorial — mas o usuário
queria um fluxo imune a esse erro de configuração.

## O que foi construído (código presente, UI desativada)

- `components/a3Duplo/A3PdfExporter.ts` — gera o PDF direto com **jsPDF**
  (chunk lazy de ~4,7KB): páginas A3, fundo (cor + imagem em cover), blocos de
  empresa espelhando o `EmpresaBlock`, pontilhados, cores do tema, fontes e
  afastamento do topo. Exporta `gerarPdfA3()` e `nomeArquivoPdfA3()`.
- `public/fonts/` — Liberation Sans (Regular/Bold/Italic; métricas idênticas à
  Arial) e Archivo Black (substituta da Arial Black). Licença OFL. Fora do
  precache do PWA (`fonts/*.ttf` no globIgnores do vite.config).
- UI removida (estava em `A3DuploCanvas`): botão "Gerar PDF Vetorial" + modal
  Visualizar / Salvar (nome automático "Cardápio A3 - EVENTO - N parceiros.pdf")
  / Cancelar. Recuperável no histórico git: commit `ec6e846` (feature) e
  `36cf791` (guarda de estado).

## O que JÁ FUNCIONOU (verificado nos bytes do PDF gerado)

- Fontes embutidas de verdade (`LiberationSans` ×3 + `ArchivoBlack`), texto 100%
  vetorial, zoom sem serrilhado.
- Arquivo caiu de 3,9MB (raster) para 1,3MB.
- Nome automático correto ("Cardápio A3 - 91ª EXPOZEBU - 10 parceiros.pdf").
- Tema (cores/fundo), destaque, colunas e estrutura geral corretos.

## O que DEU ERRADO (por que foi pausado)

1. **Bug de estado (JÁ CORRIGIDO, correção mantida em produção — `36cf791`):**
   ao clicar em "Salvar no projeto", a sincronização pós-save sobrescrevia os
   ajustes da tela com os valores vindos do banco — a tela "voltava ao padrão"
   e o PDF saía com a configuração antiga (provado extraindo os tamanhos do PDF:
   item 17px/empresa 26,5px = config salva antiga, não a da tela). Corrigido com
   `userEditouRef`: depois que o usuário toca em qualquer controle, nenhuma
   sincronização troca o estado.
2. **Mesmo assim o usuário reportou que o PDF "saiu fora do que estou vendo"**
   após a correção estar no ar — NÃO foi validado se ele testou já com o fix
   (exige F5 na tela). Pendência nº 1 da retomada: repetir o teste com o fix.
3. **Fidelidade visual incompleta do renderer jsPDF** (diferenças conhecidas):
   - Sem text-shadow/glow (empresa/categorias) e sem o vignette de fundo.
     Usuário quer o visual completo; aceita essas camadas como IMAGEM, desde
     que o TEXTO fique vetorial (PDF híbrido: efeitos raster + texto vetor).
   - Alturas de linha aproximadas (1.15/1.05/1.3) vs medição real do DOM —
     pode divergir alguns px na distribuição vertical.

## Plano de retomada sugerido

1. Repetir o teste com o fix `36cf791` no ar: F5 → ajustar → salvar (tela não
   pode pular) → Gerar PDF → comparar com o preview. Pode já estar resolvido.
2. Se ainda divergir: comparar preview (screenshot do usuário) vs
   `pypdfium2`-render do PDF, medir diferenças (tamanhos? espaçamentos? topo?).
3. Fidelidade dos efeitos: gerar camada de fundo (cor+imagem+vignette+glows)
   como UMA imagem raster por página (canvas offscreen) e desenhar o TEXTO
   vetorial por cima — híbrido que atende "brilho como imagem, texto vetor".
4. Reativar botão + modal (copiar do commit `ec6e846`).

## Ferramentas de diagnóstico usadas (repetir se precisar)

```bash
# fontes/estrutura do PDF
python -c "import pikepdf; ..."  # ver histórico da conversa 10/07/2026
# renderizar páginas do PDF para comparar visualmente
pip install pypdfium2
```
