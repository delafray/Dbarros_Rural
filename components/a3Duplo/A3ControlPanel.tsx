import React from 'react';
import { CardapioTema } from '../../utils/cardapioTema';
import { FontesA3, FONTES_A3_PADRAO } from './a3DuploLayout';

/**
 * Painel lateral de ajustes do preview A3: fontes (px), cores do tema,
 * salvar/voltar ao padrão, zoom e afastamento do topo.
 * Puro-apresentação: todo estado vive no A3DuploCanvas.
 */

const CAMPOS_FONTE: { key: keyof FontesA3; label: string }[] = [
  { key: 'empresa',   label: 'Empresa' },
  { key: 'titulo',    label: 'Título' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'item',      label: 'Item' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'preco',     label: 'Preço' },
];

const CAMPOS_COR: { key: keyof CardapioTema; label: string }[] = [
  { key: 'corFundo',        label: 'Fundo' },
  { key: 'corDourado',      label: 'Destaque' },
  { key: 'corDouradoClaro', label: 'Destaque claro' },
  { key: 'corTexto',        label: 'Texto' },
  { key: 'corTextoSuave',   label: 'Texto suave' },
];

const FONTE_STEP = 0.5;

export interface A3ControlPanelProps {
  fontes: FontesA3;
  tema: CardapioTema;
  zoom: number;
  /** Exibe o botão "Salvar no projeto" (só quando há projeto para salvar) */
  mostrarSalvar: boolean;
  isSaving: boolean;
  salvo: boolean;
  onChangeFonte: (key: keyof FontesA3, delta: number) => void;
  onChangeCor: (key: keyof CardapioTema, value: string) => void;
  onVoltarPadrao: () => void;
  onSalvar: () => void;
  onZoom: (zoom: number) => void;
  onTopo: (mm: number) => void;
}

export const A3ControlPanel: React.FC<A3ControlPanelProps> = ({
  fontes, tema, zoom, mostrarSalvar, isSaving, salvo,
  onChangeFonte, onChangeCor, onVoltarPadrao, onSalvar, onZoom, onTopo,
}) => {
  const topoMm = fontes.topoMm ?? 0;

  return (
    <div className="no-print w-60 flex-shrink-0 sticky top-4 bg-white rounded-xl border border-slate-200 shadow-lg p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
        Fontes (px)
      </p>
      <p className="text-[11px] text-slate-400 -mt-2">
        Ao ajustar, a distribuição é recalculada — a escala global se adapta para tudo caber.
      </p>

      {CAMPOS_FONTE.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-700 flex-1">{label}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onChangeFonte(key, -FONTE_STEP)}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm"
              title={`Diminuir ${label}`}
            >
              −
            </button>
            <span
              className={`w-11 text-center text-sm font-mono ${
                fontes[key] !== FONTES_A3_PADRAO[key] ? 'text-indigo-600 font-bold' : 'text-slate-500'
              }`}
              title={`Padrão: ${FONTES_A3_PADRAO[key]}px`}
            >
              {fontes[key]}
            </span>
            <button
              onClick={() => onChangeFonte(key, FONTE_STEP)}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm"
              title={`Aumentar ${label}`}
            >
              +
            </button>
          </div>
        </div>
      ))}

      {/* Cores do tema — interligadas com o projeto (valem p/ banner e A4) */}
      <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Cores do tema
        </p>
        <p className="text-[11px] text-slate-400 -mt-1">
          Cores do projeto — ao salvar, valem também para o banner e o A4.
        </p>
        {CAMPOS_COR.map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between gap-2 cursor-pointer">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <span className="flex items-center gap-1.5">
              <code className="text-[10px] text-slate-400 uppercase">{tema[key]}</code>
              <input
                type="color"
                value={tema[key]}
                onChange={(e) => onChangeCor(key, e.target.value)}
                className="w-8 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
            </span>
          </label>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
        {mostrarSalvar && (
          <button
            onClick={onSalvar}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm px-3 py-2 rounded-lg shadow transition-all"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {isSaving ? 'Salvando...' : salvo ? '✓ Salvo!' : 'Salvar no projeto'}
          </button>
        )}
        <button
          onClick={onVoltarPadrao}
          className="w-full text-sm font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5"
        >
          Voltar ao padrão
        </button>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zoom</span>
          <span className="text-xs text-slate-400 font-mono">{Math.round(zoom * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.25}
          max={1}
          step={0.05}
          value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
      </div>

      {/* Afastar do topo — empurra o conteúdo p/ baixo p/ centralizar melhor */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Afastar do topo</span>
          <span className={`text-xs font-mono ${topoMm > 0 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
            {topoMm} mm
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={60}
          step={1}
          value={topoMm}
          onChange={(e) => onTopo(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Empurra o conteúdo para baixo (0 = padrão). Salva junto com as fontes.
        </p>
      </div>
    </div>
  );
};

export default A3ControlPanel;
