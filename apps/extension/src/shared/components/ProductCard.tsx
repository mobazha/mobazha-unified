import type { CSSProperties } from 'react';
import type { ProductListItem } from '@mobazha/core/types/product';
import { getImageUrl } from '@mobazha/core/services/api/config';
import { colors, font, radius } from '../styles';

interface ProductCardProps {
  item: ProductListItem;
  onClick: () => void;
  /** compact = popup list row, grid = side-panel card */
  variant?: 'compact' | 'grid';
}

export function ProductCard({ item, onClick, variant = 'compact' }: ProductCardProps) {
  if (variant === 'grid') return <GridCard item={item} onClick={onClick} />;
  return <CompactCard item={item} onClick={onClick} />;
}

function CompactCard({ item, onClick }: { item: ProductListItem; onClick: () => void }) {
  return (
    <div
      style={compact.card}
      onClick={onClick}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = colors.bgMuted)}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = colors.bgSubtle)}
    >
      <Thumbnail src={item.thumbnail?.small} size={42} />
      <div style={compact.info}>
        <div style={compact.title}>{item.title || 'Untitled'}</div>
        {item.vendorName && <div style={compact.vendor}>{item.vendorName}</div>}
        <PriceBadge price={item.price} />
      </div>
      <ChevronIcon />
    </div>
  );
}

function GridCard({ item, onClick }: { item: ProductListItem; onClick: () => void }) {
  return (
    <div
      style={grid.card}
      onClick={onClick}
      onMouseEnter={e =>
        ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')
      }
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = 'none')}
    >
      <Thumbnail src={item.thumbnail?.small} size={0} style={grid.thumb} />
      <div style={grid.body}>
        <div style={grid.title}>{item.title || 'Untitled'}</div>
        {item.vendorName && <div style={grid.vendor}>{item.vendorName}</div>}
        <PriceBadge price={item.price} />
      </div>
    </div>
  );
}

function Thumbnail({
  src,
  size,
  style: extraStyle,
}: {
  src?: string;
  size: number;
  style?: CSSProperties;
}) {
  const imgUrl = src ? getImageUrl(src) : null;
  const base: CSSProperties = {
    width: size || undefined,
    height: size || undefined,
    borderRadius: radius.sm,
    objectFit: 'cover',
    flexShrink: 0,
    ...extraStyle,
  };

  if (imgUrl) return <img src={imgUrl} alt="" style={base} loading="lazy" />;

  return (
    <div
      style={{
        ...base,
        background: colors.border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textFaint,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    </div>
  );
}

const FIAT_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
};

function formatDisplayPrice(price?: ProductListItem['price']): string {
  if (!price?.amount) return '';
  const divisibility = price.currency?.divisibility ?? 2;
  const displayAmount = price.amount / Math.pow(10, divisibility);
  const code = price.currency?.code ?? '';

  const symbol = FIAT_SYMBOLS[code];
  if (symbol) {
    const decimals = code === 'JPY' ? 0 : 2;
    return `${symbol}${displayAmount.toFixed(decimals)}`;
  }

  if (!code) {
    return '';
  }

  const trimmed = displayAmount.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  return `${trimmed} ${code}`;
}

function PriceBadge({ price }: { price?: ProductListItem['price'] }) {
  const formatted = formatDisplayPrice(price);
  if (!formatted)
    return <div style={{ fontSize: font.base, color: colors.textFaint }}>Price unavailable</div>;
  return (
    <div style={{ fontSize: font.base, fontWeight: 600, color: colors.accent }}>{formatted}</div>
  );
}

function ChevronIcon() {
  return (
    <svg
      style={{ width: '16px', height: '16px', color: '#cbd5e1', flexShrink: 0 }}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const compact: Record<string, CSSProperties> = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '7px 8px',
    background: colors.bgSubtle,
    borderRadius: radius.md,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  info: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  title: {
    fontSize: font.md,
    fontWeight: 600,
    color: colors.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  vendor: {
    fontSize: font.sm,
    color: colors.textFaint,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

const grid: Record<string, CSSProperties> = {
  card: {
    borderRadius: radius.md,
    background: colors.white,
    border: `1px solid ${colors.borderLight}`,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
  },
  thumb: {
    width: '100%',
    height: '140px',
    objectFit: 'cover',
  },
  body: {
    padding: '8px 10px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: font.md,
    fontWeight: 600,
    color: colors.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  vendor: {
    fontSize: font.sm,
    color: colors.textFaint,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
