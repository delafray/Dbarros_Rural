import React, { useState, useEffect } from "react";
import {
  planilhaVendasService,
  CategoriaSetup,
  PlanilhaConfig,
} from "../services/planilhaVendasService";
import {
  itensOpcionaisService,
  ItemOpcional,
} from "../services/itensOpcionaisService";
import { imagensService, ImagemConfig } from "../services/imagensService";
import { supabase } from "../services/supabaseClient";
import { CORES_CATEGORIAS as CORES } from "../utils/constants";

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

export function useConfigData(edicaoId: string | undefined, markDirty: () => void) {
  const [categorias, setCategorias] = useState<CategoriaSetup[]>(DEFAULT_CATS);
  const [numCombos, setNumCombos] = useState(3);
  const [comboNames, setComboNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [savedCounts, setSavedCounts] = useState<Record<string, number>>({});
  const [planilhaExiste, setPlanilhaExiste] = useState(false);
  const [totalStands, setTotalStands] = useState(0);
  const [savedTags, setSavedTags] = useState<string[]>([]);
  const [alCategoriesWithData, setAlCategoriesWithData] = useState<Set<string>>(new Set());

  // Opcionais-related state (shared with useConfigOpcionais)
  const [opcionaisDisponiveis, setOpcionaisDisponiveis] = useState<ItemOpcional[]>([]);
  const [opcionaisSelecionados, setOpcionaisSelecionados] = useState<string[]>([]);
  const [opcionaisPrecos, setOpcionaisPrecos] = useState<Record<string, number>>({});
  const [opcionaisNomes, setOpcionaisNomes] = useState<Record<string, string>>({});
  const [opcionaisUsados, setOpcionaisUsados] = useState<Set<string>>(new Set());
  const [salvosOk, setSalvosOk] = useState<Set<string>>(new Set());

  // Imagens state (shared with useConfigImagens)
  const [imagensConfig, setImagensConfig] = useState<ImagemConfig[]>([]);

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
        const storedCats = (config.categorias_config as unknown as CategoriaSetup[]) || [];

        let maxCombos = 1;
        storedCats.forEach((cat) => {
          if (Array.isArray(cat.combos)) {
            maxCombos = Math.max(maxCombos, cat.combos.length);
          } else if (typeof cat.combos === "object" && cat.combos !== null) {
            const cArr = Object.values(cat.combos).map((v) => Number(v) || 0);
            maxCombos = Math.max(maxCombos, cArr.length);
            cat.combos = cArr;
          } else {
            cat.combos = [];
          }
        });

        setNumCombos(maxCombos);

        const mappedCats = storedCats.map((cat) => {
          const padded = Array.isArray(cat.combos) ? [...cat.combos] : [];
          while (padded.length < maxCombos) padded.push(0);
          return { ...cat, combos: padded };
        });

        let savedComboNames: string[] = [];
        if (storedCats.length > 0 && Array.isArray(storedCats[0].comboNames)) {
          savedComboNames = [...storedCats[0].comboNames];
        }
        while (savedComboNames.length < maxCombos) {
          savedComboNames.push(`COMBO ${String(savedComboNames.length + 1).padStart(2, "0")}`);
        }
        setComboNames(savedComboNames);

        setCategorias(mappedCats);
        setSavedTags(mappedCats.map((c) => c.tag));
        setOpcionaisSelecionados(config.opcionais_ativos || []);
        setOpcionaisPrecos((config.opcionais_precos as Record<string, number>) || {});

        const savedNomes = (config.opcionais_nomes as Record<string, string>) || {};
        if (Object.keys(savedNomes).length > 0) {
          setOpcionaisNomes(savedNomes);
        } else {
          const fallback: Record<string, string> = {};
          (config.opcionais_ativos || []).forEach((id: string) => {
            const item = allOpcionais.find((o: ItemOpcional) => o.id === id);
            if (item) fallback[id] = item.nome;
          });
          setOpcionaisNomes(fallback);
        }
        const counts: Record<string, number> = {};
        mappedCats.forEach((cat) => { counts[cat.tag] = cat.count; });
        setSavedCounts(counts);

        const { data: estandes } = await supabase
          .from("planilha_vendas_estandes")
          .select("id, stand_nr, cliente_id, cliente_nome_livre, tipo_venda, opcionais_selecionados, area_m2, total_override")
          .eq("config_id", config.id);
        if (estandes && estandes.length > 0) {
          setPlanilhaExiste(true);
          const standPrefixes = new Set(
            storedCats.filter((c) => c.is_stand !== false).map((c) => (c.prefix || c.tag || "").trim().toUpperCase()),
          );
          const totalStandsCount = estandes.filter((e) => {
            const prefix = e.stand_nr.split(" ")[0].toUpperCase();
            return standPrefixes.has(prefix);
          }).length;
          setTotalStands(totalStandsCount);

          const usados = new Set<string>();
          estandes.forEach((e) => {
            const sel = (e.opcionais_selecionados as Record<string, string>) || {};
            Object.entries(sel).forEach(([nome, valor]) => {
              if (valor === "x" || valor === "*") usados.add(nome);
            });
          });
          setOpcionaisUsados(usados);

          const alComDados = new Set<string>();
          mappedCats
            .filter((c) => c.tipo_precificacao === 'area_livre')
            .forEach((cat) => {
              const prefix = (cat.prefix || cat.tag || '').trim().toUpperCase();
              const temDados = (estandes as any[]).some((e) => {
                const ePrefix = e.stand_nr.split(' ')[0].toUpperCase();
                return ePrefix === prefix && (e.area_m2 != null || e.total_override != null);
              });
              if (temDados) alComDados.add(cat.tag);
            });
          setAlCategoriesWithData(alComDados);
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
  const updateCat = <K extends keyof CategoriaSetup>(idx: number, field: K, value: string | number) => {
    setCategorias((prev) =>
      prev.map((c, i) =>
        i !== idx ? c : { ...c, [field]: field === "count" || field === "standBase" ? Number(value) || 0 : value },
      ),
    );
    markDirty();
  };

  const updateCombo = (catIdx: number, ci: number, value: string | number) => {
    setCategorias((prev) =>
      prev.map((c, i) => {
        if (i !== catIdx) return c;
        const arr = Array.isArray(c.combos) ? [...c.combos] : [];
        arr[ci] = Number(value) || 0;
        return { ...c, combos: arr };
      }),
    );
    markDirty();
  };

  const updateComboAdicional = (catIdx: number, ci: number, value: string | number) => {
    setCategorias((prev) =>
      prev.map((c, i) => {
        if (i !== catIdx) return c;
        const arr = Array.isArray(c.combos_adicionais) ? [...c.combos_adicionais] : [];
        while (arr.length <= ci) arr.push(0);
        arr[ci] = Number(value) || 0;
        return { ...c, combos_adicionais: arr };
      }),
    );
    markDirty();
  };

  const addCombo = () => {
    setNumCombos((n) => n + 1);
    setComboNames((prev) => [...prev, `COMBO ${String(prev.length + 1).padStart(2, "0")}`]);
    setCategorias((prev) => prev.map((c) => ({ ...c, combos: Array.isArray(c.combos) ? [...c.combos, 0] : [0] })));
    markDirty();
  };

  const removeCombo = () => {
    if (numCombos <= 0) return;
    setNumCombos((n) => n - 1);
    setComboNames((prev) => prev.slice(0, -1));
    setCategorias((prev) => prev.map((c) => ({ ...c, combos: Array.isArray(c.combos) ? c.combos.slice(0, -1) : [] })));
    markDirty();
  };

  const handleComboNameChange = (idx: number, newName: string) => {
    setComboNames((prev) => {
      const arr = [...prev];
      arr[idx] = newName.toUpperCase();
      return arr;
    });
    markDirty();
  };

  const addCategoria = () => {
    setCategorias((prev) => {
      const maxOrdem = prev.reduce((max, cat) => Math.max(max, cat.ordem ?? 0), 0);
      return [...prev, { tag: "", prefix: "", cor: CORES[prev.length % CORES.length], count: 1, standBase: 0, combos: Array(numCombos).fill(0), ordem: maxOrdem + 1 }];
    });
    markDirty();
  };

  // Derived data
  const totalEstandes = categorias.filter((c) => c.is_stand !== false).reduce((s, c) => s + c.count, 0);

  const itensAtivos = opcionaisSelecionados
    .map((id) => {
      const catalogItem = opcionaisDisponiveis.find((o) => o.id === id);
      const snapshotNome = opcionaisNomes[id];
      if (!catalogItem && !snapshotNome) return null;
      return {
        ...(catalogItem || { id, preco_base: 0, created_at: null, tipo_padrao: null }),
        nome: snapshotNome || catalogItem?.nome || id,
      } as ItemOpcional;
    })
    .filter(Boolean) as ItemOpcional[];

  return {
    categorias, setCategorias, numCombos, comboNames, loading, saving, setSaving,
    configId, setConfigId, savedCounts, setSavedCounts, planilhaExiste, setPlanilhaExiste,
    totalStands, setTotalStands, savedTags, setSavedTags, alCategoriesWithData,
    opcionaisDisponiveis, opcionaisSelecionados, setOpcionaisSelecionados,
    opcionaisPrecos, setOpcionaisPrecos, opcionaisNomes, setOpcionaisNomes,
    opcionaisUsados, salvosOk, setSalvosOk,
    imagensConfig, setImagensConfig,
    totalEstandes, itensAtivos,
    updateCat, updateCombo, updateComboAdicional, addCombo, removeCombo,
    handleComboNameChange, addCategoria, markDirty,
  };
}
