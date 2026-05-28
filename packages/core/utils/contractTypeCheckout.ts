/**
 * Checkout-time contract type validation.
 *
 * Carts may mix product types; each order/checkout must contain a single
 * listing contract type (aligned with backend contracttype.AddToSingleTypeOrder).
 */

export const CONTRACT_TYPE_DIGITAL = 'DIGITAL_GOOD';
export const CONTRACT_TYPE_PHYSICAL = 'PHYSICAL_GOOD';

export type ContractTypeLineItem = {
  contractType?: string | null;
};

export interface ContractTypeCheckoutAnalysis {
  /** Distinct non-empty contract types in the cart/checkout selection. */
  uniqueTypes: string[];
  /** At least one line item has no contractType. */
  hasMissing: boolean;
  /** More than one distinct contract type — checkout must be split. */
  hasMixed: boolean;
  /** Safe to proceed with order creation for the current selection. */
  canCheckout: boolean;
  isEmpty: boolean;
  isAllDigital: boolean;
  hasDigitalItems: boolean;
  needsShippingAddress: boolean;
}

export function analyzeContractTypes(items: ContractTypeLineItem[]): ContractTypeCheckoutAnalysis {
  const uniqueTypes = Array.from(
    new Set(
      items.map(item => item.contractType?.trim()).filter((value): value is string => !!value)
    )
  );
  const hasMissing = items.some(item => !item.contractType?.trim());
  const hasMixed = uniqueTypes.length > 1;
  const isEmpty = items.length === 0;
  const canCheckout = !isEmpty && !hasMissing && !hasMixed;
  const isAllDigital =
    items.length > 0 && items.every(item => item.contractType?.trim() === CONTRACT_TYPE_DIGITAL);
  const hasDigitalItems = items.some(item => item.contractType?.trim() === CONTRACT_TYPE_DIGITAL);
  const needsShippingAddress = items.some(
    item => item.contractType?.trim() === CONTRACT_TYPE_PHYSICAL
  );

  return {
    uniqueTypes,
    hasMissing,
    hasMixed,
    canCheckout,
    isEmpty,
    isAllDigital,
    hasDigitalItems,
    needsShippingAddress,
  };
}
