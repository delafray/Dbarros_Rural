# Ideia — Assistente de IA no grupo de WhatsApp do evento

> Registrado em 05/08/2026 a partir de conversa com Ronaldo. **Ideia futura — NÃO implementar
> sem autorização explícita.** Complementa (não substitui) o módulo Centro de Custo.

## Conceito

Todo evento tem um grupo de WhatsApp da equipe. Um número dedicado ("assistente do evento")
entra no grupo como participante, **escuta tudo em silêncio** e transforma conversa informal
em registro estruturado no sistema: tarefas com dono e prazo, decisões, custos combinados,
contatos de fornecedores.

Cenário que motivou a ideia: *"quebrou um fio"* no grupo → alguém lá de trás manda um
**áudio** dizendo *"eu resolvo"* → a IA transcreve, conecta com o problema relatado minutos
antes e registra: **"Consertar fio do som — assumido por [autor do áudio] às 14h32, via áudio"**.
Hoje esse compromisso evapora; com o assistente, vira tarefa com dono, hora e follow-up.

## Pipeline técnico

1. **Conexão ao grupo** — opções:
   - **Evolution API** (open source, BR, mais popular) ou Baileys: número comum via protocolo
     do WhatsApp Web. Funciona bem, mas **viola ToS do WhatsApp — risco de banimento do
     número**. Regra de ouro: número dedicado e descartável, nunca o pessoal; comportamento
     discreto (sem spam).
   - **API oficial da Meta (Cloud API)**: via segura, mas suporte a grupos historicamente
     limitado (beta). ⚠️ Pesquisar estado atual antes de decidir.
   - **Telegram**: API oficial de bots, perfeita tecnicamente — mas atrito cultural (equipe
     de evento vive no WhatsApp).
2. **Áudio** — voice notes chegam em .ogg; transcrição via Whisper (API ~centavos/min, ou
   open source no próprio servidor). Português funciona bem; áudio de evento é ruidoso —
   guardar o áudio original junto da transcrição.
3. **Extração** — cada mensagem (texto ou transcrição) + contexto das mensagens anteriores
   vai para um LLM rápido/barato (classe Haiku) que classifica: tarefa / decisão / custo /
   contato / prazo / ruído. Remetente vem nos metadados → atribuição automática de dono.
4. **Persistência** — grava no Supabase (tarefas do evento, lançamentos sugeridos no
   orçado × contratado do Centro de Custo — sempre como **sugestão a validar**, nunca
   lançamento automático).

## Comportamento (o segredo é QUANDO falar)

Bot falastrão vira praga — em 3 dias o grupo silencia. Regra: **anota tudo em silêncio** e
só se intromete em 3 situações:

1. **Não entendeu algo importante** — ex.: áudio ininteligível sobre um problema:
   > 🤖 *Não consegui entender bem o áudio sobre o fio quebrado (ruído). @fulano, ficou
   > com você resolver? Responde aqui que eu registro.*
   Menção real (@) via API — notifica o celular da pessoa.
2. **Tarefa órfã** — problema relatado e ninguém assumiu em X minutos:
   > ⚠️ *O fio quebrado do som ainda está sem responsável.*
3. **Prazo estourando** — follow-up educado:
   > *@beto, o gerador que você ficou de resolver até as 16h — resolvido?*

Além disso:
- **Resumo diário** no grupo (ex.: 18h): tarefas novas / concluídas / vencendo.
- **Comandos**: `@assistente resumo`, `@assistente o que falta pra arena?`.
- **Desempate**: se 3 pessoas mandam "deixa comigo", registrar o último ou perguntar
  "ficou com quem?". Limiares (minutos até cobrar, o que é "importante", tom) são
  **configuração por evento**.
- Tarefa vinda de áudio ruidoso entra marcada como "a confirmar".

## Cuidados não-técnicos

- **Transparência/LGPD**: avisar no grupo que há um assistente registrando (uma linha na
  descrição do grupo resolve).
- Tudo que a IA extrai é **sugestão a validar** por humano — conversa de grupo é ambígua.
- Foto de nota fiscal no grupo pode virar lançamento de custo sugerido (mesmo funil).

## Encaixe no produto

Diferencial forte para o pacote por evento (projeto 3D + descritivo + sistema): nenhum
concorrente de evento pequeno/médio oferece "grupo com secretária de IA que transforma
conversa em tarefa e custo". Usa a stack já existente (Supabase + API do Claude) e o
conhecimento de operação de evento — as regras de calibragem são o que um concorrente
genérico não consegue copiar.

## Primeiro passo (quando autorizado)

Protótipo: Evolution API + número novo + grupo de teste + Whisper + classificador
(Haiku) → gravar tarefas numa tabela simples e postar resumo diário. Validar taxa de
acerto da transcrição em áudio de campo antes de qualquer coisa.
