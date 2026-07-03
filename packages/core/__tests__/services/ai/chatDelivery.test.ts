import { describe, expect, it } from 'vitest';
import {
  parseChatDeliveryFromSSE,
  translateDeliveryItemStatus,
  translateDeliveryMessage,
  translateDeliveryNextAction,
  upsertChatDeliveries,
  type ChatDelivery,
} from '../../../services/ai/chatDelivery';
import type { ChatSSEEvent } from '../../../services/ai/chatService';

const t = (key: string, params?: Record<string, string | number>) => {
  const catalog: Record<string, string> = {
    'product_import.needs_review': 'Review {{reviewableCount}} draft(s)',
    'product_import.nextAction.review_proposals': 'Review draft proposals',
    'product_import.nextAction.unknown': 'Action: {{type}}',
    'product_import.itemStatus.needs_review': 'Needs review',
    'product_import.structuredStatus': 'Status: {{state}}',
  };
  let result = catalog[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
    });
  }
  return result;
};

describe('parseChatDeliveryFromSSE', () => {
  it('parses top-level delivery fields without summary or backend-authored text', () => {
    const event: ChatSSEEvent = {
      type: 'delivery',
      state: 'needs_review',
      skillId: 'product.import',
      skillRunId: 'run_1',
      messageKey: 'product_import.needs_review',
      data: {
        counts: { proposalCount: 2 },
        reviewableCount: 2,
        items: [{ name: 'Blue Tee', status: 'needs_review' }],
        nextActions: [{ type: 'review_proposals', sourceArtifactId: 'art_1' }],
      },
    };

    expect(parseChatDeliveryFromSSE(event)).toEqual({
      state: 'needs_review',
      skillId: 'product.import',
      skillRunId: 'run_1',
      messageKey: 'product_import.needs_review',
      data: {
        status: undefined,
        counts: {
          sourceCount: undefined,
          candidateCount: undefined,
          proposalCount: 2,
          validationCount: undefined,
        },
        reviewableCount: 2,
        actionableCount: undefined,
        pendingApprovalCount: undefined,
        needsMoreInput: false,
        items: [{ name: 'Blue Tee', status: 'needs_review' }],
        nextActions: [{ type: 'review_proposals', sourceArtifactId: 'art_1' }],
      },
    });
  });

  it('rejects delivery events without a supported state or message key', () => {
    expect(
      parseChatDeliveryFromSSE({
        type: 'delivery',
        state: 'unknown',
        messageKey: 'product_import.needs_review',
      })
    ).toBeNull();
    expect(
      parseChatDeliveryFromSSE({
        type: 'delivery',
        state: 'needs_review',
        messageKey: '',
      })
    ).toBeNull();
  });
});

describe('translateDeliveryMessage', () => {
  it('uses messageKey when recognized', () => {
    const delivery: ChatDelivery = {
      state: 'needs_review',
      messageKey: 'product_import.needs_review',
      data: { reviewableCount: 2 },
    };
    expect(translateDeliveryMessage(t, delivery)).toBe('Review 2 draft(s)');
  });

  it('falls back to state-based copy for unknown message keys', () => {
    const delivery: ChatDelivery = {
      state: 'needs_review',
      messageKey: 'product_import.future_state',
    };
    expect(translateDeliveryMessage(t, delivery)).toBe('Review 0 draft(s)');
  });
});

describe('translateDeliveryNextAction', () => {
  it('localizes known action types by type only', () => {
    expect(
      translateDeliveryNextAction(t, {
        type: 'review_proposals',
        sourceArtifactId: 'art_1',
      })
    ).toBe('Review draft proposals');
  });

  it('uses generic label for unknown action types', () => {
    expect(translateDeliveryNextAction(t, { type: 'future_action' })).toBe('Action: future_action');
  });
});

describe('translateDeliveryItemStatus', () => {
  it('localizes known statuses and hides unknown machine values', () => {
    expect(translateDeliveryItemStatus(t, 'needs_review')).toBe('Needs review');
    expect(translateDeliveryItemStatus(t, 'future_status')).toBeNull();
  });
});

describe('upsertChatDeliveries', () => {
  const base: ChatDelivery = {
    state: 'needs_review',
    skillId: 'product.import',
    skillRunId: 'run_1',
    messageKey: 'product_import.needs_review',
    data: { reviewableCount: 1 },
  };

  it('upserts by skillRunId and keeps the latest state', () => {
    const updated: ChatDelivery = {
      ...base,
      state: 'needs_approval',
      messageKey: 'product_import.needs_approval',
      data: { pendingApprovalCount: 2 },
    };

    expect(upsertChatDeliveries([base], updated)).toEqual([updated]);
  });

  it('appends deliveries for different skill runs', () => {
    const other: ChatDelivery = {
      ...base,
      skillRunId: 'run_2',
    };
    expect(upsertChatDeliveries([base], other)).toEqual([base, other]);
  });
});
