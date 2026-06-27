'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advanceProductImportRun,
  applyProductImportRunApprovals,
  createProductImportRunApprovals,
  decideProductImportRunApprovals,
  getProductImportWorkbench,
} from '../services/ai/productImportService';
import type { ProductImportWorkbench, ProductImportWorkbenchQuery } from '../types/productImport';

export const PRODUCT_IMPORT_WORKBENCH_PAGE_SIZE = 50;
const POLL_INTERVAL_MS = 3000;

export type ProductImportRowStatusFilter =
  | ''
  | 'needs_review'
  | 'pending_approval'
  | 'applied'
  | 'approval_failed';

export interface UseProductImportWorkbenchOptions {
  runId: string;
  statusFilter?: ProductImportRowStatusFilter;
  pageSize?: number;
}

export function useProductImportWorkbench({
  runId,
  statusFilter = '',
  pageSize = PRODUCT_IMPORT_WORKBENCH_PAGE_SIZE,
}: UseProductImportWorkbenchOptions) {
  const [workbench, setWorkbench] = useState<ProductImportWorkbench | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [batchBusy, setBatchBusy] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setOffset(0);
  }, [runId, statusFilter]);

  const buildQuery = useCallback((): ProductImportWorkbenchQuery => {
    const query: ProductImportWorkbenchQuery = {
      limit: pageSize,
      offset,
    };
    if (statusFilter) {
      query.status = statusFilter;
    }
    return query;
  }, [offset, pageSize, statusFilter]);

  const loadWorkbench = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!runId) return;
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await getProductImportWorkbench(runId, buildQuery());
        if (mountedRef.current) {
          setWorkbench(data);
        }
      } catch (err) {
        if (mountedRef.current) {
          const message = err instanceof Error ? err.message : 'Failed to load workbench';
          setError(message);
        }
        throw err;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [buildQuery, runId]
  );

  useEffect(() => {
    void loadWorkbench().catch(() => undefined);
  }, [loadWorkbench]);

  useEffect(() => {
    if (!workbench?.skillRun?.id) return;
    if (workbench.skillRun.status !== 'running') return;

    const timer = window.setInterval(() => {
      void advanceProductImportRun(runId, {})
        .then(() => loadWorkbench({ silent: true }))
        .catch(() => loadWorkbench({ silent: true }).catch(() => undefined));
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [loadWorkbench, runId, workbench?.skillRun?.id, workbench?.skillRun?.status]);

  const refresh = useCallback(async () => {
    await loadWorkbench({ silent: !!workbench });
  }, [loadWorkbench, workbench]);

  const batchPrepare = useCallback(
    async (proposalArtifactIds: string[]) => {
      if (!runId) return;
      setBatchBusy(true);
      try {
        await createProductImportRunApprovals(
          runId,
          proposalArtifactIds.length > 0 ? proposalArtifactIds : undefined
        );
        await loadWorkbench({ silent: true });
      } finally {
        if (mountedRef.current) setBatchBusy(false);
      }
    },
    [loadWorkbench, runId]
  );

  const batchApproveAndApply = useCallback(
    async (approvalIds: string[]) => {
      if (!runId) return;
      setBatchBusy(true);
      try {
        await decideProductImportRunApprovals(runId, {
          approvalIds: approvalIds.length > 0 ? approvalIds : undefined,
          decision: 'approved',
        });
        await applyProductImportRunApprovals(
          runId,
          approvalIds.length > 0 ? approvalIds : undefined
        );
        await loadWorkbench({ silent: true });
      } finally {
        if (mountedRef.current) setBatchBusy(false);
      }
    },
    [loadWorkbench, runId]
  );

  const batchApplyOnly = useCallback(
    async (approvalIds: string[]) => {
      if (!runId) return;
      setBatchBusy(true);
      try {
        await applyProductImportRunApprovals(
          runId,
          approvalIds.length > 0 ? approvalIds : undefined
        );
        await loadWorkbench({ silent: true });
      } finally {
        if (mountedRef.current) setBatchBusy(false);
      }
    },
    [loadWorkbench, runId]
  );

  /** Resolve selected rows across pages, prepare missing approvals, then approve/apply. */
  const batchApproveAndApplySelection = useCallback(
    async (proposalArtifactIds: string[]) => {
      if (!runId || proposalArtifactIds.length === 0) {
        return { applied: 0, failed: 0, prepared: 0, actionable: false };
      }
      setBatchBusy(true);
      try {
        const prepared = await createProductImportRunApprovals(runId, proposalArtifactIds);
        const pendingIds = prepared.approvals
          .filter(approval => approval.status === 'pending')
          .map(approval => approval.id);
        const applyOnlyIds = prepared.approvals
          .filter(approval => approval.status === 'approved' || approval.status === 'apply_failed')
          .map(approval => approval.id);

        if (pendingIds.length === 0 && applyOnlyIds.length === 0) {
          await loadWorkbench({ silent: true });
          return {
            applied: 0,
            failed: 0,
            prepared: proposalArtifactIds.length,
            actionable: false,
          };
        }

        if (pendingIds.length > 0) {
          await decideProductImportRunApprovals(runId, {
            approvalIds: pendingIds,
            decision: 'approved',
          });
        }

        const allApplyIds = [...pendingIds, ...applyOnlyIds];
        const applyResult = await applyProductImportRunApprovals(runId, allApplyIds);
        await loadWorkbench({ silent: true });
        return {
          applied: applyResult.processed,
          failed: prepared.skipped.length + Math.max(0, allApplyIds.length - applyResult.processed),
          prepared: proposalArtifactIds.length,
          actionable: true,
        };
      } finally {
        if (mountedRef.current) setBatchBusy(false);
      }
    },
    [loadWorkbench, runId]
  );

  const batchRejectSelection = useCallback(
    async (proposalArtifactIds: string[]) => {
      if (!runId || proposalArtifactIds.length === 0) {
        return { rejected: 0, actionable: false };
      }
      setBatchBusy(true);
      try {
        const prepared = await createProductImportRunApprovals(runId, proposalArtifactIds);
        const pendingIds = prepared.approvals
          .filter(approval => approval.status === 'pending')
          .map(approval => approval.id);

        if (pendingIds.length === 0) {
          return { rejected: 0, actionable: false };
        }

        await decideProductImportRunApprovals(runId, {
          approvalIds: pendingIds,
          decision: 'rejected',
        });
        await loadWorkbench({ silent: true });
        return { rejected: pendingIds.length, actionable: true };
      } finally {
        if (mountedRef.current) setBatchBusy(false);
      }
    },
    [loadWorkbench, runId]
  );

  const batchReject = useCallback(
    async (approvalIds: string[]) => {
      if (!runId) return;
      setBatchBusy(true);
      try {
        await decideProductImportRunApprovals(runId, {
          approvalIds: approvalIds.length > 0 ? approvalIds : undefined,
          decision: 'rejected',
        });
        await loadWorkbench({ silent: true });
      } finally {
        if (mountedRef.current) setBatchBusy(false);
      }
    },
    [loadWorkbench, runId]
  );

  const totalRows = workbench?.page.totalRows ?? 0;
  const canPrevPage = offset > 0;
  const canNextPage = offset + pageSize < totalRows;

  const prevPage = useCallback(() => {
    setOffset(prev => Math.max(0, prev - pageSize));
  }, [pageSize]);

  const nextPage = useCallback(() => {
    setOffset(prev => prev + pageSize);
  }, [pageSize]);

  return {
    workbench,
    loading,
    refreshing,
    error,
    offset,
    batchBusy,
    totalRows,
    canPrevPage,
    canNextPage,
    refresh,
    prevPage,
    nextPage,
    batchPrepare,
    batchApproveAndApply,
    batchApplyOnly,
    batchApproveAndApplySelection,
    batchRejectSelection,
    batchReject,
  };
}
