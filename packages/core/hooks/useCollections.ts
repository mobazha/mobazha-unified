/**
 * useCollections hook — React Query 版本
 *
 * Collection CRUD + 商品关联管理
 * READ → useQuery, WRITE → useMutation + invalidation
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsApi } from '../services/api/collections';
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from '../types/collection';
import { queryKeys } from './queryKeys';
import { formatQueryError } from './queryUtils';

export function useCollections() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch: fetchCollections,
  } = useQuery({
    queryKey: queryKeys.collections.list(),
    queryFn: async () => {
      const res = await collectionsApi.listCollections(1, 50);
      return { collections: res.data, total: res.meta.total };
    },
    staleTime: 60 * 1000,
  });

  const collections = data?.collections ?? [];
  const total = data?.total ?? 0;

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });

  const createMutation = useMutation({
    mutationFn: (req: CreateCollectionRequest) => collectionsApi.createCollection(req),
    onSuccess: () => invalidateAll(),
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: UpdateCollectionRequest }) =>
      collectionsApi.updateCollection(params.id, params.data),
    onSuccess: () => invalidateAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => collectionsApi.deleteCollection(id),
    onSuccess: () => invalidateAll(),
  });

  const addProductsMutation = useMutation({
    mutationFn: (params: { collectionID: string; slugs: string[] }) =>
      collectionsApi.addCollectionProducts(params.collectionID, params.slugs),
    onSuccess: () => invalidateAll(),
  });

  const removeProductMutation = useMutation({
    mutationFn: (params: { collectionID: string; slug: string }) =>
      collectionsApi.removeCollectionProduct(params.collectionID, params.slug),
    onSuccess: () => invalidateAll(),
  });

  const reorderProductsMutation = useMutation({
    mutationFn: (params: { collectionID: string; slugs: string[] }) =>
      collectionsApi.reorderCollectionProducts(params.collectionID, params.slugs),
    onSuccess: () => invalidateAll(),
  });

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    addProductsMutation.isPending ||
    removeProductMutation.isPending ||
    reorderProductsMutation.isPending;

  const createCollection = useCallback(
    async (req: CreateCollectionRequest): Promise<Collection | null> => {
      try {
        return await createMutation.mutateAsync(req);
      } catch {
        return null;
      }
    },
    [createMutation]
  );

  const updateCollection = useCallback(
    async (id: string, data: UpdateCollectionRequest): Promise<Collection | null> => {
      try {
        return await updateMutation.mutateAsync({ id, data });
      } catch {
        return null;
      }
    },
    [updateMutation]
  );

  const deleteCollection = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    [deleteMutation]
  );

  const addProducts = useCallback(
    async (collectionID: string, slugs: string[]): Promise<boolean> => {
      try {
        await addProductsMutation.mutateAsync({ collectionID, slugs });
        return true;
      } catch {
        return false;
      }
    },
    [addProductsMutation]
  );

  const removeProduct = useCallback(
    async (collectionID: string, slug: string): Promise<boolean> => {
      try {
        await removeProductMutation.mutateAsync({ collectionID, slug });
        return true;
      } catch {
        return false;
      }
    },
    [removeProductMutation]
  );

  const reorderProducts = useCallback(
    async (collectionID: string, slugs: string[]): Promise<boolean> => {
      try {
        await reorderProductsMutation.mutateAsync({ collectionID, slugs });
        return true;
      } catch {
        return false;
      }
    },
    [reorderProductsMutation]
  );

  const mutError =
    createMutation.error ||
    updateMutation.error ||
    deleteMutation.error ||
    addProductsMutation.error ||
    removeProductMutation.error ||
    reorderProductsMutation.error;

  return {
    collections,
    total,
    isLoading,
    isSaving,
    error: formatQueryError(error || mutError),
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
  const queryClient = useQueryClient();

  const {
    data: collection,
    isLoading,
    error,
    refetch: fetchCollection,
  } = useQuery({
    queryKey: queryKeys.collections.detail(collectionID!),
    queryFn: () => collectionsApi.getCollection(collectionID!),
    enabled: !!collectionID,
    staleTime: 60 * 1000,
  });

  const invalidateDetail = () => {
    if (collectionID) {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionID) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
  };

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCollectionRequest) =>
      collectionsApi.updateCollection(collectionID!, data),
    onSuccess: () => invalidateDetail(),
  });

  const addProductsMutation = useMutation({
    mutationFn: (slugs: string[]) => collectionsApi.addCollectionProducts(collectionID!, slugs),
    onSuccess: () => invalidateDetail(),
  });

  const removeProductMutation = useMutation({
    mutationFn: (slug: string) => collectionsApi.removeCollectionProduct(collectionID!, slug),
    onSuccess: () => invalidateDetail(),
  });

  const reorderProductsMutation = useMutation({
    mutationFn: (slugs: string[]) => collectionsApi.reorderCollectionProducts(collectionID!, slugs),
    onSuccess: () => invalidateDetail(),
  });

  const isSaving =
    updateMutation.isPending ||
    addProductsMutation.isPending ||
    removeProductMutation.isPending ||
    reorderProductsMutation.isPending;

  const update = useCallback(
    async (data: UpdateCollectionRequest): Promise<boolean> => {
      if (!collectionID) return false;
      try {
        await updateMutation.mutateAsync(data);
        return true;
      } catch {
        return false;
      }
    },
    [collectionID, updateMutation]
  );

  const addProducts = useCallback(
    async (slugs: string[]): Promise<boolean> => {
      if (!collectionID) return false;
      try {
        await addProductsMutation.mutateAsync(slugs);
        return true;
      } catch {
        return false;
      }
    },
    [collectionID, addProductsMutation]
  );

  const removeProduct = useCallback(
    async (slug: string): Promise<boolean> => {
      if (!collectionID) return false;
      try {
        await removeProductMutation.mutateAsync(slug);
        return true;
      } catch {
        return false;
      }
    },
    [collectionID, removeProductMutation]
  );

  const reorderProducts = useCallback(
    async (slugs: string[]): Promise<boolean> => {
      if (!collectionID) return false;
      try {
        await reorderProductsMutation.mutateAsync(slugs);
        return true;
      } catch {
        return false;
      }
    },
    [collectionID, reorderProductsMutation]
  );

  const mutError =
    updateMutation.error ||
    addProductsMutation.error ||
    removeProductMutation.error ||
    reorderProductsMutation.error;

  return {
    collection: collection ?? null,
    isLoading,
    isSaving,
    error: formatQueryError(error || mutError),
    fetchCollection,
    update,
    addProducts,
    removeProduct,
    reorderProducts,
  };
}
