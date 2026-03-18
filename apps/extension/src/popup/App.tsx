import type { CSSProperties, KeyboardEvent } from 'react';
import { useState, useCallback } from 'react';
import { isAuthenticated } from '@mobazha/core/services/auth/token';
import { searchListings } from '@mobazha/core/services/api/products';
import type { ProductListItem } from '@mobazha/core/types/product';
import { getImageUrl } from '@mobazha/core/services/api/config';
import { WEB_APP_ORIGIN } from '../shared/init';

interface QuickFilter {
  label: string;
  query: string;
  sortBy?: string;
  type?: string;
}

const QUICK_FILTERS: QuickFilter[] = [
  { label: '🔥 Latest', query: '*', sortBy: 'recently-added' },
  { label: '📦 Physical', query: '*', type: 'PHYSICAL_GOOD' },
  { label: '💾 Digital', query: '*', type: 'DIGITAL_GOOD' },
  { label: '🛠 Services', query: '*', type: 'SERVICE' },
];

export function PopupApp() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState<number | null>(null);
  const authenticated = isAuthenticated();

  const doSearch = useCallback(async (opts: { query: string; sortBy?: string; type?: string }) => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const resp = await searchListings({
        query: opts.query || '*',
        pageSize: 8,
        sortBy: opts.sortBy,
        type: opts.type,
      });
      setResults(resp.products);
      setTotal(resp.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setActiveFilter(null);
    doSearch({ query: q });
  }, [query, doSearch]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
  );

  const handleQuickFilter = useCallback(
    (index: number) => {
      const f = QUICK_FILTERS[index];
      setActiveFilter(index);
      setQuery('');
      doSearch({ query: f.query, sortBy: f.sortBy, type: f.type });
    },
    [doSearch]
  );

  const openTab = (path = '') => {
    chrome.tabs.create({ url: `${WEB_APP_ORIGIN}${path}` });
  };

  const openSidePanel = async () => {
    try {
      const win = await chrome.windows.getCurrent();
      await chrome.sidePanel?.open?.({ windowId: win.id! });
    } catch {
      openTab();
    }
  };

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>M</div>
        <div style={{ flex: 1 }}>
          <div style={styles.brand}>Mobazha</div>
          <div style={styles.tagline}>Sell Without Middlemen</div>
        </div>
        {authenticated ? (
          <div style={styles.authChip}>
            <span style={styles.authDot} />
            Connected
          </div>
        ) : (
          <button onClick={() => openTab()} style={styles.signinBtn}>
            Sign In
          </button>
        )}
      </div>

      {/* Search */}
      <div style={styles.searchRow}>
        <div style={styles.searchInputWrap}>
          <svg style={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              if (activeFilter !== null) setActiveFilter(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search products..."
            style={styles.searchInput}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} style={styles.clearBtn} aria-label="Clear search">
              ×
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          style={{
            ...styles.searchBtn,
            opacity: loading || !query.trim() ? 0.5 : 1,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? <span style={styles.spinner} /> : 'Go'}
        </button>
      </div>

      {/* Quick filters */}
      <div style={styles.filtersRow}>
        {QUICK_FILTERS.map((f, i) => (
          <button
            key={f.label}
            onClick={() => handleQuickFilter(i)}
            style={{
              ...styles.filterChip,
              ...(activeFilter === i ? styles.filterChipActive : {}),
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <div style={styles.errorBar}>{error}</div>}

      {/* Results area */}
      <div style={styles.resultsArea}>
        {/* Loading overlay on existing results */}
        {loading && results.length > 0 && <div style={styles.loadingOverlay} />}

        {/* Initial loading */}
        {loading && results.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.spinnerDark} />
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Searching...</span>
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && !error && (
          <div style={styles.emptyState}>
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
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
              No products found
            </span>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>
              Try different keywords or filters
            </span>
          </div>
        )}

        {/* Welcome state */}
        {!searched && !loading && (
          <div style={styles.emptyState}>
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
            <span style={{ color: '#475569', fontSize: '14px', fontWeight: 600 }}>
              Explore the marketplace
            </span>
            <span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.4' }}>
              Search or tap a filter above to browse
            </span>
            <div style={styles.trustPills}>
              <span style={styles.pill}>Zero Fees</span>
              <span style={styles.pill}>Buyer Protection</span>
              <span style={styles.pill}>6 Chains + Fiat</span>
            </div>
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <>
            {/* Result count */}
            <div style={styles.resultMeta}>
              {total > results.length
                ? `Showing ${results.length} of ${total}`
                : `${results.length} products`}
              {total > results.length && (
                <button onClick={() => openTab('/search')} style={styles.viewAllBtn}>
                  View all →
                </button>
              )}
            </div>
            <div style={styles.resultsList}>
              {results.map((item, i) => (
                <div
                  key={`${item.slug}-${i}`}
                  style={styles.productCard}
                  onClick={() => openTab(`/listing/${item.slug}`)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = '#f1f5f9';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = '#f8fafc';
                  }}
                >
                  {item.thumbnail?.small ? (
                    <img
                      src={getImageUrl(item.thumbnail.small) ?? ''}
                      alt=""
                      style={styles.productThumb}
                      loading="lazy"
                    />
                  ) : (
                    <div style={styles.thumbPlaceholder}>
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
                  )}
                  <div style={styles.productInfo}>
                    <div style={styles.productTitle}>{item.title || 'Untitled'}</div>
                    {item.vendorName && <div style={styles.productVendor}>{item.vendorName}</div>}
                    <div style={styles.productPrice}>
                      {item.price?.amount != null
                        ? `${item.price.amount} ${item.price.currency?.code ?? ''}`
                        : 'Price unavailable'}
                    </div>
                  </div>
                  <svg style={styles.chevron} viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        {authenticated && (
          <div style={styles.quickActions}>
            <button onClick={() => openTab('/orders')} style={styles.quickActionBtn}>
              📋 Orders
            </button>
            <button onClick={() => openTab('/store')} style={styles.quickActionBtn}>
              🏪 My Store
            </button>
            <button onClick={() => openTab('/wallet')} style={styles.quickActionBtn}>
              💰 Wallet
            </button>
          </div>
        )}
        <div style={styles.footerActions}>
          <button onClick={openSidePanel} style={styles.footerBtn}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zM4.25 3.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h7.25V3.5H4.25z"
                clipRule="evenodd"
              />
            </svg>
            Side Panel
          </button>
          <button onClick={() => openTab()} style={styles.footerBtn}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                clipRule="evenodd"
              />
            </svg>
            Full Site
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '480px',
    background: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  logo: {
    width: '30px',
    height: '30px',
    borderRadius: '7px',
    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 700,
    flexShrink: 0,
  },
  brand: { fontSize: '15px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' },
  tagline: { fontSize: '11px', color: '#94a3b8', lineHeight: '1.3' },
  authChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    background: '#f0fdf4',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#166534',
    fontWeight: 500,
    flexShrink: 0,
  },
  authDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#22c55e',
    display: 'inline-block',
  },
  signinBtn: {
    padding: '5px 14px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },

  // Search
  searchRow: { display: 'flex', gap: '6px', padding: '10px 16px 6px' },
  searchInputWrap: {
    flex: 1,
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '10px',
    width: '14px',
    height: '14px',
    color: '#94a3b8',
    pointerEvents: 'none' as const,
  },
  searchInput: {
    width: '100%',
    padding: '7px 28px 7px 30px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box' as const,
  },
  clearBtn: {
    position: 'absolute' as const,
    right: '6px',
    width: '20px',
    height: '20px',
    border: 'none',
    background: '#e2e8f0',
    borderRadius: '50%',
    color: '#64748b',
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
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
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
    borderTopColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.6s linear infinite',
  },
  spinnerDark: {
    width: '20px',
    height: '20px',
    border: '2px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.6s linear infinite',
  },

  // Filters
  filtersRow: {
    display: 'flex',
    gap: '6px',
    padding: '0 16px 10px',
    overflowX: 'auto' as const,
  },
  filterChip: {
    padding: '4px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    background: '#fff',
    fontSize: '11px',
    color: '#475569',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  filterChipActive: {
    background: '#0f172a',
    color: '#fff',
    borderColor: '#0f172a',
  },

  // Error
  errorBar: {
    margin: '0 16px 8px',
    padding: '8px 12px',
    background: '#fef2f2',
    borderRadius: '6px',
    color: '#991b1b',
    fontSize: '12px',
  },

  // Results
  resultsArea: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0 16px',
    minHeight: 0,
    position: 'relative' as const,
  },
  loadingOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(255,255,255,0.6)',
    zIndex: 10,
    borderRadius: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '28px 0',
    textAlign: 'center' as const,
  },
  trustPills: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  pill: {
    padding: '3px 8px',
    background: '#f8fafc',
    border: '1px solid #f1f5f9',
    borderRadius: '10px',
    fontSize: '10px',
    color: '#64748b',
  },
  resultMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0 8px',
    fontSize: '11px',
    color: '#94a3b8',
  },
  viewAllBtn: {
    border: 'none',
    background: 'none',
    color: '#3b82f6',
    fontSize: '11px',
    cursor: 'pointer',
    padding: 0,
    fontWeight: 500,
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '3px',
    paddingBottom: '8px',
  },
  productCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '7px 8px',
    background: '#f8fafc',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  productThumb: {
    width: '42px',
    height: '42px',
    borderRadius: '6px',
    objectFit: 'cover' as const,
    flexShrink: 0,
  },
  thumbPlaceholder: {
    width: '42px',
    height: '42px',
    borderRadius: '6px',
    background: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    flexShrink: 0,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
  },
  productTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  productVendor: {
    fontSize: '11px',
    color: '#94a3b8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  productPrice: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#3b82f6',
  },
  chevron: {
    width: '16px',
    height: '16px',
    color: '#cbd5e1',
    flexShrink: 0,
  },

  // Footer
  footer: {
    borderTop: '1px solid #f1f5f9',
    padding: '8px 16px 10px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  quickActions: {
    display: 'flex',
    gap: '6px',
  },
  quickActionBtn: {
    flex: 1,
    padding: '6px 4px',
    background: '#f8fafc',
    border: '1px solid #f1f5f9',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#334155',
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  footerActions: {
    display: 'flex',
    gap: '6px',
  },
  footerBtn: {
    flex: 1,
    padding: '5px 8px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
};
