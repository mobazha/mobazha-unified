'use client';

import type { ToolCallInfo } from '@mobazha/core';
import { AgentApprovalActions } from './AgentApprovalActions';

interface AgentApprovalCardProps {
  tool: ToolCallInfo;
  onStatusChange?: (
    toolId: string,
    localStatus: 'approved' | 'rejected' | 'applied' | 'failed'
  ) => void;
}

export function AgentApprovalCard({ tool, onStatusChange }: AgentApprovalCardProps) {
  const approval = tool.approval;
  if (!approval || tool.status !== 'approval_required') {
    return null;
  }

  return (
    <AgentApprovalActions
      approvalId={approval.id}
      action={approval.action}
      summary={approval.summary}
      localStatus={approval.localStatus}
      onStatusChange={status => onStatusChange?.(tool.id, status)}
      testId={`agent-approval-${approval.id}`}
    />
  );
}
