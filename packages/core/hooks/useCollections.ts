/**
 * useCollections hook
 * Collection CRUD + 商品关联管理
 */

import { useState, useCallback, useEffect } from 'react';
import { collectionsApi } from '../services/api/collections';
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from '../types/collection';

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async (page = 1, pageSize = 50) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await collectionsApi.listCollections(page, pageSize);
      setCollections(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const createCollection = useCallback(
    async (data: CreateCollectionRequest): Promise<Collection | null> => {
      setIsSaving(true);
      setError(null);
      try {
        const created = await collectionsApi.createCollection(data);
        setCollections(prev => [created, ...prev]);
        setTotal(prev => prev + 1);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create collection');
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const updateCollection = useCallback(
    async (id: string, data: UpdateCollectionRequest): Promise<Collection | null> => {
      setIsSaving(true);
      setError(null);
      try {
        const updated = await collectionsApi.updateCollection(id, data);
        setCollections(prev => prev.map(c => (c.id === id ? updated : c)));
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update collection');
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const deleteCollection = useCallback(async (id: string): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      await collectionsApi.deleteCollection(id);
      setCollections(prev => prev.filter(c => c.id !== id));
      setTotal(prev => prev - 1);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const addProducts = useCallback(
    async (collectionID: string, slugs: string[]): Promise<boolean> => {
      setIsSaving(true);
      setError(null);
      try {
        await collectionsApi.addCollectionProducts(collectionID, slugs);
        await fetchCollections();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add products');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchCollections]
  );

  const removeProduct = useCallback(
    async (collectionID: string, slug: string): Promise<boolean> => {
      setIsSaving(true);
      setError(null);
      try {
        await collectionsApi.removeCollectionProduct(collectionID, slug);
        setCollections(prev =>
          prev.map(c => {
            if (c.id !== collectionID) return c;
            return {
              ...c,
              products: c.products?.filter(p => p.listingSlug !== slug),
            };
          })
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove product');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const reorderProducts = useCallback(
    async (collectionID: string, slugs: string[]): Promise<boolean> => {
      setIsSaving(true);
      setError(null);
      try {
        await collectionsApi.reorderCollectionProducts(collectionID, slugs);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reorder products');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return {
    collections,
    total,
    isLoading,
    isSaving,
    error,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    addProducts,
    removeProduct,
    reorderProducts,
  };
}

/** Single collection detail + product management */
export function useCollectionDetail(collectionID: string | undefined) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(!!collectionID);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollection = useCallback(async () => {
    if (!collectionID) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await collectionsApi.getCollection(collectionID);
      setCollection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
    } finally {
      setIsLoading(false);
    }
  }, [collectionID]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const update = useCallback(
    async (data: UpdateCollectionRequest): Promise<boolean> => {
      if (!collectionID) return false;
      setIsSaving(true);
      setError(null);
      try {
        const updated = await collectionsApi.updateCollection(collectionID, data);
        setCollection(updated);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update collection');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [collectionID]
  );

  const addProducts = useCallback(
    async (slugs: string[]): Promise<boolean> => {
      if (!collectionID) return false;
      setIsSaving(true);
      setError(null);
      try {
        await collectionsApi.addCollectionProducts(collectionID, slugs);
        await fetchCollection();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add products');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [collectionID, fetchCollection]
  );

  const removeProduct = useCallback(
    async (slug: string): Promise<boolean> => {
      if (!collectionID) return false;
      setIsSaving(true);
      setError(null);
      try {
        await collectionsApi.removeCollectionProduct(collectionID, slug);
        setCollection(prev =>
          prev
            ? {
                ...prev,
                products: prev.products?.filter(p => p.listingSlug !== slug),
              }
            : prev
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove product');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [collectionID]
  );

  const reorderProducts = useCallback(
    async (slugs: string[]): Promise<boolean> => {
      if (!collectionID) return false;
      setIsSaving(true);
      setError(null);
      try {
        await collectionsApi.reorderCollectionProducts(collectionID, slugs);
        await fetchCollection();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reorder');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [collectionID, fetchCollection]
  );

  return {
    collection,
    isLoading,
    isSaving,
    error,
    fetchCollection,
    update,
    addProducts,
    removeProduct,
    reorderProducts,
  };
}
