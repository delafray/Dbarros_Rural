import React from 'react';
import { CardapioGroup } from '../../utils/cardapioParser';
import { CardapioTema, withAlpha } from '../../utils/cardapioTema';
import { FontesA3 } from './a3DuploLayout';

/**
 * Bloco de uma empresa na página A3 (título + nome + underline + grupos de
 * itens). Usado tanto na renderização final quanto na passada invisível de
 * MEDIÇÃO (containerRef/groupRefCallback alimentam o algoritmo de layout).
 */

export interface EmpresaBlockProps {
  t: CardapioTema;
  fontes: FontesA3;
  empresa: string;
  titulo?: string;
  grupos: CardapioGroup[];
  scale: number;
  spacing?: number;
  widthPx: number;
  isContinuacao?: boolean;
  containerRef?: (el: HTMLDivElement | null) => void;
  groupRefCallback?: (el: HTMLDivElement | null, gi: number) => void;
}

export const EmpresaBlock: React.FC<EmpresaBlockProps> = ({
  t, fontes, empresa, titulo, grupos, scale, spacing = 1, widthPx, isContinuacao, containerRef, groupRefCallback,
}) => {
  return (
    <div
      ref={containerRef}
      style={{
        width: widthPx,
        marginBottom: `${15 * scale * spacing}px`,
        breakInside: 'avoid',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: `${10 * scale * spacing}px` }}>
        {titulo && !isContinuacao && (
          <div style={{
            fontSize: `${fontes.titulo * scale}px`,
            color: t.corDouradoClaro,
            textTransform: 'uppercase',
            marginBottom: '2px',
            fontWeight: 'bold',
          }}>{titulo}</div>
        )}
        <div style={{
          fontSize: `${fontes.empresa * scale}px`,
          color: t.corDouradoClaro,
          fontFamily: '"Arial Black", Impact, sans-serif',
          textTransform: 'uppercase',
          textShadow: `0 0 10px ${t.corDourado}55`,
          lineHeight: 1.05,
        }}>
          {empresa}{isContinuacao ? ' ›' : ''}
        </div>
        <div style={{
          margin: '6px auto',
          width: '60%',
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${t.corDourado}, transparent)`,
          opacity: 0.8,
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${12 * scale * spacing}px` }}>
        {grupos.map((grupo, gi) => (
          <div
            key={gi}
            ref={(el) => groupRefCallback?.(el, gi)}
            style={{ breakInside: 'avoid' }}
          >
            <h3 style={{
              fontSize: `${fontes.categoria * scale}px`,
              fontWeight: 900,
              color: t.corDouradoClaro,
              marginTop: 0,
              marginBottom: `${6 * scale * spacing}px`,
              textTransform: 'uppercase',
              fontFamily: '"Arial Black", Impact, sans-serif',
              letterSpacing: '0.4px',
            }}>
              {grupo.categoria}
            </h3>
            {grupo.itens.map((item: any, ii: number) => (
              <div key={ii} style={{ marginBottom: `${5 * scale * spacing}px` }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}>
                  <span style={{
                    fontSize: `${fontes.item * scale}px`,
                    color: t.corTexto,
                    fontWeight: 600,
                    minWidth: 0,
                  }}>
                    {item.item}
                  </span>
                  {item.valor && (
                    <span style={{
                      flex: 1,
                      minWidth: '12px',
                      margin: '0 8px',
                      borderBottom: `1px dotted ${withAlpha(t.corTextoSuave, 0.55)}`,
                      alignSelf: 'baseline',
                    }} />
                  )}
                  <span style={{
                    fontSize: `${fontes.preco * scale}px`,
                    color: t.corDouradoClaro,
                    fontWeight: 900,
                    fontFamily: '"Arial Black", Impact, sans-serif',
                    whiteSpace: 'nowrap',
                  }}>{item.valor}</span>
                </div>
                {/* Descrição abaixo da linha, largura total da coluna — só
                    quebra quando realmente falta espaço (antes: maxWidth 85%
                    de uma coluna auto-dimensionada forçava quebra sempre) */}
                {item.descricao && (
                  <div style={{
                    fontSize: `${fontes.descricao * scale}px`,
                    color: t.corTextoSuave,
                    marginTop: '2px',
                    fontStyle: 'italic',
                    lineHeight: 1.3,
                  }}>{item.descricao}</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmpresaBlock;
