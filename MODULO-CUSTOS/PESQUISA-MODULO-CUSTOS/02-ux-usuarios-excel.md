# UX para conquistar usuários de Excel — Módulo de Custos (VendasEventos)

> Pesquisa de padrões e lições de UX para uma grade de gastos (orçado × contratado × realizado)
> que precisa se comportar como planilha, não como formulário burocrático.
> Público: organizadora de eventos rurais que vive em Excel desorganizado.
> Data: 01/08/2026.

---

## 1. Por que sistemas que tentam substituir planilhas fracassam

O padrão é consistente em vários postmortems e análises: **o problema quase nunca é
técnico nem de treinamento — é comportamental e de fricção percebida.** As pessoas não
"resistem à mudança"; elas escolhem o caminho de menor esforço. Enquanto o Excel for mais
rápido para a tarefa real, o sistema novo perde, por melhor que seja.

**Causas recorrentes de fracasso:**

1. **O sistema adiciona passos em vez de remover.** Se o fluxo oficial tem mais cliques que
   o workaround da planilha, o usuário volta pra planilha. "Se as pessoas precisam de
   planilhas pra fazer o trabalho básico, o sistema não está sustentando o trabalho."
   (consultevo)

2. **Perda de controle e de confiança.** Usuários confiam mais nos próprios arquivos porque
   eles refletem anos de ajustes locais. Trocar isso é sentido como perda de controle —
   risco direto de adoção. Resultado comum: "shadow planning", o time mantém a planilha por
   fora e o sistema vira fachada (modelo híbrido que soma custo sem tirar a fraqueza). (sysgenpro, consultevo)

3. **Tentar substituir tudo de uma vez.** A maioria dos rollouts que falham tentou migrar
   o processo inteiro num big-bang, ou modelou o software em cima do que a planilha *faz*
   em vez do que o negócio *precisa*. (ntse, machinser)

4. **Complexidade acima da necessidade.** Comprar/construir mais estrutura do que o trabalho
   exige gera fluxos que *parecem mais pesados* que o método manual antigo — e adoção morre. (xanda)

5. **Rigidez que quebra a velocidade e a flexibilidade.** Os três motivos psicológicos pelos
   quais as pessoas amam planilha são: **velocidade** (parece rápido), **flexibilidade**
   (criar coluna, mudar lógica sem pedir permissão a ninguém) e **controle local** (não
   esperar por outro sistema). Qualquer replacement que remova esses três perde. (consultevo)

6. **Adoção tratada como problema de treinamento.** Hábitos antigos são automáticos; a
   ferramenta nova exige esforço consciente. Enquanto o ambiente não for redesenhado para
   tornar a ferramenta nova o caminho de menor resistência, a adoção trava. (suebehaviouraldesign)

**Lição-mestra:** *torne o sistema oficial mais fácil que o workaround, ou a adoção falha.*
Não basta ser bom; tem que ser mais barato de usar que abrir o Excel.

