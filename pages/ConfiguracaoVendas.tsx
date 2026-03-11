import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAppDialog } from "../context/DialogContext";
import { CategoriaSetup } from "../services/planilhaVendasService";
import { AvulsoStatus } from "../services/imagensService";
import CurrencyField from "../components/CurrencyField";
import { useDirtyState } from "../hooks/useDirtyState";
import { useConfigData } from "../hooks/useConfigData";
import { useConfigOpcionais } from "../hooks/useConfigOpcionais";
import { useConfigImagens } from "../hooks/useConfigImagens";
import { useConfigSave } from "../hooks/useConfigSave";
import ConfigImagensModal from "../components/config/ConfigImagensModal";
import ConfigOpcionaisPopup from "../components/config/ConfigOpcionaisPopup";

const ConfiguracaoVendas: React.FC = () => {
  const { edicaoId } = useParams<{ edicaoId: string }>();
  const navigate = useNavigate();
  const appDialog = useAppDialog();

  const {
    isDirty, showDirtyModal,
    markDirty, markClean,
    guardAction: guardNavigation,
    confirmDiscard, cancelDiscard,
  } = useDirtyState();

  // ─── Data + Categories ──────────────────────────────────────
  const data = useConfigData(edicaoId, markDirty);
  const {
    categorias, setCategorias, numCombos, comboNames, loading, saving, setSaving,
    configId, setConfigId, savedCounts, setSavedCounts, planilhaExiste, setPlanilhaExiste,
    totalStands, setTotalStands, savedTags, setSavedTags, alCategoriesWithData,
    opcionaisDisponiveis, opcionaisSelecionados, setOpcionaisSelecionados,
    opcionaisPrecos, setOpcionaisPrecos, opcionaisNomes, setOpcionaisNomes,
    opcionaisUsados, salvosOk, setSalvosOk,
    imagensConfig, setImagensConfig,
    totalEstandes, itensAtivos,
    updateCat, updateCombo, updateComboAdicional, addCombo, removeCombo,
    handleComboNameChange, addCategoria,
  } = data;

  // ─── Opcionais ──────────────────────────────────────────────
  const opc = useConfigOpcionais({
    configId, edicaoId, opcionaisDisponiveis,
    opcionaisSelecionados, setOpcionaisSelecionados,
    opcionaisPrecos, setOpcionaisPrecos,
    opcionaisNomes, setOpcionaisNomes,
    opcionaisUsados, salvosOk, setSalvosOk,
    appDialog,
  });

  // ─── Imagens ────────────────────────────────────────────────
  const img = useConfigImagens({ edicaoId, imagensConfig, setImagensConfig, appDialog });

  // ─── Save / Generate ────────────────────────────────────────
  const sav = useConfigSave({
    edicaoId, categorias, configId, setConfigId,
    savedTags, setSavedTags, savedCounts, setSavedCounts,
    planilhaExiste, setPlanilhaExiste, totalStands, setTotalStands,
    saving, setSaving, comboNames,
    opcionaisSelecionados, opcionaisNomes, opcionaisPrecos,
    markClean, navigate, appDialog,
  });

  const handleRemoveCategoria = async (idx: number) => {
    const canRemove = await sav.removeCategoria(idx);
    if (canRemove) {
      setCategorias((prev) => prev.filter((_, i) => i !== idx));
      markDirty();
    }
  };

  if (loading)
    return (
      <Layout title="Configuração">
        <div className="p-8 text-center text-slate-500">Carregando...</div>
      </Layout>
    );

  return (
    <Layout title="Estruturar Planilha de Vendas">
      {/* Modal de alterações não salvas */}
      {showDirtyModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 bg-amber-50 border-b border-amber-200">
              <h2 className="font-black text-slate-800">Alterações não salvas</h2>
              <p className="text-sm text-amber-700 mt-1">Você tem alterações não salvas. Deseja sair sem salvar?</p>
            </div>
            <div className="flex gap-3 px-6 py-4 justify-end bg-slate-50">
              <button onClick={cancelDiscard} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Ficar aqui</button>
              <button onClick={confirmDiscard} className="px-4 py-2 text-sm font-black text-white bg-red-600 rounded-lg hover:bg-red-700">Sair sem salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 pb-32 space-y-6">
        {/* Status banner */}
        {planilhaExiste ? (
          <div className="border-l-4 border-amber-500 bg-amber-50 px-5 py-3 flex items-start gap-3">
            <span className="text-xl mt-0.5">⚠️</span>
            <div>
              <p className="font-bold text-amber-800 text-sm">Planilha já gerada — {totalStands} estandes ativos</p>
              <p className="text-amber-700 text-xs mt-0.5">Você pode editar preços e opcionais e salvar. Para gerar nova planilha, limpe os dados primeiro.</p>
            </div>
          </div>
        ) : (
          <div className="border-l-4 border-blue-500 bg-blue-50 px-5 py-3">
            <p className="font-bold text-blue-800 text-sm">Nenhuma planilha gerada ainda</p>
            <p className="text-blue-700 text-xs mt-0.5">Configure abaixo, salve e clique em "Gerar Planilha".</p>
          </div>
        )}

        {/* ── Categorias / Preços ── */}
        <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <span className="font-bold text-sm uppercase tracking-wider">Estrutura de Estandes e Preços</span>
                <span className="ml-3 text-slate-400 text-xs">{totalEstandes} stand(s) no total</span>
              </div>
              {configId && categorias.filter(c => c.tipo_precificacao === 'area_livre').map((cat) => (
                <button key={cat.tag} onClick={() => sav.handleNavigateToAL(cat)} className="text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 transition-colors shadow-sm whitespace-nowrap">
                  Configurar Área Livre
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={addCombo} className="text-xs font-black bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 transition-colors shadow-sm">+ Adicionar Combo</button>
              <div className="w-3" />
              <button onClick={removeCombo} disabled={numCombos === 0} className={`text-xs font-black px-3 py-1.5 text-white transition-colors ${numCombos === 0 ? "bg-red-800/40 cursor-not-allowed" : "bg-red-700 hover:bg-red-600"}`}>− Remover Combo</button>
              <div className="w-px bg-slate-600 mx-1" />
              <button onClick={addCategoria} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 font-bold transition-colors">+ Categoria</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-1 text-center text-[11px] font-bold uppercase text-slate-500 w-16 border border-slate-200">Ord.</th>
                  <th className="px-4 py-1 text-left text-[11px] font-bold uppercase text-slate-500 w-28 border border-slate-200">Tag</th>
                  <th className="px-4 py-1 text-left text-[11px] font-bold uppercase text-slate-500 w-36 border border-slate-200">Prefixo</th>
                  <th className="px-4 py-1 text-center text-[11px] font-bold uppercase text-slate-500 w-20 border border-slate-200">Qtd.</th>
                  <th className="px-2 py-1 text-center text-[11px] font-bold uppercase text-amber-600 w-16 border border-slate-200" title="Categoria de Área Livre (venda por m²)">AL?</th>
                  <th className="px-4 py-1 text-right text-[11px] font-bold uppercase text-slate-500 w-32 border border-slate-200">Base / R$/m²</th>
                  {Array.from({ length: numCombos }).map((_, i) => (
                    <th key={i} className="px-2 py-1 text-center text-[11px] font-bold uppercase text-blue-600 min-w-[100px] border border-slate-200">
                      <input
                        type="text"
                        className="w-full text-center bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none placeholder:text-blue-300 transition-colors uppercase text-blue-700"
                        value={comboNames[i] || ""}
                        onChange={(e) => handleComboNameChange(i, e.target.value)}
                        placeholder={`COMBO ${String(i + 1).padStart(2, "0")}`}
                        title="Clique para editar o Nome/Fantasia deste combo na Planilha"
                      />
                    </th>
                  ))}
                  <th className="px-2 py-1 text-center text-[11px] font-bold uppercase text-slate-500 w-16 border border-slate-200" title="Indica se esta categoria conta como stand na contagem total">Stand?</th>
                  <th className="px-2 py-1 text-center text-[11px] font-bold uppercase text-violet-600 w-20 border border-slate-200">Imagens</th>
                  <th className="w-8 border border-slate-200" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...categorias]
                  .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
                  .map((cat) => {
                    const idx = categorias.indexOf(cat);
                    const isReducing = savedCounts[cat.prefix] && cat.count < savedCounts[cat.prefix];
                    return (
                      <tr key={idx} className={`${cat.cor} hover:brightness-95 transition-all`}>
                        <td className="px-2 py-0.5 border border-slate-200">
                          <input type="number" className="w-full p-1 border border-black/10 font-mono font-bold text-[12px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-center" value={cat.ordem ?? 0} onChange={(e) => updateCat(idx, "ordem", e.target.value)} />
                        </td>
                        <td className="px-2 py-0.5 border border-slate-200">
                          <input className="w-full p-1 border border-black/10 font-mono text-[12px] uppercase bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-bold" value={cat.tag} onChange={(e) => updateCat(idx, "tag", e.target.value)} placeholder="NAMING" />
                        </td>
                        <td className="px-2 py-0.5 border border-slate-200">
                          <input className="w-full p-1 border border-black/10 font-black text-[13px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-center" value={cat.prefix} onChange={(e) => updateCat(idx, "prefix", e.target.value)} />
                        </td>
                        <td className="px-2 py-0.5 border border-slate-200">
                          <div className="flex flex-col items-center">
                            <input type="number" min="0" className={`w-14 p-1 border text-center font-black text-[14px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 block ${isReducing ? "border-amber-400 focus:ring-amber-400 bg-amber-50" : "border-black/10 focus:ring-slate-400"}`} value={cat.count} onChange={(e) => updateCat(idx, "count", e.target.value)} />
                            {isReducing && <span className="text-[8px] text-amber-700 font-bold uppercase tracking-tighter">era {savedCounts[cat.prefix]}</span>}
                          </div>
                        </td>
                        {/* Toggle Área Livre */}
                        <td className="px-1 py-0.5 text-center border border-slate-200">
                          {(() => {
                            const isAL = cat.tipo_precificacao === 'area_livre';
                            const hasData = alCategoriesWithData.has(cat.tag);
                            return (
                              <label className={`flex items-center justify-center gap-1 ${hasData ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`} title={hasData ? 'Categoria com dados AL. Acesse a Planilha AL para desmarcar.' : 'Marcar como Área Livre (venda por m²)'}>
                                <input
                                  type="checkbox"
                                  checked={isAL}
                                  disabled={hasData}
                                  onChange={async (e) => {
                                    if (e.target.checked) {
                                      const outraComDados = categorias.find((c, i) => i !== idx && c.tipo_precificacao === 'area_livre' && alCategoriesWithData.has(c.tag));
                                      if (outraComDados) {
                                        await appDialog.alert({ title: 'Área Livre com dados', message: `A categoria "${outraComDados.tag}" já tem dados na Planilha AL. Limpe os dados dela antes de trocar.`, type: 'warning' });
                                        return;
                                      }
                                      setCategorias((prev) => prev.map((c, i) => ({ ...c, tipo_precificacao: (i === idx ? 'area_livre' : 'fixo') as 'fixo' | 'area_livre' })));
                                      markDirty();
                                    } else {
                                      setCategorias((prev) => prev.map((c, i) => i !== idx ? c : { ...c, tipo_precificacao: 'fixo' as const }));
                                      markDirty();
                                    }
                                  }}
                                  className="w-4 h-4 accent-amber-600 cursor-pointer"
                                />
                              </label>
                            );
                          })()}
                        </td>
                        {cat.tipo_precificacao === 'area_livre' ? (
                          <>
                            <td className="px-2 py-0.5 border border-slate-200 bg-slate-100" title="Configurar na Planilha Área Livre">
                              <span className="block w-full p-1 text-right font-mono text-[11px] text-slate-400 italic min-w-[90px]">via AL</span>
                            </td>
                            {Array.from({ length: numCombos }).map((_, ci) => (
                              <td key={ci} className="px-2 py-0.5 border border-slate-200 bg-slate-100" title="Configurar na Planilha Área Livre">
                                <span className="block w-full p-1 text-right font-mono text-[11px] text-slate-400 italic min-w-[90px]">via AL</span>
                              </td>
                            ))}
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-0.5 border border-slate-200">
                              <CurrencyField value={cat.standBase ?? 0} onChange={(n) => updateCat(idx, "standBase", n ?? 0)} className="w-full p-1 border border-black/10 text-right font-mono font-bold text-[13px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-[90px]" />
                            </td>
                            {Array.from({ length: numCombos }).map((_, ci) => (
                              <td key={ci} className="px-2 py-0.5 border border-slate-200">
                                <CurrencyField value={Array.isArray(cat.combos) ? cat.combos[ci] || 0 : 0} onChange={(n) => updateCombo(idx, ci, n ?? 0)} className="w-full p-1 border border-blue-200 text-right text-blue-900 font-black font-mono text-[13px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-[90px]" />
                              </td>
                            ))}
                          </>
                        )}
                        <td className="px-1 py-0.5 text-center border border-slate-200">
                          <label className="flex items-center justify-center gap-1 cursor-pointer" title="Marque para contar como stand na contagem total">
                            <input type="checkbox" checked={cat.is_stand !== false} onChange={(e) => { setCategorias((prev) => prev.map((c, i) => i !== idx ? c : { ...c, is_stand: e.target.checked })); markDirty(); }} className="w-4 h-4 accent-slate-700 cursor-pointer" />
                          </label>
                        </td>
                        <td className="px-1 py-0.5 text-center border border-slate-200">
                          {(() => {
                            const cnt = img.getImagensForRef("stand_categoria", cat.tag).length;
                            return (
                              <button onClick={() => img.handleOpenImagensModal("stand_categoria", cat.tag, cat.prefix || cat.tag)} className={`text-[10px] font-bold px-1.5 py-0.5 border transition-colors whitespace-nowrap ${cnt > 0 ? "text-violet-700 bg-violet-50 border-violet-300 hover:bg-violet-100" : "text-slate-400 border-slate-200 hover:text-violet-600 hover:border-violet-300"}`} title="Configurar imagens exigidas para esta categoria">
                                🖼 {cnt > 0 ? cnt : "+"}
                              </button>
                            );
                          })()}
                        </td>
                        <td className="px-1 py-0.5 text-center border border-slate-200">
                          {cat.tipo_precificacao === 'area_livre' && alCategoriesWithData.has(cat.tag) ? (
                            <span className="p-1 text-slate-300 cursor-not-allowed text-xs block text-center" title="Categoria com dados AL. Acesse a Planilha AL para excluir.">✕</span>
                          ) : (
                            <button onClick={() => handleRemoveCategoria(idx)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors font-bold text-xs">✕</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {categorias.length === 0 && (
                  <tr><td colSpan={4 + numCombos + 1} className="px-4 py-8 text-center text-slate-400 italic">Nenhuma categoria. Clique em "+ Categoria".</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Opcionais Selecionados — Preços por Edição ── */}
        <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-sm uppercase tracking-wider">Itens Opcionais nesta Edição</span>
              <span className="ml-3 text-slate-400 text-xs">{opcionaisSelecionados.length} selecionado(s)</span>
            </div>
            <button onClick={() => opc.setShowOpcionaisPopup(true)} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 font-bold transition-colors">📋 Selecionar Itens</button>
          </div>
          {itensAtivos.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 italic text-sm">Nenhum item selecionado. Clique em "Selecionar Itens" para vincular opcionais a esta edição.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-0.5 text-left text-[11px] font-bold uppercase text-slate-500">Item Opcional</th>
                    <th className="px-3 py-0.5 text-right text-[11px] font-bold uppercase text-slate-400">Preço Sugerido</th>
                    <th className="px-3 py-0.5 text-right text-[11px] font-bold uppercase text-green-700 w-48">Preço Nesta Edição ✏️</th>
                    <th className="w-16 text-center text-[11px] font-bold uppercase text-slate-400">Ações</th>
                    <th className="w-16 text-center text-[11px] font-bold uppercase text-violet-500">Imagens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensAtivos.map((item) => {
                    const emUso = opcionaisUsados.has(item.nome);
                    const salvo = salvosOk.has(item.id);
                    return (
                      <tr key={item.id} className={`transition-colors ${emUso ? "bg-amber-50 hover:bg-amber-100/60" : "hover:bg-slate-50"}`}>
                        <td className="px-3 py-0.5">
                          <span className="font-semibold text-slate-800 text-[12px]">{item.nome}</span>
                          {emUso && <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 align-middle">🔒 em uso</span>}
                        </td>
                        <td className="px-3 py-0.5 text-right text-slate-400 font-mono text-[11px]">
                          R$ {Number(item.preco_base).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-0.5 text-right">
                          <CurrencyField
                            value={opcionaisPrecos[item.id] ?? Number(item.preco_base)}
                            onChange={(n) => opc.updatePreco(item.id, String(n ?? 0))}
                            className={`w-36 p-1 border-2 text-right font-bold font-mono text-[12px] focus:bg-white focus:outline-none focus:ring-1 ${emUso ? "border-amber-400 text-amber-900 bg-amber-50 focus:ring-amber-500" : "border-green-400 text-green-800 bg-green-50 focus:ring-green-500"}`}
                          />
                        </td>
                        <td className="px-2 py-0.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => opc.handleSavePreco(item.id)} title="Confirmar preço" className={`p-1 transition-colors text-sm font-bold ${salvo ? "text-green-600 bg-green-50" : "text-slate-500 hover:text-green-700 hover:bg-green-50"}`}>
                              {salvo ? "✓" : "💾"}
                            </button>
                            <button onClick={() => opc.toggleOpcional(item.id)} title={emUso ? "Desmarque nos estandes antes de remover" : "Remover da edição"} className="p-1 text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors text-sm">✕</button>
                          </div>
                        </td>
                        <td className="px-2 py-0.5 text-center">
                          {(() => {
                            const cnt = img.getImagensForRef("item_opcional", item.nome).length;
                            return (
                              <button onClick={() => img.handleOpenImagensModal("item_opcional", item.nome, item.nome, item.tipo_padrao as "imagem" | "logo" | null)} className={`text-[10px] font-bold px-1.5 py-0.5 border transition-colors whitespace-nowrap ${cnt > 0 ? "text-violet-700 bg-violet-50 border-violet-300 hover:bg-violet-100" : "text-slate-400 border-slate-200 hover:text-violet-600 hover:border-violet-300"}`} title="Configurar imagens exigidas para este item">
                                🖼 {cnt > 0 ? cnt : "+"}
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Imagens Avulsas ── */}
        {(() => {
          const avulsas = imagensConfig.filter((c) => c.origem_tipo === "avulso");
          const avulsoStatusColor: Record<string, string> = { pendente: "bg-slate-100 text-slate-600", solicitado: "bg-blue-100 text-blue-700", recebido: "bg-green-100 text-green-700" };
          return (
            <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm uppercase tracking-wider">Imagens Avulsas</span>
                  <span className="ml-3 text-slate-400 text-xs">não vinculadas a stands específicos (produtor, portal de entrada, palco...)</span>
                </div>
                <button onClick={() => img.handleOpenImagensModal("avulso", "__avulso__", "Avulsa")} className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-1.5 font-bold transition-colors">+ Adicionar</button>
              </div>
              {avulsas.length === 0 ? (
                <div className="px-6 py-6 text-center text-slate-400 italic text-sm">Nenhuma imagem avulsa cadastrada.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-0.5 text-left text-[11px] font-bold uppercase text-slate-500">Descrição</th>
                        <th className="px-3 py-0.5 text-center text-[11px] font-bold uppercase text-slate-500 w-24">Tipo</th>
                        <th className="px-3 py-0.5 text-center text-[11px] font-bold uppercase text-slate-500 w-28">Dimensões</th>
                        <th className="px-3 py-0.5 text-center text-[11px] font-bold uppercase text-slate-500 w-36">Status</th>
                        <th className="w-12" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {avulsas.map((av) => {
                        const isEditing = img.editingImagem?.id === av.id;
                        if (isEditing) {
                          return (
                            <tr key={av.id} className="bg-violet-50">
                              <td colSpan={5} className="px-3 py-2">
                                <div className="flex gap-2 items-center">
                                  <select value={img.editingImagem!.tipo} onChange={(e) => img.setEditingImagem((p) => p ? { ...p, tipo: e.target.value as "imagem" | "logo", dimensoes: "" } : null)} className="border border-slate-300 text-sm px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-28 shrink-0">
                                    <option value="imagem">📐 Imagem</option>
                                    <option value="logo">🏷️ Logo</option>
                                  </select>
                                  <input autoFocus type="text" value={img.editingImagem!.descricao} onChange={(e) => img.setEditingImagem((p) => p ? { ...p, descricao: e.target.value } : null)} onKeyDown={(e) => e.key === "Enter" && img.handleUpdateImagem()} className="flex-1 border border-violet-400 text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Descrição" />
                                  {img.editingImagem!.tipo === "imagem" && (
                                    <input type="text" value={img.editingImagem!.dimensoes} onChange={(e) => img.setEditingImagem((p) => p ? { ...p, dimensoes: e.target.value } : null)} onKeyDown={(e) => e.key === "Enter" && img.handleUpdateImagem()} className="w-28 shrink-0 border border-slate-300 text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Dimensões" />
                                  )}
                                  <button onClick={img.handleUpdateImagem} disabled={img.savingImagem || !img.editingImagem!.descricao.trim()} className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-1.5 font-bold transition-colors disabled:opacity-50 shrink-0">{img.savingImagem ? "Salvando..." : "Salvar"}</button>
                                  <button onClick={() => img.setEditingImagem(null)} className="text-xs text-slate-500 border border-slate-300 px-3 py-1.5 hover:bg-slate-100 transition-colors shrink-0">Cancelar</button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={av.id} className="hover:bg-slate-50">
                            <td className="px-3 py-0.5 font-semibold text-[12px] text-slate-800">{av.descricao}</td>
                            <td className="px-3 py-0.5 text-center text-[11px] text-slate-500 uppercase">{av.tipo}</td>
                            <td className="px-3 py-0.5 text-center text-[11px] font-mono text-slate-500">{av.dimensoes || "—"}</td>
                            <td className="px-3 py-0.5 text-center">
                              <select value={av.avulso_status} onChange={(e) => img.handleUpdateAvulsoStatus(av.id, e.target.value as AvulsoStatus)} className={`text-xs font-bold px-2 py-1 border-0 rounded cursor-pointer focus:outline-none ${avulsoStatusColor[av.avulso_status] || "bg-slate-100 text-slate-600"}`}>
                                <option value="pendente">Pendente</option>
                                <option value="solicitado">Solicitado</option>
                                <option value="recebido">Recebido</option>
                              </select>
                            </td>
                            <td className="px-2 text-center">
                              <button onClick={() => img.setEditingImagem({ id: av.id, tipo: av.tipo, descricao: av.descricao, dimensoes: av.dimensoes || "" })} className="text-slate-400 hover:text-violet-600 hover:bg-violet-50 p-1 rounded transition-colors" title="Editar">✏️</button>
                              <button onClick={() => img.handleRemoveImagem(av.id)} className="text-red-400 hover:text-red-700 hover:bg-red-50 p-1 transition-colors text-sm">✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Sticky footer ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{totalEstandes} stand(s)</span>
            {planilhaExiste && <span className="ml-2 text-amber-600 font-semibold">• Planilha ativa</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => guardNavigation(() => navigate(`/planilha-vendas/${edicaoId}`))} className="text-sm font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-2 border-blue-400 px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              Ver Planilha
            </button>
            <button onClick={sav.handleSave} disabled={saving} className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 font-bold transition-colors disabled:opacity-50">
              {saving ? "Salvando..." : "💾 Salvar Configurações"}
            </button>
            {!planilhaExiste && (
              <button onClick={sav.handleGenerate} disabled={saving || categorias.length === 0} className="text-sm bg-green-700 hover:bg-green-600 text-white px-6 py-2 font-bold transition-colors disabled:opacity-50">
                {saving ? "Gerando..." : "🗂️ Gerar Planilha"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de Imagens ── */}
      {img.imagensModal && (
        <ConfigImagensModal
          imagensModal={img.imagensModal}
          imagens={img.getImagensForRef(img.imagensModal.tipo, img.imagensModal.ref)}
          novaImagem={img.novaImagem}
          setNovaImagem={img.setNovaImagem}
          savingImagem={img.savingImagem}
          editingImagem={img.editingImagem}
          setEditingImagem={img.setEditingImagem}
          onClose={() => { img.setImagensModal(null); img.setEditingImagem(null); }}
          onAdd={img.handleAddImagem}
          onRemove={img.handleRemoveImagem}
          onUpdate={img.handleUpdateImagem}
        />
      )}

      {/* ── Popup de Seleção de Opcionais ── */}
      {opc.showOpcionaisPopup && (
        <ConfigOpcionaisPopup
          opcionaisDisponiveis={opcionaisDisponiveis}
          opcionaisSelecionados={opcionaisSelecionados}
          opcionaisUsados={opcionaisUsados}
          onToggle={opc.toggleOpcional}
          onClose={() => opc.setShowOpcionaisPopup(false)}
        />
      )}
    </Layout>
  );
};

export default ConfiguracaoVendas;
