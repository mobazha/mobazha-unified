import type { CSSProperties } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { isAuthenticated } from '@mobazha/core/services/auth/token';
import { searchListings } from '@mobazha/core/services/api/products';
import type { ProductListItem } from '@mobazha/core/types/product';
import { WEB_APP_ORIGIN } from '../shared/init';
import { colors, font, radius } from '../shared/styles';
import { SearchBar } from '../shared/components/SearchBar';
import { ProductCard } from '../shared/components/ProductCard';
import { QuickFilters, QUICK_FILTERS } from '../shared/components/QuickFilters';
import { LoadingState, NoResultsState, WelcomeState } from '../shared/components/EmptyStates';

const PAGE_SIZE = 20;

export function SidePanelApp() {
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
        pageSize: PAGE_SIZE,
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

  useEffect(() => {
    doSearch({ query: '*', sortBy: 'recently-added' });
    setActiveFilter(0);
  }, [doSearch]);

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setActiveFilter(null);
    doSearch({ query: q });
  }, [query, doSearch]);

  const handleQuickFilter = useCallback(
    (index: number) => {
      setActiveFilter(index);
      setQuery('');
      const f = QUICK_FILTERS[index];
      doSearch({ query: f.query, sortBy: f.sortBy, type: f.type });
    },
    [doSearch]
  );

  const openTab = (path = '') => chrome.tabs.create({ url: `${WEB_APP_ORIGIN}${path}` });

  return (
    <div style={styles.root}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <div style={styles.logo}>M</div>
          <span style={styles.brand}>Mobazha</span>
        </div>
        <div style={styles.topRight}>
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
          <button onClick={() => openTab()} style={styles.openSiteBtn} title="Open full site">
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
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={styles.searchSection}>
        <SearchBar
          query={query}
          onQueryChange={v => {
            setQuery(v);
            if (activeFilter !== null) setActiveFilter(null);
          }}
          onSearch={handleSearch}
          loading={loading}
          autoFocus
        />
        <div style={{ marginTop: '8px' }}>
          <QuickFilters activeIndex={activeFilter} onSelect={handleQuickFilter} />
        </div>
      </div>

      {/* Quick nav for authenticated users */}
      {authenticated && (
        <div style={styles.navRow}>
          <NavButton label="Orders" icon="📋" onClick={() => openTab('/orders')} />
          <NavButton label="My Store" icon="🏪" onClick={() => openTab('/store')} />
          <NavButton label="Wallet" icon="💰" onClick={() => openTab('/wallet')} />
          <NavButton label="Chat" icon="💬" onClick={() => openTab('/chat')} />
        </div>
      )}

      {/* Error */}
      {error && <div style={styles.errorBar}>{error}</div>}

      {/* Content */}
      <div style={styles.content}>
        {loading && results.length > 0 && <div style={styles.loadingOverlay} />}
        {loading && results.length === 0 && <LoadingState />}
        {!loading && searched && results.length === 0 && !error && <NoResultsState />}
        {!searched && !loading && <WelcomeState />}

        {results.length > 0 && (
          <>
            <div style={styles.resultMeta}>
              <span>
                {total > results.length
                  ? `Showing ${results.length} of ${total}`
                  : `${results.length} products`}
              </span>
              {total > results.length && (
                <button onClick={() => openTab('/search')} style={styles.viewAllBtn}>
                  View all →
                </button>
              )}
            </div>
            <div style={styles.grid}>
              {results.map((item, i) => (
                <ProductCard
                  key={`${item.slug}-${i}`}
                  item={item}
                  variant="grid"
                  onClick={() => openTab(`/listing/${item.slug}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={{ color: colors.textFaint, fontSize: font.xs }}>
          Zero Fees · Buyer Protection · 6 Chains + Fiat
        </span>
      </div>
    </div>
  );
}

function NavButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={styles.navBtn}
      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = colors.bgMuted)}
      onMouseLeave={e =>
        ((e.currentTarget as HTMLButtonElement).style.background = colors.bgSubtle)
      }
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{ fontSize: font.sm, color: colors.textSecondary }}>{label}</span>
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: colors.bg,
    fontFamily: font.family,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: `1px solid ${colors.borderLight}`,
  },
  topLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  logo: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    color: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: font.lg,
    fontWeight: 700,
  },
  brand: { fontSize: font.xl, fontWeight: 700, color: colors.text },
  topRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  authChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    background: colors.accentGreenBg,
    borderRadius: radius.lg,
    fontSize: font.sm,
    color: colors.accentGreenText,
    fontWeight: 500,
  },
  authDot: {
    width: '6px',
    height: '6px',
    borderRadius: radius.full,
    background: colors.accentGreen,
  },
  signinBtn: {
    padding: '5px 14px',
    background: colors.btnPrimary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: font.base,
    fontWeight: 600,
    cursor: 'pointer',
  },
  openSiteBtn: {
    width: '30px',
    height: '30px',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    background: 'transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  searchSection: { padding: '12px 16px' },
  navRow: {
    display: 'flex',
    gap: '8px',
    padding: '0 16px 12px',
  },
  navBtn: {
    flex: 1,
    padding: '8px 4px',
    background: colors.bgSubtle,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: radius.md,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    transition: 'background 0.1s',
  },
  errorBar: {
    margin: '0 16px 8px',
    padding: '8px 12px',
    background: colors.errorBg,
    borderRadius: radius.sm,
    color: colors.errorText,
    fontSize: font.base,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px',
    minHeight: 0,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255,255,255,0.6)',
    zIndex: 10,
  },
  resultMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 0 10px',
    fontSize: font.sm,
    color: colors.textFaint,
  },
  viewAllBtn: {
    border: 'none',
    background: 'none',
    color: colors.accent,
    fontSize: font.sm,
    cursor: 'pointer',
    padding: 0,
    fontWeight: 500,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '10px',
    paddingBottom: '16px',
  },
  footer: {
    borderTop: `1px solid ${colors.borderLight}`,
    padding: '8px 16px',
    textAlign: 'center',
  },
};
