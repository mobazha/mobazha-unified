const STORAGE_KEY = 'mobazha_workspace_import_run_id';

export function getWorkspaceImportRunId(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setWorkspaceImportRunId(runId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, runId);
}

export function clearWorkspaceImportRunId(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
