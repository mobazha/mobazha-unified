/**
 * Maps order contractType to i18n keys for fulfillment-related UI labels.
 * Returns translation keys (not rendered text) — pass the result to `t()`.
 *
 * Buyer complete actions use `order.actions.complete*` (not `order.ship.completeService`).
 */
export type OrderContractType = string | undefined;

export function isPhysicalOrder(contractType?: OrderContractType): boolean {
  return !contractType || contractType === 'PHYSICAL_GOOD';
}

export function isServiceOrder(contractType?: OrderContractType): boolean {
  return contractType === 'SERVICE';
}

export function isDigitalOrder(contractType?: OrderContractType): boolean {
  return contractType === 'DIGITAL_GOOD';
}

/** Progress bar step 3: ship (physical) vs deliver (service/digital). */
export function getFulfillmentStepLabelKey(contractType?: OrderContractType): string {
  return isPhysicalOrder(contractType)
    ? 'order.statusCard.stepShipped'
    : 'order.statusCard.stepDelivered';
}

export function getProcessingSellerStatusKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.statusCard.processingSellerService';
  return 'order.statusCard.processingSeller';
}

export function getProcessingBuyerStatusKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.statusCard.processingBuyerService';
  return 'order.statusCard.processingBuyer';
}

export function getPendingBuyerPaidHintKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.statusCard.pendingBuyerPaidHintService';
  if (isDigitalOrder(contractType)) return 'order.statusCard.pendingBuyerPaidHintDigital';
  return 'order.statusCard.pendingBuyerPaidHint';
}

export function getShippedBuyerStatusKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.statusCard.shippedBuyerService';
  if (isDigitalOrder(contractType)) return 'order.statusCard.shippedBuyerDigital';
  return 'order.statusCard.shippedBuyer';
}

export function getShippedSellerStatusKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.statusCard.shippedSellerService';
  if (isDigitalOrder(contractType)) return 'order.statusCard.shippedSellerDigital';
  return 'order.statusCard.shippedSeller';
}

export function getShippedHintKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.statusCard.shippedHintService';
  if (isDigitalOrder(contractType)) return 'order.statusCard.shippedHintDigital';
  return 'order.statusCard.shippedHint';
}

/** Order list / badge label when status normalizes to `shipped`. */
export function getOrderListShippedLabelKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.serviceDelivered';
  if (isDigitalOrder(contractType)) return 'order.digitalDelivered';
  return 'order.shipped';
}

export function resolveOrderStatusLabelKey(
  status: string,
  contractType?: OrderContractType,
  fallbackKey?: string
): string {
  if (status === 'shipped') {
    return getOrderListShippedLabelKey(contractType);
  }
  return fallbackKey ?? `order.${status}`;
}

export function getShipActionLabelKey(
  contractType?: OrderContractType,
  digital?: {
    canSyncDigitalDelivery?: boolean;
    canRetryDigitalDelivery?: boolean;
    manualDigitalFallbackAllowed?: boolean;
  }
): string {
  if (contractType === 'DIGITAL_GOOD') {
    if (digital?.canSyncDigitalDelivery) return 'order.actions.syncDelivery';
    if (digital?.canRetryDigitalDelivery) return 'order.actions.retryDigitalDelivery';
    if (digital?.manualDigitalFallbackAllowed) return 'order.actions.deliverDigital';
    return 'order.actions.deliveryPending';
  }
  if (isServiceOrder(contractType)) {
    return 'order.actions.deliverService';
  }
  return 'order.actions.ship';
}

export function getAcceptDialogDescriptionKey(
  isFiatPayment: boolean,
  contractType?: OrderContractType
): string {
  if (isFiatPayment && isServiceOrder(contractType)) {
    return 'order.accept.fiatDescriptionService';
  }
  return isFiatPayment ? 'order.accept.fiatDescription' : 'order.accept.description';
}

export function getAcceptSuccessDescKey(contractType?: OrderContractType): string {
  return isServiceOrder(contractType)
    ? 'order.actions.acceptSuccessDescService'
    : 'order.actions.acceptSuccessDesc';
}

export function getShipSuccessTitleKey(contractType?: OrderContractType): string {
  return isServiceOrder(contractType)
    ? 'order.actions.shipSuccessService'
    : 'order.actions.shipSuccess';
}

export function getShipSuccessDescKey(contractType?: OrderContractType): string {
  return isServiceOrder(contractType)
    ? 'order.actions.shipSuccessDescService'
    : 'order.actions.shipSuccessDesc';
}

export function getAcceptedDescSellerKey(contractType?: OrderContractType): string {
  return isServiceOrder(contractType)
    ? 'order.acceptedDescSellerService'
    : 'order.acceptedDescSeller';
}

/** Buyer primary action when order is ready to complete (Complete / confirm receipt). */
export function getCompleteActionLabelKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.actions.completeService';
  if (isDigitalOrder(contractType)) return 'order.actions.completeDigital';
  return 'order.actions.complete';
}

export function getCompleteDialogTitleKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.dialogs.completeOrder.titleService';
  if (isDigitalOrder(contractType)) return 'order.dialogs.completeOrder.titleDigital';
  return 'order.dialogs.completeOrder.title';
}

export function getCompleteDialogDescriptionKey(
  contractType?: OrderContractType,
  isModerated?: boolean
): string {
  if (isServiceOrder(contractType)) {
    return isModerated
      ? 'order.dialogs.completeOrder.moderatedDescriptionService'
      : 'order.dialogs.completeOrder.descriptionService';
  }
  if (isDigitalOrder(contractType)) {
    return isModerated
      ? 'order.dialogs.completeOrder.moderatedDescriptionDigital'
      : 'order.dialogs.completeOrder.descriptionDigital';
  }
  return isModerated
    ? 'order.dialogs.completeOrder.moderatedDescription'
    : 'order.dialogs.completeOrder.description';
}

/** Detail summary / footer badge when backend status is `shipped`. */
export function getShippedStatusLabelKey(contractType?: OrderContractType): string {
  return getOrderListShippedLabelKey(contractType);
}

export function getDeliveredBuyerStatusKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.statusCard.deliveredBuyerService';
  if (isDigitalOrder(contractType)) return 'order.statusCard.deliveredBuyerDigital';
  return 'order.statusCard.deliveredBuyer';
}

export function getDeliveredSellerStatusKey(contractType?: OrderContractType): string {
  if (isServiceOrder(contractType)) return 'order.statusCard.deliveredSellerService';
  if (isDigitalOrder(contractType)) return 'order.statusCard.deliveredSellerDigital';
  return 'order.statusCard.deliveredSeller';
}
