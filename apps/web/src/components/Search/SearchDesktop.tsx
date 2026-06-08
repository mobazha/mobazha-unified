'use client';

import React from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container, HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { useSearch } from '@/hooks/useSearch';
import type { DisplayProduct, SearchUser } from '@/hooks/useSearch';
import { useProductModal } from '@/hooks';
import { buildProductHref } from '@mobazha/core';

export function SearchDesktop() {
  const search = useSearch();
  const { openProduct, isMobile } = useProductModal();

  const renderProductCard = (product: DisplayProduct) => (
    <Link
      key={product.id}
      href={buildProductHref(product.slug, product.vendor.peerID)}
      onClick={e => {
        if (!isMobile) {
          e.preventDefault();
          openProduct(product.slug, product.vendor.peerID);
        }
      }}
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
  );

  const UserCard = ({ user }: { user: SearchUser }) => (
    <Link href={`/store/${user.peerID}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]">
        <CardContent className="p-3 sm:p-4">
          <HStack gap="sm" align="start" className="sm:gap-4">
            <Avatar src={user.avatar} name={user.name} size="md" className="sm:w-12 sm:h-12" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">{user.name}</h3>
              {user.location && (
                <p className="text-xs sm:text-sm text-muted-foreground">{user.location}</p>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1 sm:mt-2">
                {user.shortDescription}
              </p>
              <HStack gap="sm" className="mt-2 sm:mt-3 text-xs sm:text-sm sm:gap-4">
                <span className="text-muted-foreground">
                  {user.listingCount} {search.t('search.listings')}
                </span>
                {user.reviewCount > 0 ? (
                  <HStack gap="xs" align="center">
                    <span className="text-warning">★</span>
                    <span className="text-muted-foreground">
                      {user.rating.toFixed(1)} ({user.reviewCount})
                    </span>
                  </HStack>
                ) : (
                  <span className="text-xs text-primary/70 font-medium px-1.5 py-0.5 bg-primary/10 rounded-full">
                    {search.t('common.new')}
                  </span>
                )}
              </HStack>
            </div>
          </HStack>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={search.t('nav.search')} />

      <main className="py-4 sm:py-8">
        <Container size="xl">
          {/* Search Header */}
          <form onSubmit={search.handleSearch} className="mb-4 sm:mb-8">
            <div className="relative">
              <input
                type="text"
                value={search.searchQuery}
                onChange={e => search.setSearchQuery(e.target.value)}
                placeholder={search.t('searchExtended.searchPlaceholder')}
                className="w-full h-11 sm:h-14 pl-10 sm:pl-14 pr-20 sm:pr-32 rounded-xl sm:rounded-2xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-lg"
              />
              <svg
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <Button
                type="submit"
                size="sm"
                className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 sm:h-10 sm:px-6"
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

          {/* No query - show recent searches */}
          {!search.queryParam && (
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <HStack justify="between" align="center" className="mb-3 sm:mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">
                      {search.t('searchExtended.recentSearches')}
                    </h2>
                    {search.recentSearches.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={search.clearRecentSearches}
                        className="text-xs sm:text-sm"
                      >
                        {search.t('searchExtended.clearAll')}
                      </Button>
                    )}
                  </HStack>

                  {search.recentSearches.length > 0 ? (
                    <VStack gap="xs" className="sm:gap-2">
                      {search.recentSearches.map((keyword, index) => (
                        <button
                          key={index}
                          onClick={() => search.handleRecentSearch(keyword)}
                          className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors text-left"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-foreground text-sm sm:text-base">{keyword}</span>
                        </button>
                      ))}
                    </VStack>
                  ) : (
                    <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                      {search.t('empty.noRecentSearches')}
                    </p>
                  )}

                  {/* Browse by Type */}
                  <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border">
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
                      {search.t('search.browseByType', { defaultValue: 'Browse by Type' })}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {search.typeOptions.slice(1).map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => search.handleRecentSearch(opt.label)}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-muted text-foreground hover:bg-primary/10 hover:text-primary active:scale-95 transition-all text-xs sm:text-sm"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search Results */}
          {search.queryParam && (
            <>
              {/* Tabs & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex gap-1 p-1 bg-muted rounded-lg sm:rounded-xl w-fit">
                  <button
                    onClick={() => search.setActiveTab('listings')}
                    className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium transition-all text-sm sm:text-base ${
                      search.activeTab === 'listings'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {search.t('searchExtended.products')} ({search.productsTotal})
                  </button>
                  <button
                    onClick={() => search.setActiveTab('users')}
                    className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium transition-all text-sm sm:text-base ${
                      search.activeTab === 'users'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {search.t('searchExtended.stores')} ({search.usersTotal})
                  </button>
                </div>

                {search.activeTab === 'listings' && (
                  <HStack gap="sm">
                    <button
                      onClick={() => search.setShowFilters(!search.showFilters)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        search.showFilters
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 text-foreground'
                      }`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                      </svg>
                      {search.t('filter.filters')}
                    </button>
                    <Select value={search.sortBy} onValueChange={search.setSortBy}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {search.sortOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </HStack>
                )}
              </div>

              {/* Filter Panel */}
              {search.showFilters && search.activeTab === 'listings' && (
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {search.t('filter.productType', { defaultValue: 'Product Type' })}
                        </label>
                        <Select value={search.listingType} onValueChange={search.setListingType}>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={search.t('marketplace.allTypes', {
                                defaultValue: 'All Types',
                              })}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {search.typeOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {search.t('filter.priceRange')}
                        </label>
                        <HStack gap="sm">
                          <input
                            type="number"
                            placeholder={search.t('filter.min')}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-muted-foreground">-</span>
                          <input
                            type="number"
                            placeholder={search.t('filter.max')}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </HStack>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {search.t('filter.rating')}
                        </label>
                        <Select defaultValue="all">
                          <SelectTrigger>
                            <SelectValue placeholder={search.t('filter.anyRating')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{search.t('filter.anyRating')}</SelectItem>
                            <SelectItem value="4">
                              {search.t('filter.stars', { count: 4 })}
                            </SelectItem>
                            <SelectItem value="3">
                              {search.t('filter.stars', { count: 3 })}
                            </SelectItem>
                            <SelectItem value="2">
                              {search.t('filter.stars', { count: 2 })}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {search.t('filter.type')}
                        </label>
                        <Select defaultValue="all">
                          <SelectTrigger>
                            <SelectValue placeholder={search.t('filter.allTypes')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{search.t('filter.allTypes')}</SelectItem>
                            <SelectItem value="physical">
                              {search.t('filter.physicalGoods')}
                            </SelectItem>
                            <SelectItem value="digital">
                              {search.t('filter.digitalGoods')}
                            </SelectItem>
                            <SelectItem value="service">{search.t('filter.services')}</SelectItem>
                            <SelectItem value="rwa">{search.t('filter.rwaTokens')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Results */}
              {search.activeTab === 'listings' ? (
                <>
                  {search.isLoadingProducts && search.products.length === 0 ? (
                    <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <ProductCardSkeleton key={i} />
                      ))}
                    </Grid>
                  ) : search.products.length > 0 ? (
                    <>
                      <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
                        {search.products.map(product => renderProductCard(product))}
                      </Grid>
                      {search.productsHasMore && (
                        <div className="flex justify-center mt-8">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={search.loadMoreProducts}
                            disabled={search.isLoadingProducts}
                          >
                            {search.isLoadingProducts ? (
                              <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                {search.t('common.loading')}
                              </span>
                            ) : (
                              search.t('empty.loadMoreResults')
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card className="text-center">
                      <CardContent className="py-12">
                        <svg
                          className="w-16 h-16 mx-auto text-muted-foreground mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {search.t('empty.noProductsFound')}
                        </h3>
                        <p className="text-muted-foreground">
                          {search.t('empty.tryAdjustingFilters')}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  {search.isLoadingUsers && search.users.length === 0 ? (
                    <Grid cols={2} colsMobile={1} gap="md">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <HStack gap="sm" align="start">
                              <div className="w-12 h-12 rounded-full bg-muted" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted rounded w-1/3" />
                                <div className="h-3 bg-muted rounded w-1/4" />
                                <div className="h-3 bg-muted rounded w-2/3" />
                              </div>
                            </HStack>
                          </CardContent>
                        </Card>
                      ))}
                    </Grid>
                  ) : search.users.length > 0 ? (
                    <>
                      <Grid cols={2} colsMobile={1} gap="md">
                        {search.users.map(user => (
                          <UserCard key={user.peerID} user={user} />
                        ))}
                      </Grid>
                      {search.usersHasMore && (
                        <div className="flex justify-center mt-8">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={search.loadMoreUsers}
                            disabled={search.isLoadingUsers}
                          >
                            {search.isLoadingUsers ? (
                              <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                {search.t('common.loading')}
                              </span>
                            ) : (
                              search.t('empty.loadMoreResults')
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card className="text-center">
                      <CardContent className="py-12">
                        <svg
                          className="w-16 h-16 mx-auto text-muted-foreground mb-4"
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
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {search.t('empty.noStoresFound')}
                        </h3>
                        <p className="text-muted-foreground">
                          {search.t('empty.tryAdjustingSearch')}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
