import React, { useState, useEffect, useRef } from "react";
import { PlanilhaEstande } from "../services/planilhaVendasService";
import { supabase } from "../services/supabaseClient";
import { mesclarEcoRealtime } from "../utils/escritasLocais";

export function usePlanilhaRealtime(
  configId: string | undefined,
  setRows: React.Dispatch<React.SetStateAction<PlanilhaEstande[]>>,
) {
  const [realtimeToast, setRealtimeToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!configId) return;

    const channel = supabase
      .channel(`planilha_realtime_${configId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planilha_vendas_estandes",
          filter: `config_id=eq.${configId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRows((prev) => {
              if (prev.some((r) => r.id === (payload.new as any).id)) return prev;
              return [...prev, payload.new as PlanilhaEstande];
            });
          } else if (payload.eventType === "UPDATE") {
            // Campos que ESTE navegador acabou de gravar não são sobrescritos pelo eco
            // (evita o vai-e-volta em cliques rápidos na célula/estande).
            setRows((prev) => {
              let mudou = false;
              const prox = prev.map((r) => {
                if (r.id !== (payload.new as any).id) return r;
                const m = mesclarEcoRealtime(r, payload.new as Partial<PlanilhaEstande>);
                if (m !== r) mudou = true;
                return m;
              });
              return mudou ? prox : prev;
            });
          } else if (payload.eventType === "DELETE") {
            setRows((prev) =>
              prev.filter((r) => r.id !== (payload.old as { id: string }).id),
            );
          }
          setRealtimeToast(true);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setRealtimeToast(false), 3000);
        },
      )
      .subscribe();

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [configId, setRows]);

  return { realtimeToast };
}
