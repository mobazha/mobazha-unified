/**
 * Collection API 服务
 *
 * 两类端点：
 *   - 管理端点（需认证）: CRUD + 商品关联管理
 *   - 公开端点: 浏览已发布的 Collection
 */

import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authPut, authDel, authRequest, publicGet } from './helpers';
import type {
  Collection,
  CollectionListResponse,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from '../../types/collection';

// Re-export types for convenience
export type {
  Collection,
  CollectionProduct,
  CollectionListResponse,
  CollectionType,
  CollectionSortOrder,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from '../../types/collection';

// ========== 管理 API (需认证) ==========

export async function createCollection(data: CreateCollectionRequest): Promise<Collection> {
  return authPost<Collection>(NODE_API.COLLECTIONS, data);
}

export async function getCollection(collectionID: string): Promise<Collection> {
  return authGet<Collection>(NODE_API.COLLECTION(collectionID));
}

export async function listCollections(
  page = 1,
  pageSize = 20,
  publishedOnly = false
): Promise<CollectionListResponse> {
  let path = `${NODE_API.COLLECTIONS}?page=${page}&pageSize=${pageSize}`;
  if (publishedOnly) path += '&publishedOnly=true';
  return authRequest<CollectionListResponse>(path, { raw: true });
}

export async function updateCollection(
  collectionID: string,
  data: UpdateCollectionRequest
): Promise<Collection> {
  return authPut<Collection>(NODE_API.COLLECTION(collectionID), data);
}

export async function deleteCollection(collectionID: string): Promise<void> {
  return authDel<void>(NODE_API.COLLECTION(collectionID));
}

export async function addCollectionProducts(collectionID: string, slugs: string[]): Promise<void> {
  return authPost<void>(NODE_API.COLLECTION_PRODUCTS(collectionID), { slugs });
}

export async function removeCollectionProduct(collectionID: string, slug: string): Promise<void> {
  return authDel<void>(NODE_API.COLLECTION_PRODUCT(collectionID, slug));
}

export async function reorderCollectionProducts(
  collectionID: string,
  slugs: string[]
): Promise<void> {
  return authPut<void>(NODE_API.COLLECTION_PRODUCTS_REORDER(collectionID), { slugs });
}

// ========== 公开 API (买家浏览) ==========

export async function listPublishedCollections(
  peerID: string,
  page = 1,
  pageSize = 20
): Promise<Collection[]> {
  const path = `${NODE_API.COLLECTIONS_PUBLISHED(peerID)}?page=${page}&pageSize=${pageSize}`;
  return publicGet<Collection[]>(path);
}

export async function getPublishedCollection(
  peerID: string,
  collectionID: string
): Promise<Collection> {
  return publicGet<Collection>(NODE_API.COLLECTION_PUBLISHED(peerID, collectionID));
}

// ========== 导出 ==========

export const collectionsApi = {
  createCollection,
  getCollection,
  listCollections,
  updateCollection,
  deleteCollection,
  addCollectionProducts,
  removeCollectionProduct,
  reorderCollectionProducts,
  listPublishedCollections,
  getPublishedCollection,
};
