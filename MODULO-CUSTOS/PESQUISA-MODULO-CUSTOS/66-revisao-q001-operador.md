# 66 — Revisão Q-001 pela lente do OPERADOR (gestor de eventos)

> Data: 02/08/2026 · Lente: operador pragmático (vive de planilha, não sabe nada
> de banco). Revisa a decisão consolidada nos rel. 61 (modelagem) e 62 (operação):
> **o orçamento vive na EDIÇÃO ("Rodeio X 2026"), não no evento-pai ("Rodeio X");
> evento avulso cria pai + edição automaticamente (invisível); o pai agrega a série.**
> Não avalia a decisão técnica (essa está certa) — avalia se DÓI no dia a dia.

## VEREDITO

**FUNCIONA PARA O LEIGO** — desde que a interface fale "evento" e "ano/edição", NUNCA
"evento-pai" e "edição-id", e que a criação já caia dentro de um ano. A decisão de
guardar o custo por ano é exatamente como o gestor já pensa ("o Rodeio DESTE ano custou
tanto"); o risco não está na arquitetura, está em VAZAR o vocabulário técnico na tela.
Achado que reforça: o sistema atual **já** mostra em cada card do dashboard o trio
`[2026] NOME DO EVENTO • título/datas` navegando por `edicao.id` — ou seja, o pai já é
um container invisível na prática, e ninguém reclamou. A decisão do custo só segue o
eixo que o operador já usa todo dia.

---

## Simulação, cenário a cenário

### (1) Criar "Rodeio X 2026" copiando 2025 — o fluxo de 15 min sobrevive?
**Sim, e melhora.** Na cabeça do gestor a ação é "vou fazer o Rodeio de novo esse ano".
Ele não cria "uma edição do pai"; ele clica no Rodeio X e faz **"Repetir para 2026"**
(ou "Novo ano"). O botão "copiar custos da edição anterior" (rel. 62) é o que salva os
15 min: ele não recomeça do zero, chega com o orçado/compostos de 2025 prontos e só
renegocia preço. **Cuidado de UI:** o botão de cópia tem de ser a rota ÓBVIA e default
(o gesto natural é "repetir o do ano passado"), não uma opção escondida — se o leigo não
achar a cópia, ele recria na mão e a promessa dos 15 min morre. A cópia deve trazer
orçado + compostos e deixar o realizado de 2025 intacto como âncora.

### (2) O gestor entende pai/edição ou tem de ser 100% invisível?
**Não precisa ser 100% invisível — precisa ser traduzido.** Ele NÃO entende "pai" e
"edição" (jargão de banco). Ele entende **"evento"** (o Rodeio X, que existe todo ano) e
**"o ano"** (2026). Isso ele já vive na planilha: uma aba por ano, o nome do evento no
topo. Então a hierarquia pode e deve aparecer — como **"Rodeio X" › "2026"** — desde que
com essas palavras. O que confunde é chamar de "edição" na primeira tela; "edição" soa a
revista/livro. Preferir **"ano"** como rótulo primário e usar "edição" só quando houver
dois eventos no mesmo ano (caso raro). O dashboard atual já faz isso certo com o badge do
ano + nome — seguir o mesmo padrão no módulo de custos.

### (3) A conversa de vendas (RF-046) sai natural?
**Sai — é o cenário mais forte da decisão.** Porque o custo mora por ano, a frase
"ano passado custou 1, o de antes 0,75, o seu chega a 1,25" é literalmente ler os anos
do mesmo evento em sequência. O gestor abre "Rodeio X", vê a coluna de anos e a projeção
já calculada. **Isso só é natural PORQUE o custo está na edição** — se estivesse no pai,
o sistema teria de descobrir "de que ano é cada custo" para montar a série, e a âncora do
RF-046 ficaria frágil. **Cuidado de UI:** a tela do evento (pai) tem de ter uma vista
"últimos anos, lado a lado" pronta — é o material de negociação; se exigir montar
relatório, o gestor volta pro Excel.

### (4) Dia de campo avulso: o gestor nunca percebe que existe um pai — confirma?
**Confirmado, com UMA condição inegociável.** O gestor digita "Dia de campo Fazenda Y",
responde meia dúzia de itens (RF-042) e pronto. Ele nunca deve ver a palavra "edição"
nem um passo "agora crie o ano". O pai + edição nascem juntos, automáticos e mudos
(rel. 61/62). **Condição:** a criação do evento tem de materializar a edição na mesma
transação — se em algum momento existir um evento SEM ano e o centro de custo não abrir
("cadê a edição?"), o leigo trava sem entender o porquê. Bônus real: se aquele dia de
campo virar anual, ele já é o "ano 1" sem migração — mas isso é ganho de bastidor, o
operador não precisa saber. Confirmado que funciona.

### (5) Encerrar a edição e abrir a próxima — ritual anual claro?
**Pode ser claro, mas é o ponto que exige mais capricho de UI** — é onde o leigo mais
pode se perder. Na cabeça dele: "fechei o Rodeio desse ano, mês que vem começo o do ano
que vem". Isso mapeia certo em: **encerrar o ano atual** (congela o realizado, vira
histórico/âncora do RF-046) e **abrir o próximo ano** (nova edição, com a cópia do
anterior). **Cuidados:** (a) chamar de **"Encerrar 2026"** / **"Abrir 2027"**, nunca
"fechar edição"; (b) deixar EXPLÍCITO que encerrar não apaga nada — só arquiva e vira
base do próximo (o operador tem medo de "perder o trabalho", ver MEMORY sobre reversível);
(c) "Abrir 2027" deve automaticamente oferecer copiar de 2026. Se esses três estiverem no
lugar, o ritual anual é claro; sem eles, o gestor fica inseguro se encerrar "some" com o
histórico.

