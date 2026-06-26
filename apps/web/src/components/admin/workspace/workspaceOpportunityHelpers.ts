import type { WorkspaceOpportunity } from './useWorkspaceOpportunities';

export interface WorkspaceChatHandoff {
  opportunityId: string;
  promptKey: string;
  contextLabel: string;
  title: string;
  count?: number;
}

export function opportunityContextLabel(item: WorkspaceOpportunity, title: string): string {
  if (item.count != null && item.count > 0) {
    return `${item.count} · ${title}`;
  }
  return title;
}

export function pickPrimaryChatOpportunity(
  items: WorkspaceOpportunity[],
  titleFor: (item: WorkspaceOpportunity) => string
): WorkspaceChatHandoff | null {
  const candidate = items.find(
    item => (item.action === 'chat' || item.action === 'both') && item.chatPromptKey
  );
  if (!candidate?.chatPromptKey) return null;
  const title = titleFor(candidate);
  return {
    opportunityId: candidate.id,
    promptKey: candidate.chatPromptKey,
    contextLabel: opportunityContextLabel(candidate, title),
    title,
    count: candidate.count,
  };
}

export function buildSituationSummary(
  items: WorkspaceOpportunity[],
  titleFor: (item: WorkspaceOpportunity) => string,
  joiner: string
): string | null {
  const urgent = items
    .filter(item => item.priority <= 1 && item.action !== 'navigate')
    .slice(0, 2)
    .map(item => {
      const title = titleFor(item);
      return item.count != null && item.count > 0 ? `${item.count} ${title}` : title;
    });
  if (urgent.length === 0) return null;
  return urgent.join(joiner);
}

const ORDER_OPPORTUNITY_IDS = new Set(['pending-orders', 'fulfill-orders', 'disputed-orders']);

export function workspaceHasOrderOpportunities(items: WorkspaceOpportunity[]): boolean {
  return items.some(item => ORDER_OPPORTUNITY_IDS.has(item.id));
}

export function workspaceNeedsProductImport(items: WorkspaceOpportunity[]): boolean {
  return items.some(item => item.id === 'no-products');
}
