import type { TranslationParams } from '../../i18n/types';
import type { ChatSSEEvent } from './chatService';

export type ChatDeliveryState =
  | 'needs_input'
  | 'needs_review'
  | 'needs_approval'
  | 'completed'
  | 'partially_completed'
  | 'failed';

export const CHAT_DELIVERY_STATES: readonly ChatDeliveryState[] = [
  'needs_input',
  'needs_review',
  'needs_approval',
  'completed',
  'partially_completed',
  'failed',
] as const;

export interface ProductImportDeliveryCounts {
  sourceCount?: number;
  candidateCount?: number;
  proposalCount?: number;
  validationCount?: number;
}

export interface ProductImportDeliveryItem {
  name?: string;
  status?: string;
}

export interface ProductImportDeliveryNextAction {
  type: string;
  sourceArtifactId?: string;
  candidateArtifactId?: string;
}

export interface ProductImportDeliveryData {
  status?: string;
  counts?: ProductImportDeliveryCounts;
  reviewableCount?: number;
  actionableCount?: number;
  pendingApprovalCount?: number;
  needsMoreInput?: boolean;
  items?: ProductImportDeliveryItem[];
  nextActions?: ProductImportDeliveryNextAction[];
}

export interface ChatDelivery {
  state: ChatDeliveryState;
  skillId?: string;
  skillRunId?: string;
  messageKey: string;
  data?: ProductImportDeliveryData;
}

export const PRODUCT_IMPORT_DELIVERY_MESSAGE_KEYS = [
  'product_import.needs_input',
  'product_import.needs_review',
  'product_import.needs_approval',
  'product_import.completed',
  'product_import.partially_completed',
  'product_import.failed',
] as const;

export type ProductImportDeliveryMessageKey = (typeof PRODUCT_IMPORT_DELIVERY_MESSAGE_KEYS)[number];

const PRODUCT_IMPORT_ITEM_STATUSES = [
  'new',
  'needs_review',
  'ready',
  'skipped',
  'applied',
] as const;

type ProductImportDeliveryItemStatus = (typeof PRODUCT_IMPORT_ITEM_STATUSES)[number];

function isKnownProductImportDeliveryMessageKey(
  messageKey: string
): messageKey is ProductImportDeliveryMessageKey {
  return (PRODUCT_IMPORT_DELIVERY_MESSAGE_KEYS as readonly string[]).includes(messageKey);
}

function isChatDeliveryState(value: string): value is ChatDeliveryState {
  return (CHAT_DELIVERY_STATES as readonly string[]).includes(value);
}

function isProductImportDeliveryItemStatus(
  value: string
): value is ProductImportDeliveryItemStatus {
  return (PRODUCT_IMPORT_ITEM_STATUSES as readonly string[]).includes(value);
}

