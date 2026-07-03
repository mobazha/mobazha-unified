export interface SettlementStatusDisplay {
  label: string;
  className: string;
}

const UNKNOWN_STATE: SettlementStatusDisplay = {
  label: 'Settlement',
  className: 'bg-muted text-muted-foreground border-transparent',
};

export function resolveSettlementStatusDisplay(state?: string): SettlementStatusDisplay | null {
  const normalized = (state || '').trim().toLowerCase();
  if (!normalized) return null;

  switch (normalized) {
    case 'submitting':
      return {
        label: 'Settlement: submitting',
        className:
          'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
      };
    case 'submitted':
      return {
        label: 'Settlement: submitted',
        className:
          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
      };
    case 'confirmed':
      return {
        label: 'Settlement: confirmed',
        className:
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
      };
    case 'failed':
      return {
        label: 'Settlement: failed',
        className: 'bg-destructive/10 text-destructive border-destructive/20',
      };
    case 'abandoned':
      return {
        label: 'Settlement: timed out',
        className: 'bg-destructive/10 text-destructive border-destructive/20',
      };
    default:
      return {
        label: `Settlement: ${normalized.replace(/_/g, ' ')}`,
        className: UNKNOWN_STATE.className,
      };
  }
}
