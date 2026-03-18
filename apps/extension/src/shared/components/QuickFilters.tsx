import type { CSSProperties } from 'react';
import { colors, font, radius } from '../styles';

export interface QuickFilter {
  label: string;
  query: string;
  sortBy?: string;
  type?: string;
}

export const QUICK_FILTERS: QuickFilter[] = [
  { label: '🔥 Latest', query: '*', sortBy: 'recently-added' },
  { label: '📦 Physical', query: '*', type: 'PHYSICAL_GOOD' },
  { label: '💾 Digital', query: '*', type: 'DIGITAL_GOOD' },
  { label: '🛠 Services', query: '*', type: 'SERVICE' },
];

interface QuickFiltersProps {
  activeIndex: number | null;
  onSelect: (index: number) => void;
}

export function QuickFilters({ activeIndex, onSelect }: QuickFiltersProps) {
  return (
    <div style={styles.row}>
      {QUICK_FILTERS.map((f, i) => (
        <button
          key={f.label}
          onClick={() => onSelect(i)}
          style={{
            ...styles.chip,
            ...(activeIndex === i ? styles.chipActive : {}),
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  row: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
  },
  chip: {
    padding: '4px 10px',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.pill,
    background: colors.white,
    fontSize: font.sm,
    color: colors.textSecondary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  chipActive: {
    background: colors.btnPrimary,
    color: colors.white,
    borderColor: colors.btnPrimary,
  },
};