function normalizeDeliveryData(raw: unknown): ProductImportDeliveryData | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const countsRaw = record.counts;
  let counts: ProductImportDeliveryCounts | undefined;
  if (countsRaw && typeof countsRaw === 'object') {
    const c = countsRaw as Record<string, unknown>;
    counts = {
      sourceCount: readCount(c.sourceCount),
      candidateCount: readCount(c.candidateCount),
      proposalCount: readCount(c.proposalCount),
      validationCount: readCount(c.validationCount),
    };
  }
  const itemsRaw = record.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .filter(
          (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object'
        )
        .map(item => ({
          name: typeof item.name === 'string' ? item.name : undefined,
          status: typeof item.status === 'string' ? item.status : undefined,
        }))
    : undefined;
  const nextActionsRaw = record.nextActions;
  const nextActions = Array.isArray(nextActionsRaw)
    ? nextActionsRaw
        .filter(
          (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object'
        )
        .map(item => ({
          type: typeof item.type === 'string' ? item.type : '',
          sourceArtifactId:
            typeof item.sourceArtifactId === 'string' ? item.sourceArtifactId : undefined,
          candidateArtifactId:
            typeof item.candidateArtifactId === 'string' ? item.candidateArtifactId : undefined,
        }))
        .filter(action => action.type.length > 0)
    : undefined;
  return {
    status: typeof record.status === 'string' ? record.status : undefined,
    counts,
    reviewableCount: readCount(record.reviewableCount),
    actionableCount: readCount(record.actionableCount),
    pendingApprovalCount: readCount(record.pendingApprovalCount),
    needsMoreInput: record.needsMoreInput === true,
    items,
    nextActions,
  };
}

function readCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Parse a top-level SSE delivery event (fields are not nested under result). */
export function parseChatDeliveryFromSSE(event: ChatSSEEvent): ChatDelivery | null {
  if (event.type !== 'delivery') return null;
  const state = typeof event.state === 'string' ? event.state.trim() : '';
  const messageKey = typeof event.messageKey === 'string' ? event.messageKey.trim() : '';
  if (!isChatDeliveryState(state) || !messageKey) return null;
  return {
    state,
    skillId: typeof event.skillId === 'string' ? event.skillId : undefined,
    skillRunId: typeof event.skillRunId === 'string' ? event.skillRunId : undefined,
    messageKey,
    data: normalizeDeliveryData(event.data),
  };
}

export function deliveryUpsertKey(delivery: ChatDelivery): string {
  return delivery.skillRunId?.trim() || delivery.messageKey;
}

/** Upsert by skillRunId (or messageKey fallback); latest event wins. */
export function upsertChatDeliveries(
  existing: ChatDelivery[] | undefined,
  incoming: ChatDelivery
): ChatDelivery[] {
  const key = deliveryUpsertKey(incoming);
  const list = existing ? [...existing] : [];
  const index = list.findIndex(item => deliveryUpsertKey(item) === key);
  if (index >= 0) {
    list[index] = incoming;
    return list;
  }
  return [...list, incoming];
}

export function deliveryTranslationParams(data?: ProductImportDeliveryData): TranslationParams {
  const counts = data?.counts ?? {};
  return {
    reviewableCount: data?.reviewableCount ?? 0,
    actionableCount: data?.actionableCount ?? 0,
    pendingApprovalCount: data?.pendingApprovalCount ?? 0,
    sourceCount: counts.sourceCount ?? 0,
    candidateCount: counts.candidateCount ?? 0,
    proposalCount: counts.proposalCount ?? 0,
    validationCount: counts.validationCount ?? 0,
  };
}

export function isProductImportDelivery(delivery: ChatDelivery): boolean {
  return delivery.skillId === 'product.import';
}

/** Localize delivery title from messageKey; unknown keys fall back to state-based copy. */
export function translateDeliveryMessage(
  t: (key: string, params?: TranslationParams) => string,
  delivery: ChatDelivery
): string {
  const params = deliveryTranslationParams(delivery.data);
  if (isKnownProductImportDeliveryMessageKey(delivery.messageKey)) {
    return t(delivery.messageKey, params);
  }
  const stateKey = `product_import.${delivery.state}`;
  if (isKnownProductImportDeliveryMessageKey(stateKey)) {
    return t(stateKey, params);
  }
  return t('product_import.structuredStatus', { state: delivery.state, ...params });
}

export function translateDeliveryNextAction(
  t: (key: string, params?: TranslationParams) => string,
  action: ProductImportDeliveryNextAction
): string {
  const key = `product_import.nextAction.${action.type}`;
  const translated = t(key);
  if (translated !== key) {
    return translated;
  }
  return t('product_import.nextAction.unknown', { type: action.type });
}

export function translateDeliveryItemStatus(
  t: (key: string, params?: TranslationParams) => string,
  status?: string
): string | null {
  if (!status || !isProductImportDeliveryItemStatus(status)) return null;
  return t(`product_import.itemStatus.${status}`);
}
