# 📘 Manual de Prompts (Para Humanos)

> **O que é esta pasta?** Nas vezes em que eu (a IA) resolver um problema difícil ou construir um sistema complexo no seu aplicativo, nós criaremos um "Prompt Mestre" e o salvaremos aqui. 
> 
> A utilidade disso é gigantesca: **Se daqui a 2 anos você quiser criar um aplicativo do zero e precisar recriar a biometria ou a proteção de senhas, basta copiar o texto desses arquivos na ordem e mandar para a nova IA.** Ela fará em 5 minutos o que nós demoramos horas estudando para acertar.

Abaixo, explico de forma simples e livre de "tecnês" o que cada prompt guardado nesta pasta faz. Eles estão **ordenados por prioridade arquitetural** (do essencial para a fundação do aplicativo, até as funcionalidades extras de perfumaria).

---

## 01. 🧬 `PROMPT_01_BIOMETRIA_SUPABASE.md`
**(Autenticação e Segurança Dificílima)**
**O que ele faz:** Ensina uma IA a construir o sistema de "Entrar com Digital ou FaceID" (WebAuthn/Passkeys).
**Por que é genial:** No mundo real, a Apple e o Google (Android) têm várias "pegadinhas" de segurança quando o usuário tenta logar com a digital sem digitar o email antes. Esse prompt contém os macetes exatos de como lemos a digital do usuário, convertemos códigos bizarros em texto normal (Base64) e buscamos a identidade dele no banco de dados automaticamente.

---

## 02. 🚦 `PROMPT_02_ROTAS_PROTEGIDAS.md`
**(Acesso e Roteamento)**
**O que ele faz:** Cria o "Leão de Chácara" das páginas do seu aplicativo.
**Por que é genial:** Em sites normais, se você aperta "F5", às vezes o site pisca a tela de Login por meio segundo e te joga pra dentro de novo. Esse prompt ensina a IA a fazer o sistema *esperar silenciosamente* o banco de dados confirmar quem você é antes de desenhar a tela, igualzinho a um App de banco. Garante que quem estiver logado nunca veja a tela de Login por acidente.

---

## 03. �️ `PROMPT_03_PERMISSOES_E_PAPEIS.md`
**(Regras de Negócio e RLS)**
**O que ele faz:** Cria a hierarquia de Patentes e Perfis do seu sistema (Administrador vs Usuário Master vs Comum).
**Por que é genial:** Em sistemas amadores, a segurança é feita escondendo botões na tela. Um hacker consegue clicar no botão invisível. Esse prompt ensina a IA o Nível Ouro (RLS - Row Level Security): A regra é gravada lá no fundo do Banco. Uma IA é instruída a criar um escudo onde um usuário fica fisicamente proibido pelo Servidor de visualizar dados irrelevantes.

---

## 04. 🎨 `PROMPT_04_SISTEMA_DE_BOTOES_PADRAO.md`
**(Framework de Design e UX Padrão)**
**O que ele faz:** Ensina a IA a construir um sistema universal de "Peças de Lego" para a Interface, focado em Botões (`<Button>`), Cartões Brancos (`<Card>`) e Campos de Texto (`<Input>`).
**Por que é genial:** Quando IAs constroem telas gigantescas sem um "Framework" base, elas criam 50 botões diferentes e a interface vira um "Balaio de Gato". Esse prompt cria 1 "Botão de Ouro" que dita a lei para o site inteiro, mantendo botões simétricos, com mesmas sombras e comportamentos (como afundar ao apertar no celular).

---

## 05. 🚨 `PROMPT_05_MODAL_ALERTA_GLOBAL.md`
**(Identidade Visual e Comunicação)**
**O que ele faz:** Exclui do projeto da IA o velho botão feioso `alert('Deu certo')` padrão do Chrome e instiga a padronização de avisos no aplicativo pelo Central AlertModal.
**Por que é genial:** Mostrando Erros em Vermelho, Sucessos em Verde e Botões perigosos pedindo Confirmação. O Sistema para de se comunicar de 15 jeitos diferentes e centraliza a identidade em 1 canal principal limpo e estético.

---