### (6) Que NOME as coisas devem ter para o leigo?
| Conceito técnico | NOME na interface | NÃO usar |
|---|---|---|
| evento-pai (`eventos`) | **Evento** (ex.: "Rodeio X") | "pai", "guarda-chuva", "série" |
| edição-ano (`eventos_edicoes`) | **Ano** (ex.: "2026"); "Edição" só se houver 2 no mesmo ano | "edição" como rótulo primário, "instância" |
| criar nova edição | **"Novo ano" / "Repetir para 2027"** | "criar edição", "nova instância" |
| copiar da anterior | **"Copiar do ano passado"** (default óbvio) | "clonar", "duplicar registro" |
| agregação do pai | **"Histórico do evento" / "Últimos anos"** | "consolidação por evento_id" |
| encerrar edição | **"Encerrar 2026"** | "fechar edição", "arquivar instância" |

Regra-mãe: o operador só conhece **Evento** e **Ano**. Todo o resto é bastidor.

---

## Onde CONFUNDE se a UI descuidar (riscos concretos, todos de front)

1. **Vazar "edição"** como rótulo primário — soa a livro/revista, quebra o modelo mental
   "evento + ano". (o mais provável de acontecer)
2. **Cópia escondida** — se "copiar do ano passado" não for o gesto default ao abrir o
   ano novo, o gestor recria na mão e perde os 15 min.
3. **Medo no encerramento** — se "encerrar" não deixar claro que arquiva e não apaga, o
   gestor evita encerrar e a série do RF-046 fica bagunçada (anos abertos misturados).
4. **Evento sem ano** — qualquer brecha que crie evento sem edição materializada trava o
   leigo no avulso ("cadê o centro de custo?"). Tem de nascer junto, sempre.

## Conclusão para o encaminhamento

A decisão do rel. 62 está **certa pela ótica de quem opera** — ela segue o eixo (evento +
ano) que o gestor já usa na planilha e que o sistema atual já expõe sem atrito no
dashboard. O trabalho que resta NÃO é rediscutir a arquitetura: é **garantir o vocabulário
"Evento / Ano"**, a **cópia como caminho default**, e um **encerramento que tranquiliza**
(não apaga). Com esses três cuidados de UI, FUNCIONA PARA O LEIGO.
