import React from "react";
import { createPortal } from "react-dom";
import { ESTILO_STATUS, parseViewBox, pontosParaAtributo } from "../../utils/mapaCalc";
import type { ItemMapa } from "../../hooks/useMapaVendas";
import RotuloEstande from "./RotuloEstande";

interface MapaImpressaoProps {
  viewBox: string;
  fundoUrl: string | null;
  itens: ItemMapa[];
  mostrarNomes: boolean;
}

/**
 * Folha de impressão do mapa (botão 🖨️ Imprimir, 18/09): A3 deitado, só o mapa.
 * Fundo = imagem; estandes e textos = vetor (o "Salvar como PDF" do navegador preserva).
 * Renderiza o que está na tela (filtro de família, modo Nomes/Números), sem pan/zoom,
 * sem seleção, sem animação. Montado num portal direto no <body>; só aparece no @media print
 * (ver index.css, classe body.imprimindo-mapa).
 */
const MapaImpressao: React.FC<MapaImpressaoProps> = ({ viewBox, fundoUrl, itens, mostrarNomes }) => {
  const box = parseViewBox(viewBox);
  if (!box) return null;
  return createPortal(
    <div className="mapa-impressao-root">
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        {fundoUrl && (
          <image href={fundoUrl} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio="xMidYMid meet" />
        )}
        {itens.map(({ estande, status, rotuloMapa }) => {
          if (!estande.pontos || estande.pontos.length < 3) return null;
          const estilo = ESTILO_STATUS[status];
          return (
            <g key={estande.codigo}>
              <polygon
                points={pontosParaAtributo(estande.pontos)}
                fill={estilo.fill}
                stroke={estilo.stroke}
                strokeWidth={0.4}
                opacity={0.85}
              />
              <RotuloEstande estande={estande} estilo={estilo} mostrarNomes={mostrarNomes} rotuloMapa={rotuloMapa} />
            </g>
          );
        })}
      </svg>
    </div>,
    document.body,
  );
};

export default MapaImpressao;
