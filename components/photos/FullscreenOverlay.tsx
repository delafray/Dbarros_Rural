import React from 'react';

interface FullscreenOverlayProps {
  fsUrl: string;
  fsZoom: number;
  fsPan: { x: number; y: number };
  fsOverlayRef: React.RefObject<HTMLDivElement>;
  fsNeedsRotation: boolean;
  closeFullscreen: () => void;
  handleFsImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  handleFsWheel: (e: React.WheelEvent) => void;
  setFsZoom: React.Dispatch<React.SetStateAction<number>>;
  setFsPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

const FullscreenOverlay: React.FC<FullscreenOverlayProps> = ({
  fsUrl,
  fsZoom,
  fsPan,
  fsOverlayRef,
  fsNeedsRotation,
  closeFullscreen,
  handleFsImageLoad,
  handleFsWheel,
  setFsZoom,
  setFsPan,
}) => {
  return (
    <div
      ref={fsOverlayRef}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
      onWheel={handleFsWheel}
      style={{ touchAction: 'none' }}
    >
      <img
        src={fsUrl}
        alt="Visualizacao em tela cheia"
        onLoad={handleFsImageLoad}
        draggable={false}
        style={fsNeedsRotation ? {
          width: '100vh',
          height: '100vw',
          maxWidth: 'none',
          maxHeight: 'none',
          objectFit: 'contain',
          transform: `rotate(90deg) scale(${fsZoom}) translate(${fsPan.x}px, ${fsPan.y}px)`,
          transformOrigin: 'center center',
          transition: 'none',
          userSelect: 'none',
          cursor: fsZoom > 1 ? 'grab' : 'default',
        } : {
          maxWidth: '100vw',
          maxHeight: '100vh',
          objectFit: 'contain',
          transform: `scale(${fsZoom}) translate(${fsPan.x}px, ${fsPan.y}px)`,
          transformOrigin: 'center center',
          transition: 'none',
          userSelect: 'none',
          cursor: fsZoom > 1 ? 'grab' : 'default',
        }}
      />
      <button
        onClick={closeFullscreen}
        className="absolute top-4 right-4 z-10 w-12 h-12 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 active:scale-95 transition-all border border-white/20 backdrop-blur-sm shadow-lg"
        title="Fechar"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {fsZoom > 1 && (
        <button
          onClick={() => { setFsZoom(1); setFsPan({ x: 0, y: 0 }); }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 bg-black/70 text-white text-xs font-bold rounded-full border border-white/20 backdrop-blur-sm hover:bg-black/90 transition-all"
        >
          &#x2715; {Math.round(fsZoom * 100)}%
        </button>
      )}
    </div>
  );
};

export default FullscreenOverlay;