## 06. 👥 `PROMPT_06_GESTAO_DE_USUARIOS_AVANCADA.md`
**(Funcionalidade B2B Impressionante)**
**O que ele faz:** Ensina a IA a construir telas de Administração de Usuários sofisticadas com Grade Interativa para Papéis (Super Admin, Visitante) e um revolucionário **Gerador de Usuários Temporários**.
**Por que é genial:** Ao invés do dono do site ter que criar uma conta inteira com e-mail real só para mostrar o portfólio para um cliente uma vez, o sistema gera e-mail e senha falsos (expira em 3 dias) e entrega na tela um botão "Copiar para WhatsApp" já com o texto montado.

---

## 07. 🖼️ `PROMPT_07_COMPRESSAO_IMAGEM_NAVEGADOR.md`
**(Otimização Pesada de Infraestrutura)**
**O que ele faz:** Ensina a IA a comprimir e diminuir fotos gigantes recém batidas pela câmera do celular do usuário ANTES de enviar pela internet.
**Por que é genial:** Se você não tiver isso, upload de fotos queima o banco de dados e gasta a cota do Servidor. Ao injetar essa aula técnica de Interceptamento "Canvas Web" no dispositivo, convertemos arquivos monstros em pequenos bloquinhos JPG de qualidade de 300 Kilobytes sem gastar recursos da rede.

---

## 08. � `PROMPT_08_BOTAO_VOLTAR_CELULAR.md`
**(Correção de UX Mobile Típica)**
**O que ele faz:** Intercepta (sequestra) a função física do botão "Voltar" (aquela setinha de baixo no Android) para que ele não feche o aplicativo na sua cara.
**Por que é genial:** Em aplicativos de internet (PWAs), apertar "Voltar" não fecha telas soltas, ele volta o navegador. Se apertar voltar, o celular te desloga brutalmente. Este prompt intercepta o botão físico e exibe um alerta amigável: *"Deseja Sair e Deslogar?"* - salvando o usuário.

---

## 09. 📱 `PROMPT_09_LIGHTBOX_FULLSCREEN_CELULAR.md`
**(Luxo Visual para Galerias)**
**O que ele faz:** Mágica pura de Pinça. Quando um cliente clica numa foto, a tela vira preta (Full Blackout) para exibir zoom na imagem focado nos dedos do Celular.
**Por que é genial:** A maioria das IAs tentariam instalar módulos gigantes antigos. Esta instrução ensina as coordenadas matemáticas do Gesto de Pinça Touch de Celular (`onTouchMove`, `Math.hypot()`) sem NENHUMA dependência externa, dando "Suporte de Visão Ouro".

---

## 10. 📄 `PROMPT_10_GERACAO_PDF_CELULAR.md`
**(Feature Específica e Suporte a Sistemas Nativos)**
**O que ele faz:** Ensina a IA a construir um Pop-up com 3 botões (Visualizar, Baixar e Compartilhar) logo após gerar um arquivo PDF em celulares.
**Por que é genial:** Em celulares, forçar um download silencioso de PDF falha e bloqueia. Esse prompt instrui o uso da tecnologia nativa do celular (`Web Share API`), permitindo que a própria bandeja do sistema abra (WhatsApp, AirDrop) já contendo o arquivo PDF embutido com 100% de margem de sucesso.

---

## 11. 🧭 `PROMPT_11_PRESERVACAO_DE_ESTADO_E_SCROLL_MOBILE.md`
**(Experiência Offline / Retorno Pós-Minimização)**
**O que ele faz:** Evita que a página recarregue do zero (dando F5 de repente) sempre que você minimiza o site no celular para responder um WhatsApp e depois volta para o navegador.
**Por que é genial:** Navegadores matam abas em segundo plano para economizar bateria. Esse Blueprint ensina a IA a injetar âncoras na Memória de Sessão Nativa, "Salvar Tudo" (Debounce Autosave) 0.5s após o usuário digitar. Quando o usuário volta do WhatsApp, o sistema recarrega tudo instantaneamente onde ele parou de rolar e digitar. O usuário nunca perde os rascunhos de seus formulários.

---

## 12. 🎥 `PROMPT_12_INTEGRACAO_VIDEOS_REDES_SOCIAIS.md`
**(Comunicação Backend Proxy Anti-CORS)**
**O que ele faz:** Ensina a IA a NUNCA buscar miniaturas do Reels no Instagram usando Javascript do cliente, para evitar o catastrófico bloqueio de CORS de domínios fechados.
**Por que é genial:** Se o seu futuro E-commerce precisar puxar fotos de Redes Sociais, esse Blueprint ensina a sua IA a arquitetar uma **Edge Function Oculta**. Um servidor age como detetive pela rede da Amazon, rouba a foto da miniatura em qualidade máxima direto da Meta, e devolve mascarado para a cara limpa do seu App sem ser bloqueado pela matriz de segurança.

