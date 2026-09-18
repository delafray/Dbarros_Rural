import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../UI";
import ClienteSelectorPopup from "../ClienteSelectorPopup";
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
  /** Grava cliente cadastrado (id) ou não cadastrado (nome livre) na linha; ausente = só leitura. */
  onSelecionarCliente?: (clienteId: string | null, nomeLivre: string | null) => void;
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
  onSelecionarCliente,
}) => {
  const navigate = useNavigate();
  const estilo = ESTILO_STATUS[status];
  const [popupCliente, setPopupCliente] = useState(false);
  const podeEditarCliente = !isVisitor && !!linha && !!onSelecionarCliente;
  // Mesma regra da planilha: linha com venda/opcionais pede confirmação antes de limpar o cliente.
  const linhaTemDados =
    !!linha &&
    ((!!linha.tipo_venda && linha.tipo_venda !== "DISPONÍVEL") ||
      Object.values((linha.opcionais_selecionados as Record<string, string>) || {}).some((v) => !!v));

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
        style={{
          background: estilo.piscaAte
            ? `linear-gradient(135deg, ${estilo.fill} 45%, ${estilo.piscaAte} 55%)`
            : estilo.fill,
          color: estilo.texto,
        }}
      >
        {estilo.label}
      </span>

      <div className="text-sm space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500">Cliente: </span>
          {clienteNome ? (
            <>
              <span className="font-semibold text-slate-800">{clienteNome}</span>
              {podeEditarCliente && (
                <button
                  type="button"
                  onClick={() => setPopupCliente(true)}
                  className="text-[11px] text-blue-600 hover:underline"
                  title="Trocar ou limpar o cliente deste estande"
                >
                  trocar
                </button>
              )}
            </>
          ) : podeEditarCliente ? (
            <button
              type="button"
              onClick={() => setPopupCliente(true)}
              className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-red-600 hover:bg-red-700 text-white shadow-sm"
              title="Escolher cliente cadastrado, não cadastrado ou limpar"
            >
              Selecionar cliente
            </button>
          ) : (
            <span className="font-semibold text-slate-800">—</span>
          )}
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

      {popupCliente && onSelecionarCliente && (
        <ClienteSelectorPopup
          currentClienteId={linha?.cliente_id}
          currentNomeLivre={linha?.cliente_nome_livre}
          currentClienteNome={clienteNome}
          rowHasData={linhaTemDados}
          onSelect={(clienteId, nomeLivre) => {
            onSelecionarCliente(clienteId, nomeLivre);
            setPopupCliente(false);
          }}
          onClose={() => setPopupCliente(false)}
        />
      )}
    </div>
  );
};

export default PainelEstande;
