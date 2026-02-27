import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import {
  planilhaVendasService,
  CategoriaSetup,
} from "../services/planilhaVendasService";
import {
  itensOpcionaisService,
  ItemOpcional,
} from "../services/itensOpcionaisService";
import { supabase } from "../services/supabaseClient";
import {
  imagensService,
  ImagemConfig,
  OrigemTipo,
  AvulsoStatus,
} from "../services/imagensService";

const CORES = [
  "bg-[#FCE4D6]",
  "bg-[#FFF2CC]",
  "bg-[#E2EFDA]",
  "bg-[#D9E1F2]",
  "bg-[#F2F2F2]",
  "bg-[#E6E6FA]",
];

const DEFAULT_CATS: CategoriaSetup[] = [
  {
    tag: "NAMING",
    prefix: "Naming",
    cor: CORES[0],
    count: 16,
    standBase: 20000,
    combos: [20000, 20000, 20000],
  },
];

const ConfiguracaoVendas: React.FC = () => {
  const { edicaoId } = useParams<{ edicaoId: string }>();
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState<CategoriaSetup[]>(DEFAULT_CATS);
  const [numCombos, setNumCombos] = useState(3);
  const [opcionaisDisponiveis, setOpcionaisDisponiveis] = useState<
    ItemOpcional[]
  >([]);
  const [opcionaisSelecionados, setOpcionaisSelecionados] = useState<string[]>(
    [],
  );
  // Preços por edição: { [itemId]: number }
  const [opcionaisPrecos, setOpcionaisPrecos] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [savedCounts, setSavedCounts] = useState<Record<string, number>>({});
  const [planilhaExiste, setPlanilhaExiste] = useState(false);
  const [totalStands, setTotalStands] = useState(0);
  // Nomes dos combos customizáveis
  const [comboNames, setComboNames] = useState<string[]>([]);
  // Popup state
  const [showOpcionaisPopup, setShowOpcionaisPopup] = useState(false);
  // Nomes de opcionais que já têm marcação em algum estande da planilha
  const [opcionaisUsados, setOpcionaisUsados] = useState<Set<string>>(
    new Set(),
  );
  // IDs de linhas com preço salvo recentemente (feedback visual)
  const [salvosOk, setSalvosOk] = useState<Set<string>>(new Set());
  // Imagens
  const [imagensConfig, setImagensConfig] = useState<ImagemConfig[]>([]);
  const [imagensModal, setImagensModal] = useState<{
    tipo: OrigemTipo;
    ref: string;
    label: string;
  } | null>(null);
  const [novaImagem, setNovaImagem] = useState({
    tipo: "imagem" as "imagem" | "logo",
    descricao: "",
    dimensoes: "",
  });
  const [savingImagem, setSavingImagem] = useState(false);

  useEffect(() => {
    if (edicaoId) loadData();
  }, [edicaoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [config, allOpcionais, imagens] = await Promise.all([
        planilhaVendasService.getConfig(edicaoId!),
        itensOpcionaisService.getItens(),
        imagensService.getConfig(edicaoId!),
      ]);
      if (config) {
        setConfigId(config.id);
        // Categorias vindas do banco como Json (precisam de cast seguro para CategoriaSetup)
        const storedCats =
          (config.categorias_config as unknown as CategoriaSetup[]) || [];

        let maxCombos = 1;
        // Ajuste defensivo: garante que combos é array e descobre o limite máximo (numCombos)
        storedCats.forEach((cat) => {
          if (Array.isArray(cat.combos)) {
            maxCombos = Math.max(maxCombos, cat.combos.length);
          } else if (typeof cat.combos === "object" && cat.combos !== null) {
            // Migração legada para quem usava objeto { combo01: number }
            const cArr = Object.values(cat.combos).map((v) => Number(v) || 0);
            maxCombos = Math.max(maxCombos, cArr.length);
            cat.combos = cArr;
          } else {
            cat.combos = [];
          }
        });

        setNumCombos(maxCombos);

        // Normaliza o array de combos para ter o mesmo tamnho padding (ex 0, 0, 0)
        const mappedCats = storedCats.map((cat) => {
          const padded = Array.isArray(cat.combos) ? [...cat.combos] : [];
          while (padded.length < maxCombos) padded.push(0);
          return { ...cat, combos: padded };
        });

        // Carrega nomes customizados dos combos (usa da primeira cat, se existir)
        let savedComboNames: string[] = [];
        if (storedCats.length > 0 && Array.isArray(storedCats[0].comboNames)) {
          savedComboNames = [...storedCats[0].comboNames];
        }
        while (savedComboNames.length < maxCombos) {
          savedComboNames.push(
            `COMBO ${String(savedComboNames.length + 1).padStart(2, "0")}`,
          );
        }
        setComboNames(savedComboNames);

        setCategorias(mappedCats);
        setOpcionaisSelecionados(config.opcionais_ativos || []);
        // Load custom prices
        setOpcionaisPrecos(
          (config.opcionais_precos as Record<string, number>) || {},
        );
        const counts: Record<string, number> = {};
        mappedCats.forEach((cat) => {
          counts[cat.tag] = cat.count;
        });
        setSavedCounts(counts);

        const { data: estandes } = await supabase
          .from("planilha_vendas_estandes")
          .select(
            "id, cliente_id, cliente_nome_livre, tipo_venda, opcionais_selecionados",
          )
          .eq("config_id", config.id);
        if (estandes && estandes.length > 0) {
          setPlanilhaExiste(true);
          setTotalStands(estandes.length);
          // Descobrir quais opcionais (por nome) têm marcação em algum estande
          const usados = new Set<string>();
          estandes.forEach((e) => {
            const sel =
              (e.opcionais_selecionados as Record<string, string>) || {};
            Object.entries(sel).forEach(([nome, valor]) => {
              if (valor === "x" || valor === "*") usados.add(nome);
            });
          });
          setOpcionaisUsados(usados);
        }
      }
      setOpcionaisDisponiveis(allOpcionais);
      setImagensConfig(imagens || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Category handlers ──────────────────────────────────────
  const updateCat = <K extends keyof CategoriaSetup>(
    idx: number,
    field: K,
    value: string | number,
  ) =>
    setCategorias((prev) =>
      prev.map((c, i) =>
        i !== idx
          ? c
          : {
              ...c,
              [field]:
                field === "count" || field === "standBase"
                  ? Number(value) || 0
                  : value,
            },
      ),
    );

  const updateCombo = (catIdx: number, ci: number, value: string | number) =>
    setCategorias((prev) =>
      prev.map((c, i) => {
        if (i !== catIdx) return c;
        const arr = Array.isArray(c.combos) ? [...c.combos] : [];
        arr[ci] = Number(value) || 0;
        return { ...c, combos: arr };
      }),
    );

  const addCombo = () => {
    setNumCombos((n) => n + 1);
    setComboNames((prev) => [
      ...prev,
      `COMBO ${String(prev.length + 1).padStart(2, "0")}`,
    ]);
    setCategorias((prev) =>
      prev.map((c) => ({
        ...c,
        combos: Array.isArray(c.combos) ? [...c.combos, 0] : [0],
      })),
    );
  };

  const removeCombo = () => {
    if (numCombos <= 0) return;
    setNumCombos((n) => n - 1);
    setComboNames((prev) => prev.slice(0, -1));
    setCategorias((prev) =>
      prev.map((c) => ({
        ...c,
        combos: Array.isArray(c.combos) ? c.combos.slice(0, -1) : [],
      })),
    );
  };

  const handleComboNameChange = (idx: number, newName: string) => {
    setComboNames((prev) => {
      const arr = [...prev];
      arr[idx] = newName.toUpperCase();
      return arr;
    });
  };

  const addCategoria = () => {
    setCategorias((prev) => {
      const maxOrdem = prev.reduce(
        (max, cat) => Math.max(max, cat.ordem ?? 0),
        0,
      );
      return [
        ...prev,
        {
          tag: "",
          prefix: "",
          cor: CORES[prev.length % CORES.length],
          count: 1,
          standBase: 0,
          combos: Array(numCombos).fill(0),
          ordem: maxOrdem + 1,
        },
      ];
    });
  };

  const removeCategoria = async (idx: number) => {
    const cat = categorias[idx];
    const identifier = (cat.prefix || cat.tag || "").trim();

    // Se já existe uma planilha gerada, verificar se há estandes com dados
    if (configId && identifier) {
      const { data: estandes } = await supabase
        .from("planilha_vendas_estandes")
        .select(
          "stand_nr, cliente_id, cliente_nome_livre, tipo_venda, opcionais_selecionados",
        )
        .eq("config_id", configId)
        .ilike("stand_nr", `${identifier} %`);

      if (estandes && estandes.length > 0) {
        const comDados = estandes.filter(
          (e) =>
            e.cliente_id ||
            e.cliente_nome_livre ||
            (e.tipo_venda && e.tipo_venda !== "DISPONÍVEL") ||
            (e.opcionais_selecionados &&
              Object.keys(e.opcionais_selecionados as object).length > 0),
        );

        if (comDados.length > 0) {
          alert(
            `⛔ A categoria "${cat.tag}" não pode ser removida.\n\n` +
              `${comDados.length} estande(s) com dados cadastrados:\n` +
              comDados.map((e) => `• ${e.stand_nr}`).join("\n") +
              `\n\nLimpe os dados na planilha antes de remover esta categoria.`,
          );
          return;
        }
      }
    }

    // Removido da lista em tempo de execução. O banco será limpo no "Salvar Configurações".
    const novasCategorias = categorias.filter((_, i) => i !== idx);
    setCategorias(novasCategorias);
  };

  // ── Opcionais handlers ─────────────────────────────────────
  const toggleOpcional = (id: string) => {
    setOpcionaisSelecionados((prev) => {
      if (prev.includes(id)) {
        // Bloquear se o item já foi usado na planilha
        const item = opcionaisDisponiveis.find((o) => o.id === id);
        if (item && opcionaisUsados.has(item.nome)) {
          alert(
            `⛔ O item "${item.nome}" já está marcado em estandes da planilha.\n\nPara removê-lo da edição, primeiro desmarque-o em todos os estandes na planilha.`,
          );
          return prev; // bloqueia
        }
        setOpcionaisPrecos((p) => {
          const n = { ...p };
          delete n[id];
          return n;
        });
        return prev.filter((x) => x !== id);
      }
      // Adicionar: setar preço sugerido como padrão
      const item = opcionaisDisponiveis.find((o) => o.id === id);
      if (item)
        setOpcionaisPrecos((p) => ({
          ...p,
          [id]: Number(item.preco_base) || 0,
        }));
      return [...prev, id];
    });
  };

  const updatePreco = (id: string, value: string) => {
    setOpcionaisPrecos((prev) => ({ ...prev, [id]: Number(value) || 0 }));
  };

  const handleSavePreco = async (id: string) => {
    if (!edicaoId || !configId) {
      alert("Salve as configurações gerais primeiro.");
      return;
    }
    const item = opcionaisDisponiveis.find((o) => o.id === id);
    const novoPreco = opcionaisPrecos[id] ?? Number(item?.preco_base ?? 0);
    const precoFmt = novoPreco.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    });

    if (item && opcionaisUsados.has(item.nome)) {
      const ok = window.confirm(
        `⚠️ O item "${item.nome}" já está marcado em estandes desta planilha.\n\n` +
          `Ao confirmar, o novo preço de R$ ${precoFmt} será salvo na configuração e passará a valer para todos os cálculos da edição.\n\n` +
          `Deseja continuar?`,
      );
      if (!ok) return;
    }

    // Salva opcionais_precos no banco imediatamente
    const newPrecos = { ...opcionaisPrecos, [id]: novoPreco };
    const { error } = await supabase
      .from("planilha_configuracoes")
      .update({
        opcionais_precos:
          newPrecos as unknown as import("../database.types").Json,
      })
      .eq("id", configId);

    if (error) {
      alert("Erro ao salvar preço: " + error.message);
      return;
    }

    setOpcionaisPrecos(newPrecos);
    setSalvosOk((prev) => new Set(prev).add(id));
    setTimeout(
      () =>
        setSalvosOk((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        }),
      2500,
    );
  };

  // ── Imagens handlers ───────────────────────────────────────
  const getImagensForRef = (tipo: OrigemTipo, ref: string) =>
    imagensConfig.filter(
      (c) => c.origem_tipo === tipo && c.origem_ref === ref,
    );

  const handleOpenImagensModal = (
    tipo: OrigemTipo,
    ref: string,
    label: string,
  ) => {
    setImagensModal({ tipo, ref, label });
    setNovaImagem({ tipo: "imagem", descricao: "", dimensoes: "" });
  };

  const handleAddImagem = async () => {
    if (!novaImagem.descricao.trim() || !edicaoId || !imagensModal) return;
    setSavingImagem(true);
    try {
      const added = await imagensService.addConfig({
        edicao_id: edicaoId,
        origem_tipo: imagensModal.tipo,
        origem_ref: imagensModal.ref,
        tipo: novaImagem.tipo,
        descricao: novaImagem.descricao.trim(),
        dimensoes:
          novaImagem.tipo === "imagem" && novaImagem.dimensoes.trim()
            ? novaImagem.dimensoes.trim()
            : null,
      });
      setImagensConfig((prev) => [...prev, added]);
      setNovaImagem({ tipo: "imagem", descricao: "", dimensoes: "" });
    } catch (err) {
      alert(
        "Erro ao adicionar: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSavingImagem(false);
    }
  };

  const handleRemoveImagem = async (id: string) => {
    try {
      await imagensService.removeConfig(id);
      setImagensConfig((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(
        "Erro ao remover: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const handleUpdateAvulsoStatus = async (id: string, status: AvulsoStatus) => {
    try {
      await imagensService.updateAvulsoStatus(id, status);
      setImagensConfig((prev) =>
        prev.map((c) => (c.id === id ? { ...c, avulso_status: status } : c)),
      );
    } catch (err) {
      alert(
        "Erro ao atualizar status: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  // ── Validation ─────────────────────────────────────────────
  const validateCountReduction = async (): Promise<string | null> => {
    if (!configId) return null;

    // Verifica se há estandes "órfãos" (removidos ou com prefixo alterado) que possuem dados
    const { data: estandes, error } = await supabase
      .from("planilha_vendas_estandes")
      .select(
        "stand_nr, cliente_id, cliente_nome_livre, tipo_venda, opcionais_selecionados",
      )
      .eq("config_id", configId);

    if (error || !estandes) return null;

    const validStandNrs = new Set<string>();
    for (const cat of categorias) {
      for (let i = 1; i <= cat.count; i++) {
        validStandNrs.add(planilhaVendasService.buildStandNr(cat, i));
      }
    }

    const orphansWithData = estandes.filter((e) => {
      if (validStandNrs.has(e.stand_nr)) return false;
      // É um órfão. Tem dados?
      return (
        e.cliente_id ||
        e.cliente_nome_livre ||
        (e.tipo_venda && e.tipo_venda !== "DISPONÍVEL") ||
        (e.opcionais_selecionados &&
          Object.keys(e.opcionais_selecionados as object).length > 0)
      );
    });

    if (orphansWithData.length > 0) {
      return `Existem ${orphansWithData.length} estande(s) com dados que ficariam órfãos (ex: ${orphansWithData[0].stand_nr}). Isso ocorre ao reduzir a quantidade, excluir uma categoria ou alterar seu prefixo. Limpe estes estandes na planilha primeiro.`;
    }

    return null;
  };

  // ── Helper: salva config no banco ──────────────────────────
  const persistConfig = async (): Promise<string> => {
    // Vincula a property comboNames no payload (vamos gravar em todas pra ser seguro, mas apenas as do Index 0 importam de verdade)
    const categoriasToSave = categorias.map((c) => ({
      ...c,
      comboNames: comboNames,
    }));

    const payload = {
      edicao_id: edicaoId,
      categorias_config:
        categoriasToSave as unknown as import("../database.types").Json,
      opcionais_ativos: opcionaisSelecionados,
      opcionais_precos:
        opcionaisPrecos as unknown as import("../database.types").Json,
    };

    if (configId) {
      const { data, error } = await supabase
        .from("planilha_configuracoes")
        .update(payload)
        .eq("id", configId)
        .select()
        .single();
      if (error) throw error;
      return data.id;
    } else {
      const { data, error } = await supabase
        .from("planilha_configuracoes")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data.id;
    }
  };

  // ── Validate categories ────────────────────────────────────
  const validateCategorias = (): string | null => {
    const identifiers = new Set<string>();

    for (const cat of categorias) {
      const tagNormalized = (cat.tag || "").trim().toUpperCase();
      if (!tagNormalized || tagNormalized === "NOVA") {
        return `Todas as categorias precisam de uma TAG válida (A TAG "${cat.tag || "vazia"}" não é permitida). Corrija antes de continuar.`;
      }
      if (cat.count < 1) {
        return `A categoria "${cat.tag}" precisa ter ao menos 1 stand (QTD ≥ 1).`;
      }

      // Checar por identificadores (prefixos) duplicados
      const identifier = (cat.prefix || cat.tag || "").trim().toUpperCase();
      if (identifiers.has(identifier)) {
        return `O Identificador/Prefixo "${identifier}" está duplicado. Cada categoria precisa de um prefixo único para evitar erros na geração da planilha.`;
      }
      identifiers.add(identifier);
    }
    return null;
  };

  // ── Save config ────────────────────────────────────────────
  const handleSave = async () => {
    if (!edicaoId) return;
    const catErr = validateCategorias();
    if (catErr) {
      alert(`⚠️ ${catErr}`);
      return;
    }
    const err = await validateCountReduction();
    if (err) {
      alert(`⚠️ ${err}`);
      return;
    }
    try {
      setSaving(true);
      const savedId = await persistConfig();
      setConfigId(savedId);

      // Sincroniza estandes (insere novos, remove excedentes sem dados)
      if (planilhaExiste || savedId) {
        const result = await planilhaVendasService.syncEstandes(
          savedId,
          categorias,
        );
        if (result.inserted > 0 || result.deleted > 0) {
          setPlanilhaExiste(true);
          setTotalStands((prev) => prev + result.inserted - result.deleted);
        }
      }

      const counts: Record<string, number> = {};
      categorias.forEach((c) => {
        counts[c.prefix] = c.count;
      });
      setSavedCounts(counts);

      alert("✅ Configurações salvas!");
      // Redireciona para planilha para refletir novas cores/preços
      navigate(`/planilha-vendas/${edicaoId}`);
    } catch (err) {
      console.error(err);
      alert(
        "Erro ao salvar: " + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Generate planilha ──────────────────────────────────────
  const handleGenerate = async () => {
    if (!edicaoId) return;
    if (planilhaExiste) {
      alert(
        `⛔ Planilha já existe com ${totalStands} estandes. Limpe os dados na planilha antes de gerar novamente.`,
      );
      return;
    }
    const catErr = validateCategorias();
    if (catErr) {
      alert(`⚠️ ${catErr}`);
      return;
    }
    const err = await validateCountReduction();
    if (err) {
      alert(`⚠️ ${err}`);
      return;
    }
    if (!confirm("Gerar planilha com as categorias definidas?")) return;
    try {
      setSaving(true);
      const savedId = await persistConfig();
      setConfigId(savedId);
      await planilhaVendasService.generateEstandes(savedId, categorias);
      setPlanilhaExiste(true);
      setTotalStands(categorias.reduce((s, c) => s + c.count, 0));
      alert("✅ Planilha gerada com sucesso!");
      navigate(`/planilha-vendas/${edicaoId}`);
    } catch (err) {
      console.error(err);
      alert(
        "Erro ao gerar planilha: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Layout title="Configuração">
        <div className="p-8 text-center text-slate-500">Carregando...</div>
      </Layout>
    );

  const totalEstandes = categorias.reduce((s, c) => s + c.count, 0);
  const itensAtivos = opcionaisDisponiveis.filter((o) =>
    opcionaisSelecionados.includes(o.id),
  );

  return (
    <Layout title="Estruturar Planilha de Vendas">
      <div className="max-w-7xl mx-auto p-4 pb-32 space-y-6">
        {/* Status banner */}
        {planilhaExiste ? (
          <div className="border-l-4 border-amber-500 bg-amber-50 px-5 py-3 flex items-start gap-3">
            <span className="text-xl mt-0.5">⚠️</span>
            <div>
              <p className="font-bold text-amber-800 text-sm">
                Planilha já gerada — {totalStands} estandes ativos
              </p>
              <p className="text-amber-700 text-xs mt-0.5">
                Você pode editar preços e opcionais e salvar. Para gerar nova
                planilha, limpe os dados primeiro.
              </p>
            </div>
          </div>
        ) : (
          <div className="border-l-4 border-blue-500 bg-blue-50 px-5 py-3">
            <p className="font-bold text-blue-800 text-sm">
              Nenhuma planilha gerada ainda
            </p>
            <p className="text-blue-700 text-xs mt-0.5">
              Configure abaixo, salve e clique em "Gerar Planilha".
            </p>
          </div>
        )}

        {/* ── Categorias / Preços ── */}
        <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap gap-2 items-center justify-between">
            <div>
              <span className="font-bold text-sm uppercase tracking-wider">
                Estrutura de Estandes e Preços
              </span>
              <span className="ml-3 text-slate-400 text-xs">
                {totalEstandes} stand(s) no total
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={addCombo}
                className="text-xs font-bold bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 transition-colors shadow-sm"
              >
                + Adicionar Combo
              </button>
              {numCombos > 0 && (
                <button
                  onClick={removeCombo}
                  className="text-xs bg-red-900/60 hover:bg-red-800 text-red-200 px-3 py-1.5 transition-colors"
                >
                  − Remover Combo
                </button>
              )}
              <div className="w-px bg-slate-600 mx-1" />
              <button
                onClick={addCategoria}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 font-bold transition-colors"
              >
                + Categoria
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-1 text-center text-[11px] font-bold uppercase text-slate-500 w-16 border border-slate-200">
                    Ord.
                  </th>
                  <th className="px-4 py-1 text-left text-[11px] font-bold uppercase text-slate-500 w-28 border border-slate-200">
                    Tag
                  </th>
                  <th className="px-4 py-1 text-left text-[11px] font-bold uppercase text-slate-500 w-36 border border-slate-200">
                    Prefixo
                  </th>
                  <th className="px-4 py-1 text-center text-[11px] font-bold uppercase text-slate-500 w-20 border border-slate-200">
                    Qtd.
                  </th>
                  <th className="px-4 py-1 text-right text-[11px] font-bold uppercase text-slate-500 w-32 border border-slate-200">
                    Base
                  </th>
                  {Array.from({ length: numCombos }).map((_, i) => (
                    <th
                      key={i}
                      className="px-2 py-1 text-center text-[11px] font-bold uppercase text-blue-600 min-w-[100px] border border-slate-200"
                    >
                      <input
                        type="text"
                        className="w-full text-center bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none placeholder:text-blue-300 transition-colors uppercase text-blue-700"
                        value={comboNames[i] || ""}
                        onChange={(e) =>
                          handleComboNameChange(i, e.target.value)
                        }
                        placeholder={`COMBO ${String(i + 1).padStart(2, "0")}`}
                        title="Clique para editar o Nome/Fantasia deste combo na Planilha"
                      />
                    </th>
                  ))}
                  <th className="px-2 py-1 text-center text-[11px] font-bold uppercase text-violet-600 w-20 border border-slate-200">
                    Imagens
                  </th>
                  <th className="w-8 border border-slate-200" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...categorias]
                  .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
                  .map((cat) => {
                    const idx = categorias.indexOf(cat);
                    const isReducing =
                      savedCounts[cat.prefix] &&
                      cat.count < savedCounts[cat.prefix];
                    return (
                      <tr
                        key={idx}
                        className={`${cat.cor} hover:brightness-95 transition-all`}
                      >
                        <td className="px-2 py-0.5 border border-slate-200">
                          <input
                            type="number"
                            className="w-full p-1 border border-black/10 font-mono font-bold text-[12px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-center"
                            value={cat.ordem ?? 0}
                            onChange={(e) =>
                              updateCat(idx, "ordem", e.target.value)
                            }
                          />
                        </td>
                        <td className="px-2 py-0.5 border border-slate-200">
                          <input
                            className="w-full p-1 border border-black/10 font-mono text-[12px] uppercase bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-bold"
                            value={cat.tag}
                            onChange={(e) =>
                              updateCat(idx, "tag", e.target.value)
                            }
                            placeholder="NAMING"
                          />
                        </td>
                        <td className="px-2 py-0.5 border border-slate-200">
                          <input
                            className="w-full p-1 border border-black/10 font-black text-[13px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-center"
                            value={cat.prefix}
                            onChange={(e) =>
                              updateCat(idx, "prefix", e.target.value)
                            }
                          />
                        </td>
                        <td className="px-2 py-0.5 border border-slate-200">
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              className={`w-14 p-1 border text-center font-black text-[14px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 block ${isReducing ? "border-amber-400 focus:ring-amber-400 bg-amber-50" : "border-black/10 focus:ring-slate-400"}`}
                              value={cat.count}
                              onChange={(e) =>
                                updateCat(idx, "count", e.target.value)
                              }
                            />
                            {isReducing && (
                              <span className="text-[8px] text-amber-700 font-bold uppercase tracking-tighter">
                                era {savedCounts[cat.prefix]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-0.5 border border-slate-200">
                          <input
                            type="number"
                            min="0"
                            className="w-full p-1 border border-black/10 text-right font-mono font-bold text-[13px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-[90px]"
                            value={cat.standBase}
                            onChange={(e) =>
                              updateCat(idx, "standBase", e.target.value)
                            }
                          />
                        </td>
                        {Array.from({ length: numCombos }).map((_, ci) => (
                          <td
                            key={ci}
                            className="px-2 py-0.5 border border-slate-200"
                          >
                            <input
                              type="number"
                              min="0"
                              className="w-full p-1 border border-blue-200 text-right text-blue-900 font-black font-mono text-[13px] bg-white/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-[90px]"
                              value={
                                Array.isArray(cat.combos)
                                  ? cat.combos[ci] || 0
                                  : 0
                              }
                              onChange={(e) =>
                                updateCombo(idx, ci, e.target.value)
                              }
                            />
                          </td>
                        ))}
                        <td className="px-1 py-0.5 text-center border border-slate-200">
                          {(() => {
                            const cnt = getImagensForRef(
                              "stand_categoria",
                              cat.tag,
                            ).length;
                            return (
                              <button
                                onClick={() =>
                                  handleOpenImagensModal(
                                    "stand_categoria",
                                    cat.tag,
                                    cat.prefix || cat.tag,
                                  )
                                }
                                className={`text-[10px] font-bold px-1.5 py-0.5 border transition-colors whitespace-nowrap ${cnt > 0 ? "text-violet-700 bg-violet-50 border-violet-300 hover:bg-violet-100" : "text-slate-400 border-slate-200 hover:text-violet-600 hover:border-violet-300"}`}
                                title="Configurar imagens exigidas para esta categoria"
                              >
                                🖼 {cnt > 0 ? cnt : "+"}
                              </button>
                            );
                          })()}
                        </td>
                        <td className="px-1 py-0.5 text-center border border-slate-200">
                          <button
                            onClick={() => removeCategoria(idx)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors font-bold text-xs"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {categorias.length === 0 && (
                  <tr>
                    <td
                      colSpan={4 + numCombos + 1}
                      className="px-4 py-8 text-center text-slate-400 italic"
                    >
                      Nenhuma categoria. Clique em "+ Categoria".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Opcionais Selecionados — Preços por Edição ── */}
        <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-sm uppercase tracking-wider">
                Itens Opcionais nesta Edição
              </span>
              <span className="ml-3 text-slate-400 text-xs">
                {opcionaisSelecionados.length} selecionado(s)
              </span>
            </div>
            <button
              onClick={() => setShowOpcionaisPopup(true)}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 font-bold transition-colors"
            >
              📋 Selecionar Itens
            </button>
          </div>

          {itensAtivos.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 italic text-sm">
              Nenhum item selecionado. Clique em "Selecionar Itens" para
              vincular opcionais a esta edição.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase text-slate-500">
                      Item Opcional
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase text-slate-400">
                      Preço Sugerido
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase text-green-700 w-56">
                      Preço Nesta Edição ✏️
                    </th>
                    <th className="w-20 text-center text-[11px] font-bold uppercase text-slate-400">
                      Ações
                    </th>
                    <th className="w-20 text-center text-[11px] font-bold uppercase text-violet-500">
                      Imagens
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensAtivos.map((item) => {
                    const emUso = opcionaisUsados.has(item.nome);
                    const salvo = salvosOk.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${emUso ? "bg-amber-50 hover:bg-amber-100/60" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-slate-800">
                            {item.nome}
                          </span>
                          {emUso && (
                            <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 align-middle">
                              🔒 em uso
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-400 font-mono text-xs">
                          R${" "}
                          {Number(item.preco_base).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-500 text-xs">R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={`w-36 p-1.5 border-2 text-right font-bold font-mono focus:bg-white focus:outline-none focus:ring-2
                                                                ${
                                                                  emUso
                                                                    ? "border-amber-400 text-amber-900 bg-amber-50 focus:ring-amber-500"
                                                                    : "border-green-400 text-green-800 bg-green-50 focus:ring-green-500"
                                                                }`}
                              value={
                                opcionaisPrecos[item.id] ??
                                Number(item.preco_base)
                              }
                              onChange={(e) =>
                                updatePreco(item.id, e.target.value)
                              }
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSavePreco(item.id)}
                              title="Confirmar preço"
                              className={`p-1.5 transition-colors text-sm font-bold
                                                                ${
                                                                  salvo
                                                                    ? "text-green-600 bg-green-50"
                                                                    : "text-slate-500 hover:text-green-700 hover:bg-green-50"
                                                                }`}
                            >
                              {salvo ? "✓" : "💾"}
                            </button>
                            <button
                              onClick={() => toggleOpcional(item.id)}
                              title={
                                emUso
                                  ? "Desmarque nos estandes antes de remover"
                                  : "Remover da edição"
                              }
                              className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          {(() => {
                            const cnt = getImagensForRef(
                              "item_opcional",
                              item.nome,
                            ).length;
                            return (
                              <button
                                onClick={() =>
                                  handleOpenImagensModal(
                                    "item_opcional",
                                    item.nome,
                                    item.nome,
                                  )
                                }
                                className={`text-[10px] font-bold px-1.5 py-0.5 border transition-colors whitespace-nowrap ${cnt > 0 ? "text-violet-700 bg-violet-50 border-violet-300 hover:bg-violet-100" : "text-slate-400 border-slate-200 hover:text-violet-600 hover:border-violet-300"}`}
                                title="Configurar imagens exigidas para este item"
                              >
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
          const avulsas = imagensConfig.filter(
            (c) => c.origem_tipo === "avulso",
          );
          const avulsoStatusLabel: Record<string, string> = {
            pendente: "Pendente",
            solicitado: "Solicitado",
            recebido: "Recebido",
          };
          const avulsoStatusColor: Record<string, string> = {
            pendente: "bg-slate-100 text-slate-600",
            solicitado: "bg-blue-100 text-blue-700",
            recebido: "bg-green-100 text-green-700",
          };
          return (
            <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm uppercase tracking-wider">
                    Imagens Avulsas
                  </span>
                  <span className="ml-3 text-slate-400 text-xs">
                    não vinculadas a stands específicos (produtor, portal de
                    entrada, palco...)
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleOpenImagensModal("avulso", "__avulso__", "Avulsa")
                  }
                  className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-1.5 font-bold transition-colors"
                >
                  + Adicionar
                </button>
              </div>
              {avulsas.length === 0 ? (
                <div className="px-6 py-6 text-center text-slate-400 italic text-sm">
                  Nenhuma imagem avulsa cadastrada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-[11px] font-bold uppercase text-slate-500">
                          Descrição
                        </th>
                        <th className="px-4 py-2 text-center text-[11px] font-bold uppercase text-slate-500 w-24">
                          Tipo
                        </th>
                        <th className="px-4 py-2 text-center text-[11px] font-bold uppercase text-slate-500 w-28">
                          Dimensões
                        </th>
                        <th className="px-4 py-2 text-center text-[11px] font-bold uppercase text-slate-500 w-36">
                          Status
                        </th>
                        <th className="w-12" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {avulsas.map((av) => (
                        <tr key={av.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-semibold text-slate-800">
                            {av.descricao}
                          </td>
                          <td className="px-4 py-2 text-center text-xs text-slate-500 uppercase">
                            {av.tipo}
                          </td>
                          <td className="px-4 py-2 text-center text-xs font-mono text-slate-500">
                            {av.dimensoes || "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <select
                              value={av.avulso_status}
                              onChange={(e) =>
                                handleUpdateAvulsoStatus(
                                  av.id,
                                  e.target.value as AvulsoStatus,
                                )
                              }
                              className={`text-xs font-bold px-2 py-1 border-0 rounded cursor-pointer focus:outline-none ${avulsoStatusColor[av.avulso_status] || "bg-slate-100 text-slate-600"}`}
                            >
                              <option value="pendente">Pendente</option>
                              <option value="solicitado">Solicitado</option>
                              <option value="recebido">Recebido</option>
                            </select>
                            <span className="sr-only">
                              {avulsoStatusLabel[av.avulso_status]}
                            </span>
                          </td>
                          <td className="px-2 text-center">
                            <button
                              onClick={() => handleRemoveImagem(av.id)}
                              className="text-red-400 hover:text-red-700 hover:bg-red-50 p-1 transition-colors text-sm"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
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
            <span className="font-semibold text-slate-700">
              {totalEstandes} stand(s)
            </span>
            {planilhaExiste && (
              <span className="ml-2 text-amber-600 font-semibold">
                • Planilha ativa
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/planilha-vendas/${edicaoId}`)}
              className="text-sm text-slate-600 border border-slate-300 px-4 py-2 hover:bg-slate-50 transition-colors"
            >
              ← Ver Planilha
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 font-bold transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "💾 Salvar Configurações"}
            </button>
            {!planilhaExiste && (
              <button
                onClick={handleGenerate}
                disabled={saving || categorias.length === 0}
                className="text-sm bg-green-700 hover:bg-green-600 text-white px-6 py-2 font-bold transition-colors disabled:opacity-50"
              >
                {saving ? "Gerando..." : "🗂️ Gerar Planilha"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de Imagens ── */}
      {imagensModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) =>
            e.target === e.currentTarget && setImagensModal(null)
          }
        >
          <div className="bg-white shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                  {imagensModal.tipo === "stand_categoria"
                    ? "Categoria"
                    : imagensModal.tipo === "item_opcional"
                      ? "Item Opcional"
                      : "Imagem Avulsa"}
                </span>
                <p className="font-black text-sm uppercase">
                  Imagens — {imagensModal.label}
                </p>
              </div>
              <button
                onClick={() => setImagensModal(null)}
                className="text-slate-400 hover:text-white text-2xl leading-none ml-4"
              >
                ×
              </button>
            </div>

            {/* Lista existente */}
            <div className="flex-1 overflow-y-auto">
              {getImagensForRef(imagensModal.tipo, imagensModal.ref).length ===
              0 ? (
                <div className="px-6 py-6 text-center text-slate-400 italic text-sm">
                  Nenhuma imagem configurada ainda.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {getImagensForRef(imagensModal.tipo, imagensModal.ref).map(
                    (cfg) => (
                      <li
                        key={cfg.id}
                        className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {cfg.tipo === "logo" ? "🏷️" : "📐"}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-800 text-sm">
                              {cfg.descricao}
                            </span>
                            {cfg.dimensoes && (
                              <span className="ml-2 text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5">
                                {cfg.dimensoes}
                              </span>
                            )}
                            <span className="ml-2 text-[10px] font-bold uppercase text-violet-500">
                              {cfg.tipo}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveImagem(cfg.id)}
                          className="text-red-400 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                        >
                          ✕
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>

            {/* Formulário de adição */}
            <div className="flex-shrink-0 border-t border-slate-200 px-5 py-4 bg-slate-50 space-y-3">
              <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Adicionar imagem
              </p>
              <div className="flex gap-2">
                <select
                  value={novaImagem.tipo}
                  onChange={(e) =>
                    setNovaImagem((p) => ({
                      ...p,
                      tipo: e.target.value as "imagem" | "logo",
                      dimensoes: "",
                    }))
                  }
                  className="border border-slate-300 text-sm px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-28 shrink-0"
                >
                  <option value="imagem">📐 Imagem</option>
                  <option value="logo">🏷️ Logo</option>
                </select>
                <input
                  type="text"
                  placeholder="Descrição (ex: Testeira, Fundo)"
                  className="flex-1 border border-slate-300 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                  value={novaImagem.descricao}
                  onChange={(e) =>
                    setNovaImagem((p) => ({
                      ...p,
                      descricao: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleAddImagem()}
                />
                {novaImagem.tipo === "imagem" && (
                  <input
                    type="text"
                    placeholder="Dimensões (ex: 5x1m)"
                    className="w-28 shrink-0 border border-slate-300 text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    value={novaImagem.dimensoes}
                    onChange={(e) =>
                      setNovaImagem((p) => ({
                        ...p,
                        dimensoes: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleAddImagem()}
                  />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setImagensModal(null)}
                  className="text-sm text-slate-600 border border-slate-300 px-4 py-1.5 hover:bg-slate-100 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={handleAddImagem}
                  disabled={savingImagem || !novaImagem.descricao.trim()}
                  className="text-sm bg-violet-700 hover:bg-violet-600 text-white px-5 py-1.5 font-bold transition-colors disabled:opacity-50"
                >
                  {savingImagem ? "Salvando..." : "+ Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup de Seleção de Opcionais ── */}
      {showOpcionaisPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) =>
            e.target === e.currentTarget && setShowOpcionaisPopup(false)
          }
        >
          <div className="bg-white shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
              <span className="font-bold text-sm uppercase tracking-wider">
                Selecionar Itens Opcionais
              </span>
              <button
                onClick={() => setShowOpcionaisPopup(false)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {opcionaisDisponiveis.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-400 italic text-sm">
                  Nenhum item opcional cadastrado. Acesse "Opcionais" para
                  criar.
                </div>
              ) : (
                opcionaisDisponiveis.map((item) => {
                  const selected = opcionaisSelecionados.includes(item.id);
                  const emUso = opcionaisUsados.has(item.nome);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors
                                                ${selected ? "bg-blue-50" : "hover:bg-slate-50"}
                                                ${emUso ? "cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleOpcional(item.id)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <div className="flex-1">
                        <span
                          className={`font-semibold text-sm ${selected ? "text-blue-900" : "text-slate-800"}`}
                        >
                          {item.nome}
                        </span>
                        {emUso && (
                          <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5">
                            🔒 em uso na planilha
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        R${" "}
                        {Number(item.preco_base).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex-shrink-0 px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {opcionaisSelecionados.length} selecionado(s)
              </span>
              <button
                onClick={() => setShowOpcionaisPopup(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold px-5 py-2 transition-colors"
              >
                ✓ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ConfiguracaoVendas;
