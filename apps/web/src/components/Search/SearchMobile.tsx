'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Button } from '@/components/ui/button';
import { BottomSheet, BottomSheetItem } from '@/components/ui/bottom-sheet';
import { useSearch } from '@/hooks/useSearch';
import { useTGBackButton } from '@/hooks/useTGBackButton';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';
import type { DisplayProduct, SearchUser } from '@/hooks/useSearch';

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function SearchMobile() {
  const search = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAvailable: isTG } = useTGMiniApp();

  useTGBackButton({ visible: isTG });

  useEffect(() => {
    if (!search.queryParam && inputRef.current) {
      inputRef.current.focus();
    }
  }, [search.queryParam]);

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      <MobilePageHeader title={search.t('nav.search')} />

      {/* Search Input Bar */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3">
        <form onSubmit={search.handleSearch}>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search.searchQuery}
              onChange={e => search.setSearchQuery(e.target.value)}
              placeholder={search.t('searchExtended.searchPlaceholder')}
              className="w-full h-11 pl-10 pr-20 rounded-xl border border-border bg-muted/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              enterKeyHint="search"
            />
            {search.searchQuery && (
              <button
                type="button"
                onClick={() => search.setSearchQuery('')}
                className="absolute right-16 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
              >
                <XIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-9"
              disabled={search.isLoading}
            >
              {search.isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                search.t('common.search')
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* No Query: Recent Searches + Categories */}
      {!search.queryParam && (
        <div className="px-4 py-4">
          {/* Recent Searches */}
          {search.recentSearches.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {search.t('searchExtended.recentSearches')}
                </h2>
                <button
                  onClick={search.clearRecentSearches}
                  className="text-xs text-muted-foreground"
                >
                  {search.t('searchExtended.clearAll')}
                </button>
              </div>
              <div className="space-y-0.5">
                {search.recentSearches.map((keyword, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 py-2.5 active:bg-muted/50 rounded-lg transition-colors"
                  >
                    <button
                      onClick={() => search.handleRecentSearch(keyword)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <ClockIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground truncate">{keyword}</span>
                    </button>
                    <button
                      onClick={() => search.removeRecentSearch(keyword)}
                      className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                    >
                      <XIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Categories */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {search.t('searchExtended.popularCategories')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {search.categoryOptions.slice(1).map(cat => (
                <button
                  key={cat.value}
                  onClick={() => {
                    search.setCategory(cat.value);
                    search.setSearchQuery(cat.label);
                    search.handleRecentSearch(cat.label);
                  }}
                  className="px-3 py-1.5 rounded-full bg-muted text-foreground text-xs active:scale-95 transition-transform"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {search.queryParam && (
        <div className="flex flex-col">
          {/* Tabs */}
          <div className="sticky top-[68px] z-10 bg-background border-b border-border">
            <div className="flex px-4">
              <button
                onClick={() => search.setActiveTab('listings')}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                  search.activeTab === 'listings'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                {search.t('searchExtended.products')} ({search.productsTotal})
              </button>
              <button
                onClick={() => search.setActiveTab('users')}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                  search.activeTab === 'users'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                {search.t('searchExtended.stores')} ({search.usersTotal})
              </button>
            </div>
          </div>

          {/* Sort + Category Bar */}
          {search.activeTab === 'listings' && <SortCategoryBar search={search} />}

          {/* Product Grid / User List */}
          <div className="px-3 py-3 pb-24">
            {search.activeTab === 'listings' ? (
              <ProductResults search={search} />
            ) : (
              <UserResults search={search} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductResults({ search }: { search: ReturnType<typeof useSearch> }) {
  if (search.isLoadingProducts && search.products.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (search.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-20 h-20 rounded-full bg-muted/80 flex items-center justify-center mb-5">
          <SearchIcon className="w-10 h-10 text-muted-foreground/60" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {search.t('empty.noProductsFound')}
        </h3>
        <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-xs">
          {search.t('empty.tryAdjustingFilters')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {search.products.map((product: DisplayProduct) => (
          <Link
            key={product.id}
            href={`/product/${product.slug}${product.vendor.peerID ? `?peerID=${product.vendor.peerID}` : ''}`}
          >
            <ProductCard
              title={product.title}
              imageUrl={product.image}
              price={product.price}
              currency={product.currency}
              divisibility={product.divisibility}
              vendorName={product.vendor.name}
              vendorAvatar={product.vendor.avatar}
              vendorPeerID={product.vendor.peerID}
              rating={product.rating}
              reviewCount={product.reviewCount}
              contractType={product.contractType}
              tokenStandard={product.tokenStandard}
              rwaTradeMode={product.rwaTradeMode}
              hasVerifiedModerator={search.hasVerifiedMod(product.moderators)}
              isWishlist={search.isInWishlist(product.vendor.peerID, product.slug)}
              onToggleWishlist={e => search.handleToggleWishlist(product, e)}
            />
          </Link>
        ))}
      </div>
      {search.productsHasMore && (
        <div className="flex justify-center mt-6 pb-4">
          <Button
            variant="outline"
            onClick={search.loadMoreProducts}
            disabled={search.isLoadingProducts}
            className="w-full max-w-xs"
          >
            {search.isLoadingProducts ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              search.t('empty.loadMoreResults')
            )}
          </Button>
        </div>
      )}
    </>
  );
}

function UserResults({ search }: { search: ReturnType<typeof useSearch> }) {
  if (search.isLoadingUsers && search.users.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (search.users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <svg
          className="w-12 h-12 text-muted-foreground mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="text-base font-semibold text-foreground mb-1">
          {search.t('empty.noStoresFound')}
        </h3>
        <p className="text-sm text-muted-foreground text-center">
          {search.t('empty.tryAdjustingSearch')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {search.users.map((user: SearchUser) => (
          <Link key={user.peerID} href={`/store/${user.peerID}`}>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border active:bg-muted/50 transition-colors">
              <Avatar src={user.avatar} name={user.name} size="sm" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-foreground truncate">{user.name}</h3>
                {user.shortDescription && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {user.shortDescription}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>
                    {user.listingCount} {search.t('search.listings')}
                  </span>
                  {user.reviewCount > 0 ? (
                    <span className="flex items-center gap-0.5">
                      <span className="text-warning">★</span>
                      {user.rating.toFixed(1)} ({user.reviewCount})
                    </span>
                  ) : (
                    <span className="text-primary/70 font-medium px-1.5 py-0.5 bg-primary/10 rounded-full">
                      {search.t('common.new')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {search.usersHasMore && (
        <div className="flex justify-center mt-6 pb-4">
          <Button
            variant="outline"
            onClick={search.loadMoreUsers}
            disabled={search.isLoadingUsers}
            className="w-full max-w-xs"
          >
            {search.isLoadingUsers ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              search.t('empty.loadMoreResults')
            )}
          </Button>
        </div>
      )}
    </>
  );
}

function SortCategoryBar({ search }: { search: ReturnType<typeof useSearch> }) {
  const [showSort, setShowSort] = useState(false);
  const [showCategory, setShowCategory] = useState(false);

  const currentSort = search.sortOptions.find(o => o.value === search.sortBy);
  const currentCategory = search.categoryOptions?.find(
    (c: { value: string }) => c.value === search.category
  );

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <button
          onClick={() => setShowSort(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground active:bg-muted/70 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          {currentSort?.label || search.t('search.sortBy')}
        </button>

        {search.categoryOptions && search.categoryOptions.length > 0 && (
          <button
            onClick={() => setShowCategory(true)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors active:bg-muted/70 ${
              search.category !== 'all'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            {currentCategory?.label || search.t('search.allCategories')}
          </button>
        )}
      </div>

      <BottomSheet
        open={showSort}
        onClose={() => setShowSort(false)}
        title={search.t('search.sortBy')}
      >
        <div className="py-1">
          {search.sortOptions.map(opt => (
            <BottomSheetItem
              key={opt.value}
              title={opt.label}
              selected={search.sortBy === opt.value}
              onClick={() => {
                search.setSortBy(opt.value);
                setShowSort(false);
              }}
            />
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={showCategory}
        onClose={() => setShowCategory(false)}
        title={search.t('search.category')}
      >
        <div className="py-1">
          <BottomSheetItem
            title={search.t('common.all')}
            selected={search.category === 'all'}
            onClick={() => {
              search.setCategory('all');
              setShowCategory(false);
            }}
          />
          {search.categoryOptions?.map((cat: { value: string; label: string }) => (
            <BottomSheetItem
              key={cat.value}
              title={cat.label}
              selected={search.category === cat.value}
              onClick={() => {
                search.setCategory(cat.value);
                setShowCategory(false);
              }}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
