import type { Address as FrontendAddress } from '@/components/Address';
import type { UserProfile, DisplayAddress, Address as CoreAddress } from '@mobazha/core';
import type { AppliedDiscount } from '@mobazha/core/utils/discountUtils';
import type { ApplicableDiscount } from '@mobazha/core/services/api/discounts';

/** Checkout shipping zone (from ShippingProfile zones) */
export interface CheckoutShippingZone {
  id?: string;
  name: string;
  regions: string[];
  rates: CheckoutShippingRate[];
  currency: string;
}

/** Checkout shipping rate within a zone */
export interface CheckoutShippingRate {
  id?: string;
  name: string;
  price: number;
  currency: string;
  estimatedDelivery?: string;
}

/** Resolved checkout item with all data needed for order creation */
export interface CheckoutItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  image: string;
  vendor: {
    name: string;
    peerID: string;
  };
  listingHash?: string;
  contractType?: string;
  rwaTradeMode?: number;
  rwaEscrowTimeoutSeconds?: number;
  cryptoListingCurrencyCode?: string;
  shippingZones?: CheckoutShippingZone[];
  taxAmount?: number;
}

/** Per-item shipping selection */
export interface ShippingSelection {
  zoneName: string;
  rateName: string;
  zoneId?: string;
  rateId?: string;
}

/** Address-related actions exposed by the hook */
export interface AddressActions {
  showDrawer: boolean;
  setShowDrawer: (v: boolean) => void;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  editingAddress: DisplayAddress | null;
  setEditingAddress: (a: DisplayAddress | null) => void;
  apiAddresses: DisplayAddress[];
  isSaving: boolean;
  isLoading: boolean;
  addAddress: (a: Omit<CoreAddress, 'id'>) => Promise<boolean>;
  updateAddress: (id: string, a: Partial<CoreAddress>) => Promise<boolean>;
  deleteAddress: (id: string) => Promise<boolean>;
  setDefaultAddress: (id: string) => Promise<boolean>;
  defaultAddress: DisplayAddress | undefined;
}

/** Return type of useCheckout hook — consumed by Desktop and Mobile views */
export interface UseCheckoutReturn {
  checkoutItems: CheckoutItem[];
  isLoading: boolean;
  error: string | null;
  vendor: UserProfile | null;

  addresses: FrontendAddress[];
  selectedAddress: string;
  setSelectedAddress: (id: string) => void;
  addressActions: AddressActions;

  selectedShipping: Record<string, ShippingSelection>;
  handleShippingChange: (itemId: string, sel: ShippingSelection) => void;
  selectedCountryCode: string | undefined;

  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  currency: string;

  updateQuantity: (itemId: string, qty: number) => void;
  orderNote: string;
  setOrderNote: (note: string) => void;
  refundAddress: string;
  setRefundAddress: (address: string) => void;
  requiresRefundAddress: boolean;
  connectedRefundWalletAddress: string | null;
  handleCreateOrder: () => Promise<void>;
  isSubmitting: boolean;
  canSubmit: boolean;

  appliedDiscounts: AppliedDiscount[];
  applicableDiscounts: ApplicableDiscount[];
  discountTotal: number;
  isValidatingDiscount: boolean;
  handleApplyDiscountCode: (code: string) => Promise<void>;
  handleRemoveDiscount: (id: string) => void;

  isRwaToken: boolean;
  rwaTradeMode: number | undefined;
  needsShippingAddress: boolean;
  hasAllShippingSelected: boolean;
  hasShippingPricingIssue: boolean;
  hasFreeShippingSelection: boolean;
}
