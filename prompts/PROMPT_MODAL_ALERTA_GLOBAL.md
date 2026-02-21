# Prompt Master: Sistema Global de Alertas e Confirmações Táticas (React)

> **Objetivo Final:** Ensinar a IA a banir o uso das famosas (e feias) janelas padrão do navegador (`window.alert` e `window.confirm`). A Inteligência Artificial será instruída a instanciar um Singleton de Modal Estético Global via Provider Contexto ou simplesmente importar um modal local de ponta que emita diferentes sinais visuais e sensoriais baseados no estado (Info, Sucesso, Alerta Vermelho de Perigo, e Confirmação Dupla para Destruição de Dados).

---

## 🛑 1. O Problema das Camadas de Javascript Nativas

Muitos dev's novos e IAs quando precisam avisar `"Dados apagados com sucesso!"` botam a linha crua: `alert('Dados apagados');`.
1. Fica com a cara de site de 1999.
2. É incontrolável via CSS (Você não pode mudar a cor ou botar cantos redondos nela, é o botão feio do Windows/Mac OS sobrepondo o Chrome).
3. E o pior: No celular, o `window.alert("Deseja deletar?")` muitas vezes buga fluxos pesados e fecha o teclado abruptamente.

## 🛠️ 2. A Solução: Componente Reativo "AlertModal.tsx" (Tipo Siga-Mestre)

Você obriga a Inteligência Artificial a criar um `<AlertModal />`. 
1. Ele suporta Títulos e Textos, Ícones dinâmicos via SVG, e cores que variam sozinhas `(info = azul, error = vermelho, success = verde)`. 
2. A IA não cria "Modais Diferentes" para o site. Ela cria 1 modal Siga-Mestre genérico, e os programadores apenas mudam as "Props".

### O Código de Ouro (Apenas as partes Importantes):

```tsx
import React from 'react';
import { Modal, Button } from './UI'; // Puxa do nosso arquivo padrão UI.tsx (Promtp 6)

// O Tipo Rigoroso das variantes do Sistema. Nunca fuja disso.
export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

// Interface do Componente (Quais controles o desenvolvedor pode exigir da tela que pular)
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void; // Ação de esconder a tela (Cancelou)
  title: string;
  message: React.ReactNode; 
  type?: AlertType;
  onConfirm?: () => void; // Ação fatal (Sim, eu desejo apagar. Clique Final)
  confirmText?: string;
  cancelText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen, onClose, title, message, type = 'info', onConfirm, confirmText = 'Confirmar', cancelText = 'Cancelar'
}) => { ... }
```

### O Desvio de Fluxo Mágico (Botões por Tipo de Alarme)

A IA não precisa codar 5 tipos diferentes da tela de modal. Ela apenas insere um Dicionário de Cores e Ícones, e a tela pisca diferente com base no Desvio Condicional do `type` exigido. Lógica Inteligente.

```tsx
  // Dicionário de Estilos Coloridos
  const config = {
    info: { icon: 'ℹ️', color: 'text-blue-500', bg: 'bg-blue-50' },
    success: { icon: '🟢', color: 'text-green-500', bg: 'bg-green-50' },
    warning: { icon: '⚠️', color: 'text-orange-500', bg: 'bg-orange-50' },
    error: { icon: '🔴', color: 'text-red-500', bg: 'bg-red-50' },
    confirm: { icon: '❓', color: 'text-blue-500', bg: 'bg-blue-50' }, // Confirmação Azul clássico
  };
  
...
{/* Área Base Contendo o Botão Centralizado: Mágica de renderização das Ações  */}
<div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
    {type === 'confirm' ? (
        // Se for um MODAL DE PERGUNTA PARA O USUÁRIO ('Deseja Salvar?') = Ele recebe DOIS Botões
      <>
        <Button variant="outline" onClick={onClose} className="px-6 border-slate-300">
          {cancelText}
        </Button>
        {/* Se eled isse SIM eu vou acionar a prop onConfirm e fechar a casinha após. */}
        <Button onClick={() => { if (onConfirm) onConfirm(); onClose(); }} className="px-8 font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700">
          {confirmText}
        </Button>
      </>
    ) : (
        // Se for MODAL DE AVISO BURRO ('Sua mensagem foi entregue com sucesso!') = Ele recebe UM Botão só de fechar.
      <Button onClick={onClose} className={`px-8 font-black uppercase tracking-widest ${type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
        OK
      </Button>
    )}
</div>
```

## 🧠 3. Controlando o Alerta Numa Tela Real

Mostre a IA como você espera que ela aplique na prática. Ela não ficará inventando variáveis longas. Falei pra ela aglomerar os dados de Erro ou Info no "AlertState" num pequeno utilitário da própria página que vai chamar a atenção do usuário para não poluir o arquivo.

```tsx
// 1. Criar o Robozinho Estado
const [alertState, setAlertState] = useState<{isOpen: boolean; title: string; message: string; type: AlertType; onConfirm?: () => void}>({isOpen: false, title: '', message: '', type: 'info'});
  
// 2. Utilitário Simplificador de 1 Linha "showAlert"
const showAlert = (title: string, message: string, type: AlertType = 'info', onConfirm?: () => void) => {
    setAlertState({ isOpen: true, title, message, type, onConfirm });
};

// 3. O Injetor no final da Árvore de HTML do React da Tela Atual
<AlertModal {...alertState} onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} />

// USANDO O PODER DE DEUS: A IA CHAMA DAQUI EM DIANTE APENAS 1 LINHA
showAlert('Acesso Negado!', 'Verifique sua senha incorreta. Perca total', 'error');

// SE QUISER CONFIRMAÇÃO DO USUÁRIO PRA LIXEIRA, SÓ PASSA A FUNÇÃO OCULTA:
showAlert('Despejo Lixeira', 'Confirma Apagar TUDO DO BANCO IRREVERSIVELMENTE?', 'confirm', async () => {
    await DeletaBancoInteiroVoadoraBraba()
});
```

---

Aplicando este Blueprint Padrão universal (Info, Erro, Alerta e Confirma), você domina e sequestra totalmente o controle do tom e voz do seu aplicativo mobile sem estregar a "Estética Premium" e profissional da Empresa!