---

## 13. 📜 `PROMPT_13_SCROLL_INFINITO_PAGINACAO_E_METADADOS.md`
**(Engenharia de Memória e Listas Infinitas)**
**O que ele faz:** Ensina a IA como lidar com tabelas contendo mais de 10.000 itens (Fotos, Clientes, Financeiro). Substitui o destrutivo "baixar tudo de uma vez" por um esqueleto de Scroll Infinito que carrega apenas 50 por vez quando você desliza o dedo.
**Por que é genial:** Se você tiver 10 mil fotos de um condomínio, seu celular congela tentando baixar todas. Mas se criarmos um App novo e o botão "Selecionar Tudo (As 10 mil)" for clicado, o banco também não aguenta. Esse Blueprint ensina como enganar o frontend: O sistema não baixa as 10 mil. Ele conta escondido (Head Counting), vira a chave virtual (`isAllSelected`), e se o cliente desmarcar 30 fotos na tela, nós apenas subimos para o servidor uma Lista Negra (`excludedIds`) ordenando: "Deleta tudo MENOS esses 30 da lista negra". Um design de App corporativo puro!

---

## 14. 🖱️ `PROMPT_14_ESTILO_DE_ACOES_EM_LISTAS.md`
**(Acessibilidade e Padrão de Design)**
**O que ele faz:** Estabelece que botões de ação (Editar, Excluir) devem estar sempre visíveis em listas, removendo a necessidade de passar o mouse para encontrá-los.
**Por que é genial:** Em dispositivos móveis ou para usuários que não querem "caçar" botões, ter as ações visíveis previne erros e torna a navegação muito mais rápida. Define também as cores padrão (Azul para Editar, Vermelho para Excluir) para o resto do sistema.

---

## 15. 🔍 `PROMPT_15_SISTEMA_DE_BUSCA_INTELIGENTE.md`
**(UX de Alta Performance e Acessibilidade)**
**O que ele faz:** Ensina a IA a criar buscas "mágicas" que ignoram acentos, espaços e letras maiúsculas/minúsculas.
**Por que é genial:** Se o usuário digitar "DANIELABORBA" ou "daniela borba", o sistema encontrará o registro do mesmo jeito. Isso é essencial para buscas rápidas em campo (eventos) onde o usuário está com pressa e não quer se preocupar com a gramática perfeita ou corretor ortográfico do celular.

---

## 16. 📊 `PROMPT_16_LISTAGEM_DENSA_INDUSTRIAL.md`
**(UX Corporativa e Alta Densidade de Dados)**
**O que ele faz:** Ensina a IA a construir tabelas com visual de "Planilha Técnica", onde cada milímetro da tela é aproveitado para mostrar o máximo de informações possível sem virar bagunça.
**Por que é genial:** Em sistemas de gestão, o usuário não quer ver botões redondos e espaços vazios; ele quer ver 100 clientes de uma vez na tela para decidir rápido. Esse Blueprint ensina a técnica de "Linha Única Perfeita": o texto nunca quebra (usa reticências se for grande), as bordas são bem visíveis como no Excel e as linhas mudam de cor alternadamente para o olho não se perder na leitura horizontal.
---

---

## 17. 🧪 `NA_UNHA.md`
**(Economia de Tokens e Testes Profundos)**
**O que ele faz:** Estabelece um protocolo de teste "manual" realizado pela IA apenas sob demanda, focando em verificação visual e funcional exaustiva.
**Por que é genial:** Previne o gasto excessivo de recursos (tokens) fazendo com que a IA use o navegador e capturas de tela apenas quando a alteração for visualmente crítica, mantendo o desenvolvimento ágil e econômico para tarefas de lógica pura.

---

## 18. 🔄 `PROMPT_RESTORE_PHOTO_SYSTEM.md`
**(Manutenção e Flexibilidade de Interface)**
**O que ele faz:** Fornece o código e as instruções exatas para reativar os menus de "Fotos" e "Tags de Busca" caso você decida voltar a usá-los no futuro.
**Por que é genial:** Em vez de você ter que lembrar onde o código foi escondido ou como ele funcionava, este manual guarda o "interruptor" pronto para ser acionado. Garante que nenhuma funcionalidade seja perdida, apenas guardada para o momento certo.

---

