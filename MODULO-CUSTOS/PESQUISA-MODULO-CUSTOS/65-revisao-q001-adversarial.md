# 65 — Revisão ADVERSARIAL da Q-001 (FK raiz do Centro de Custo)

> Data: 02/08/2026 · Papel: revisor adversarial (tentar QUEBRAR a decisão antes de virar código).
> Alvo: decisão convergente dos rel. 61 (modelagem) e 62 (operação) — **FK raiz `edicao_id` →
> `eventos_edicoes`; evento avulso cria pai + 1 edição; pai agrega por join; fornecedores/
> produtos/biblioteca de espaços no nível empresa.**
> Método: ataques cruzados com o CÓDIGO REAL do repo (migrations, `eventosService.ts`,
> `CadastroEvento.tsx`, RLS `master_isolation`, `authService.ts`), não só com a teoria.

---

## Resumo do veredito

**A DECISÃO SOBREVIVE** — a escolha do grão (edição como raiz) é a certa e resiste a
todos os 7 cenários. **MAS as duas deliberações apoiaram-se em duas premissas de código
FALSAS**, e uma delas esconde um furo de segurança que já existe hoje e que o módulo de
custos vai herdar se ninguém corrigir. A decisão não cai; os **pressupostos** caem, e viram
pré-condições obrigatórias de implementação. Detalhe ataque a ataque abaixo.

---

## Ataque 1 — Integridade do par pai↔edição e "pais-fantasma"

**Alegação das deliberações:** "uma edição sempre tem pai (NOT NULL nos dois lados)"; "o
cadastro garante a edição-pai automática".

**Realidade no código — DUAS falhas:**

- **`evento_id` é NULLABLE.** Em `20260225003600_create_events_system.sql`:
  ```sql
  evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE,   -- SEM NOT NULL
  ```
  Não existe `NOT NULL`. A afirmação "NOT NULL em ambos os lados" (rel. 61, l.47) é
  **falsa hoje**. Uma edição órfã (custos pendurados em edição sem pai) é fisicamente
  inserível. A âncora do RF-046/037 ("subir até `eventos` e `GROUP BY evento_id`")
  silenciosamente **perde** as edições com `evento_id IS NULL`.

- **NÃO existe criação automática pai+edição.** Em `eventosService.ts`, `saveEvento` e
  `saveEdicao` são chamadas **independentes**. Em `CadastroEvento.tsx` a aba "Edições" fica
  **travada** (`isTabLocked`) até o evento existir, e a edição só nasce se o usuário clicar
  "Adicionar Edição" e salvar. **É perfeitamente possível criar um `evento` sem NENHUMA
  edição** (a tabela mostra "Nenhuma edição cadastrada"). Ou seja, o caminho oposto ao
  temido pelo rel. 61 é o real: não há edição órfã de pai pela UI, mas há **pai órfão de
  edição** — e o módulo de custos, ancorado na edição, simplesmente **não tem onde
  pendurar custo** nesses eventos. A "criação automática da edição" que a decisão assume
  como mitigação **ainda não existe** e é trabalho a fazer, não fato dado.

**Poluição da lista (pais-fantasma):** procede como preocupação de UX, mas é menor. Um dia
de campo avulso vira 1 pai + 1 edição; `getEventos()` ordena por nome e lista tudo. 40
avulsos/ano = 40 pais degenerados na lista de eventos. Não quebra dado, mas suja a tela de
Eventos (que hoje não distingue "pai recorrente" de "pai de realização única"). **Ajuste
sugerido:** flag `recorrente`/`tipo` no pai, ou uma view que colapse pai-de-1-edição.

> **Veredito A1:** a decisão sobrevive, mas exige **(a)** tornar `evento_id NOT NULL` na
> migration do módulo (ou uma trigger que recuse custo em edição órfã) e **(b)** IMPLEMENTAR
> de fato a criação atômica pai+edição (hoje inexistente). Sem isso, "custo órfão zero" é
> promessa não cumprida pelo schema atual.

---

## Ataque 2 — `users.edicao_id`, visitantes e RLS (O ACHADO MAIS FORTE)

**Alegação das duas deliberações (rel. 61 l.68-70, rel. 62 l.26):** "a RLS já isola por
edição em `users.edicao_id`; uma cláusula `edicao_id IN (edições permitidas)` protege as
~10 tabelas." Isto é apresentado como o argumento-âncora de que o grão-edição "preserva
integridade e RLS por edição".

**Realidade no código — a premissa é FALSA e perigosa:**

- A RLS real do repo (`20260310000001_rls_master_isolation.sql`) **NÃO usa `users.edicao_id`
  em lugar nenhum.** O isolamento é por **`master_user_id` no `eventos` pai**: `is_master()
  OR master_user_id IS NULL`. Todas as ~11 policias resolvem o pai por join e checam
  `master_user_id`.
- `users.edicao_id` é apenas um **rótulo** gravado em visitante temporário por
  `authService.createTempUser` (l.322-347). **Nenhuma policy o consulta.** `grep edicao_id`
  nos `.sql` e em `Users.tsx` confirma: zero uso em enforcement.
