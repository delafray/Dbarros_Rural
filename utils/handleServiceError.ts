/**
 * Utility para tratamento padronizado de erros de servico.
 * Substitui o pattern repetido: catch (err) { appDialog.alert({ title: 'Erro', message: ... }) }
 */
export function handleServiceError(
  err: unknown,
  action: string,
  appDialog: { alert: (opts: { title: string; message: string; type: string }) => Promise<void> },
): void {
  const msg = err instanceof Error ? err.message : String(err);
  void appDialog.alert({
    title: "Erro",
    message: `${action}: ${msg}`,
    type: "danger",
  });
}
