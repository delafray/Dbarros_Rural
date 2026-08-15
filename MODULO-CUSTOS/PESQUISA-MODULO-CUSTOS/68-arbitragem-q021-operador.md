# 68 — Arbitragem Q-021 pela lente do OPERADOR (gestor leigo + dono)

> **Data:** 02/08/2026
> **Quem decide aqui:** não é o matemático (rel. 63) nem o teórico de precificação
> (rel. 64) — é quem ABRE A TELA e quem SENTA NA MESA com o expositor. A pergunta
> não é "qual está mais certo", é "qual eu consigo USAR e DEFENDER sem passar
> vergonha e sem tomar prejuízo".
> **Arbitra entre:** Posição A (rel. 63: frete/ART rateados automático por `valor`,
> cachê direto) × Posição B (rel. 64: só direto + medível no estande; frete/ART/
> cachê na verba fechada, cobertos pelo break-even).

---

## As 5 perguntas de quem vai usar

**1) Abro "custo do estande: R$ 5.680" — em qual eu CONFIO e sei de onde veio?**
Na B. R$ 5.250 = peças que o expositor VÊ (tenda, mesa, cadeiras, testeira, luz)
+ duas frações que eu sei recitar (piso 25 de 1.000 m², energia 2 de 200 kVA). Aponto
com o dedo cada linha. No A, dentro dos R$ 5.680 tem R$ 300 e pouco de "fatia do
frete rateada por valor de tenda" — matematicamente lindo, mas quando o cliente
perguntar "que R$ 300 são esses?" eu vou ter de explicar rateio proporcional na mesa.
Não explico. Perdi.

**2) Na negociação, qual número me PROTEGE mais?**
A B, e por um motivo que o técnico não sente: **estabilidade**. O rel. 64 acertou a
dor real — se eu tinha 20 estandes e caio pra 15, o rateio do A muda o preço do MESMO
estande no meio da feira. Eu já vendi 8 a um preço; o 9º não pode custar diferente
"porque o denominador mudou". Custo de peça é firme; custo de verba fechada rateada
balança. Na mesa eu preciso de um piso duro: "custo R$ 5.250, daqui eu não desço" —
e sei que amanhã ainda é R$ 5.250.

**3) Aceito o sistema ratear sozinho (A) ou prefiro o aviso do B?**
Prefiro o aviso. "Custo do estande R$ 5.250 + faltam R$ 170 mil de custos gerais a
cobrir" é a frase que me salva do prejuízo — é o "azul virando vermelho" que o rel. 64
cita. O A me dá um número unitário completo e me deixa CEGO pro buraco de R$ 170 mil:
vendo tudo com markup achando que estou no azul e descubro o rombo na semana do evento.
O B me obriga a olhar as duas contas. Rateio automático de verba fechada esconde o
risco dentro do preço; eu quero o risco na CARA.

**4) Dois números por composto (direto R$ 5.250 / cheio R$ 6.100) resolve ou confunde?**
Como número que eu DIGITO ou NEGOCIO, confunde — funcionário vai brigar sobre qual é
"o certo" e cada um usa um. Mas como **etiqueta de leitura**, ajuda e eu topo: o preço
de trabalho é UM só (R$ 5.250), e ao lado, discreto, um "se um dia a verba fechada
não fechar no break-even, este estande custaria ~R$ 6.100 cheio". É termômetro, não
preço. A regra: **um número manda; o outro é aviso.** Nunca dois preços concorrendo.

**5) Qual explico em 30 segundos pro funcionário novo?**
A B, fácil: "Custo do estande é só o que está DENTRO do estande — as peças e o que dá
pra medir (piso, energia). Frete, ART, gerador e o show são custo do evento inteiro,
ficam numa conta separada que a margem paga." Acabou, 15 segundos. O A eu não consigo:
"o frete entra no estande rateado proporcional ao valor de tenda de cada composto..."
— perdi o funcionário na palavra "proporcional".

---

## VEREDITO

**Fica a Posição B (rel. 64).** É a única que eu, gestor leigo, consigo OPERAR sem
entender de rateio, e a única que eu, dono, consigo DEFENDER na mesa e que me AVISA do
prejuízo em vez de escondê-lo. O rel. 63 é a matemática mais honesta de *como* ratear —
mas ele resolve um problema que, pra verba fechada, eu não quero ter: **a decisão certa
não é ratear melhor, é NÃO ratear e mostrar o buraco.** A força do 63 vira o **escape
hatch** do 64 (item 4/opt-in): quando eu DECIDIR ratear um frete manualmente, o driver
`valor` do 63 é exatamente a conta que roda por baixo. Backend do 63, política do 64.

**Como aparece na tela:**
- Um número grande e único: **"Custo do estande: R$ 5.250"**, com as linhas expandíveis
  (Direto R$ 4.100 / Medível R$ 1.150) — cada uma clicável até o item. Esse é O preço.
- Logo abaixo, uma faixa de aviso que NÃO é preço: **"Custos gerais do evento a cobrir:
  R$ 170.000 — break-even ~33 estandes (você tem 20). Ingressos/patrocínio ou markup
  precisam cobrir."** Amarela quando o mix não fecha.
- Verba fechada NUNCA entra silenciosa no R$ 5.250. Se o gestor quiser puxar um item pra
  dentro, é um botão explícito "ratear no estande" no próprio item (opt-in, visível), e aí
  o R$ 5.250 sobe à vista de todos, com a origem marcada.
- O "custo cheio R$ 6.100" só existe como etiqueta cinza de leitura ao lado, jamais como
  segundo preço editável.
