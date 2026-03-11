import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Hook para gerenciar estado de alterações não salvas.
 * Exibe aviso do browser ao fechar/recarregar, e controla navegação segura.
 */
export function useDirtyState() {
  const navigate = useNavigate();
  const [isDirty, setIsDirty] = useState(false);
  const [showDirtyModal, setShowDirtyModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Avisa o browser ao fechar/recarregar aba
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /** Navega para `to` se não há alterações, ou mostra modal */
  const safeNavigate = useCallback(
    (to: string) => {
      if (isDirty) {
        setPendingAction(() => () => navigate(to));
        setShowDirtyModal(true);
      } else {
        navigate(to);
      }
    },
    [isDirty, navigate],
  );

  /** Guarda uma ação arbitrária (não apenas navegação) */
  const guardAction = useCallback(
    (action: () => void) => {
      if (isDirty) {
        setPendingAction(() => action);
        setShowDirtyModal(true);
      } else {
        action();
      }
    },
    [isDirty],
  );

  /** Confirma saída: executa ação pendente e limpa estado */
  const confirmDiscard = useCallback(() => {
    setIsDirty(false);
    setShowDirtyModal(false);
    if (pendingAction) pendingAction();
    setPendingAction(null);
  }, [pendingAction]);

  /** Cancela saída */
  const cancelDiscard = useCallback(() => {
    setShowDirtyModal(false);
    setPendingAction(null);
  }, []);

  /** Marca como salvo (limpa dirty) */
  const markClean = useCallback(() => setIsDirty(false), []);
  /** Marca como alterado */
  const markDirty = useCallback(() => setIsDirty(true), []);

  return {
    isDirty,
    showDirtyModal,
    markDirty,
    markClean,
    safeNavigate,
    guardAction,
    confirmDiscard,
    cancelDiscard,
  };
}
