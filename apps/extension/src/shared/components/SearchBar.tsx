import type { CSSProperties, KeyboardEvent } from 'react';
import { colors, font, radius } from '../styles';

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  /** When provided, shows a "clear all" X that resets entire search state */
  onClear?: () => void;
}

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  loading,
  autoFocus,
  placeholder = 'Search products...',
  onClear,
}: SearchBarProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  const disabled = loading || !query.trim();

  return (
    <div style={styles.row}>
      <div style={styles.inputWrap}>
        <svg style={styles.icon} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={styles.input}
          autoFocus={autoFocus}
        />
        {(query || onClear) && (
          <button
            onClick={() => {
              if (onClear) {
                onClear();
                return;
              }
              onQueryChange('');
            }}
            style={styles.clearBtn}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <button
        onClick={onSearch}
        disabled={disabled}
        style={{
          ...styles.searchBtn,
          opacity: disabled ? 0.5 : 1,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? <span style={styles.spinner} /> : 'Go'}
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  row: { display: 'flex', gap: '6px' },
  inputWrap: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: '10px',
    width: '14px',
    height: '14px',
    color: colors.textFaint,
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '7px 28px 7px 30px',
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    fontSize: font.md,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: '6px',
    width: '20px',
    height: '20px',
    border: 'none',
    background: colors.border,
    borderRadius: radius.full,
    color: colors.textMuted,
    fontSize: '14px',
    lineHeight: '1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  searchBtn: {
    padding: '7px 14px',
    background: colors.btnPrimary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.md,
    fontSize: font.md,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: colors.white,
    borderRadius: radius.full,
    display: 'inline-block',
    animation: 'spin 0.6s linear infinite',
  },
};
