# 📘 Manual de Prompts (Para Humanos)

> **O que é esta pasta?** Nas vezes em que eu (a IA) resolver um problema difícil ou construir um sistema complexo no seu aplicativo, nós criaremos um "Prompt Mestre" e o salvaremos aqui. 
> 
> A utilidade disso é gigantesca: **Se daqui a 2 anos você quiser criar um aplicativo do zero e precisar recriar a biometria ou a proteção de senhas, basta copiar o texto desses arquivos e mandar para a nova IA.** Ela fará em 5 minutos o que nós demoramos horas estudando para acertar.

Abaixo, explico de forma simples e livre de "tecnês" o que cada prompt guardado nesta pasta faz:

---

## 1. 🧬 `PROMPT_BIOMETRIA_SUPABASE.md`
**O que ele faz:** Ensina uma IA a construir o sistema de "Entrar com Digital ou FaceID" (também chamado de WebAuthn ou Passkeys).
**Por que é genial:** No mundo real, a Apple e o Google (Android) têm várias "pegadinhas" de segurança quando o usuário tenta logar com a digital sem digitar o email antes. Esse prompt contém os macetes exatos de como lemos a digital do usuário, convertemos códigos bizarros em texto normal (Base64) e buscamos a identidade dele no banco de dados automaticamente. Além de ensinar a Inteligência Artificial a não exibir esse botão de login para quem estiver no Computador usando teclado e mouse.

---

## 2. 🚦 `PROMPT_PROTECTED_ROUTES_REACT.md`
**O que ele faz:** Cria o "Leão de Chácara" das páginas do seu aplicativo.
**Por que é genial:** Em sites normais, se você está logado na Galeria de Fotos e aperta "F5" (atualizar), às vezes o site pisca a tela de Login por meio segundo e te joga pra dentro de novo. Isso é horrível. Esse prompt ensina a IA a fazer o sistema *esperar silenciosamente* o banco de dados confirmar quem você é antes de desenhar a tela, igualzinho a um App de banco no celular. Ele garante que ninguém acesse a Galeria sem estar logado, e que quem estiver logado nunca veja a tela de Login por acidente.

---

## 3. 🚫 `PROMPT_MOBILE_BACK_BUTTON_REACT.md`
**O que ele faz:** Intercepta (sequestra) a função física do botão "Voltar" (aquela setinha de baixo no Android) para que ele não feche o aplicativo na sua cara.
**Por que é genial:** Em aplicativos de internet (PWAs ou Single Page Applications), apertar "Voltar" não fecha telas soltas, ele faz o navegador retroceder o "histórico". Se você estiver na Galeria e apertar voltar, o celular te joga para o menu principal do telefone, deslogando a sua sessão brutalmente. Este prompt ensina a nova IA a interceptar o botão físico do usuário e exibir na tela aquele alerta amigável: *"Deseja Sair e Deslogar?"* - salvando o usuário de perder o trabalho no meio do caminho.

---

## 4. 🗄️ `PROMPT_RBAC_RLS_SUPABASE.md`
**O que ele faz:** Cria a hierarquia de Patentes e Perfis do seu sistema (Administrador vs Usuário Master vs Comum).
**Por que é genial:** Em sistemas amadores, a segurança é feita escondendo botões na tela (ex: se o usuário for estagiário, o botão "Deletar Projeto" fica invisível). O problema é que um hacker consegue clicar no botão invisível. Esse prompt ensina a IA o Nível Ouro (RLS - Row Level Security): A regra é gravada lá no fundo do Banco de Dados. A IA é instruída a criar um escudo onde um "Usuário Comum" fica fisicamente proibido pelo Servidor de visualizar dados de outros usuários, mesmo que a tela tente forçar a busca. E te ensina como fazer o sistema desenhar (ou esconder) os botões de acordo com esse nível de patente.

---

## 5. 📄 `PROMPT_PDF_MOBILE_REACT.md`
**O que ele faz:** Ensina a IA a construir aquele "Pop-up" com 3 botões (Visualizar, Baixar e Compartilhar) logo após a galeria gerar um arquivo PDF em aparelhos celulares.
**Por que é genial:** Em computadores é fácil baixar arquivos. Mas em celulares modernos (iOS ou navegadores dentro de redes sociais como Instagram), forçar um download silencioso de um arquivo PDF bloqueia e falha na hora. Esse prompt ensina a IA a não tentar forçar nada. Ele instrui a criação formal de um botão que usa a tecnologia nativa do celular (`Web Share API`), permitindo que a própria bandeja do sistema operacional abra (aquela com ícones do WhatsApp, Telegram e AirDrop) já contendo o arquivo PDF embutido na mensagem dele com 100% de margem de sucesso!

---

## 6. 🎨 `PROMPT_TAILWIND_BUTTON_FRAMEWORK.md`
**O que ele faz:** Ensina a IA a construir um sistema universal de "Peças de Lego" para a Interface do Aplicativo, focado principalmente em Botões (`<Button>`), Cartões Brancos (`<Card>`) e Campos de Texto (`<Input>`).
**Por que é genial:** Quando IAs constroem telas gigantescas sem um "Framework" base, elas criam 50 botões diferentes. Um botão na tela Inicial fica enorme, o da tela de Login fica sem margem, um terceiro nem afunda quando você aperta nele no celular. Esse prompt corta o mal pela raiz. Ele cria 1 "Botão de Ouro" que dita a lei para o site inteiro. Se no futuro um botão novo for criado, ele herda a mesma sombra, cantos arredondados, comportamento de clique (`active:scale`) e tamanhos perfeitos dos 30 botões antigos. Fim das páginas "Balaio de Gato"!

---

*(Toda vez que a IA criar um novo Prompt Mestre, ela está autorizada e instruída a atualizar este manual automaticamente para você!)*
