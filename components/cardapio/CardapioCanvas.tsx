import React, { forwardRef, useMemo } from 'react';
import { CardapioGroup, splitGroups, calcFontSize } from '../../utils/cardapioParser';

// ─── Canvas dimensions (proportional to 2.0m × 1.1m banner) ────────────────
export const CANVAS_W = 1600;
export const CANVAS_H = 880;

// ─── Design tokens ──────────────────────────────────────────────────────────
const GOLD       = '#D4AF37';
const GOLD_BRIGHT = '#FFE066';
const TEXT_WHITE  = '#FFFFFF';
const TEXT_GRAY   = '#b8cce0';
const COL_PADDING_V = 14;
const COL_PADDING_H = 44;
const DIVIDER_W   = 3;
const SCREW_SIZE  = 28;
const SCREW_INSET = 20;

// Approximate usable content width per column (used for empresa font sizing)
const APPROX_COL_W = (CANVAS_W / 2) - COL_PADDING_H - Math.round(COL_PADDING_H * 0.7);

// ─── Dynamic layout helpers ──────────────────────────────────────────────────
function calcHeaderH(totalItens: number): number {
  if (totalItens >= 14) return 128;
  if (totalItens >= 10) return 144;
  if (totalItens >= 7)  return 158;
  return 172;
}

/**
 * Empresa font size constrained to the half-column width.
 * More items → smaller so items have more room.
 */
function calcEmpresaFs(empresa: string, totalItens: number, colW = APPROX_COL_W): number {
  const byLength = Math.min(68, Math.floor(colW / Math.max(empresa.length, 1)));
  const pressure = Math.min(0.42, Math.max(0, (totalItens - 4) * 0.036));
  return Math.max(24, Math.floor(byLength * (1 - pressure)));
}

// ─── Screw corner decoration ─────────────────────────────────────────────────
const Screw = ({ style }: { style: React.CSSProperties }) => (
  <div
    style={{
      position: 'absolute',
      width: SCREW_SIZE,
      height: SCREW_SIZE,
      borderRadius: '50%',
      background: `radial-gradient(circle at 36% 36%, #f8e878 0%, ${GOLD} 55%, #7a5f00 100%)`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,220,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      ...style,
    }}
  >
    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1a0e00', opacity: 0.65 }} />
  </div>
);

// ─── Per-column header (titulo + empresa) — replicated on each half ──────────
const ColHeader = ({
  titulo,
  empresa,
  headerH,
  totalItens,
}: {
  titulo: string;
  empresa: string;
  headerH: number;
  totalItens: number;
}) => {
  const empresaFs = calcEmpresaFs(empresa, totalItens);
  const tituloFs  = Math.max(12, Math.floor(headerH * 0.13));
  const underlineW = Math.max(100, Math.min(APPROX_COL_W * 0.75, empresa.length * 22));

  return (
    <div
      style={{
        height: headerH,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 4,
        flexShrink: 0,
      }}
    >
      {titulo && (
        <div
          style={{
            color: GOLD_BRIGHT,
            fontSize: tituloFs,
            fontWeight: 700,
            letterSpacing: Math.max(3, tituloFs * 0.28),
            textTransform: 'uppercase',
            opacity: 0.88,
            fontFamily: 'Arial, Helvetica, sans-serif',
            marginBottom: 6,
          }}
        >
          {titulo}
        </div>
      )}

      {/* Empresa — hero text */}
      <div
        style={{
          color: GOLD_BRIGHT,
          fontSize: empresaFs,
          fontWeight: 900,
          letterSpacing: Math.max(2, 8 - empresa.length * 0.15),
          textTransform: 'uppercase',
          lineHeight: 0.9,
          fontFamily: '"Arial Black", Impact, Gadget, sans-serif',
          textShadow: `0 0 40px ${GOLD}65, 0 3px 10px rgba(0,0,0,0.6)`,
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          textAlign: 'center',
        }}
      >
        {empresa}
      </div>

      {/* Underline */}
      <div
        style={{
          width: underlineW,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          marginTop: Math.max(4, headerH * 0.045),
          opacity: 0.72,
        }}
      />
    </div>
  );
};

