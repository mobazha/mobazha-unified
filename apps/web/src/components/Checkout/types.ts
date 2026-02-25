import type { Address as FrontendAddress } from '@/components/Address';
import type { UserProfile, DisplayAddress, Address as CoreAddress } from '@mobazha/core';

/** Checkout shipping zone (unified from ShippingProfile zones and legacy ShippingOptions) */
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
  additionalItemPrice?: number;
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
  total: number;
  currency: string;

  updateQuantity: (itemId: string, qty: number) => void;
  orderNote: string;
  setOrderNote: (note: string) => void;
  handleCreateOrder: () => Promise<void>;
  isSubmitting: boolean;
  canSubmit: boolean;

  isRwaToken: boolean;
  rwaTradeMode: number | undefined;
  needsShippingAddress: boolean;
  hasAllShippingSelected: boolean;
}
