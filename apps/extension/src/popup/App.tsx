import type { CSSProperties } from 'react';
import { useState, useCallback } from 'react';
import { getStoredUser } from '@mobazha/core/services/auth/token';
import { searchListings } from '@mobazha/core/services/api/products';
import type { ProductListItem } from '@mobazha/core/types/product';
import { WEB_APP_ORIGIN } from '../shared/init';
import { extensionSignIn, extensionSignOut, isAuthenticated } from '../shared/auth';
import { colors, font, radius } from '../shared/styles';
import { SearchBar } from '../shared/components/SearchBar';
import { ProductCard } from '../shared/components/ProductCard';
import { QuickFilters, QUICK_FILTERS } from '../shared/components/QuickFilters';
import { LoadingState, NoResultsState, WelcomeState } from '../shared/components/EmptyStates';

export function PopupApp() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState<number | null>(null);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const storedUser = getStoredUser();

  const handleSignIn = useCallback(async () => {
    if (!loginUsername.trim() || !loginPassword) return;
    setSigningIn(true);
    setError(null);
    try {
      const result = await extensionSignIn(loginUsername.trim(), loginPassword);
      if (result.success) {
        setAuthenticated(true);
        setShowLoginForm(false);
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setError(result.error || 'Sign in failed');
      }
    } finally {
      setSigningIn(false);
    }
  }, [loginUsername, loginPassword]);

  const handleSignOut = useCallback(() => {
    extensionSignOut();
    setAuthenticated(false);
  }, []);

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

  const openSidePanelAt = (route = '/') => {
    chrome.runtime.sendMessage({ action: 'openSidePanel', route });
    window.close();
  };

  const openSidePanel = () => openSidePanelAt('/');

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
          <div style={styles.userArea}>
            <div style={styles.avatar}>
              {storedUser?.avatar ? (
                <img
                  src={storedUser.avatar}
                  alt=""
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span>{(storedUser?.name || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <button onClick={handleSignOut} style={styles.signoutBtn} title="Sign out">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        ) : (
          <button onClick={() => setShowLoginForm(v => !v)} style={styles.signinBtn}>
            Sign In
          </button>
        )}
      </div>

      {/* Inline Login Form */}
      {showLoginForm && !authenticated && (
        <div style={styles.loginForm}>
          <input
            type="text"
            placeholder="Username or email"
            value={loginUsername}
            onChange={e => setLoginUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            style={styles.loginInput}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            style={styles.loginInput}
          />
          <button
            onClick={handleSignIn}
            disabled={signingIn || !loginUsername.trim() || !loginPassword}
            style={{
              ...styles.loginSubmitBtn,
              opacity: signingIn || !loginUsername.trim() || !loginPassword ? 0.6 : 1,
            }}
          >
            {signingIn ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      )}

      {/* Search + Filters */}
      <div style={{ padding: '10px 16px 6px' }}>
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
      </div>
      <div style={{ padding: '0 16px 10px' }}>
        <QuickFilters activeIndex={activeFilter} onSelect={handleQuickFilter} />
      </div>

      {/* Error */}
      {error && <div style={styles.errorBar}>{error}</div>}

      {/* Results area */}
      <div style={styles.resultsArea}>
        {loading && results.length > 0 && <div style={styles.loadingOverlay} />}
        {loading && results.length === 0 && <LoadingState />}
        {!loading && searched && results.length === 0 && !error && <NoResultsState />}
        {!searched && !loading && <WelcomeState />}

        {results.length > 0 && (
          <>
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
                <ProductCard
                  key={`${item.slug}-${i}`}
                  item={item}
                  variant="compact"
                  onClick={() => openSidePanelAt(`/product/${item.slug}`)}
                />
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
    background: colors.bg,
    fontFamily: font.family,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderBottom: `1px solid ${colors.borderLight}`,
  },
  logo: {
    width: '30px',
    height: '30px',
    borderRadius: '7px',
    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    color: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: font.xl,
    fontWeight: 700,
    flexShrink: 0,
  },
  brand: { fontSize: font.xl, fontWeight: 700, color: colors.text, lineHeight: '1.2' },
  tagline: { fontSize: font.sm, color: colors.textFaint, lineHeight: '1.3' },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  avatar: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    overflow: 'hidden',
  },
  signoutBtn: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    color: colors.textMuted,
    display: 'flex',
    alignItems: 'center',
    borderRadius: radius.sm,
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
    flexShrink: 0,
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 16px 12px',
    borderBottom: `1px solid ${colors.borderLight}`,
    background: colors.bgSubtle,
  },
  loginInput: {
    padding: '8px 10px',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    fontSize: font.base,
    fontFamily: font.family,
    background: colors.bg,
    color: colors.text,
    outline: 'none',
  },
  loginSubmitBtn: {
    padding: '8px 14px',
    background: colors.btnPrimary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: font.base,
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorBar: {
    margin: '0 16px 8px',
    padding: '8px 12px',
    background: colors.errorBg,
    borderRadius: radius.sm,
    color: colors.errorText,
    fontSize: font.base,
  },
  resultsArea: {
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
    borderRadius: radius.md,
  },
  resultMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0 8px',
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
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    paddingBottom: '8px',
  },
  footer: {
    borderTop: `1px solid ${colors.borderLight}`,
    padding: '8px 16px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  quickActions: { display: 'flex', gap: '6px' },
  quickActionBtn: {
    flex: 1,
    padding: '6px 4px',
    background: colors.bgSubtle,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: radius.sm,
    fontSize: font.sm,
    color: colors.textSecondary,
    cursor: 'pointer',
    textAlign: 'center',
  },
  footerActions: { display: 'flex', gap: '6px' },
  footerBtn: {
    flex: 1,
    padding: '5px 8px',
    background: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    fontSize: font.sm,
    color: colors.textMuted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
};
