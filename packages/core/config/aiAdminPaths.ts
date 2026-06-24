/** Admin UI path for AI model / provider configuration. */
export function getAdminAiModelsPath(aiWorkspaceEnabled: boolean): string {
  return aiWorkspaceEnabled ? '/admin/ai/models' : '/admin/settings/integrations?tab=ai';
}
