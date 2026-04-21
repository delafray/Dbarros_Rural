/**
 * CardapioA4Canvas.tsx
 * Preview component for A4 cardápio with 3cm bleed on all sides.
 *
 * ADAPTIVE LAYOUT:
 *   totalItens ≤ 18  →  single column  (full width, bigger text, cleaner read)
 *   totalItens > 18  →  two columns    (handles large menus)
 *
 * Physical dimensions:
 *   Total (with bleed): 270mm × 357mm
 *   Safe area (A4):     210mm × 297mm
 *   Bleed per side:      30mm
 *
 * Canvas pixels (3 px/mm):
 *   Total: 810 × 1071 px
 *   Safe:  630 × 891 px
 *   Bleed: 90 px per side
 */

import React, { forwardRef, useMemo } from 'react';
import {
  CardapioGroup,
  splitGroups,
  calcFontSize,
  getGroupWeight,
} from '../../utils/cardapioParser';

// ─── Canvas constants ─────────────────────────────────────────────────────────
export const CANVAS_W = 810;
export const CANVAS_H = 1071;
export const BLEED_PX = 90; // 30mm × 3px/mm

export const SAFE_L = BLEED_PX;
export const SAFE_T = BLEED_PX;
export const SAFE_W = CANVAS_W - BLEED_PX * 2; // 630 px = 210mm
export const SAFE_H = CANVAS_H - BLEED_PX * 2; // 891 px = 297mm
export const SAFE_R = SAFE_L + SAFE_W;
export const SAFE_B = SAFE_T + SAFE_H;

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD = '#D4AF37';
const GOLD_BRIGHT = '#FFE066';
const TEXT_WHITE = '#FFFFFF';
const TEXT_GRAY = '#b8cce0';
const COL_PAD_H = 28;
const COL_PAD_V = 14;
const FOOTER_H  = 124;  // chancela 10458×2051px scaled to 630px wide → 123.5px
const DIVIDER_W = 2;
const SCREW_SIZE = 20;
const SCREW_INSET = 12;

// ─── Layout decision ──────────────────────────────────────────────────────────
const TWO_COL_ITEM_THRESHOLD = 18;

function useSingleColumn(totalItens: number): boolean {
  return totalItens <= TWO_COL_ITEM_THRESHOLD;
}

// ─── Font size helpers ────────────────────────────────────────────────────────
function calcHeaderH(totalItens: number): number {
  if (totalItens >= 20) return 100;
  if (totalItens >= 14) return 116;
  if (totalItens >= 10) return 128;
  return 142;
}

function calcEmpresaFs(empresa: string, totalItens: number): number {
  const availW = SAFE_W - COL_PAD_H * 2;
  const byLength = Math.min(64, Math.floor(availW / Math.max(empresa.length, 1)));
  const pressure = Math.min(0.3, Math.max(0, (totalItens - 6) * 0.025));
  return Math.max(22, Math.floor(byLength * (1 - pressure)));
}

// ─── Screw decoration ─────────────────────────────────────────────────────────
const Screw = ({ style }: { style: React.CSSProperties }) => (
  <div
    style={{
      position: 'absolute',
      width: SCREW_SIZE,
      height: SCREW_SIZE,
      borderRadius: '50%',
      background: `radial-gradient(circle at 36% 36%, #f8e878 0%, ${GOLD} 55%, #7a5f00 100%)`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,220,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      ...style,
    }}
  >
    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1a0e00', opacity: 0.65 }} />
  </div>
);