// ─── Column content renderer ──────────────────────────────────────────────────
const ColumnContent = ({
  grupos,
  fs,
}: {
  grupos: CardapioGroup[];
  fs: number;
}) => {
  const priceFs = Math.max(fs * 1.22, 11.5);
  const itemFs  = fs * 1.02;
  const catFs   = fs * 1.52;
  const descFs  = fs * 0.68;

  return (
    <>
      {grupos.map((group) => (
        <div key={group.categoria} style={{ marginBottom: fs * 0.42 }}>

          {/* Category heading */}
          <div
            style={{
              color: GOLD_BRIGHT,
              fontSize: catFs,
              fontWeight: 900,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              lineHeight: 1.15,
              marginBottom: fs * 0.28,
              fontFamily: '"Arial Black", "Arial Bold", Gadget, sans-serif',
              textShadow: `0 0 12px ${GOLD_BRIGHT}45`,
            }}
          >
            {group.categoria}
          </div>

          {/* Items */}
          {group.itens.map((item, idx) => (
            <div key={idx} style={{ marginBottom: fs * 0.34 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    color: TEXT_WHITE,
                    fontSize: itemFs,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    flex: 1,
                  }}
                >
                  {item.item}
                </span>
                <span
                  style={{
                    color: GOLD_BRIGHT,
                    fontSize: priceFs,
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    fontFamily: '"Arial Black", Gadget, sans-serif',
                    letterSpacing: 0.5,
                    textShadow: `0 0 8px ${GOLD}40`,
                  }}
                >
                  {item.valor}
                </span>
              </div>

              {item.descricao && (
                <div
                  style={{
                    color: TEXT_GRAY,
                    fontSize: descFs,
                    lineHeight: 1.3,
                    marginTop: fs * 0.06,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontStyle: 'italic',
                    opacity: 0.9,
                  }}
                >
                  {item.descricao}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
};

// ─── Main Canvas Component ────────────────────────────────────────────────────
interface CardapioCanvasProps {
  titulo?: string;
  empresa?: string;
  grupos: CardapioGroup[];
}

export const CardapioCanvas = forwardRef<HTMLDivElement, CardapioCanvasProps>(
  ({ titulo = '', empresa = '', grupos }, ref) => {
    const [leftGrupos, rightGrupos] = useMemo(() => splitGroups(grupos), [grupos]);

    const totalItens = useMemo(
      () => grupos.reduce((s, g) => s + g.itens.length, 0),
      [grupos]
    );

    const headerH = useMemo(() => calcHeaderH(totalItens), [totalItens]);
    const availH  = CANVAS_H - headerH - COL_PADDING_V * 2 - 8;
    const fs      = useMemo(() => calcFontSize(grupos, availH), [grupos, availH]);

    return (
      <div
        ref={ref}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          position: 'relative',
          overflow: 'hidden',
          background: '#011464',
          fontFamily: 'Arial, Helvetica, sans-serif',
          flexShrink: 0,
        }}
      >
        {/* Vignette */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.35) 100%)',
          }}
        />

        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4, opacity: 0.8,
          background: `linear-gradient(90deg, transparent, ${GOLD} 20%, ${GOLD} 80%, transparent)`,
        }} />




        {/* Corner screws */}
        <Screw style={{ top: SCREW_INSET, left: SCREW_INSET + 15 }} />
        <Screw style={{ top: SCREW_INSET, right: SCREW_INSET + 10 }} />
        <Screw style={{ bottom: SCREW_INSET, left: SCREW_INSET + 15 }} />
        <Screw style={{ bottom: SCREW_INSET, right: SCREW_INSET + 10 }} />

        {/* ── Two-column layout — each half is independent ──────────────── */}
        <div
          style={{
            display: 'flex',
            height: CANVAS_H,
            paddingBottom: COL_PADDING_V,
            paddingTop: COL_PADDING_V * 0.5,
          }}
        >
          {/* ── Left half ─────────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              paddingLeft: COL_PADDING_H + 20,
              paddingRight: COL_PADDING_H * 1.6,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <ColHeader titulo={titulo} empresa={empresa} headerH={headerH} totalItens={totalItens} />
            <ColumnContent grupos={leftGrupos} fs={fs} />
          </div>




          {/* ── Right half ────────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              paddingLeft: COL_PADDING_H * 1.6,
              paddingRight: COL_PADDING_H + SCREW_SIZE,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <ColHeader titulo={titulo} empresa={empresa} headerH={headerH} totalItens={totalItens} />
            <ColumnContent grupos={rightGrupos} fs={fs} />
          </div>
        </div>
      </div>
    );
  }
);

CardapioCanvas.displayName = 'CardapioCanvas';
