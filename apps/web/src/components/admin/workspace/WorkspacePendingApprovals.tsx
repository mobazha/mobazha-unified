'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listAgentApprovals,
  useI18n,
  type AgentApprovalRecord,
  type AgentApprovalStatus,
} from '@mobazha/core';
import { ShieldAlert } from 'lucide-react';
import {
  AgentApprovalActions,
  type AgentApprovalLocalStatus,
} from '@/components/ai/AgentApprovalActions';

type TrackedApproval = AgentApprovalRecord & { localStatus: AgentApprovalLocalStatus };

function toLocalStatus(status: AgentApprovalStatus): AgentApprovalLocalStatus {
  if (status === 'apply_failed') return 'failed';
  if (status === 'pending') return 'pending';
  return 'pending';
}

async function fetchActionableApprovals(): Promise<TrackedApproval[]> {
  const [pending, failed] = await Promise.all([
    listAgentApprovals({ status: 'pending', limit: 5 }),
    listAgentApprovals({ status: 'apply_failed', limit: 5 }),
  ]);
  return [...pending, ...failed]
    .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
    .slice(0, 5)
    .map(item => ({
      ...item,
      localStatus: toLocalStatus(item.status),
    }));
}

export function WorkspacePendingApprovals() {
  const { t } = useI18n();
  const [items, setItems] = useState<TrackedApproval[]>([]);

  useEffect(() => {
    let active = true;
    fetchActionableApprovals()
      .then(merged => {
        if (active) setItems(merged);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleStatusChange = useCallback(
    (approvalId: string, localStatus: AgentApprovalLocalStatus) => {
      setItems(current => {
        if (localStatus === 'applied' || localStatus === 'rejected') {
          return current.filter(item => item.id !== approvalId);
        }
        if (localStatus === 'failed') {
          return current.map(item =>
            item.id === approvalId ? { ...item, localStatus: 'failed' } : item
          );
        }
        return current;
      });
    },
    []
  );

  const actionableCount = items.filter(
    item => item.localStatus === 'pending' || item.localStatus === 'failed'
  ).length;

  if (actionableCount === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl border border-border bg-card px-4 py-3 space-y-3"
      data-testid="workspace-pending-approvals"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden />
        <p className="text-sm font-medium text-foreground">
          {t('ai.approval.actionBanner', { count: actionableCount })}
        </p>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <AgentApprovalActions
            key={item.id}
            approvalId={item.id}
            action={item.action}
            summary={item.summary}
            localStatus={item.localStatus}
            applyError={item.applyError}
            onStatusChange={status => handleStatusChange(item.id, status)}
            testId={`workspace-approval-${item.id}`}
          />
        ))}
      </div>
    </div>
  );
}
