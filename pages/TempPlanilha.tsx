import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useAppDialog } from "../context/DialogContext";
import { edicaoDocsService } from "../services/edicaoDocsService";
import { ImagemConfig } from "../services/imagensService";
import { Atendimento } from "../services/atendimentosService";
import { DocModal, DocModalState } from "../components/dashboard/DocModal";
import ClienteSelectorPopup from "../components/ClienteSelectorPopup";
import ResolucaoAtendimentoModal from "../components/ResolucaoAtendimentoModal";
import PlanilhaM2AvisoModal from "../components/planilha/PlanilhaM2AvisoModal";
import PlanilhaCompleteConfirmModal from "../components/planilha/PlanilhaCompleteConfirmModal";
import PlanilhaStatusModal from "../components/planilha/PlanilhaStatusModal";
import { usePlanilhaData } from "../hooks/usePlanilhaData";
import { usePlanilhaRealtime } from "../hooks/usePlanilhaRealtime";
import { usePlanilhaEditing } from "../hooks/usePlanilhaEditing";
import { usePlanilhaStatusModal } from "../hooks/usePlanilhaStatusModal";

const naturalSort = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const PlanilhaVendas: React.FC = () => {
  const { edicaoId } = useParams<{ edicaoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isVisitor = user?.isVisitor ?? false;
  const appDialog = useAppDialog();

  // ─── Data ───────────────────────────────────────────────────
  const data = usePlanilhaData(edicaoId, navigate);
  const {
    loading, config, edicao, rows, setRows, clientes, clienteMap, imagensConfig,
    statusMap, setStatusMap, recebimentosMap, setRecebimentosMap,
    categorias, opcionaisAtivos, comboLabels, comboNamesDisplay,
    atendimentoMap, getCategoriaOfRow, calculateRow, getComputedStatus, getImagensDoStand,
  } = data;

  // ─── Realtime ───────────────────────────────────────────────
  const { realtimeToast } = usePlanilhaRealtime(config?.id, setRows);

  // ─── Editing ────────────────────────────────────────────────
  const edit = usePlanilhaEditing(rows, setRows, appDialog);
  const {
    editing, setEditing, pendingAction, setPendingAction,
    editingM2, setEditingM2, m2AvisoModal, setM2AvisoModal,
    handleSelectCombo, handleToggleOpcional, handleUpdateField,
    handleClienteSelect, handleSaveM2,
  } = edit;

  // ─── Status Modal ──────────────────────────────────────────
  const sm = usePlanilhaStatusModal({
    rows, statusMap, setStatusMap, setRecebimentosMap, getImagensDoStand, appDialog,
  });
  const {
    statusModal, setStatusModal, modalRecebimentos, modalRecebLoading,
    handleToggleRecebimento, handleSaveModal, pendingCompleteConfirm, setPendingCompleteConfirm,
  } = sm;

  // ─── Local state ───────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [viewFilter, setViewFilter] = useState<'todos' | 'vendidos' | 'disponivel'>('todos');
  const [docModal, setDocModal] = useState<DocModalState>(null);
  const [popupRowId, setPopupRowId] = useState<string | null>(null);
  const [atendimentoModal, setAtendimentoModal] = useState<Atendimento | null>(null);

  // ─── Filtered + sorted rows ────────────────────────────────
  const filtered = useMemo(() => {
    const arr = rows.filter((r) => {
      if (viewFilter === 'vendidos' && r.tipo_venda === 'DISPONÍVEL') return false;
      if (viewFilter === 'disponivel' && r.tipo_venda !== 'DISPONÍVEL') return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        r.stand_nr.toLowerCase().includes(term) ||
        clienteMap.get(r.cliente_id ?? "")?.nome_fantasia?.toLowerCase().includes(term) ||
        clienteMap.get(r.cliente_id ?? "")?.razao_social?.toLowerCase().includes(term) ||
        r.cliente_nome_livre?.toLowerCase().includes(term)
      );
    });
    return arr.sort((a, b) => {
      const catA = getCategoriaOfRow(a);
      const catB = getCategoriaOfRow(b);
      const ordA = catA?.ordem ?? 0;
      const ordB = catB?.ordem ?? 0;
      if (ordA !== ordB) return ordA - ordB;
      if (catA && catB) {
        const idxA = categorias.findIndex((c) => c === catA);
        const idxB = categorias.findIndex((c) => c === catB);
        if (idxA !== idxB) return idxA - idxB;
      }
      return naturalSort(a.stand_nr, b.stand_nr);
    });
  }, [rows, clienteMap, searchTerm, viewFilter, getCategoriaOfRow, categorias]);

  // ─── Summary ───────────────────────────────────────────────
  const summary = useMemo(() => {
    const comboXCounts: Record<string, number> = {};
    const comboStarCounts: Record<string, number> = {};
    const optCounts: Record<string, number> = {};
    comboLabels.forEach((l) => { comboXCounts[l] = 0; comboStarCounts[l] = 0; });
    opcionaisAtivos.forEach((o) => { optCounts[o.nome] = 0; });
    rows.forEach((row) => {
      const tipo = row.tipo_venda;
      if (tipo !== "DISPONÍVEL") {
        const isStar = tipo.endsWith("*");
        const baseLabel = tipo.replace("*", "").trim();
        if (isStar) comboStarCounts[baseLabel] = (comboStarCounts[baseLabel] || 0) + 1;
        else comboXCounts[baseLabel] = (comboXCounts[baseLabel] || 0) + 1;
      }
      const sel = (row.opcionais_selecionados as Record<string, string>) || {};
      opcionaisAtivos.forEach((opt) => {
        const val = sel[opt.nome];
        if (val === "x" || val === "*") optCounts[opt.nome] = (optCounts[opt.nome] || 0) + 1;
      });
    });
    return { comboXCounts, comboStarCounts, optCounts };
  }, [rows, comboLabels, opcionaisAtivos]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const c = calculateRow(row);
          acc.subTotal += c.subTotal;
          acc.desconto += c.desconto > 0 ? c.desconto : 0;
          acc.totalVenda += c.totalVenda;
          acc.valorPago += c.valorPago;
          acc.pendente += c.pendente;
          return acc;
        },
        { subTotal: 0, desconto: 0, totalVenda: 0, valorPago: 0, pendente: 0 },
      ),
    [rows, calculateRow],
  );

  // ─── Loading ───────────────────────────────────────────────
  if (loading)
    return (
      <Layout title="Planilha">
        <div className="p-8 text-center">Carregando dados da planilha...</div>
      </Layout>
    );

  const thStyle =
    "border border-slate-300 px-1 py-1 text-[11px] font-normal uppercase whitespace-nowrap text-white text-center bg-[#1F497D]";
  const tdStyle =
    "border border-slate-300 text-[12px] px-2 py-0 whitespace-nowrap";

  const formatPeriodo = (ini: string | null, fim: string | null): string => {
    if (!ini) return '';
    const d1 = new Date(ini);
    const dia1 = String(d1.getUTCDate()).padStart(2, '0');
    const mes1 = String(d1.getUTCMonth() + 1).padStart(2, '0');
    if (!fim) return `${dia1}/${mes1}`;
    const d2 = new Date(fim);
    const dia2 = String(d2.getUTCDate()).padStart(2, '0');
    const mes2 = String(d2.getUTCMonth() + 1).padStart(2, '0');
    if (mes1 === mes2) return `${dia1}–${dia2}/${mes1}`;
    return `${dia1}/${mes1}–${dia2}/${mes2}`;
  };
  const periodo = edicao ? formatPeriodo(edicao.data_inicio, edicao.data_fim) : '';

  return (
    <Layout
      title={edicao ? `Planilha :: ${edicao.titulo}${periodo ? ` · ${periodo}` : ''}` : "Planilha de Vendas"}
      headerActions={
        <div className="flex gap-2 items-center">
          {isVisitor ? (
            <div className="flex gap-2">
              {edicao?.proposta_comercial_path && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-violet-600 border-violet-200 hover:bg-violet-50"
                  onClick={() => {
                    const url = edicaoDocsService.getPublicUrl(edicao.proposta_comercial_path!);
                    setDocModal({ tipo: 'proposta_comercial', url, edicaoTitulo: edicao.titulo });
                  }}
                >
                  📄 Proposta
                </Button>
              )}
              {edicao?.planta_baixa_path && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-teal-600 border-teal-200 hover:bg-teal-50"
                  onClick={() => {
                    const url = edicaoDocsService.getPublicUrl(edicao.planta_baixa_path!);
                    setDocModal({ tipo: 'planta_baixa', url, edicaoTitulo: edicao.titulo });
                  }}
                >
                  🗺️ Planta
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate(`/atendimentos/${edicaoId}`)}>
                📋 Atendimentos
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`/configuracao-vendas/${edicaoId}`)}>
                ⚙️ Setup
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/controle-imagens', { state: { edicaoId } })}>
                🖼 Controle de Imagens
              </Button>
            </>
          )}
          {/* Filtro de status */}
          <div className="flex border border-slate-200 rounded overflow-hidden text-xs font-bold">
            {(['todos', 'vendidos', 'disponivel'] as const).map((f) => {
              const labels = { todos: 'Todos', vendidos: 'Vendidos', disponivel: 'Disponível' };
              const active = viewFilter === f;
              const colors = {
                todos: active ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50',
                vendidos: active ? 'bg-green-700 text-white' : 'bg-white text-green-700 hover:bg-green-50',
                disponivel: active ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
              };
              return (
                <button
                  key={f}
                  onClick={() => setViewFilter(f)}
                  className={`px-3 py-1.5 transition-colors border-r last:border-r-0 border-slate-200 ${colors[f]}`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="Buscar estande ou cliente..."
            className="px-3 py-1.5 border rounded text-sm w-56"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      }
    >
      {/* Modal de aviso: m² alterado */}
      {m2AvisoModal && <PlanilhaM2AvisoModal onClose={() => setM2AvisoModal(false)} />}

      {/* Modal de confirmação: COMPLETO com imagens pendentes */}
      {pendingCompleteConfirm && statusModal && (
        <PlanilhaCompleteConfirmModal
          imgTotal={pendingCompleteConfirm.imgTotal}
          imgRecebidas={pendingCompleteConfirm.imgRecebidas}
          onCancel={() => setPendingCompleteConfirm(null)}
          onConfirm={handleSaveModal}
        />
      )}

      {/* Realtime update toast */}
      {realtimeToast && (
        <div
          className="fixed bottom-5 right-5 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white"
          style={{ background: "#1e293b", opacity: 0.92 }}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Atualizado por outro usuário
        </div>
      )}

      <div
        className="overflow-x-auto overflow-y-auto bg-white shadow-xl rounded-lg border border-slate-200 select-none w-full"
        style={{ maxHeight: "calc(100vh - 80px)" }}
      >
        <table className="border-collapse text-[11px] font-sans select-none w-full">
          <thead className="sticky top-0 z-10 shadow-sm">
            {/* ── Row 1: Summary Titles ── */}
            <tr className="bg-slate-900 text-white">
              <th colSpan={2} className="border border-white/10 px-2 py-1 text-left text-[11px] font-black tracking-widest text-slate-400 uppercase whitespace-nowrap">
                Resumo Geral
              </th>
              {comboLabels.map((l) => (
                <th key={l} className="border border-white/10 text-[8px] text-slate-500 font-normal uppercase leading-none overflow-hidden max-w-[24px]"></th>
              ))}
              {opcionaisAtivos.map((o) => (
                <th key={o.id} className="border border-white/10 text-[8px] text-slate-500 font-normal uppercase leading-none overflow-hidden max-w-[24px]"></th>
              ))}
              <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-slate-400 font-bold uppercase">SubTotal</th>
              <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-yellow-500/90 font-bold uppercase">Desconto</th>
              <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-white font-bold uppercase bg-slate-800/40">Total</th>
              {!isVisitor && <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-green-400 font-bold uppercase bg-slate-800/40">Pago</th>}
              {!isVisitor && <th className="border border-white/10 px-2 py-1 text-center text-[11px] text-red-400 font-bold uppercase bg-slate-800/40">Pendente</th>}
              <th className="border border-white/10 bg-violet-900/20" />
              <th className="border border-white/10 bg-violet-900/30" />
              <th className="border border-white/10 bg-violet-900/30" />
            </tr>

            {/* ── Row 2: Summary Values ── */}
            <tr className="bg-slate-800 text-slate-300">
              <th className="border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-tighter text-center">
                <div className="text-[8px] text-slate-500 font-normal leading-none">stands</div>
                <div className="text-[13px] font-black text-white leading-none">
                  {rows.filter((r) => getCategoriaOfRow(r)?.is_stand !== false).length}
                </div>
              </th>
              <th className="border border-white/10 px-2 py-0.5 text-center">
                {(() => {
                  const standRows = rows.filter((r) => getCategoriaOfRow(r)?.is_stand !== false);
                  const vendidos = standRows.filter((r) => r.tipo_venda !== 'DISPONÍVEL').length;
                  const total = standRows.length;
                  const pct = total > 0 ? Math.round((vendidos / total) * 100) : 0;
                  return (
                    <span className="text-[8px] font-black uppercase tracking-tight text-slate-400">
                      Vendas{' '}
                      <span className="text-slate-200 text-[10px]">{vendidos}</span>
                      {' '}de{' '}
                      <span className="text-slate-200 text-[10px]">{total}</span>
                      {'   '}
                      <span className="text-slate-400 text-[9px]">({pct}%)</span>
                    </span>
                  );
                })()}
              </th>
              {comboLabels.map((label) => {
                const x = summary.comboXCounts[label] || 0;
                const s = summary.comboStarCounts[label] || 0;
                return (
                  <th key={label} className="border border-white/10 px-1 py-0.5 text-center text-[10px] font-mono text-green-400 font-bold">
                    {x + s}
                  </th>
                );
              })}
              {opcionaisAtivos.map((o) => (
                <th key={o.id} className="border border-white/10 px-1 py-0.5 text-center text-[10px] text-green-400 font-mono font-bold">
                  {summary.optCounts[o.nome] || 0}
                </th>
              ))}
              <th className={`${thStyle} text-right font-mono`}>{formatMoney(totals.subTotal)}</th>
              <th className={`${thStyle} text-right font-mono text-yellow-400`}>{formatMoney(totals.desconto)}</th>
              <th className={`${thStyle} text-right font-mono font-black text-white bg-slate-700/60 text-[12px]`}>{formatMoney(totals.totalVenda)}</th>
              {!isVisitor && <th className={`${thStyle} text-right font-mono font-black text-green-400 bg-slate-700/60 text-[12px]`}>{formatMoney(totals.valorPago)}</th>}
              {!isVisitor && <th className={`${thStyle} text-right font-mono font-black text-red-400 bg-slate-700/60 text-[12px]`}>{formatMoney(totals.pendente)}</th>}
              <th className="border border-white/10 bg-violet-900/20" />
              <th className="border border-white/10 bg-violet-900/30" />
              <th className="border border-white/10 bg-violet-900/30" />
            </tr>

            {/* ── Row 3: Column headers ── */}
            <tr className="bg-[#1F497D]">
              <th className={`${thStyle} w-16`}>Stand</th>
              <th className={`${thStyle} min-w-[180px]`}>Cliente</th>
              {comboLabels.map((label) => (
                <th key={label} className={`${thStyle} w-6 p-0 font-normal`} title={label} style={{ verticalAlign: 'bottom' }}>
                  <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: comboNamesDisplay[label].length > 10 ? '7px' : '8px', lineHeight: 1, padding: '4px 2px', textAlign: 'left', display: 'block' }}>
                    {comboNamesDisplay[label]}
                  </div>
                </th>
              ))}
              {opcionaisAtivos.map((opt) => (
                <th key={opt.id} className={`${thStyle} w-6 p-0 font-normal`} style={{ verticalAlign: 'bottom' }}>
                  <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: opt.nome.length > 10 ? '7px' : '8px', lineHeight: 1, padding: '4px 2px', textAlign: 'left', display: 'block' }}>
                    {opt.nome}
                  </div>
                </th>
              ))}
              <th className={thStyle}>SubTotal</th>
              <th className={thStyle}>Desconto</th>
              <th className={thStyle}>Total</th>
              {!isVisitor && <th className={`${thStyle} bg-[#385723]`}>PAGO</th>}
              {!isVisitor && <th className={`${thStyle} bg-[#C00000]`}>PENDENTE</th>}
              {!isVisitor && <th className={`${thStyle} w-20 bg-violet-900/60`} title="Status de recebimento de imagens">Imagens</th>}
              {!isVisitor && <th className={`${thStyle} w-px whitespace-nowrap bg-violet-900/60 px-2`}>Cliente</th>}
              <th className={`${thStyle} w-px whitespace-nowrap bg-violet-900/60`}>Contato</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((row) => {
              const cat = getCategoriaOfRow(row);
              const calc = calculateRow(row);
              const sel = (row.opcionais_selecionados as Record<string, string>) || {};

              return (
                <tr key={row.id} className={`${cat?.cor || "bg-white"} border-b border-slate-300 hover:brightness-95`}>
                  {/* Stand nº */}
                  <td className={`${tdStyle} px-1 py-0 align-middle w-[90px] min-w-[90px] max-w-[90px]`}>
                    <div className="flex items-center gap-1 leading-none">
                      <div className="flex flex-col items-start shrink-0" style={{ lineHeight: 1 }}>
                        {cat?.tag && (
                          <span className="text-[7px] text-slate-500/80 font-normal uppercase tracking-tighter pointer-events-none">{cat.tag}</span>
                        )}
                        {cat?.tipo_precificacao === 'area_livre' && (
                          editingM2?.id === row.id ? (
                            <input
                              autoFocus
                              type="text"
                              inputMode="numeric"
                              value={editingM2.val}
                              onChange={(e) => setEditingM2({ id: row.id, val: e.target.value.replace(/[^0-9.]/g, "") })}
                              onBlur={() => handleSaveM2(row.id, editingM2.val)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveM2(row.id, editingM2.val);
                                if (e.key === "Escape") setEditingM2(null);
                              }}
                              className="w-10 text-[8px] font-black text-slate-700 border-b border-amber-400 bg-transparent focus:outline-none text-center"
                            />
                          ) : (
                            <span
                              className="text-[8px] font-black text-slate-600 cursor-pointer hover:text-amber-700 hover:underline"
                              title="Clique para editar m²"
                              onClick={() => !isVisitor && setEditingM2({ id: row.id, val: String(row.area_m2 ?? "") })}
                            >
                              {row.area_m2 != null ? String(row.area_m2) : "—"}
                            </span>
                          )
                        )}
                      </div>
                      <span className="flex-1 text-center font-bold text-[11px] whitespace-nowrap">
                        {cat?.prefix?.trim()
                          ? row.stand_nr
                          : row.stand_nr.replace(new RegExp(`^${cat?.tag ?? ""}\\s*`, "i"), "").trim()}
                      </span>
                    </div>
                  </td>

                  {/* Cliente */}
                  <td
                    className={`${tdStyle} min-w-[200px] ${isVisitor ? '' : 'cursor-pointer'} group px-2`}
                    onClick={() => !isVisitor && setPopupRowId(row.id)}
                    title={isVisitor ? undefined : "Clique para selecionar cliente"}
                  >
                    {(() => {
                      const cliente = clienteMap.get(row.cliente_id ?? "");
                      if (cliente) {
                        const nomeExibir = cliente.nome_fantasia || (cliente.tipo_pessoa === "PJ" ? cliente.razao_social : cliente.nome_completo);
                        return <span className="font-bold text-slate-900 truncate block">{nomeExibir}</span>;
                      }
                      if (row.cliente_nome_livre) return <span className="text-amber-900 font-black italic truncate block">{row.cliente_nome_livre}</span>;
                      return <span className="text-slate-400 italic text-[11px] group-hover:text-blue-500 transition-colors uppercase">Disponível</span>;
                    })()}
                  </td>

                  {/* Combo columns */}
                  {comboLabels.map((label) => {
                    const isX = row.tipo_venda === label;
                    const isStar = row.tipo_venda === label + "*";
                    const isPending = pendingAction?.rowId === row.id && pendingAction?.field === label;
                    return (
                      <td
                        key={label}
                        className={`${tdStyle} text-center font-black select-none w-6 h-5 leading-none px-0
                          ${!isVisitor ? "cursor-pointer" : ""}
                          ${isPending ? "!bg-slate-400 !text-white"
                            : isX ? "!bg-[#00B050] !text-white ring-1 ring-inset ring-black/10"
                            : isStar ? "!bg-[#00B0F0] !text-white ring-1 ring-inset ring-black/10"
                            : "!bg-white hover:bg-blue-100/50 text-transparent"}`}
                        onClick={() => {
                          if (isVisitor) return;
                          if (isPending) { handleSelectCombo(row.id, label); setPendingAction(null); }
                          else { setPendingAction({ rowId: row.id, field: label }); }
                        }}
                        title={isPending ? "Clique novamente para confirmar" : isX ? `${comboNamesDisplay[label]} (clique para cortesia)` : isStar ? `${comboNamesDisplay[label]} - Cortesia (clique para limpar)` : comboNamesDisplay[label]}
                      >
                        <span className="flex items-center justify-center w-full h-full text-[11px]">
                          {isPending ? "?" : isX ? "x" : isStar ? "*" : ""}
                        </span>
                      </td>
                    );
                  })}

                  {/* Optional columns */}
                  {opcionaisAtivos.map((opt) => {
                    const status = sel[opt.nome] || "";
                    const isPending = pendingAction?.rowId === row.id && pendingAction?.field === opt.nome;
                    return (
                      <td
                        key={opt.id}
                        className={`${tdStyle} text-center font-black w-6 h-5 leading-none select-none px-0
                          ${!isVisitor ? "cursor-pointer" : ""}
                          ${isPending ? "!bg-slate-400 !text-white"
                            : status === "x" ? "!bg-[#00B050] !text-white ring-1 ring-inset ring-black/10"
                            : status === "*" ? "!bg-[#00B0F0] !text-white ring-1 ring-inset ring-black/10"
                            : "!bg-white hover:bg-slate-100/50 text-transparent"}`}
                        onClick={() => {
                          if (isVisitor) return;
                          if (isPending) { handleToggleOpcional(row.id, opt.nome); setPendingAction(null); }
                          else { setPendingAction({ rowId: row.id, field: opt.nome }); }
                        }}
                        title={isPending ? "Clique novamente para confirmar" : opt.nome}
                      >
                        <span className="flex items-center justify-center w-full h-full text-[11px]">
                          {isPending ? "?" : status}
                        </span>
                      </td>
                    );
                  })}

                  {/* Sub Total */}
                  <td className={`${tdStyle} px-2 py-0 text-right font-mono font-bold bg-[#D9E1F2]/50 whitespace-nowrap text-slate-700`}>
                    {formatMoney(calc.subTotal)}
                  </td>

                  {/* Desconto */}
                  <td
                    className={`${tdStyle} px-2 py-0 text-right font-mono bg-white group ${!isVisitor ? "cursor-pointer" : ""}`}
                    onClick={() => {
                      if (isVisitor) return;
                      if (!(editing?.id === row.id && editing?.field === "desconto"))
                        setEditing({ id: row.id, field: "desconto", val: String(row.desconto || "") });
                    }}
                    title={isVisitor ? undefined : "Clique para editar"}
                  >
                    {editing?.id === row.id && editing?.field === "desconto" ? (
                      <input
                        autoFocus
                        type="text"
                        className="w-full bg-slate-100 text-right font-mono outline-none border-b border-red-400 min-w-[70px] px-1"
                        value={editing.val}
                        onChange={(e) => setEditing({ ...editing, val: e.target.value })}
                        onBlur={() => {
                          const parsed = Number(editing?.val.replace(",", "."));
                          const num = isNaN(parsed) ? 0 : parsed;
                          handleUpdateField(row.id, "desconto", num);
                          setEditing(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                      />
                    ) : (
                      <span className={`group-hover:text-blue-500 transition-colors ${(row.desconto || 0) > 0 ? "text-yellow-600 font-bold" : "text-slate-400"}`}>
                        {formatMoney(row.desconto ?? 0)}
                      </span>
                    )}
                  </td>

                  {/* Total Vendas */}
                  <td className={`${tdStyle} text-right font-mono font-black text-[12px] bg-[#D9E1F2]/60 text-slate-900`}>
                    {formatMoney(calc.totalVenda)}
                  </td>

                  {/* Valor Pago */}
                  {!isVisitor && (
                    <td
                      className={`${tdStyle} px-2 py-0 text-right font-mono text-[12px] bg-green-50/60 group cursor-pointer`}
                      onClick={() => {
                        if (!(editing?.id === row.id && editing?.field === "valor_pago"))
                          setEditing({ id: row.id, field: "valor_pago", val: String(row.valor_pago || "") });
                      }}
                      title="Clique para editar"
                    >
                      {editing?.id === row.id && editing?.field === "valor_pago" ? (
                        <input
                          autoFocus
                          type="text"
                          className="w-full bg-slate-100 text-right font-mono outline-none border-b border-green-500 font-bold px-1 min-w-[70px]"
                          value={editing.val}
                          onChange={(e) => setEditing({ ...editing, val: e.target.value })}
                          onBlur={() => {
                            const parsed = Number(editing?.val.replace(",", "."));
                            const num = isNaN(parsed) ? 0 : parsed;
                            handleUpdateField(row.id, "valor_pago", num);
                            setEditing(null);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                        />
                      ) : (
                        <span className="text-green-900 font-bold group-hover:text-blue-500 transition-colors">
                          {formatMoney(row.valor_pago ?? 0)}
                        </span>
                      )}
                    </td>
                  )}

                  {/* Pendente */}
                  {!isVisitor && (
                    <td className={`${tdStyle} text-right font-mono font-black text-[12px] ${calc.pendente > 0 ? "text-red-600 bg-red-50/30" : calc.pendente < 0 ? "text-blue-600" : "text-slate-300"}`}>
                      {formatMoney(calc.pendente)}
                    </td>
                  )}

                  {/* Imagens status */}
                  {(() => {
                    if (isVisitor) return null;
                    const hasCliente = row.cliente_id || row.cliente_nome_livre;
                    if (!hasCliente) return <td className={`${tdStyle} w-20 text-center`} />;
                    const computed = getComputedStatus(row);
                    const imgDoStand = getImagensDoStand(row);
                    const rowRec = recebimentosMap[row.id] || {};
                    const receivedCount = imgDoStand.filter((c: ImagemConfig) => rowRec[c.id]).length;
                    const todasRecebidas = computed === "solicitado" && imgDoStand.length > 0 && receivedCount === imgDoStand.length;
                    const badgeConfig = {
                      sem_config: { label: "Sem config", cls: "bg-slate-100 text-slate-400 border-slate-200" },
                      pendente: { label: "Pendente", cls: "bg-yellow-100 text-yellow-700 border-yellow-300 cursor-pointer hover:bg-yellow-200" },
                      solicitado: {
                        label: "Solicitado",
                        cls: todasRecebidas
                          ? "bg-green-100 text-green-800 border-green-400 cursor-pointer hover:bg-green-200"
                          : "bg-blue-100 text-blue-700 border-blue-300 cursor-pointer hover:bg-blue-200",
                      },
                      completo: { label: "Completo", cls: "bg-green-100 text-green-700 border-green-300 cursor-pointer hover:bg-green-200" },
                    }[computed];
                    return (
                      <td className={`${tdStyle} w-20 text-center px-1`}>
                        <button
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border rounded-sm transition-colors w-full ${badgeConfig.cls}`}
                          onClick={() => computed !== "sem_config" && setStatusModal({ rowId: row.id, obs: statusMap[row.id]?.observacoes || "" })}
                          title={computed === "sem_config" ? "Configure imagens na tela de Setup" : "Clique para atualizar status"}
                        >
                          {badgeConfig.label}
                          {imgDoStand.length > 0 && <span className="ml-1">{receivedCount}/{imgDoStand.length}</span>}
                        </button>
                      </td>
                    );
                  })()}

                  {/* Cadastro */}
                  {!isVisitor && (
                    <td className={`${tdStyle} w-px text-center px-1 bg-violet-50/30`}>
                      {row.cliente_id && clienteMap.has(row.cliente_id) ? (
                        <button
                          onClick={() => navigate(`/clientes/editar/${row.cliente_id}`)}
                          className="text-violet-700 hover:text-violet-900 hover:underline text-[10px] font-bold transition-colors whitespace-nowrap"
                          title="Abrir cadastro do cliente"
                        >
                          Abrir
                        </button>
                      ) : (
                        <span className="text-slate-200 text-[10px]">—</span>
                      )}
                    </td>
                  )}

                  {/* Contato */}
                  <td className={`${tdStyle} w-px text-center px-1 bg-violet-50/30`}>
                    {row.cliente_id && atendimentoMap[row.cliente_id] ? (
                      <button
                        onClick={() => setAtendimentoModal(atendimentoMap[row.cliente_id])}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-[10px] font-bold transition-colors whitespace-nowrap"
                        title="Ver histórico de atendimento"
                      >
                        Histórico
                      </button>
                    ) : (
                      <span className="text-slate-200 text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5 + comboLabels.length + opcionaisAtivos.length + 5} className="py-8 text-center text-slate-400">
                  {rows.length === 0 ? "Nenhum estande gerado. Vá em ⚙️ Setup para configurar e gerar a planilha." : "Nenhum resultado para a busca."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`.vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; }`}</style>

      {popupRowId && (() => {
        const popupRow = rows.find((r) => r.id === popupRowId);
        const popupCliente = popupRow?.cliente_id ? clienteMap.get(popupRow.cliente_id) : undefined;
        const popupClienteNome = popupCliente
          ? (popupCliente.tipo_pessoa === 'PJ' ? (popupCliente.razao_social || popupCliente.nome_fantasia) : popupCliente.nome_completo) || null
          : null;
        const rowHasData = !!popupRow && (
          (!!popupRow.tipo_venda && popupRow.tipo_venda !== 'DISPONÍVEL') ||
          Object.values((popupRow.opcionais_selecionados as Record<string, string>) || {}).some(v => !!v)
        );
        return (
          <ClienteSelectorPopup
            currentClienteId={popupRow?.cliente_id}
            currentNomeLivre={popupRow?.cliente_nome_livre}
            currentClienteNome={popupClienteNome}
            rowHasData={rowHasData}
            onSelect={(clienteId, nomeLivre) => handleClienteSelect(popupRowId, clienteId, nomeLivre)}
            onClose={() => setPopupRowId(null)}
          />
        );
      })()}

      {/* Modal de Histórico de Atendimento */}
      {atendimentoModal && (
        <ResolucaoAtendimentoModal
          atendimento={atendimentoModal}
          onClose={() => setAtendimentoModal(null)}
          onSuccess={() => setAtendimentoModal(null)}
          readOnly={isVisitor}
        />
      )}

      {/* Modal de Status de Imagens */}
      {statusModal && (() => {
        const row = rows.find((r) => r.id === statusModal.rowId);
        if (!row) return null;
        return (
          <PlanilhaStatusModal
            statusModal={statusModal}
            row={row}
            imagens={getImagensDoStand(row)}
            statusMap={statusMap}
            clientes={clientes}
            modalRecebimentos={modalRecebimentos}
            modalRecebLoading={modalRecebLoading}
            onClose={() => setStatusModal(null)}
            onObsChange={(obs) => setStatusModal((p) => p ? { ...p, obs } : null)}
            onToggleRecebimento={handleToggleRecebimento}
            onSave={handleSaveModal}
          />
        );
      })()}

      {/* Modal de Documento (Proposta / Planta) */}
      {docModal && <DocModal docModal={docModal} onClose={() => setDocModal(null)} />}
    </Layout>
  );
};

export default PlanilhaVendas;
