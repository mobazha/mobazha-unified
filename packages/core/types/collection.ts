/**
 * Collection types — mirrors backend pkg/models/collection.go
 */

export type CollectionType = 'manual' | 'auto';

export type CollectionSortOrder =
  | 'manual'
  | 'alpha-asc'
  | 'alpha-desc'
  | 'price-asc'
  | 'price-desc'
  | 'created-desc'
  | 'created-asc';

export interface CollectionProduct {
  collectionId: string;
  listingSlug: string;
  position: number;
  createdAt: string;
}

export interface Collection {
  id: string;
  title: string;
  description?: string;
  image?: string;
  type: CollectionType;
  rules?: string;
  sortOrder: CollectionSortOrder;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  products?: CollectionProduct[];
}

export interface CollectionListResponse {
  data: Collection[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface CreateCollectionRequest {
  title: string;
  description?: string;
  image?: string;
  type?: CollectionType;
  sortOrder?: CollectionSortOrder;
  published?: boolean;
}

export interface UpdateCollectionRequest {
  title?: string;
  description?: string;
  image?: string;
  sortOrder?: CollectionSortOrder;
  published?: boolean;
}
