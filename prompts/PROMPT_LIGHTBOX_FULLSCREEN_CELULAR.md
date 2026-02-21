# Prompt Master: Visualizador de Imagens Tela Cheia Mobile (Pinch-to-Zoom Lightbox)

> **Objetivo Final:** Ensinar a IA a não depender de bibliotecas pesadas e desatualizadas do NPM (como `react-image-lightbox`) para permitir que fotos abram em tela cheia na sua aplicação Mobile. IAs tem vício de embutir bibliotecas velhas para resolver Lightboxes. Este prompt força a Inteligência Artificial a criar um `<div fixed>` limpo com matemática de eixos Puros (`transform: scale() translate()`) suportando Pinch-To-Zoom de 2 dedos, Drag (Arrastar Imagem Ampliada) e Fechamento Rápido.

---

## 🛑 1. A Necessidade Visual do Cliente no Século 21

Se seu site tiver um Catálogo de Produtos da Loja, Obras Num Condomínio Real Estate, ou Escaneamento de Relatórios Financeiros, ninguém consegue enxergar as letrinhas pequenas nos "Quadrados" pequeninhos.
Se você abrir a foto em Nova Aba (`window.open(imgUrl)`), o usuário perde seu site inteiro PWA, fecha um site real sem intenção e cai fora da jornada de compra, desistindo da conversão.

## 🛠️ 2. A Solução: Arquitetura Nativa (Z-Index Extremo + Touch API React)

Instrua a Inteligência Artificial a criar um estado global (ou local na lista de exibição) focado em **3 Coordenadas Vitais:** 

```tsx
// O trio vital do Pan-Zoom React
const [fsZoom, setFsZoom] = useState(1);       // Nível de aproximação de pinça
const [fsPan, setFsPan] = useState({ x: 0, y: 0 }); // Vetor de deslocamento na tela do usuário (onde o dedo arrastou a foto)

// Dicionário Analítico de Rotação por Metadata Exif Nulo (Importante em fotos viradas de iPad etc)
const [fsNeedsRotation, setFsNeedsRotation] = useState(false);
```

### 👆 Os 3 Sentidos Táteis Celulares (Touch API)

Este Lightbox só ganha vida com a escuta constante sobre 3 verbos táteis (Para a IA criar a matemática de Pinça e Arrasto): `onTouchStart`, `onTouchMove` e `onTouchEnd`.

A IA **Deve** construir seu componente reativo Mestre deste jeito:

```tsx
// Componente JSX Desenhado com Fundo Preto Fixado: OVERLAY FULLSCREEN OPACO BLACK-OUT 100% Z-INDEX 9999
{fsUrl && (
  <div
    ref={fsOverlayRef} // Container Mestre (Espera toque com dedos)
    className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden" 
    onWheel={handleFsWheel} // E o Desktop Scroll wheel do mouse, não deixe a IA esquecer dele.
    style={{ touchAction: 'none' }} // Trava o Deslizamento de tela natural do navegador Apple/Android pra roubar pro React Controlar
  >
  
     <img
        src={fsUrl}
        alt="Visualização Tela Cheia"
        draggable={false}
        // CSS PURO HARDWARE ACCELERATED RENDER
        style={{
            maxWidth: '100vw',
            maxHeight: '100vh',
            objectFit: 'contain',
            transform: `scale(${fsZoom}) translate(${fsPan.x}px, ${fsPan.y}px)`,
            transformOrigin: 'center center',
            transition: 'none', // Touch Movement não pode ter Transição Animada senão fica parecendo sabonete lento (Frame Drop Jitter)
            cursor: fsZoom > 1 ? 'grab' : 'default',
        }}
    />
        
     {/* BOTÃO FECHAR */}
     <button onClick={() => { fecharEResetar(); }} className="absolute top-4 right-4 z-10 w-12 h-12 bg-black/70 text-white rounded-full flex items-center justify-center"> X </button>
  </div>
```

### 🧠 A Física Euclidiana do React - Toque na Tela

Para IAs pararem de bugar no *Pinch-to-zoom*, o Segredo Central exige calcular a "Distância Hipotenusa" entre os 2 dedos. Exija da IA que imite o esqueleto do Teorema de Pitágoras no touch events:

```typescript
// Dica do Esqueleto Matemático da Foto a injetar na IA:
const handleTouchMove = (e) => {
    // 2 Dedos Movendo! Calcula nova distância do centro e gera nova Escala = Amplia e Afasta!
    if (e.touches.length === 2 && touchesRef.current.length === 2) {
      const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      // O Pitágoras Raiz do Touch Zoom
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const prevDist = Math.hypot(
        touchesRef.current[1].clientX - touchesRef.current[0].clientX,
        touchesRef.current[1].clientY - touchesRef.current[0].clientY
      );

      // Incremento / Decremento do "Pinça" Humano com Trava (Ex: min 1x - max 4x Zoom MÁX)
      setFsZoom(prev => Math.min(Math.max(1, prev * (dist / prevDist)), 4));
   }
}
```

---

Qualquer Inteligência Artificial alimentada com este Dossiê arquitetônico e a injeção do Módulo Touch Move de React construirá um Sistema Mobile fluído melhor que o Nativo sem sofrer bloqueios do npm. Uma solução estritamente local (Offline-first / Zero deps) que não envelhece!
