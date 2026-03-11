import { useState, useMemo } from "react";
import { PlanilhaEstande, CategoriaSetup } from "../services/planilhaVendasService";
import { ClienteComContatos } from "../services/clientesService";

export type FilterStatus = "todos" | "pendente" | "parcial" | "completo";
export type RowStatus = "sem_config" | "pendente" | "parcial" | "completo";

function simplify(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

const naturalSort = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

interface UseControleFiltersParams {
  activeEstandes: PlanilhaEstande[];
  clientes: ClienteComContatos[];
  categorias: CategoriaSetup[];
  getCategoriaOfRow: (row: PlanilhaEstande) => CategoriaSetup | undefined;
  getRowStatus: (row: PlanilhaEstande) => RowStatus;
}

export function useControleFilters({
  activeEstandes,
  clientes,
  categorias,
  getCategoriaOfRow,
  getRowStatus,
}: UseControleFiltersParams) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("todos");

  const filteredEstandes = useMemo(() => {
    let result = [...activeEstandes];

    result.sort((a, b) => {
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

    if (searchTerm.trim()) {
      const q = simplify(searchTerm);
      result = result.filter((row) => {
        if (simplify(row.stand_nr).includes(q)) return true;
        const cliente = clientes.find((c) => c.id === row.cliente_id);
        const nome = cliente
          ? cliente.nome_fantasia ||
            (cliente.tipo_pessoa === "PJ"
              ? cliente.razao_social || ""
              : cliente.nome_completo || "")
          : row.cliente_nome_livre || "";
        return simplify(nome).includes(q);
      });
    }

    if (filterStatus !== "todos") {
      result = result.filter((row) => {
        const s = getRowStatus(row);
        if (filterStatus === "pendente") return s === "pendente" || s === "sem_config";
        if (filterStatus === "parcial") return s === "parcial";
        if (filterStatus === "completo") return s === "completo";
        return true;
      });
    }

    return result;
  }, [activeEstandes, searchTerm, filterStatus, getCategoriaOfRow, categorias, clientes, getRowStatus]);

  const counts = useMemo(() => {
    const pendente = activeEstandes.filter((e) => {
      const s = getRowStatus(e);
      return s === "pendente" || s === "sem_config";
    }).length;
    const parcial = activeEstandes.filter((e) => getRowStatus(e) === "parcial").length;
    const completo = activeEstandes.filter((e) => getRowStatus(e) === "completo").length;
    return { pendente, parcial, completo, total: activeEstandes.length };
  }, [activeEstandes, getRowStatus]);

  return {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filteredEstandes,
    counts,
  };
}
