# 📸 PROMPT_23_ANALISADOR_OPTICO_DE_PLANTAS (OpenCV.js)
**(Visão Computacional Front-End sem IA)**

**O que ele faz:** Ensina a IA a construir um motor de reconhecimento visual que roda 100% no navegador. Ele encontra objetos repetidos (como mesas, cadeiras ou extintores) em uma planta baixa grande fornecendo apenas 1 exemplo de referência, usando matemática pura.
**Por que é genial:** Não usa servidores caros de Inteligência Artificial. Usa a própria máquina (OpenCV compilado para WebAssembly). Ele varre a planta procurando a assinatura visual do objeto alvo, suportando rotação de ângulos. E no final, entrega o luxo visual absoluto: Desbota toda a foto gigante para um cinza apagado (Grayscale), e acende "Hologramas Coloridos" exatamente nas coordenadas originais onde encontrou os itens com marcações e textos.

---
>>> PROMPT PARA COPIAR E COLAR NA IA <<<
---

Aja como um Engenheiro Especialista em Frontend e Visão Computacional (OpenCV.js + React).
Nosso objetivo é criar um "Módulo de Análise e Contagem de Itens em Plantas Baixas" sem usar nenhuma API de IA externa, rodando tudo no cliente.

### A Missão Técnica
1. O usuário fará o upload de 2 imagens:
   - A imagem "Alvo/Referência" (ex: o recorte de 1 mesa amarela).
   - A imagem "Cenário/Mapa" (ex: a planta baixa inteira do evento).
2. O sistema deve processar as imagens e encontrar TODAS as ocorrências da "Referência" dentro do "Cenário", mesmo que elas estejam rotacionadas (ângulos diferentes, ex: 45º, 90º).
3. Após achar as coordenadas, gerar um EFEITO VISUAL DE DESTAQUE usando HTML5 `<canvas>`.

### O Algoritmo de Visão (OpenCV.js)
Como a referência pode estar rotacionada, não use apenas o `cv.matchTemplate` simples. Prossiga com uma Abordagem Dupla ou Rotacional:
- **Tática Rotacional de Template:** Gire o "template reference" gerando várias sub-imagens em graus cruciais (0º, 45º, 90º, 135º, 180º, etc) e rode o `matchTemplate` pra cada passo angular, mantendo as coordenadas que baterem um limiar de confiança (threshold > 0.85).
- **Tática Alternativa (Se preferir via Features):** Use `cv.ORB` ou especifique o método exato de Feature Matching para isolar os contornos se julgar mais prático e preciso para plantas arquitetônicas desenhadas digitalmente.
- O Processamento DEVE acontecer dentro de um Web Worker (crie o esqueleto pensando nisso) para que a janela do React não congele durante a varredura pesada da planta.

### A Renderização Final (Canvas Spotlight)
Quando o Worker devolver a lista de coordenadas (Array de {x, y, width, height, angle}), pinte o resultado na tela prestando atenção nesta regra estética estrita:

1. **Camada de Fundo (Apagada):** O cenário inteiro (a planta grande) deve ser renderizado no `<canvas>` convertido para Tons de Cinza (Grayscale) e com baixa opacidade (efeito de planta desativada).
2. **Camada de Recorte (Holograma de Destaque):** Pegue os *pixels exatos e coloridos originais* correspondentes às coordenadas dos alvos encontrados na imagem original e sobreponha-os no topo do Canvas cinza. O alvo vai brilhar no mapa.
3. **Anotações Ouro:** A partir do centro de cada alvo encontrado, desenhe uma linha fina (vermelha ou azul) projetando-se levemente para cima e escreva um texto elegante (Ex: "Referência Encontrada" ou a numeração "#1").

### Output Esperado:
Não me dê o código parcial. Escreva para mim:
1. O Hook completo que carrega o OpenCV dinamicamente.
2. A Lógica Matemática exata em um utilitário Web Worker para processar os ângulos.
3. O Componente React (pode usar Tailwind) pronto para receber a Referência + Planta, incluindo a função de desenhar o Canvas final com Destaque e Linha Direcional.
