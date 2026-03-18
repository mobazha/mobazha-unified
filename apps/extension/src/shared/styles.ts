import type { CSSProperties } from 'react';

export const colors = {
  bg: '#fff',
  bgSubtle: '#f8fafc',
  bgMuted: '#f1f5f9',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  accent: '#3b82f6',
  accentGreen: '#22c55e',
  accentGreenBg: '#f0fdf4',
  accentGreenText: '#166534',
  errorBg: '#fef2f2',
  errorText: '#991b1b',
  btnPrimary: '#0f172a',
  white: '#fff',
};

export const font = {
  xs: '10px',
  sm: '11px',
  base: '12px',
  md: '13px',
  lg: '14px',
  xl: '15px',
  family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  pill: '14px',
  full: '50%',
};

export const shared: Record<string, CSSProperties> = {
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexCol: {
    display: 'flex',
    flexDirection: 'column',
  },
};
