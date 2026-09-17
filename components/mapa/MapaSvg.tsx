import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ESTILO_STATUS,
  parseViewBox,
  pontosParaAtributo,
  tamanhoFonteRotulo,
  clampZoom,
  zoomComRoda,
  panParaZoomNoPonto,
} from "../../utils/mapaCalc";
import type { ItemMapa } from "../../hooks/useMapaVendas";

interface MapaSvgProps {
  viewBox: string;
  fundoUrl: string | null;
  itens: ItemMapa[];
  selecionado: string | null;
  onSelect: (codigo: string) => void;
}

/**
 * Componente puramente visual: desenha a planta (fundo opcional + polígonos
 * coloridos por status) com pan (arrastar) e zoom (roda / botões) simples.
 * Toda a lógica de status/resumo já veio pronta em `itens` (hooks/useMapaVendas).
 */
const MapaSvg: React.FC<MapaSvgProps> = ({ viewBox, fundoUrl, itens, selecionado, onSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const box = useMemo(() => parseViewBox(viewBox), [viewBox]);

  // Ponto do cursor em unidades do viewBox (antes do translate/scale do <g>).
  const pontoNoSvg = (el: SVGSVGElement, clientX: number, clientY: number) => {
    const ctm = el.getScreenCTM();
    if (!ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  };

  // Roda do mouse: listener nativo (não-passivo) para poder preventDefault e não
  // rolar a página. Zoom ancorado no cursor: o ponto sob o mouse fica parado.
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const novo = zoomComRoda(zoomRef.current, e.deltaY);
      const p = pontoNoSvg(el, e.clientX, e.clientY);
      if (p) setPan(panParaZoomNoPonto(panRef.current, zoomRef.current, novo, p));
      setZoom(novo);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    setArrastando(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current || !svgRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    const escala = ctm ? 1 / ctm.a : 1; // px de tela → unidades do viewBox
    const dx = (e.clientX - dragRef.current.x) * escala;
    const dy = (e.clientY - dragRef.current.y) * escala;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };
  const pararArraste = () => {
    dragRef.current = null;
    setArrastando(false);
  };

  const zoomBotao = (fator: number) => {
    if (!box) return;
    const centro = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    const novo = clampZoom(zoom * fator);
    setPan(panParaZoomNoPonto(pan, zoom, novo, centro));
    setZoom(novo);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (!box) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Mapa com viewBox inválido — contate o administrador.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-50">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className={`w-full h-full ${arrastando ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={pararArraste}
        onMouseLeave={pararArraste}
      >
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {fundoUrl && (
            <image
              href={fundoUrl}
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              preserveAspectRatio="xMidYMid meet"
            />
          )}
          {itens.map(({ estande, status, clienteNome }) => {
            if (!estande.pontos || estande.pontos.length < 3) return null;
            const estilo = ESTILO_STATUS[status];
            const isSelecionado = estande.codigo === selecionado;
            const fonte = tamanhoFonteRotulo(estande.pontos);
            const tituloTooltip = [estande.codigo, estilo.label, clienteNome].filter(Boolean).join(" · ");
            return (
              <g key={estande.codigo}>
                <polygon
                  points={pontosParaAtributo(estande.pontos)}
                  fill={estilo.fill}
                  stroke={isSelecionado ? "#1D4ED8" : estilo.stroke}
                  strokeWidth={isSelecionado ? 1.2 : 0.4}
                  opacity={0.85}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(estande.codigo);
                  }}
                >
                  <title>{tituloTooltip}</title>
                </polygon>
                {fonte > 0 && (
                  <text
                    x={estande.centro[0]}
                    y={estande.centro[1]}
                    fontSize={fonte}
                    fill={estilo.texto}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none select-none"
                    style={{ fontWeight: 700 }}
                  >
                    {estande.codigo}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Controles de zoom */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-white/90 border border-slate-200 rounded shadow-sm overflow-hidden text-slate-700">
        <button
          className="w-8 h-8 hover:bg-slate-100 font-bold"
          onClick={() => zoomBotao(1.25)}
          title="Aproximar"
          type="button"
        >
          +
        </button>
        <button
          className="w-8 h-8 hover:bg-slate-100 font-bold border-t border-slate-200"
          onClick={() => zoomBotao(1 / 1.25)}
          title="Afastar"
          type="button"
        >
          −
        </button>
        <button
          className="w-8 h-8 hover:bg-slate-100 border-t border-slate-200"
          onClick={resetView}
          title="Restaurar visão"
          type="button"
        >
          ⟲
        </button>
      </div>
    </div>
  );
};

export default MapaSvg;