- **Consequência de segurança:** um visitante amarrado à "Barra Mansa 2026" **não está
  contido a essa edição pela RLS**. Pela policy atual ele enxerga/escreve QUALQUER linha
  cujo pai tenha `master_user_id IS NULL` — ou seja, **todas as edições não-master**. Se o
  módulo de custos copiar o mesmo padrão `master_isolation` (é o único que existe), **os
  custos de TODOS os eventos ficam visíveis a todo visitante** — e o CLAUDE.md diz
  explicitamente "visitante nunca escreve em nenhuma tabela": a policy `FOR ALL` nem separa
  leitura de escrita por papel.

Isto NÃO derruba a escolha do grão (edição continua sendo o eixo certo), mas **derruba o
principal argumento usado para justificá-la** e revela que a RLS "por edição" que as duas
deliberações deram como pronta **precisa ser construída do zero** — e a decisão de ancorar
na edição só ajuda essa construção se o `users.edicao_id` (ou uma tabela de acesso
usuário×edição) passar a ser **de fato** consultado nas policies.

> **Veredito A2:** decisão sobrevive; **premissa cai**. Pré-condição dura: a RLS do módulo
> de custos NÃO pode herdar `master_isolation` como está. Tem de filtrar por edição de
> verdade (`edicao_id = users.edicao_id` para visitante, papel para gestor) e separar
> SELECT de escrita. Segue o `PADRAO-NOVOS-SISTEMAS.md` (RLS desde o zero) — é o próprio
> caso de dor que originou o padrão.

---

## Ataque 3 — Rebranding (evento muda de nome/pai entre anos) e a série do RF-046

Cenário: "Rodeio da Serra" (2024, 2025) é renomeado "Festa Country da Serra" (2026); ou o
promotor troca e o gestor cria um pai novo.

- **Renomear o pai:** o `nome` fica em `eventos` (pai único); as edições apontam por
  `evento_id`. Trocar o nome **não quebra a série** — a FK é por id, não por nome; RF-046
  (`SUM por edicao_id ORDER BY ano` dentro do mesmo `evento_id`) continua íntegro. **A
  decisão ganha aqui** — exatamente o cenário em que ancorar no nome/pai-textual quebraria.
- **O furo real do rebranding:** se o gestor, por não reconhecer o evento renomeado, criar
  um **pai NOVO** para 2026, a série 2024-2025 fica no pai antigo e 2026 no novo → RF-046
  quebra por **fragmentação de pai**, não por modelagem. Isto é um risco de **processo/UX**
  (nenhum modelo protege contra o humano criar duplicata), mitigável com "mover edição
  entre pais" (um `UPDATE evento_id` — trivial no grão-edição) e busca de pai por
  similaridade no cadastro. **Ancorar no pai NÃO resolveria isto e ainda seria pior:**
  mover custos entre baldes exigiria backfill em ~10 tabelas.

> **Veredito A3:** sobrevive e sai reforçada. Ajuste: prever "reassociar edição a outro
> pai" (barato no grão-edição) e desduplicação de pai no cadastro.

---

## Ataque 4 — Duas edições simultâneas do mesmo pai

Já suportado hoje: `eventos_edicoes` não tem unique em `(evento_id, ano)` — duas edições
com mesmo `evento_id` e mesmo `ano` coexistem (rel. 62, cenário 3). Cada uma tem seu
`edicao_id` e, portanto, seu centro de custo isolado. A previsão RF-046 usa `ORDER BY ano`,
que **empata** as duas do mesmo ano; ajuste menor: ordenar/agrupar por `data_inicio` ou por
`edicao_id` de desempate, não só por `ano`. Nada estrutural.

> **Veredito A4:** sobrevive sem esforço. Grão-edição é o único que trata isto sem
> gambiarra. (No modelo pai, colidiria — como o próprio rel. 62 nota.)

---

## Ataque 5 — Orçamento ANTES da edição existir (simular para decidir SE faz) — O 2º ACHADO

Este é o cenário que a decisão **não cobre bem**, e conecta direto com o RF-046, que é o
requisito que "ABRE a conversa": o gestor quer simular o custo de um evento **para decidir
se aceita fazê-lo** — antes de existir compromisso, data, e às vezes antes de existir o pai.

- Pela decisão, custo só existe preso a `edicao_id NOT NULL`. Logo, **para simular, é
  preciso primeiro materializar pai + edição** — criando um registro "real" para algo que
  talvez não aconteça. Isso **repõe exatamente o pais-fantasma do Ataque 1**, agora com
  edições-fantasma de orçamentos abortados poluindo a série histórica e o RF-046 (a série
  "0,75 → 1 → 1,25" passa a incluir simulações que viraram nada).
- A decisão não define **onde vive a simulação**. Duas saídas limpas, ambas compatíveis com
  o grão-edição:
  1. **Edição em status `rascunho`/`simulacao`** (não entra em agregações plurianuais até
     ser "confirmada") — barato, reusa o eixo, mas exige disciplina de status em TODA query
     de série (senão contamina RF-046).
  2. **Cópia-como-base sem persistir** (RF-037 já prevê "copiar como base"): a simulação é
     um clone efêmero de uma edição anterior, calculada em memória/relatório, só persistida
     se o gestor "promover a evento real". Mais aderente ao "não chego de mãos vazias" do
     RF-046.

