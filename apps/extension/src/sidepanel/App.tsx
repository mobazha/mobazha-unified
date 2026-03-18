import { useState, useCallback, useEffect, useRef, Suspense, type ReactNode } from 'react';
import { MemoryRouter, Routes, Route, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/ThemeProvider';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { Toaster } from '@/components/ui/toaster';
import { useUserStore } from '@mobazha/core';
import { getStoredUser } from '@mobazha/core/services/auth/token';
import { searchListings } from '@mobazha/core/services/api/products';
import type { ProductListItem } from '@mobazha/core/types/product';
import { WEB_APP_ORIGIN } from '../shared/init';
import { extensionSignIn, extensionSignOut, isAuthenticated } from '../shared/auth';
import { SearchBar } from '../shared/components/SearchBar';
import { ProductCard } from '../shared/components/ProductCard';
import { QuickFilters, QUICK_FILTERS } from '../shared/components/QuickFilters';
import { LoadingState, NoResultsState, WelcomeState } from '../shared/components/EmptyStates';
import { routes } from './routes';

const PAGE_SIZE = 20;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ExtHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [signingIn, setSigningIn] = useState(false);
  const storedUser = getStoredUser();
  const isHome = location.pathname === '/';

  const handleSignIn = useCallback(async () => {
    setSigningIn(true);
    try {
      const result = await extensionSignIn();
      if (result.success) setAuthenticated(true);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    extensionSignOut();
    setAuthenticated(false);
  }, []);

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background sticky top-0 z-50">
      <div className="flex items-center gap-2">
        {!isHome && (
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded hover:bg-muted text-foreground"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <button
          onClick={() => navigate('/')}
          className="font-bold text-base text-foreground hover:opacity-80"
        >
          Mobazha
        </button>
      </div>
      <div className="flex items-center gap-2">
        {authenticated ? (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
              {storedUser?.avatar ? (
                <img
                  src={storedUser.avatar}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>{(storedUser?.name || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
              title="Sign out"
            >
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
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="px-3 py-1 text-xs font-medium rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {signingIn ? 'Signing in…' : 'Sign In'}
          </button>
        )}
        <button
          onClick={() => window.open(`${WEB_APP_ORIGIN}/`, '_blank')}
          className="p-1 text-muted-foreground hover:text-foreground rounded"
          title="Open full site"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState<number | null>(null);

  const doSearch = useCallback(async (opts: { query: string; sortBy?: string; type?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await searchListings({
        query: opts.query,
        sortBy: opts.sortBy,
        type: opts.type,
        pageSize: PAGE_SIZE,
        page: 0,
      });
      setResults(resp.products || []);
      setTotal(resp.total ?? 0);
      setSearched(true);
    } catch {
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setQuery(trimmed);
      setActiveFilter(null);
      if (trimmed) doSearch({ query: trimmed });
    },
    [doSearch]
  );

  const handleFilter = useCallback(
    (idx: number) => {
      if (activeFilter === idx) {
        setActiveFilter(null);
        setResults([]);
        setSearched(false);
        return;
      }
      setActiveFilter(idx);
      const f = QUICK_FILTERS[idx];
      doSearch({ query: f.query || '', sortBy: f.sortBy, type: f.type });
    },
    [activeFilter, doSearch]
  );

  useEffect(() => {
    doSearch({ query: '', sortBy: 'newest' });
  }, [doSearch]);

  const handleProductClick = useCallback(
    (item: ProductListItem) => {
      if (item.slug) navigate(`/product/${item.slug}`);
    },
    [navigate]
  );

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="px-3 pt-3 pb-1">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          onSearch={() => handleSearch(query)}
          loading={loading}
          placeholder="Search products…"
        />
      </div>
      <div className="px-3 py-1">
        <QuickFilters activeIndex={activeFilter} onSelect={handleFilter} />
      </div>
      {error && (
        <div className="mx-3 my-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
          {error}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <LoadingState />
        ) : !searched ? (
          <WelcomeState />
        ) : results.length === 0 ? (
          <NoResultsState />
        ) : (
          <>
            <div className="text-xs text-muted-foreground mb-2">{total} results</div>
            <div className="flex flex-col gap-2">
              {results.map(item => (
                <ProductCard key={item.slug} item={item} onClick={() => handleProductClick(item)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SidePanelLayout() {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <ExtHeader />
      <div className="flex-1 overflow-y-auto min-h-0">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

function ExtAuthProvider({ children }: { children: ReactNode }) {
  const { restoreSession } = useUserStore();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    restoreSession();
  }, [restoreSession]);

  return <>{children}</>;
}

function PendingRouteHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const consumePending = async () => {
      const data = await chrome.storage.session.get('pendingRoute');
      if (data.pendingRoute && data.pendingRoute !== '/') {
        navigate(data.pendingRoute);
        await chrome.storage.session.remove('pendingRoute');
      }
    };
    consumePending();

    const listener = (msg: { action?: string; route?: string }) => {
      if (msg?.action === 'openSidePanel' && msg.route) {
        navigate(msg.route);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [navigate]);

  return null;
}

export function SidePanelApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CurrencyProvider>
          <ExtAuthProvider>
            <MemoryRouter>
              <PendingRouteHandler />
              <Routes>
                <Route element={<SidePanelLayout />}>
                  <Route index element={<HomePage />} />
                  {routes.map(r => (
                    <Route key={String(r.path)} path={r.path} element={r.element} />
                  ))}
                </Route>
              </Routes>
            </MemoryRouter>
            <Toaster />
          </ExtAuthProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
