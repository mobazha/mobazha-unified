import type { CSSProperties, KeyboardEvent } from 'react';
import { useState, useCallback, useRef } from 'react';
import { isAuthenticated, getStoredToken } from '@mobazha/core/services/auth/token';
import { searchListings } from '@mobazha/core/services/api/products';
import type { ProductListItem } from '@mobazha/core/types/product';
import { getImageUrl } from '@mobazha/core/services/api/config';
import { WEB_APP_ORIGIN } from '../shared/init';

export function PopupApp() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const authenticated = isAuthenticated();

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const resp = await searchListings({ query: q, pageSize: 8 });
      setResults(resp.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
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
        <div>
          <div style={styles.brand}>Mobazha</div>
          <div style={styles.tagline}>Sell Without Middlemen</div>
        </div>
        {authenticated && (
          <div
            style={styles.authBadge}
            title={getStoredToken()?.startsWith('basic:') ? 'Basic Auth' : 'Bearer Token'}
          >
            ●
          </div>
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
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products..."
            style={styles.searchInput}
            autoFocus
          />
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
          {loading ? (
            <span style={styles.spinner} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Error */}
      {error && <div style={styles.errorBar}>{error}</div>}

      {/* Results / States */}
      <div style={styles.resultsArea}>
        {loading && results.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.spinner} />
            <span style={{ color: '#94a3b8' }}>Searching...</span>
          </div>
        )}

        {!loading && searched && results.length === 0 && !error && (
          <div style={styles.emptyState}>
            <span style={{ fontSize: '24px' }}>🔍</span>
            <span style={{ color: '#64748b', fontSize: '13px' }}>No products found</span>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Try different keywords</span>
          </div>
        )}

        {!searched && !loading && (
          <div style={styles.emptyState}>
            <span style={{ fontSize: '24px' }}>🛍️</span>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Search the marketplace</span>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>
              Zero fees · Buyer protection · 6 chains + fiat
            </span>
          </div>
        )}

        {results.length > 0 && (
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
                  <div
                    style={{
                      ...styles.productThumb,
                      background: '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontSize: '12px',
                    }}
                  >
                    No img
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
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        {!authenticated && (
          <button onClick={() => openTab()} style={styles.ctaBtn}>
            Sign In to Mobazha
          </button>
        )}
        <div style={styles.footerActions}>
          <button onClick={openSidePanel} style={styles.footerBtn}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zM4.25 3.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h7.25V3.5H4.25z"
                clipRule="evenodd"
              />
            </svg>
            Side Panel
          </button>
          <button onClick={() => openTab()} style={styles.footerBtn}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
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
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px 10px',
    borderBottom: '1px solid #f1f5f9',
  },
  logo: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 700,
    flexShrink: 0,
  },
  brand: { fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' },
  tagline: { fontSize: '11px', color: '#94a3b8', lineHeight: '1.3' },
  authBadge: {
    marginLeft: 'auto',
    color: '#22c55e',
    fontSize: '10px',
    cursor: 'default',
  },

  searchRow: { display: 'flex', gap: '6px', padding: '10px 16px' },
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
    padding: '8px 10px 8px 30px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box' as const,
  },
  searchBtn: {
    padding: '8px 12px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
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

  errorBar: {
    margin: '0 16px',
    padding: '8px 12px',
    background: '#fef2f2',
    borderRadius: '6px',
    color: '#991b1b',
    fontSize: '12px',
  },

  resultsArea: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0 16px',
    minHeight: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '32px 0',
    textAlign: 'center' as const,
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    paddingBottom: '8px',
  },
  productCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    background: '#f8fafc',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  productThumb: {
    width: '44px',
    height: '44px',
    borderRadius: '6px',
    objectFit: 'cover' as const,
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

  footer: {
    borderTop: '1px solid #f1f5f9',
    padding: '10px 16px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  ctaBtn: {
    width: '100%',
    padding: '10px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  footerActions: {
    display: 'flex',
    gap: '8px',
  },
  footerBtn: {
    flex: 1,
    padding: '6px 8px',
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
