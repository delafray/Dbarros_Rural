# Prompt Master: Proteção de Botão Voltar (Mobile Back Button) no React SPA

> **Objetivo Final:** Ensinar a IA a interceptar com segurança o botão "Voltar" nativo dos sistemas operacionais móveis (Android e PWA iOS) rodando um Single Page Application (SPA), impedindo saídas acidentais ou deslogamentos forçados do App sem criar loops infinitos no histórico.

---

## 🚫 1. A Armadilha do Navegador Mobile

As aplicações React SPA usam bibliotecas como `react-router-dom` que manipulam a API `window.history`.
Quando um usuário abre seu WebApp ou PWA logado e aperta o **Botão Voltar Nativo do Android**, a ação padrão do navegador não é disparar um evento React, mas sim retroceder literalmente na pilha de histórico (History Stack). Se essa pilha estiver vazia ou estiver na rota de login, o app simplesmente "Sai para a Tela Inicial do Celular" ou volta para a view de login incondicionalmente, estourando a sessão.

## 🛡️ 2. A Injeção de Segurança (`History Push Guard`)

Não podemos simplesmente desabilitar o botão Voltar do hardware. Precisamos interceptar o evento nativo `popstate` e **enganar o navegador**.

A IA **DEVE** seguir essa exata lógica na raiz do aplicativo (exemplo: no `Layout.tsx` geral dos usuários logados):

### Passo A: Criar a Guarda Imediata
Assim que o usuário loga e entra no SPA protegido, o navegador precisa de uma lixeira de histórico (dummy history state) para que o *primeiro* "voltar" nativo não jogue o usuário pro `/login`.

```javascript
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MobileBackGuard = ({ user, logout }) => {
    const navigate = useNavigate();
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const exitDialogOpenRef = useRef(false);

    useEffect(() => {
        // Se não houver usuário logado (ex. tela de registro), deixe o backbutton agir livre.
        if (!user) return;

        // 1. INJEÇÃO DO GUARD (Com delay sutil para não conflitar com a animação inicial do React Router)
        const timer = setTimeout(() => {
            window.history.pushState({ appGuard: true }, '', window.location.href);
        }, 150);

        // [...] Continuação abaixo
```

### Passo B: O Evento Interceptador Reativo
A IA **DEVE** adicionar um `eventListener` real pro `popstate` (E remover no `return / cleanup`).
Dentro dele, a magia acontece:

```javascript
        const handlePopState = (event) => {
            // ALERTA VERMELHO: O usuário APERTOU VOLTAR no Hardware de fora para dentro.

            // 1. Re-injete imediatamente outra parede de proteção ANTES 
            // que o navegador faça qualquer coisa. Assim o Histórico nunca fica vazio.
            window.history.pushState({ appGuard: true }, '', window.location.href);

            // 2. Lógica Condicional: Tem algum "Modal" / "Lightbox de Foto" aberto agora?
            // A IA deve se comunicar com Stores GLOBAIS (Zustand/Context) para checar se há popups abertos.
            if (isModalOpen) {
                 closeModal(); 
                 return; // Fecha o Modal UI, mas continua no sistema!
            }

            // 3. Checagem de Saída Dupla: O pop-up "Deseja Sair?" já estava na tela?
            // Se ele apertou Voltar DE NOVO tendo um Pop-Up fatal ativo, signfica que é uma Saída de Fuga severa (Rage quit). FORCE SAÍDA.
            if (exitDialogOpenRef.current) {
                exitDialogOpenRef.current = false;
                setShowExitConfirm(false);
                logout().then(() => navigate('/login'));
                return;
            }

            // 4. Fluxo Normal: Mostre o Pop-up "Sair e Deslogar?"
            exitDialogOpenRef.current = true;
            setShowExitConfirm(true);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [user, isModalOpen]); 
```

---

## 🎨 3. Construindo UI de Confirmação Bloqueante (z-index)

O pop-up gerado `showExitConfirm` não pode ser fechado via Escape ou Back novamente (se ele apertar back no hardware, `handlePopState` já cobre executando a Fase 3 do Alert, e saindo brutalmente).

A UI do React exibe a caixa "Cancelar / Sair Definitivamente". Ensinar a IA a zerar as **refs** de escape:

```javascript
    const confirmExit = async () => {
        exitDialogOpenRef.current = false; // Importantíssimo zerar a ref pro próximo login da pessoa
        setShowExitConfirm(false);
        await logout(); // Quebra o jwt, limpa storages async.
        navigate('/login');
    };

    const cancelExit = () => {
        exitDialogOpenRef.current = false;
        setShowExitConfirm(false); // Retorna ele pro App seguro
    };
```

**Nota para a IA**: Lados da Web tentam usar o novo `useBlocker()` (React Router 6.19+) para fazer isso elegantemente, mas esta API depende de **BrowserRouter** restrito. Se a arquitetura usar *HashRouter* (ex: PWAs antigas, Electron, Cordova ou Capacitor), o `useBlocker` sofre **Crash Fatal**. A implementação nativa Window Popstate (`window.history.pushState`) acima é 100% à prova de falhas em qualquer motor WebView JS.