// ─── Content renderer ─────────────────────────────────────────────────────────
const GroupList = ({
  grupos,
  fs,
  singleCol,
}: {
  grupos: CardapioGroup[];
  fs: number;
  singleCol: boolean;
}) => {
  const catFs    = fs * 1.52;
  const itemFs   = fs;
  const priceFs  = Math.max(fs * 1.18, 11);
  const descFs   = fs * 0.68;

  return (
    <>
      {grupos.map((group, gi) => (
        <div key={group.categoria} style={{ marginBottom: fs * 0.42 }}>
          {/* Category header */}
          <div
            style={{
              color: GOLD_BRIGHT,
              fontSize: catFs,
              fontWeight: 900,
              letterSpacing: 1,
              textTransform: 'uppercase',
              lineHeight: 1.08,
              marginBottom: fs * 0.22,
              fontFamily: '"Arial Black", "Arial Bold", Gadget, sans-serif',
              textShadow: `0 0 12px ${GOLD_BRIGHT}45`,
            }}
          >
            {group.categoria}
          </div>

          {/* Slim underline below category — only in single-col mode for breathing room */}
          {singleCol && (
            <div
              style={{
                height: 1,
                background: `linear-gradient(90deg, ${GOLD}90, transparent)`,
                marginBottom: fs * 0.22,
                width: '60%',
                opacity: 0.6,
              }}
            />
          )}

          {/* Items */}
          {group.itens.map((item, idx) => (
            <div key={idx} style={{ marginBottom: fs * 0.3 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: singleCol ? 16 : 6,
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
                    letterSpacing: 0.4,
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
                    lineHeight: 1.35,
                    marginTop: fs * 0.06,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontStyle: 'italic',
                    opacity: 0.88,
                  }}
                >
                  {item.descricao}
                </div>
              )}
            </div>
          ))}

          {/* Separator between groups in single-col mode */}
          {singleCol && gi < grupos.length - 1 && (
            <div
              style={{
                height: 1,
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)`,
                marginTop: fs * 0.18,
              }}
            />
          )}
        </div>
      ))}
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
interface CardapioA4CanvasProps {
  titulo?: string;
  empresa?: string;
  grupos: CardapioGroup[];
}

export const CardapioA4Canvas = forwardRef<HTMLDivElement, CardapioA4CanvasProps>(
  ({ titulo = '', empresa = '', grupos }, ref) => {
    const totalItens = useMemo(
      () => grupos.reduce((s, g) => s + g.itens.length, 0),
      [grupos]
    );

    const singleCol = useSingleColumn(totalItens);

    const [leftGrupos, rightGrupos] = useMemo(
      () => (singleCol ? [grupos, []] : splitGroups(grupos)),
      [grupos, singleCol]
    );

    const headerH   = useMemo(() => calcHeaderH(totalItens), [totalItens]);
    const empresaFs = useMemo(() => calcEmpresaFs(empresa, totalItens), [empresa, totalItens]);
    const tituloFs  = Math.max(10, Math.floor(headerH * 0.115));
    const underlineW = Math.max(80, Math.min(SAFE_W * 0.62, empresa.length * 18));

    const availH = SAFE_H - headerH - COL_PAD_V * 2 - FOOTER_H - 10;

    // Single col: wider → less wrapping → higher factor, bigger cap
    // Two col:   narrow → more wrapping → lower factor, smaller cap
    const fs = useMemo(() => {
      if (singleCol) {
        // Full-width single column (~574px) — text rarely wraps
        const totalWeight = grupos.reduce((s, g) => s + getGroupWeight(g), 0);
        const ideal = totalWeight > 0 ? (availH * 0.86) / totalWeight : 24;
        return Math.max(8, Math.min(24, ideal));
      } else {
        // Two narrow columns (~263px each) — text wraps more
        return Math.min(calcFontSize(grupos, availH * 0.52), 20);
      }
    }, [grupos, singleCol, availH]);

    const screwOff = BLEED_PX + SCREW_INSET;

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
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(0,0,0,0.26) 100%)',
          }}
        />

        {/* Top accent line — 8px inside safe area */}
        <div
          style={{
            position: 'absolute',
            top: SAFE_T + 8,
            left: SAFE_L,
            width: SAFE_W,
            height: 3,
            opacity: 0.8,
            background: `linear-gradient(90deg, transparent, ${GOLD} 20%, ${GOLD} 80%, transparent)`,
          }}
        />

        {/* Bottom accent line — 8px inside safe area */}
        <div
          style={{
            position: 'absolute',
            bottom: BLEED_PX + 8,
            left: SAFE_L,
            width: SAFE_W,
            height: 3,
            opacity: 0.8,
            background: `linear-gradient(90deg, transparent, ${GOLD} 20%, ${GOLD} 80%, transparent)`,
          }}
        />

        {/* Corner screws */}
        <Screw style={{ top: screwOff, left: screwOff }} />
        <Screw style={{ top: screwOff, right: screwOff }} />
        <Screw style={{ bottom: screwOff, left: screwOff }} />
        <Screw style={{ bottom: screwOff, right: screwOff }} />

        {/* ── Safe area content ───────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: SAFE_T,
            left: SAFE_L,
            width: SAFE_W,
            height: SAFE_H,
            display: 'flex',
            flexDirection: 'column',
            paddingTop: COL_PAD_V,
          }}
        >
          {/* Header */}
          <div
            style={{
              height: headerH,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
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
                  marginBottom: 3,
                }}
              >
                {titulo}
              </div>
            )}

            <div
              style={{
                color: GOLD_BRIGHT,
                fontSize: empresaFs,
                fontWeight: 900,
                letterSpacing: Math.max(2, 7 - empresa.length * 0.14),
                textTransform: 'uppercase',
                lineHeight: 0.9,
                fontFamily: '"Arial Black", Impact, Gadget, sans-serif',
                textShadow: `0 0 35px ${GOLD}60, 0 3px 10px rgba(0,0,0,0.6)`,
                whiteSpace: 'nowrap',
                textAlign: 'center',
                maxWidth: '100%',
              }}
            >
              {empresa}
            </div>

            <div
              style={{
                width: underlineW,
                height: 1.5,
                background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                marginTop: Math.max(4, headerH * 0.04),
                opacity: 0.7,
              }}
            />
          </div>

          {/* Content area */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {singleCol ? (
              /* ── Single column ─────────────────────────────────── */
              <div
                style={{
                  flex: 1,
                  paddingLeft: COL_PAD_H,
                  paddingRight: COL_PAD_H,
                  overflow: 'hidden',
                }}
              >
                <GroupList grupos={leftGrupos} fs={fs} singleCol />
              </div>
            ) : (
              /* ── Two columns ───────────────────────────────────── */
              <>
                <div
                  style={{
                    flex: 1,
                    paddingLeft: COL_PAD_H,
                    paddingRight: Math.round(COL_PAD_H * 1.3),
                    overflow: 'hidden',
                  }}
                >
                  <GroupList grupos={leftGrupos} fs={fs} singleCol={false} />
                </div>

                {/* Gold divider */}
                <div
                  style={{
                    width: DIVIDER_W,
                    flexShrink: 0,
                    margin: '4px 0 8px',
                    background: `linear-gradient(180deg, rgba(212,175,55,0) 0%, ${GOLD} 5%, ${GOLD} 95%, rgba(212,175,55,0) 100%)`,
                  }}
                />

                <div
                  style={{
                    flex: 1,
                    paddingLeft: Math.round(COL_PAD_H * 1.3),
                    paddingRight: COL_PAD_H,
                    overflow: 'hidden',
                  }}
                >
                  <GroupList grupos={rightGrupos} fs={fs} singleCol={false} />
                </div>
              </>
            )}
          </div>

          {/* Footer — chancela do evento */}
          <div
            style={{
              height: FOOTER_H,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
              borderTop: `1px solid ${GOLD}18`,
            }}
          >
            <img
              src="/chancela.png"
              alt="Chancela do evento"
              style={{
                width: SAFE_W,
                height: FOOTER_H,
                objectFit: 'contain',
                objectPosition: 'center center',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* ── Bleed indicators (preview only) ────────────────────── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: BLEED_PX, background: 'rgba(255,60,60,0.07)', borderBottom: '1px dashed rgba(255,90,90,0.6)', pointerEvents: 'none', zIndex: 20 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: BLEED_PX, background: 'rgba(255,60,60,0.07)', borderTop: '1px dashed rgba(255,90,90,0.6)', pointerEvents: 'none', zIndex: 20 }} />
        <div style={{ position: 'absolute', top: BLEED_PX, bottom: BLEED_PX, left: 0, width: BLEED_PX, background: 'rgba(255,60,60,0.07)', borderRight: '1px dashed rgba(255,90,90,0.6)', pointerEvents: 'none', zIndex: 20 }} />
        <div style={{ position: 'absolute', top: BLEED_PX, bottom: BLEED_PX, right: 0, width: BLEED_PX, background: 'rgba(255,60,60,0.07)', borderLeft: '1px dashed rgba(255,90,90,0.6)', pointerEvents: 'none', zIndex: 20 }} />

        <div
          style={{
            position: 'absolute', top: 3, left: 4, zIndex: 21,
            color: 'rgba(255,100,100,0.75)',
            fontSize: 7, fontFamily: 'Arial', letterSpacing: 1.5, textTransform: 'uppercase',
          }}
        >
          Sangria 3cm
        </div>
      </div>
    );
  }
);

CardapioA4Canvas.displayName = 'CardapioA4Canvas';
