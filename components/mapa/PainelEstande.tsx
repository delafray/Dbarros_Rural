import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../UI";
import { EstandeMapa, StatusEstande, ESTILO_STATUS } from "../../utils/mapaCalc";
import { CategoriaSetup, PlanilhaEstande } from "../../services/planilhaVendasService";
import { TotaisRow } from "../../utils/planilhaCalc";
import { formatBRL } from "../../utils/formatCurrency";

interface PainelEstandeProps {
  edicaoId: string;
  estande: EstandeMapa;
  status: StatusEstande;
  linha: PlanilhaEstande | undefined;
  clienteNome: string | null;
  categoria: CategoriaSetup | undefined;
  totais: TotaisRow | null;
  isVisitor: boolean;
  onClose: () => void;
}

/** Painel lateral do estande selecionado no mapa — visual, sem lógica de negócio. */
const PainelEstande: React.FC<PainelEstandeProps> = ({
  edicaoId,
  estande,
  status,
  linha,
  clienteNome,
  categoria,
  totais,
  isVisitor,
  onClose,
}) => {
  const navigate = useNavigate();
  const estilo = ESTILO_STATUS[status];

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-black text-slate-900 leading-none">{estande.codigo}</div>
          {categoria?.tag && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600">
              {categoria.tag}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-sm p-1 -mr-1 -mt-1"
          aria-label="Fechar"
          type="button"
        >
          ✕
        </button>
      </div>

      <span
        className="inline-block px-2.5 py-1 rounded text-xs font-bold uppercase"
        style={{ background: estilo.fill, color: estilo.texto }}
      >
        {estilo.label}
      </span>

      <div className="text-sm space-y-1.5">
        <div>
          <span className="text-slate-500">Cliente: </span>
          <span className="font-semibold text-slate-800">{clienteNome || "—"}</span>
        </div>
        <div>
          <span className="text-slate-500">Tipo de venda: </span>
          <span className="font-semibold text-slate-800">{linha?.tipo_venda || "—"}</span>
        </div>
        <div>
          <span className="text-slate-500">Área: </span>
          <span className="font-semibold text-slate-800">
            {estande.area != null ? `${estande.area} m²` : "—"}
          </span>
        </div>
        {estande.obs && (
          <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-xs">
            {estande.obs}
          </div>
        )}
        {status === "sem_planilha" && (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 text-xs">
            Este código não tem linha correspondente na planilha de vendas — alerta de sincronização.
          </div>
        )}
      </div>

      {totais && (
        <div className="border-t border-slate-100 pt-2.5 text-sm space-y-1 font-mono">
          <div className="flex justify-between text-slate-500">
            <span>Preço base</span>
            <span>{formatBRL(totais.precoBase)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-800">
            <span>Total</span>
            <span>{formatBRL(totais.totalVenda)}</span>
          </div>
          {!isVisitor && (
            <>
              <div className="flex justify-between text-green-700">
                <span>Pago</span>
                <span>{formatBRL(totais.valorPago)}</span>
              </div>
              <div
                className={`flex justify-between font-bold ${
                  totais.pendente > 0 ? "text-red-600" : "text-slate-400"
                }`}
              >
                <span>Pendente</span>
                <span>{formatBRL(totais.pendente)}</span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={() => navigate(`/planilha-vendas/${edicaoId}`)}>
          Abrir na planilha
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
};

export default PainelEstande;
