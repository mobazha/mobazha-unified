/**
 * Mobazha wire canonical uses *ID suffix (orderID, caseID, peerID).
 * Read helpers accept legacy camelCase variants at JSON ingress boundaries only.
 */

type StringRecord = Record<string, unknown> | null | undefined;

export function readStringField(record: StringRecord, ...keys: string[]): string {
  if (!record) return '';
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return '';
}

export function resolveOrderID(record: StringRecord): string {
  return readStringField(record, 'orderID', 'orderId');
}

export function resolveCaseID(record: StringRecord): string {
  return readStringField(record, 'caseID', 'caseId');
}

/** Backend emits orderID for buyer/seller events and caseID for moderator case events (same value). */
export function resolveOrderOrCaseID(record: StringRecord): string {
  return resolveOrderID(record) || resolveCaseID(record);
}

export function resolvePeerID(record: StringRecord): string {
  return readStringField(record, 'peerID', 'peerId');
}

export function resolveNotificationID(record: StringRecord): string {
  return readStringField(record, 'notificationID', 'notificationId');
}