> **Veredito A5:** a decisão **sobrevive mas está incompleta** — precisa de um estado de
> simulação/rascunho de edição, ou o RF-046 força o usuário a sujar a série com eventos que
> nunca aconteceram. É o ajuste mais substantivo. Não justifica ancorar no pai (lá a
> simulação seria ainda mais solta).

---

## Ataque 6 — Performance/complexidade das consultas plurianuais

- As policies atuais fazem subquery com JOIN pai a cada linha; os índices existem
  (`idx_eventos_edicoes_evento_id`, `..._edicao_id` em `20260310000003`). Para ~10 tabelas
  novas, cada policy repetirá o join até `eventos` para achar `master_user_id`. Com o
  volume real (dezenas de eventos, não milhões de linhas) é **irrelevante** em performance.
- Complexidade de escrita das policies, sim, cresce: cada tabela de custo repete o mesmo
  bloco `JOIN eventos_edicoes ... JOIN eventos`. **Mitigação já ditada pelo próprio
  `PLANO-MODULO-CUSTOS`**: função `SECURITY DEFINER` cacheada (`is_master()` já é assim) +
  `(select auth.uid())`. Um helper `pode_ver_edicao(edicao_id)` centraliza a lógica e evita
  colar o join 10 vezes.
- Consolidação plurianual (RF-046/RF-037): `SUM ... GROUP BY evento_id` sobre um join que já
  tem índice — trivial no volume esperado.

> **Veredito A6:** não quebra. Recomendação: **um helper SQL único** de visibilidade por
> edição, para não replicar (e dessincronizar) 10 policies.

---

## Ataque 7 — Migração das ~40 planilhas históricas — PREMISSA FALSA (3º ACHADO)

**A missão pergunta:** "amarrar ~40 planilhas históricas a edições retroativas é viável?"
**A premissa está errada** e vale corrigir antes de dimensionar o trabalho:

- O baseline registrado (`01-VISAO-E-ESCOPO.md`, l.57-58) diz: **"hoje UM evento são ~40
  planilhas desconectadas."** As ~40 planilhas são as facetas de **um único evento/edição**
  (banheiro, tenda, gerador, som, cotações...), **não 40 eventos históricos**. Logo NÃO há
  "40 edições retroativas" a reconstruir — há **1 edição** para a qual convergem ~40
  arquivos.
- Isso torna a migração **muito mais fácil** do que o cenário temido: amarrar ~40 planilhas
  a **uma** `edicao_id` (via importação/colar — RF-047, RF-012/029, já previstos) é o
  caminho-feliz do módulo, não um backfill plurianual arriscado.
- O grão-edição **ajuda** aqui: cada import cola numa edição-alvo; se depois surgir histórico
  de anos anteriores, cada ano vira uma edição do mesmo pai (o "ano 1" do rel. 61). Não há
  discriminador de ano a inventar.

> **Veredito A7:** sobrevive e é o cenário mais favorável. O "risco de 40 migrações" era
> fantasma — são 40 fontes → 1 edição.

---

## VEREDITO FINAL

**A DECISÃO SOBREVIVE.** Ancorar o centro de custo em `edicao_id → eventos_edicoes` é o grão
correto e resiste aos 7 ataques; nenhum cenário justifica ancorar no pai (o pai perde em
rebranding, em duas-edições-no-ano, em cancelamento e em custo de errar). **O que CAI são
duas premissas factuais das deliberações**, que viram pré-condições de implementação:

1. **"RLS já isola por edição via `users.edicao_id`" — FALSO.** A RLS real é por
   `master_user_id` no pai e não contém `users.edicao_id`; visitante não está contido à sua
   edição. A RLS do módulo tem de ser escrita do zero, por edição, com SELECT×escrita
   separados. **(Ataque 2 — o mais grave: segurança.)**
2. **"NOT NULL nos dois lados + criação automática pai+edição" — FALSO.** `evento_id` é
   nullable e não há criação atômica; hoje existe pai-sem-edição. Exigir `NOT NULL` +
   implementar a criação atômica é pré-requisito de "custo órfão zero". **(Ataque 1.)**
3. **Lacuna de desenho:** falta o estado de **simulação/rascunho** de edição para o RF-046
   ("orçar antes de decidir se faz") — sem ele, simulações abortadas poluem a série
   plurianual. **(Ataque 5.)**

Correção de premissa de escopo: as "~40 planilhas" são de **um** evento, não 40 históricos
— a migração é 40→1 edição, não um backfill plurianual (Ataque 7).

**Condição de sobrevivência:** a decisão passa DESDE QUE, na migration do módulo, entrem
juntos: `evento_id NOT NULL`, criação atômica pai+edição, RLS por edição de verdade (helper
`pode_ver_edicao`) com escrita bloqueada a visitante, e um status de edição-rascunho para a
simulação do RF-046.
