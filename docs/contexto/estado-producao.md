# Estado de produção — Dbarros Rural

> Resumo do que está no ar e o que aguarda validação. Atualizar a cada entrega.
> Histórico completo de decisões: memória persistente + docs dos módulos.

## No ar (produção — `main` → Vercel `dbarros-rural.vercel.app`)

- Sistema de vendas/eventos completo: dashboard, clientes, eventos/edições,
  planilhas de venda, atendimentos, cardápios, controle de imagens.
- **Centro de Custo (módulo de custos)**: MERGEADO e deployado, mas com
  **acesso EXCLUSIVO** de `ronaldo@ronaldoborba.com.br` (RF-060) — front (menu
  + rota) e RLS (`custos_papel` → `sem_acesso` para os demais). Todos os outros
  usuários veem o sistema como antes. Liberação geral: reversão pronta no
  `scripts/bloco25-acesso-exclusivo-custos.sql`.
- **Dashboard — botão "XLS" (12/09, V0.2026.09.0001)**: planilha de vendas
  em Excel ao lado do "PDF", mesmo layout, mas com cálculos em FÓRMULA:
  PREÇO BASE lê a marca do combo ("x" = preço, "*" = 0), OPCIONAIS por
  linha de preços editável, SUBTOTAL/TOTAL/resumo vivos. Aba "Resumo" com
  quantidades por tipo e abertura stand × merchandising (combos e avulso).
  Lógica pura em `utils/relatorioVendasXlsx.ts` (25 testes); exceljs só
  carrega ao clicar. Aguarda validação do usuário com edição real.
- **Botão de simulação de visão** no Dashboard (só o dono): cicla Super Admin →
  Admin → Usuário sem trocar de login (só a UI; RLS segue real).
- **Segurança (auditoria F12, 14/08)**: código-fonte/histórico git fora do
  bundle público; allowlist de upload nos buckets; ban de credencial ao
  desativar usuário. Nenhum segredo vazou.
- **Cardápios — preços compostos (26/08)**: valor `Rótulo - R$ X / ...` agora
  é estruturado pelo parser e SEMPRE vira sublinhas pontilhadas (o inline de
  2 tamanhos quebrava em cardápio pequeno/fonte grande — caso Riva Sorvetes).
  Aplicado no A4 (preview+export, auto-fit conta as sublinhas), no A3 Duplo
  (EmpresaBlock + PDF vetorial) e na Lona (renderer + peso; a fonte automática
  já conta as sublinhas). Ainda inline: só o renderer antigo do módulo
  Cardápios (CardapioRenderer).
- **A3 — botão "PDF p/ Corel" (27/08)**: o PDF do "Salvar como PDF" do
  navegador não abre no CorelDRAW ("arquivo danificado"); reativado o
  A3PdfExporter (jsPDF) como download direto — fundo chapado sem arte,
  com sublinhas/juntar linhas/categorias. O botão de imprimir segue para
  o visual completo.
- **PDFs p/ Corel — texto em CURVAS (27/08)**: o Corel cortava pontas de
  letras ao converter as fontes embutidas; agora A3 "PDF p/ Corel" e A4
  vetorial desenham cada glifo como caminho vetorial via opentype.js
  (`utils/pdfTextoVetor.ts`) — o arquivo não contém NENHUMA fonte (testes
  garantem) e abre no Corel como desenho puro. Trade-off aceito: texto
  não é mais selecionável nesses dois PDFs.
- **A4 — PDF vetorial (27/08)**: exportador jsPDF com fontes embutidas
  (Liberation Sans/Archivo Black, mesmas do A3) espelhando o renderer —
  texto selecionável/nítido; opção principal no menu de export (o raster
  300dpi segue como alternativa). A pedido do usuário sai SÓ O CONTEÚDO
  sobre fundo chapado do tema: sem arte, sem chancela, sem decoração
  (parafusos/linhas — que saíam com contorno escuro) — geração rápida,
  composição da arte fica no Corel. Helpers em `utils/pdfVetorial.ts`
  (A3PdfExporter refatorado para usá-los).
- **A4 — nome de empresa longo + juntar linhas (26/08)**: nome acima de 28
  caracteres quebra em 2 linhas no cabeçalho (fonte pela linha mais longa —
  antes estourava a página); slider "Juntar linhas" no editor do menu (mesma
  compressão ponderada; auto-fit cresce a fonte), salvo no JSON `fontes`.
- **Lona — controles novos (26/08)**: "Juntar linhas" e "Mostrar categorias"
  no editor, salvos no JSON `fontes` da lona (compat: JSON antigo cai no
  padrão). Como a fonte da lona cresce até encher a área útil, compactar/
  ocultar categorias AUMENTA a letra automaticamente. Helpers do juntar
  linhas agora moram em `utils/cardapioParser` (A3 re-exporta).
- **A3 Duplo — controles novos (26/08)**: "Juntar linhas" (70–130%, compressão
  ponderada: descrição encolhe metade, espaços largos o valor cheio) e
  "Mostrar categorias" (oculta DOCES/LANCHES... de todos os cardápios).
  Salvos em `fontes_a3` (campos `linhas`/`mostrarCategorias`); JSON antigo
  sem os campos cai no padrão.
- **A3 Duplo — preenchimento automático (26/08)**: `fillScale` cresce sozinho
  (teto 1.6×, convergência em ≤5 re-medições — `proximoFillScale`) para as
  fontes ocuparem o máximo da página SEM alterar os px do usuário nem as
  proporções entre eles; reage a qualquer mudança (fontes, juntar linhas,
  categorias, topo). Status mostra a fonte efetiva (%).
  **Bug conhecido e ACEITO pelo usuário (26/08, sem corrigir por ora)**: em
  produção o crescimento não disparou (fonte ficou em 100% com colunas a
  ~70%) — na prática o A3 segue manual; o usuário ajusta as fontes à mão.

## Aguardando o usuário

- **RESUMO-MANHA-2026-08-05.md** (precificação, base das fases R4/R5 do módulo
  de custos) — ainda não lido.
- Ban retroativo das 9 contas temporárias inativas antigas (UPDATE opcional em
  `scripts/bloco27-ban-credencial-desativado.sql`).
- Fases R4 (Julgamento/Diversos) e R5 (redesenho do fluxo) do módulo de custos.
- **Mapa de Vendas / motor de planta (17/09, branch `feature-mapa-vendas`, NÃO
  mergeada)**: motor Python (`motor-planta/`) lê a planta do Corel e gera
  planilha + mapa; página `/mapa-vendas/:edicaoId` pinta estandes pela planilha
  em tempo real. Para o piloto Megaleite 2027 o usuário precisa: (1) rodar a
  migration `20260917000001_planilha_mapa.sql`, (2) `scripts/seed-megaleite-2027.sql`,
  (3) `publicar.sql` do motor, (4) subir `fundo.png` — roteiro em
  `motor-planta/RODAR-NO-SUPABASE.md`. Depois: testar na branch, merge, push.

## Notas

- `services/api/photoService.ts` aponta para bucket `photos` que NÃO existe
  aqui — código legado do template; o sistema de fotos real é outro repo.
