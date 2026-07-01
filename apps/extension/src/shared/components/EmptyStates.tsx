import type { CSSProperties } from 'react';
import { colors, font, radius } from '../styles';

const stateBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '28px 16px',
  textAlign: 'center',
};

export function LoadingState() {
  return (
    <div style={stateBase}>
      <div style={styles.spinner} />
      <span style={{ color: colors.textFaint, fontSize: font.md }}>Searching...</span>
    </div>
  );
}

export function NoResultsState() {
  return (
    <div style={stateBase}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1.5"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M8 11h6" />
      </svg>
      <span style={{ color: colors.textMuted, fontSize: font.md, fontWeight: 500 }}>
        No products found
      </span>
      <span style={{ color: colors.textFaint, fontSize: font.base }}>
        Try different keywords or filters
      </span>
    </div>
  );
}

export function WelcomeState() {
  return (
    <div style={stateBase}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.5"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      <span style={{ color: colors.textSecondary, fontSize: font.lg, fontWeight: 600 }}>
        Explore the marketplace
      </span>
      <span style={{ color: colors.textFaint, fontSize: font.base, lineHeight: '1.4' }}>
        Search or tap a filter above to browse
      </span>
      <div style={styles.pills}>
        <span style={styles.pill}>Zero Fees</span>
        <span style={styles.pill}>Buyer Protection</span>
        <span style={styles.pill}>6 Chains + Fiat</span>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  spinner: {
    width: '20px',
    height: '20px',
    border: `2px solid ${colors.border}`,
    borderTopColor: colors.accent,
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.6s linear infinite',
  },
  pills: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    padding: '3px 8px',
    background: colors.bgSubtle,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: radius.lg,
    fontSize: font.xs,
    color: colors.textMuted,
  },
};