Fontes: [consultevo](https://consultevo.com/why-your-team-keeps-reverting-to-spreadsheets/) ·
[suebehaviouraldesign](https://www.suebehaviouraldesign.com/en/blog/why-software-adoption-fails/) ·
[ntse](https://ntse.co.uk/blog/spreadsheet-to-software-migration) ·
[sysgenpro/ERP](https://sysgenpro.com/erp/manufacturing-erp-migration-challenges-when-replacing-spreadsheet-based-planning) ·
[xanda](https://www.xanda.net/when-to-replace-spreadsheets-and-manual-processes-with-custom-software/) ·
[machinser](https://machinser.com/how-to-replace-spreadsheet-based-processes/)

---

## 2. Padrões concretos de grade editável que funcionam

Bibliotecas maduras que "parecem e funcionam como planilha" (Handsontable, Syncfusion,
Smart.Grid, RevoGrid, AG Grid, Infragistics) convergem num conjunto de padrões que os
usuários de Excel esperam por reflexo. Se qualquer um faltar, a grade "quebra a ilusão"
de planilha e o usuário estranha.

**Navegação e edição por teclado (o item nº 1 de "sensação de planilha"):**
- `Tab` / `Shift+Tab` move horizontal; `Enter` confirma e desce; `Shift+Enter` sobe.
- Setas navegam célula a célula; começar a digitar já entra em edição (não precisa
  dar duplo-clique nem clicar em "editar").
- `Esc` cancela a edição da célula sem salvar. `Delete` limpa a célula.
- Navegação completa sem mouse — o teto de produtividade de quem vem de Excel.

**Colar blocos do Excel (colar TSV/multi-célula):**
- Ctrl+V cola um bloco tab-separated (TSV) a partir da célula ativa, preenchendo várias
  células/linhas de uma vez. Opção de colar como **novas linhas** ou **sobrescrever** a
  partir da célula ativa. Este é o recurso que faz o usuário migrar a planilha em segundos
  em vez de redigitar. (Infragistics, Syncfusion)
- Copiar da grade também deve devolver TSV, pra ida e volta com o Excel.

**Autofill (alça de arrasto):**
- Arrastar a alça inferior da seleção para copiar/estender valores ou séries por linhas/colunas,
  igual ao Excel. (Handsontable)

**Undo/Redo:**
- `Ctrl+Z` / `Ctrl+Y` cobrindo edição, colagem e autofill. Isto é o que torna "errar barato":
  o usuário arrisca sem medo porque sabe que desfaz. Sem undo confiável, ele digita com medo
  e volta pro Excel.

**Seleção em intervalo (range):**
- Selecionar retângulos de células (Shift+setas, arrastar) para copiar/limpar/preencher em lote.

**Editores de célula ricos, mas invisíveis:**
- Dropdown/autocomplete/checkbox como editor de célula, com navegação por teclado — sem abrir
  modal. A estrutura (ex.: categoria de gasto, fornecedor) vira um dropdown na própria célula,
  não um formulário à parte.

**Performance:**
- Renderização virtual (só o visível) pra rolar centenas/milhares de linhas sem travar. Lentidão
  destrói a "sensação de rápido" que o usuário busca.

**Validação suave — aceitar entrada suja e sinalizar depois (crítico):**
- Regra consagrada em UX de formulários: **"reward early, punish late"** — confirme o acerto
  rápido, mas só sinalize o erro *depois que o usuário sai do campo*, nunca enquanto ele digita.
  Validar durante a digitação força o usuário a alternar entre dois modos mentais
  (preencher × corrigir), o que atrasa e irrita. (LogRocket, Smart Interface Design Patterns)
- Se a intenção está clara, **trabalhe a favor do usuário**: aceite formatos variados,
  apare espaços, aceite colagem, normalize por trás — não bloqueie por padrão quando a checagem
  é incerta. (Smashing/Vitaly Friedman)
- Para uma grade de gastos: **nunca impedir de digitar/salvar por causa de formato**. Aceite
  "R$ 1.500", "1500", "1.500,00", "mil e quinhentos?" e sinalize com um marcador suave
  (borda amarela, ícone) em vez de um modal de erro que trava o Enter. O dado sujo entra;
  a limpeza é convidada, não imposta.

Fontes: [Handsontable](https://handsontable.com/) ·
[Syncfusion React Data Grid](https://www.syncfusion.com/react-components/react-data-grid) ·
[Infragistics — paste from Excel](https://www.infragistics.com/products/ignite-ui-angular/angular/components/grid/paste-excel) ·
[Smart.Grid](https://www.htmlelements.com/grid/) ·
[RevoGrid — top libs 2026](https://rv-grid.com/blog/top-5-react-spreadsheet-libraries-2026) ·
[jQueryScript — best grids](https://www.jqueryscript.net/blog/best-spreadsheet-data-grid.html) ·
[LogRocket — inline vs after submit](https://blog.logrocket.com/ux-design/ux-form-validation-inline-after-submission/) ·
[Smart Interface Design Patterns — inline validation](https://smart-interface-design-patterns.com/articles/inline-validation-ux/) ·
[Smashing — live validation](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)

---

## 3. "Progressive structure" — começar bagunçado, estruturar depois

O eixo central da adoção. Os dois paradigmas:

- **Airtable = "estrutura primeiro".** Você define os campos/tipos antes de colocar conteúdo.
  Ótimo para dados limpos, mas **força o pensamento em grade lá no começo** — exatamente a
  fricção que assusta o usuário de Excel.
- **Notion = "conteúdo primeiro, estrutura depois".** Você joga o conteúdo bagunçado e formaliza
  em banco de dados depois. A informação nasce contextualizada e só então vira estrutura.
  (notionapps, embednotionpages)

Por que isso importa para nós: a **flexibilidade** é justamente o que faz a planilha ser
rápida de começar (sem setup, sem schema, sem decisões) — e é a mesma flexibilidade que
quebra as coisas depois (alguém digita "15 de março" numa coluna de data, ou uma nota numa
célula que uma fórmula estava somando). O **flexibility–usability tradeoff** diz: quanto mais
flexível o sistema, menos usável ele tende a ficar, porque acomodar tudo gera complexidade. (softr, zite, Wikipedia)

**O caminho vencedor não é escolher um lado — é sequenciar:**
1. **Deixe entrar sujo.** Célula livre, colar bloco, linha sem categoria, valor "mais ou menos".
   Zero obstáculo na captura.
2. **Estruture por convite, depois.** Quando houver dado, ofereça (não imponha): "quer virar
   categoria?", "3 linhas parecem o mesmo fornecedor — agrupar?", marque em amarelo o que está
   fora do formato. A estrutura é uma recompensa progressiva, não um pedágio de entrada.
3. **Nunca perca dado por falta de estrutura.** O anti-padrão é o "shadow planning": se o sistema
   exigir estrutura antes de aceitar o dado, o usuário mantém a planilha por fora.

Fontes: [notionapps — Airtable→Notion](https://www.notionapps.com/blog/why-businesses-move-from-airtable-to-notion) ·
[embednotionpages — migração](https://www.embednotionpages.com/guide/airtable-to-notion-migration/) ·
[softr — spreadsheet vs database](https://www.softr.io/blog/spreadsheet-vs-database) ·
[zite — quando trocar](https://www.zite.com/blog/spreadsheet-vs-database) ·
[Wikipedia — flexibility–usability tradeoff](https://en.wikipedia.org/wiki/Flexibility%E2%80%93usability_tradeoff) ·
[decisivedata — structure vs flexibility](https://www.decisivedata.net/blog/structure-vs-flexibility)

---

## 4. Como Linear / Airtable fazem onboarding de quem migra de planilha

**Linear — o padrão-ouro de onboarding "sem onboarding":**
- Nada de wizard de 5 passos. No primeiro login, um workspace limpo; a ajuda aparece
  **contextualmente**. Assume que você sabe o que a ferramenta faz — sem tour guiado, sem
  "crie seu primeiro item". A tela útil é a primeira coisa que você vê. (925studios, growthdives)
- **Teclado em primeiro lugar.** Command palette (`Cmd+K`) cria, navega e roda qualquer ação
  em poucas teclas; `/` filtra; teclas únicas movem/atribuem. O teto de velocidade supera o Excel. (siit, 925studios)
- **Importadores prontos** (Jira, Asana, Trello, GitHub) — migração em horas, não dias; os
  conceitos mapeiam direto, então a transição é suave. (work-management)

**Airtable — traz estrutura ao caos, mas com a porta do Excel aberta:**
- Import de CSV/Excel e templates que já entregam uma base pronta; foi por anos "a resposta
  padrão para quem superava a planilha", transformando linhas estáticas em base colaborativa.
  O ponto fraco reconhecido: exige definir estrutura antes do conteúdo. (abhyashsuchi, notionsender)

**Lições de onboarding para o módulo de custos:**
- **Zero wizard.** A grade preenchível é a primeira tela. Ajuda contextual, não tour.
- **Importar/colar a planilha existente já no primeiro minuto** (colar TSV do Excel na grade
  vazia). O primeiro "aha" é ver a própria planilha dentro do sistema em segundos.
- **Atalhos de teclado desde o dia 1**, com uma folha de atalhos discreta. A velocidade percebida
  é o que retém quem vem de Excel.

Fontes: [925studios — Linear design](https://www.925studios.co/blog/linear-design-breakdown-saas-ui-2026) ·
[growthdives — Linear onboarding sem A/B](https://www.growthdives.com/p/the-onboarding-linear-built-without) ·
[siit — Linear review](https://www.siit.io/tools/trending/linear-app-review) ·
[work-management — Linear](https://work-management.org/software-development/linear-review/) ·
[abhyashsuchi — Notion vs Airtable](https://abhyashsuchi.in/notion-vs-airtable-2026-7-key-differences/) ·
[notionsender — Airtable vs Notion](https://www.notionsender.com/blog/post/airtable-vs-notion)

---

## 5. RECOMENDAÇÃO — 10 princípios de design da grade de gastos (ordenados por impacto na adoção)

> Ordenados do maior para o menor impacto sobre "o usuário larga o Excel e fica".

1. **Digitou-salvou, sem botão "Salvar".** Edição inline com autosave por célula ao sair do
   campo. Nenhum modal, nenhum formulário. A tela central é a grade — orçado × contratado ×
   realizado como colunas editáveis. *(Sem isto, nada mais importa.)*

2. **Aceite entrada suja; sinalize depois, nunca bloqueie.** "Reward early, punish late":
   aceite "R$ 1.500", "1500", "1.500,00", célula sem categoria, e marque em amarelo/ícone o
   que precisa de atenção. Enter nunca é recusado por formato. Normalize por trás.

3. **Colar bloco do Excel (TSV) na grade.** Ctrl+V cola várias linhas/colunas de uma vez, como
   novas linhas ou sobrescrevendo. É o recurso que migra a planilha existente em segundos e
   gera o primeiro "aha". Copiar da grade também devolve TSV.

4. **Navegação por teclado igual a planilha.** Tab/Shift+Tab, Enter/Shift+Enter, setas,
   começar a digitar já edita, Esc cancela, Delete limpa. Fluxo completo sem tocar no mouse.

5. **Undo/Redo confiável (Ctrl+Z / Ctrl+Y)** cobrindo edição, colagem e autofill. É o que torna
   "errar e corrigir barato" — o usuário arrisca sem medo. Sem isto, ele digita com receio.

6. **Estrutura progressiva por convite, não pedágio.** Deixe a linha entrar sem categoria/fornecedor
   e ofereça estruturar depois ("virar categoria?", "agrupar fornecedor?"). Nunca exija estrutura
   antes de aceitar o dado — senão nasce o "shadow planning" na planilha paralela.

7. **Autofill por arraste + edição em lote.** Alça de arrasto para copiar/estender valores por
   linhas; seleção de intervalo para limpar/preencher em bloco. Replica o gesto do Excel.

8. **Zero wizard: a grade é a primeira tela.** No primeiro acesso, workspace pronto pra colar a
   planilha. Ajuda contextual (tooltips, palette), nunca tour obrigatório. Importar/colar já no
   primeiro minuto.

9. **Rápido de verdade (renderização virtual).** Rolagem fluida com centenas de linhas, digitação
   sem lag. "Parece rápido" é um dos três motivos pelos quais amam planilha; lentidão devolve
   o usuário ao Excel.

10. **Dropdowns e categorias dentro da célula, não em modal.** Categoria de gasto, fornecedor,
    status viram editor de célula (dropdown/autocomplete) com teclado — a estrutura mora na grade,
    não num formulário separado. Preserva controle e flexibilidade local.

---

### Síntese em uma frase
A grade só vence o Excel se for **mais barata de usar que abrir o Excel**: capturar dado sujo
sem fricção, colar a planilha inteira, navegar e desfazer pelo teclado, e deixar a estrutura
chegar depois — como convite, nunca como pedágio de entrada.
