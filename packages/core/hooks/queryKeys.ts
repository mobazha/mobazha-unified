/**
 * React Query Key Factory
 *
 * Centralized query key definitions for cache management, invalidation, and prefetching.
 * Convention: each domain exposes `.all`, `.lists()`, `.detail(id)` for granular invalidation.
 */

export const queryKeys = {
  products: {
    all: ['products'] as const,
    trending: () => [...queryKeys.products.all, 'trending'] as const,
    featured: () => [...queryKeys.products.all, 'featured'] as const,
    myListings: () => [...queryKeys.products.all, 'my-listings'] as const,
    store: (peerID: string) => [...queryKeys.products.all, 'store', peerID] as const,
    detail: (slug: string, peerID?: string) =>
      [...queryKeys.products.all, 'detail', slug, peerID] as const,
    ratings: (slug?: string, peerID?: string) =>
      [...queryKeys.products.all, 'ratings', slug, peerID] as const,
    storeRatings: (peerID: string) => [...queryKeys.products.all, 'store-ratings', peerID] as const,
  },

  orders: {
    all: ['orders'] as const,
    purchases: (filter?: string) => [...queryKeys.orders.all, 'purchases', filter] as const,
    sales: (filter?: string) => [...queryKeys.orders.all, 'sales', filter] as const,
    detail: (orderId: string) => [...queryKeys.orders.all, 'detail', orderId] as const,
  },

  profiles: {
    all: ['profiles'] as const,
    detail: (peerID: string) => [...queryKeys.profiles.all, peerID] as const,
  },

  collections: {
    all: ['collections'] as const,
    list: (page?: number) => [...queryKeys.collections.all, 'list', page] as const,
    detail: (id: string) => [...queryKeys.collections.all, 'detail', id] as const,
  },

  storefront: {
    all: ['storefront'] as const,
    config: (peerID?: string) => [...queryKeys.storefront.all, 'config', peerID] as const,
    configPublic: (peerID: string) =>
      [...queryKeys.storefront.all, 'config-public', peerID] as const,
  },

  moderators: {
    all: ['moderators'] as const,
    verified: () => [...queryKeys.moderators.all, 'verified'] as const,
    list: (options?: string) => [...queryKeys.moderators.all, 'list', options] as const,
  },

  search: {
    all: ['search'] as const,
    products: (query: string, sort?: string, category?: string) =>
      [...queryKeys.search.all, 'products', query, sort, category] as const,
    users: (query: string) => [...queryKeys.search.all, 'users', query] as const,
  },
} as const;