## 19. 📧 `PROMPT_19_ENVIO_EMAIL_TRANSACIONAL.md`
**(Comunicação Automatizada e Profissional)**
**O que ele faz:** Ensina a IA a configurar um sistema de envio de e-mails (como convites, contratos e comunicados) usando o e-mail oficial da sua feira.
**Por que é genial:** Em vez de usar e-mails comuns que caem no SPAM, este Blueprint ensina a usar ferramentas profissionais (como o Resend) integradas ao Supabase. Ele explica como garantir que o e-mail chegue ao cliente com o nome da sua empresa, suporte a anexos (PDFs) e como enviar para grupos inteiros de uma só vez de forma segura e rápida.

---

## 20. 📐 `PROMPT_20_COLUNA_CLIENTE_PLANILHA_FLEX.md`
**(Reversão / Ajuste Visual da Planilha de Vendas)**
**O que ele faz:** Documenta a mudança da coluna CLIENTE na Planilha de Vendas de **largura fixa (200px)** para **largura flexível** — e guarda o código exato para reverter caso o resultado pareça estranho.
**Por que é genial:** Em monitores grandes (1920px), a coluna do cliente agora expande e mostra o nome completo sem cortar. Em monitores menores, trunca com "..." normalmente. Se um dia você achar que a tabela ficou desequilibrada ou larga demais, basta abrir este arquivo e copiar o bloco "Como Reverter" — em 2 minutos está de volta ao estado original fixo, sem precisar lembrar de nada.

---

## 21. 💾 `PROMPT_21_BACKUP_COMPLETO_AUTOMATICO.md`
**(Segurança Total e Paz de Espírito — Backup Nuclear)**
**O que ele faz:** Documenta o sistema de backup automático completo do projeto — aquele que é ativado com um único botão **"Backup BD"** e gera um ZIP com absolutamente tudo: dados de todas as tabelas, usuários com UUIDs originais, funções PostgreSQL ao vivo, políticas RLS ao vivo, histórico de migrations, todos os arquivos do Storage **e o código-fonte completo do projeto (~122 arquivos)**.
**Por que é genial:** O sistema descobre automaticamente tabelas novas, funções criadas no Studio, políticas RLS e arquivos de código-fonte novos — sem nenhuma atualização manual. O banco é descoberto via `backup_introspect()` e o código via `import.meta.glob` do Vite (mesma técnica usada para as migrations). O ZIP contém literalmente tudo: banco + storage + código + guia de restauração. **Se o Supabase cair, se o GitHub sumir, se o computador queimar — com este ZIP + uma IA + 10 minutos, o sistema inteiro volta a funcionar do zero.** Nenhum projeto pequeno/médio no mundo tem uma solução tão completa com um único botão.
---

## 22. 📄 `PROMPT_22_RELATORIO_COMERCIAL_PDF.md`
**(Matemática e Estética de Exportação PDF)**
**O que ele faz:** Esculpe regras visuais inquebráveis para quando uma IA for gerar e desenhar um relatório em `.pdf`. Ele trava o arquivo em A4 Paisagem, ensina como desenhar o logotipo da empresa sem achatá-lo e como calcular o texto para ficar perfeitamente no meio da folha.
**Por que é genial:** Gerar PDFs no navegador é famoso por "quebrar linhas" e "ficar torto" ou criar páginas em branco gigantescas com "itens lixo" que o cliente não comprou. Este Blueprint ensina uma IA a construir um filtro cirúrgico que *silencia listas não registradas*, e injeta cálculos milimétricos (Offset de `+0.6mm` de gravidade) para desenhar cruzes "x" e asteriscos "*" *VISUALMENTE* no centro exato de pequenos quadrados da tabela. Um documento final de estética impecável.

.

---

## 23. ?? `PROMPT_23_ANALISADOR_OPTICO_DE_PLANTAS.md`
**(Vis�o Computacional Front-End sem IA)**
**O que ele faz:** Ensina a IA a construir um motor de reconhecimento visual que roda 100% no navegador usando OpenCV. Ele encontra objetos repetidos (como mesas ou extintores) em uma planta baixa fornecendo apenas 1 exemplo de refer�ncia.
**Por que � genial:** N�o gasta IA nem servidores externos para descobrir onde os itens est�o (matem�tica pura de Pixels). E o mais importante: entrega uma arquitetura visual onde a planta gigante fica apagada em escala de cinza, e apenas os itens achados brilham na tela com suas cores originais, com uma linha apontando para eles. Pura engenharia criativa.

