import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ESTILO_STATUS,
  parseViewBox,
  pontosParaAtributo,
  tamanhoFonteRotulo,
  layoutNomeEstande,
  bboxDePontos,
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
  /** Clique de novo no estande já selecionado: cicla o status (ausente = somente leitura). */
  onAlternarStatus?: (codigo: string) => void;
  /** true = estandes ocupados mostram o nome (fantasia) do cliente no lugar do código. */
  mostrarNomes?: boolean;
}

/**
 * Componente puramente visual: desenha a planta (fundo opcional + polígonos
 * coloridos por status) com pan (arrastar) e zoom (roda / botões) simples.
 * Toda a lógica de status/resumo já veio pronta em `itens` (hooks/useMapaVendas).
 */
const MapaSvg: React.FC<MapaSvgProps> = ({ viewBox, fundoUrl, itens, selecionado, onSelect, onAlternarStatus, mostrarNomes = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);
  // Balão próprio (instantâneo, com negrito) no lugar do <title> nativo, que demora ~0,5s e é só texto.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ codigo: string; x: number; y: number } | null>(null);
  const moverBalao = (codigo: string, e: React.MouseEvent) => {
    const r = wrapRef.current?.getBoundingClientRect();
    setHover({ codigo, x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) });
  };

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
    <div ref={wrapRef} className="relative w-full h-full bg-slate-50">
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
          {itens.map(({ estande, status, clienteNome, rotuloMapa, proximoStatus }) => {
            if (!estande.pontos || estande.pontos.length < 3) return null;
            const estilo = ESTILO_STATUS[status];
            const isSelecionado = estande.codigo === selecionado;
            const fonte = tamanhoFonteRotulo(estande.pontos, estande.codigo);
            // Modo "Nomes": todo estande COM cliente mostra o nome abreviado, na direção em que cabe
            // (inclusive "cliente sem status", que continua piscando para chamar atenção).
            const nome = mostrarNomes && rotuloMapa ? layoutNomeEstande(estande.pontos, rotuloMapa) : null;
            const editavel = !!onAlternarStatus && proximoStatus !== null && proximoStatus !== "sem_planilha";
            const dica = !editavel
              ? null
              : isSelecionado
                ? `clique de novo: ${ESTILO_STATUS[proximoStatus].label}`
                : "clique para selecionar";
            // Marcado sem cliente: oscila devagar entre a cor cheia e a clara (mesma atenção sutil da planilha).
            const oscilaSemCliente = !!estilo.semCliente && !clienteNome;
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
                    if (isSelecionado && editavel) onAlternarStatus!(estande.codigo);
                    else onSelect(estande.codigo);
                  }}
                  onMouseEnter={(e) => moverBalao(estande.codigo, e)}
                  onMouseMove={(e) => moverBalao(estande.codigo, e)}
                  onMouseLeave={() => setHover(null)}
                >
                  {estilo.piscaAte && (
                    <animate
                      attributeName="fill"
                      values={`${estilo.fill};${estilo.piscaAte};${estilo.fill}`}
                      dur="1.4s"
                      repeatCount="indefinite"
                    />
                  )}
                  {oscilaSemCliente && (
                    <animate
                      attributeName="fill"
                      values={`${estilo.fill};${estilo.semCliente};${estilo.fill}`}
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  )}
                </polygon>
                {nome ? (
                  <text
                    x={estande.centro[0]}
                    y={estande.centro[1]}
                    fontSize={nome.fonte}
                    fill={estilo.texto}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={nome.rotacao ? `rotate(${nome.rotacao} ${estande.centro[0]} ${estande.centro[1]})` : undefined}
                    className="pointer-events-none select-none"
                    style={{ fontWeight: 700 }}
                  >
                    {nome.linhas.length === 1 ? nome.linhas[0] : (
                      <>
                        <tspan x={estande.centro[0]} dy="-0.55em">{nome.linhas[0]}</tspan>
                        <tspan x={estande.centro[0]} dy="1.1em">{nome.linhas[1]}</tspan>
                      </>
                    )}
                  </text>
                ) : fonte > 0 && (() => {
                  // Metragem abaixo do código, menor, só quando cabe (altura do estande ≥ 2 linhas).
                  const box = bboxDePontos(estande.pontos);
                  const comArea = estande.area != null && !!box && box.h >= fonte * 2.1;
                  return (
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
                      {comArea ? (
                        <>
                          <tspan x={estande.centro[0]} dy="-0.42em">{estande.codigo}</tspan>
                          <tspan x={estande.centro[0]} dy="1.15em" fontSize={fonte * 0.62} style={{ fontWeight: 600 }}>
                            {estande.area} m²
                          </tspan>
                        </>
                      ) : (
                        estande.codigo
                      )}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Balão do estande sob o mouse: instantâneo, cliente em negrito */}
      {hover && (() => {
        const item = itens.find((i) => i.estande.codigo === hover.codigo);
        if (!item) return null;
        const est = ESTILO_STATUS[item.status];
        const editavel = !!onAlternarStatus && item.proximoStatus !== null && item.proximoStatus !== "sem_planilha";
        const dica = !editavel ? null : hover.codigo === selecionado
          ? `clique de novo: ${ESTILO_STATUS[item.proximoStatus!].label}`
          : "clique para selecionar";
        const semCliente = !!est.semCliente && !item.clienteNome;
        return (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 text-white rounded shadow-lg px-2.5 py-1.5 text-xs leading-snug whitespace-nowrap"
            style={{ left: hover.x + 14, top: hover.y + 14 }}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-black">{item.estande.codigo}</span>
              {item.estande.area != null && <span className="text-slate-300">{item.estande.area} m²</span>}
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: est.fill }} />
              <span>{est.label}</span>
            </div>
            {item.clienteNome ? (
              <div className="font-black text-[13px] mt-0.5">{item.clienteNome}</div>
            ) : semCliente ? (
              <div className="font-bold text-amber-300 mt-0.5">sem cliente</div>
            ) : null}
            {dica && <div className="text-slate-300 mt-0.5">{dica}</div>}
          </div>
        );
      })()}

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
