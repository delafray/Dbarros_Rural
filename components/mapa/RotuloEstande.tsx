import React from "react";
import {
  EstandeMapa,
  EstiloStatus,
  tamanhoFonteRotulo,
  layoutNomeEstande,
  bboxDePontos,
} from "../../utils/mapaCalc";

interface RotuloEstandeProps {
  estande: EstandeMapa;
  estilo: EstiloStatus;
  /** true = mostra o nome (rótulo do mapa / nome do cliente) no lugar do código. */
  mostrarNomes: boolean;
  rotuloMapa: string | null;
}

/**
 * Texto dentro do polígono do estande — compartilhado pela tela (MapaSvg) e pela
 * impressão (MapaImpressao), para os dois saírem idênticos.
 * Modo "Nomes": nome abreviado na direção/linhas em que cabe. Senão: código e, abaixo,
 * a metragem em fonte menor quando o estande tem altura para duas linhas.
 */
const RotuloEstande: React.FC<RotuloEstandeProps> = ({ estande, estilo, mostrarNomes, rotuloMapa }) => {
  const [cx, cy] = estande.centro;
  const nome = mostrarNomes && rotuloMapa ? layoutNomeEstande(estande.pontos, rotuloMapa) : null;
  if (nome) {
    return (
      <text
        x={cx}
        y={cy}
        fontSize={nome.fonte}
        fill={estilo.texto}
        textAnchor="middle"
        dominantBaseline="central"
        transform={nome.rotacao ? `rotate(${nome.rotacao} ${cx} ${cy})` : undefined}
        className="pointer-events-none select-none"
        style={{ fontWeight: 700 }}
      >
        {nome.linhas.length === 1 ? nome.linhas[0] : (
          <>
            <tspan x={cx} dy="-0.55em">{nome.linhas[0]}</tspan>
            <tspan x={cx} dy="1.1em">{nome.linhas[1]}</tspan>
          </>
        )}
      </text>
    );
  }
  const fonte = tamanhoFonteRotulo(estande.pontos, estande.codigo);
  if (fonte <= 0) return null;
  const box = bboxDePontos(estande.pontos);
  const comArea = estande.area != null && !!box && box.h >= fonte * 2.1;
  return (
    <text
      x={cx}
      y={cy}
      fontSize={fonte}
      fill={estilo.texto}
      textAnchor="middle"
      dominantBaseline="central"
      className="pointer-events-none select-none"
      style={{ fontWeight: 700 }}
    >
      {comArea ? (
        <>
          <tspan x={cx} dy="-0.42em">{estande.codigo}</tspan>
          <tspan x={cx} dy="1.15em" fontSize={fonte * 0.62} style={{ fontWeight: 600 }}>
            {estande.area} m²
          </tspan>
        </>
      ) : (
        estande.codigo
      )}
    </text>
  );
};

export default RotuloEstande;
