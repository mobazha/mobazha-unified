'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  analyzeContractTypes,
  convertCurrency,
  fromMinimalUnit,
  toMinimalUnit,
  productDataService,
  profileApi,
  ordersApi,
  productsApi,
  getImageUrl,
  useShippingAddresses,
  useCartStore,
  parseCollectibleListingMetadata,
  hasAuthoritativeCollectibleTitleMetadata,
  useFeature,
  useAppKit,
  resolveCheckoutPaymentPolicyFromCheckoutItems,
  persistCheckoutPaymentPolicy,
  sanitizeCheckoutPaymentPolicySession,
  referralSessionForSeller,
  clearSellerAffiliateReferralSession,
  shouldClearSellerAffiliateReferralOnError,
} from '@mobazha/core';
import type { UserProfile } from '@mobazha/core';
import type { OrderItemOption, ProductSku } from '@mobazha/core';
import { discountsApi } from '@mobazha/core/services/api/discounts';
import type { ApplicableDiscount } from '@mobazha/core/services/api/discounts';
import type { AppliedDiscount } from '@mobazha/core/utils/discountUtils';
import { calculateDiscountAmount } from '@mobazha/core/utils/discountUtils';
import { useToast } from '@/components/ui/use-toast';
import { useCheckoutSupplyQuote } from '@mobazha/core/hooks/useCheckoutSupplyQuote';
import { useI18n } from '@mobazha/core';
import {
  profileToCheckoutZones,
  toFrontendAddress,
  toOrderAddress,
  isZoneAvailable,
} from '@/components/Checkout/checkout-utils';
import type {
  CheckoutItem,
  ShippingSelection,
  UseCheckoutReturn,
} from '@/components/Checkout/types';

/**
 * useCheckout — all business logic for the checkout page.
 *
 * Supports two entry modes:
 *  1. Single-item "Buy Now": ?slug=xxx&peerID=yyy&quantity=1
 *  2. Multi-item from cart:  ?vendorPeerID=yyy&slugs=slug1,slug2
 *     (quantities and options read from useCartStore)
 *
 * Both vendorPeerID and slugs are required for cart mode. A URL with only
 * vendorPeerID and no slugs does not trigger cart mode — this prevents silently
 * loading all cart items for that vendor when slugs are absent (e.g. truncated URL).
 */
export function useCheckout(): UseCheckoutReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { toast } = useToast();
  const collectiblesHubEnabled = useFeature('collectiblesHubEnabled');
  const {
    address: appKitAddress,
    isConnected: appKitConnected,
    isInitializing: appKitInitializing,
    connectSolana,
    chain: appKitChain,
  } = useAppKit();
  // ---- URL params ----
  const singleSlug = searchParams.get('slug');
  const singlePeerID = searchParams.get('peerID');
  const singleQty = parseInt(searchParams.get('quantity') || '1', 10);
  const singleOptionsParam = searchParams.get('options');

  const cartVendorPeerID = searchParams.get('vendorPeerID');
  const cartSlugs = searchParams.get('slugs');

  // Both params are required: vendorPeerID alone must not silently load all vendor
  // cart items. buildCheckoutUrl always includes slugs for multi-item checkouts.
  const isCartMode = !!cartVendorPeerID && !!cartSlugs;

  // ---- Cart store (for multi-item mode) ----
  const cartItems = useCartStore(s => s.items);

  const parseOptionsParam = useCallback((value: string | null): OrderItemOption[] | undefined => {
    if (!value) return undefined;
    const parsed = value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const idx = part.indexOf(':');
        if (idx <= 0) return null;
        const name = part.slice(0, idx).trim();
        const optionValue = part.slice(idx + 1).trim();
        if (!name || !optionValue) return null;
        return { name, value: optionValue };
      })
      .filter((item): item is OrderItemOption => item !== null);
    return parsed.length > 0 ? parsed : undefined;
  }, []);

  const findMatchingSku = useCallback(
    (skus: ProductSku[] | undefined, options: OrderItemOption[] | undefined): ProductSku | null => {
      if (!skus?.length || !options?.length) return null;
      return (
        skus.find(sku => {
          if (!sku.selections || sku.selections.length !== options.length) return false;
          return sku.selections.every(selection =>
            options.some(
              option => option.name === selection.option && option.value === selection.variant
            )
          );
        }) ?? null
      );
    },
    []
  );

  // ---- Core state ----
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendor, setVendor] = useState<UserProfile | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);

  // ---- Address management ----
  const {
    addresses: apiAddresses,
    defaultAddress,
    isLoading: isLoadingAddresses,
    isSaving: isSavingAddress,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useShippingAddresses();

  const addresses = useMemo(() => apiAddresses.map(toFrontendAddress), [apiAddresses]);

  const [selectedAddress, setSelectedAddress] = useState('');
  const [showAddressDrawer, setShowAddressDrawer] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<
    import('@mobazha/core').DisplayAddress | null
  >(null);

  useEffect(() => {
    if (defaultAddress) {
      setSelectedAddress(prev => prev || defaultAddress.id);
    }
  }, [defaultAddress]);

  // ---- Shipping selection ----
  const [selectedShipping, setSelectedShipping] = useState<Record<string, ShippingSelection>>({});
  const selectedShippingRef = useRef(selectedShipping);
  selectedShippingRef.current = selectedShipping;

  const handleShippingChange = useCallback((itemId: string, sel: ShippingSelection) => {
    setSelectedShipping(prev => ({ ...prev, [itemId]: sel }));
  }, []);

  // ---- Order note ----
  const [orderNote, setOrderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- Discounts ----
  const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedDiscount[]>([]);
  const [applicableDiscounts, setApplicableDiscounts] = useState<ApplicableDiscount[]>([]);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);

  // ---- Quantity ----
  const handleUpdateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCheckoutItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const quantity = item.isAuthoritativeCollectibleTitle ? 1 : newQuantity;
        return { ...item, quantity };
      })
    );
  }, []);

  // ---- Resolve a single product into a CheckoutItem ----
  const resolveProduct = useCallback(
    async (
      slug: string,
      vendorPeerID: string,
      quantity: number,
      options?: OrderItemOption[]
    ): Promise<CheckoutItem | null> => {
      const product = await productDataService.getProduct(slug, vendorPeerID);
      if (!product) return null;

      const matchedSku = findMatchingSku(product.item.skus, options);
      const price = Number(matchedSku?.price ?? product.item.price) || 0;
      const currency = product.metadata?.pricingCurrency?.code;
      if (!currency) {
        throw new Error(`Listing ${slug} is missing pricing currency`);
      }
      const imageUrl =
        matchedSku?.images?.[0]?.medium ||
        matchedSku?.images?.[0]?.small ||
        product.item.images?.[0]?.medium ||
        product.item.images?.[0]?.small;
      const sellerPeerID = product.vendorID?.peerID || vendorPeerID;

      let listingHash = '';
      try {
        const listingIndex = await productsApi.getStoreListingIndex(sellerPeerID);
        const meta = listingIndex.find(l => l.slug === slug);
        listingHash = meta?.cid || '';
      } catch {
        // fallback below
      }
      if (!listingHash) {
        const raw = product as unknown as Record<string, unknown>;
        listingHash = String(raw.hash ?? raw.cid ?? '');
      }

      const isAuthoritativeCollectibleTitle = hasAuthoritativeCollectibleTitleMetadata(product);
      const collectibleMeta = isAuthoritativeCollectibleTitle
        ? parseCollectibleListingMetadata(product)
        : null;
      const resolvedQuantity = isAuthoritativeCollectibleTitle ? 1 : quantity;

      return {
        id:
          options && options.length > 0
            ? `${product.slug}:${options.map(option => `${option.name}=${option.value}`).join('|')}`
            : product.slug,
        listingSlug: product.slug,
        title: product.item.title,
        price,
        currency,
        quantity: resolvedQuantity,
        image: getImageUrl(imageUrl) || '',
        vendor: { name: sellerPeerID.slice(0, 8), peerID: sellerPeerID },
        options,
        listingHash,
        contractType: product.metadata?.contractType,
        rwaTradeMode: product.metadata?.rwaTradeMode,
        rwaEscrowTimeoutSeconds: product.metadata?.rwaEscrowTimeoutSeconds,
        cryptoListingCurrencyCode: product.item?.cryptoListingCurrencyCode,
        shippingZones: product.shippingProfile
          ? profileToCheckoutZones(product.shippingProfile)
          : undefined,
        isCollectibleHubNft: isAuthoritativeCollectibleTitle,
        isAuthoritativeCollectibleTitle,
        fulfillment: collectibleMeta?.fulfillment,
        hubSlotID: collectibleMeta?.hubSlotID,
        nftMint: collectibleMeta?.nftMint,
        certNumber: collectibleMeta?.certNumber,
        hubLocation: collectibleMeta?.hubLocation,
      };
    },
    [findMatchingSku]
  );

  // ---- Load products ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        let items: CheckoutItem[] = [];

        if (isCartMode) {
          // Multi-item from cart
          const vendorID = cartVendorPeerID!;
          const vendorCartItems = cartItems.filter(item => item.listing.vendorPeerID === vendorID);
          const scopedCartItems = (() => {
            if (!cartSlugs) return vendorCartItems;
            const remaining = [...vendorCartItems];
            return cartSlugs
              .split(',')
              .filter(Boolean)
              .map(slug => {
                const idx = remaining.findIndex(item => item.listing.slug === slug);
                if (idx < 0) return null;
                return remaining.splice(idx, 1)[0];
              })
              .filter((item): item is (typeof vendorCartItems)[number] => item !== null);
          })();

          const resolved = await Promise.all(
            scopedCartItems.map(cartItem =>
              resolveProduct(
                cartItem.listing.slug,
                vendorID,
                cartItem.quantity || 1,
                cartItem.options
              )
            )
          );
          items = resolved.filter((r): r is CheckoutItem => r !== null);
        } else if (singleSlug) {
          // Single item buy-now
          const item = await resolveProduct(
            singleSlug,
            singlePeerID || '',
            singleQty,
            parseOptionsParam(singleOptionsParam)
          );
          if (item) items = [item];
        }

        if (cancelled) return;

        // Fetch vendor profile and patch item vendor names in one pass
        const peerID = items[0]?.vendor.peerID;
        if (peerID) {
          try {
            const v = await profileApi.getProfile(peerID);
            if (!cancelled && v) {
              setVendor(v);
              if (v.name) {
                items = items.map(item => ({
                  ...item,
                  vendor: { ...item.vendor, name: v.name },
                }));
              }
            }
          } catch {
            // vendor info is optional
          }
        }

        if (cancelled) return;
        setCheckoutItems(items);

        // Auto-select first shipping zone for physical goods
        const initialShipping: Record<string, ShippingSelection> = {};
        items.forEach(item => {
          if (item.contractType === 'PHYSICAL_GOOD' && item.shippingZones?.length) {
            const z = item.shippingZones[0];
            const r = z.rates?.[0];
            if (z && r) {
              initialShipping[item.id] = {
                zoneName: z.name,
                rateName: r.name,
                zoneId: z.id,
                rateId: r.id,
              };
            }
          }
        });
        if (!cancelled && Object.keys(initialShipping).length) {
          setSelectedShipping(initialShipping);
        }
      } catch (err) {
        console.error('Checkout: failed to load products', err);
        if (!cancelled) {
          setError((err as Error).message || 'Failed to load checkout items');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    singleSlug,
    singlePeerID,
    singleQty,
    singleOptionsParam,
    cartVendorPeerID,
    cartSlugs,
    parseOptionsParam,
    resolveProduct,
    cartItems,
  ]);

  const checkoutPaymentPolicy = useMemo(
    () => resolveCheckoutPaymentPolicyFromCheckoutItems(checkoutItems),
    [checkoutItems]
  );

  useEffect(() => {
    if (checkoutItems.length === 0) return;
    persistCheckoutPaymentPolicy(checkoutPaymentPolicy);
    sanitizeCheckoutPaymentPolicySession(checkoutPaymentPolicy);
  }, [checkoutItems.length, checkoutPaymentPolicy]);

  // ---- Derived state ----
  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [checkoutItems]
  );

  // Pricing currency is deterministic from listing metadata once checkout items are loaded.
  const pricingCurrency = checkoutItems[0]?.currency;

  const convertMinimalAmountToPricingCurrency = useCallback(
    (amount: number, fromCurrency: string, targetPricingCurrency: string): number => {
      if (!amount) return 0;

      const from = fromCurrency.toUpperCase();
      const to = targetPricingCurrency.toUpperCase();
      if (from === to) return amount;

      const standardAmount = fromMinimalUnit(amount, from);
      const convertedStandard = convertCurrency(standardAmount, from, to);
      return toMinimalUnit(convertedStandard, to);
    },
    []
  );

  const shippingTotal = useMemo(() => {
    if (!pricingCurrency) return 0;

    return checkoutItems.reduce((sum, item) => {
      if (item.contractType !== 'PHYSICAL_GOOD') return sum;
      if (!item.shippingZones?.length) return sum;
      const sel = selectedShipping[item.id];
      if (!sel) return sum;
      const zone = item.shippingZones.find(z => z.name === sel.zoneName);
      const rate = zone?.rates.find(r => r.name === sel.rateName);
      if (!rate) return sum;
      if (!rate.currency) return sum;

      const firstItemShipping = convertMinimalAmountToPricingCurrency(
        rate.price,
        rate.currency,
        pricingCurrency
      );
      return sum + firstItemShipping;
    }, 0);
  }, [checkoutItems, selectedShipping, pricingCurrency, convertMinimalAmountToPricingCurrency]);

  type SelectedShippingRate = { price: number; currency: string };
  const selectedPhysicalShippingRates = useMemo<SelectedShippingRate[]>(() => {
    const rates: SelectedShippingRate[] = [];

    checkoutItems.forEach(item => {
      if (item.contractType !== 'PHYSICAL_GOOD') return;
      if (!item.shippingZones?.length) return;

      const sel = selectedShipping[item.id];
      if (!sel) return;

      const zone = item.shippingZones.find(z => z.name === sel.zoneName);
      const rate = zone?.rates.find(r => r.name === sel.rateName);
      if (!rate) return;

      rates.push({ price: rate.price, currency: rate.currency });
    });

    return rates;
  }, [checkoutItems, selectedShipping]);

  const hasFreeShippingSelection = useMemo(() => {
    if (!selectedPhysicalShippingRates.length) return false;
    return selectedPhysicalShippingRates.every(rate => rate.price === 0);
  }, [selectedPhysicalShippingRates]);

  const hasShippingPricingIssue = useMemo(() => {
    if (!selectedPhysicalShippingRates.length) return false;
    if (!pricingCurrency) return true;
    if (selectedPhysicalShippingRates.some(rate => !rate.currency)) return true;

    const hasPaidShipping = selectedPhysicalShippingRates.some(rate => rate.price > 0);
    return hasPaidShipping && shippingTotal <= 0;
  }, [selectedPhysicalShippingRates, pricingCurrency, shippingTotal]);

  // Recalculate savedAmount for percentage-based discounts when subtotal changes
  useEffect(() => {
    if (!appliedDiscounts.length || subtotal <= 0) return;
    setAppliedDiscounts(prev =>
      prev.map(d => ({
        ...d,
        savedAmount: calculateDiscountAmount(d.valueType, d.value, subtotal),
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const discountTotal = useMemo(
    () => appliedDiscounts.reduce((sum, d) => sum + d.savedAmount, 0),
    [appliedDiscounts]
  );

  const taxTotal = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  }, [checkoutItems]);

  const total = Math.max(0, subtotal + shippingTotal + taxTotal - discountTotal);
  const currency = checkoutItems[0]?.currency ?? '';
  const contractTypeCheckout = useMemo(() => analyzeContractTypes(checkoutItems), [checkoutItems]);
  const { hasMissing: hasMissingContractType, hasMixed: hasMixedContractTypes } =
    contractTypeCheckout;
  const isRwaToken = useMemo(
    () => checkoutItems.some(i => i.contractType === 'RWA_TOKEN'),
    [checkoutItems]
  );

  const isCollectibleHubNftCheckout = useMemo(
    () =>
      collectiblesHubEnabled &&
      checkoutItems.length > 0 &&
      checkoutItems.every(item => item.isCollectibleHubNft),
    [checkoutItems, collectiblesHubEnabled]
  );

  const requiresCollectibleHolderWallet = useMemo(
    () =>
      collectiblesHubEnabled &&
      checkoutItems.length > 0 &&
      checkoutItems.every(item => item.isAuthoritativeCollectibleTitle),
    [checkoutItems, collectiblesHubEnabled]
  );

  const collectibleSolanaWallet = useMemo(() => {
    if (!appKitConnected || !appKitAddress?.trim()) return null;
    if (appKitAddress.startsWith('0x')) return null;
    if (appKitChain?.chainNamespace && appKitChain.chainNamespace !== 'solana') {
      return null;
    }
    return appKitAddress.trim();
  }, [appKitConnected, appKitAddress, appKitChain]);

  const isCollectibleHolderWalletReady =
    !requiresCollectibleHolderWallet || !!collectibleSolanaWallet;

  const isCollectibleHolderWalletWrongNamespace =
    requiresCollectibleHolderWallet &&
    appKitConnected &&
    !!appKitAddress &&
    !collectibleSolanaWallet;

  const connectCollectibleHolderWallet = useCallback(() => {
    void connectSolana();
  }, [connectSolana]);

  const isRwaCheckoutBlocked = useMemo(() => {
    return checkoutItems.some(item => {
      if (item.contractType !== 'RWA_TOKEN') return false;
      if (item.isAuthoritativeCollectibleTitle) return !collectiblesHubEnabled;
      return true;
    });
  }, [checkoutItems, collectiblesHubEnabled]);

  const hasCollectibleQuantityIssue = useMemo(
    () =>
      isCollectibleHubNftCheckout &&
      (checkoutItems.length !== 1 || (checkoutItems[0]?.quantity ?? 0) !== 1),
    [checkoutItems, isCollectibleHubNftCheckout]
  );

  const rwaTradeMode = useMemo(() => {
    return checkoutItems.find(i => i.contractType === 'RWA_TOKEN')?.rwaTradeMode;
  }, [checkoutItems]);

  const needsShippingAddress =
    contractTypeCheckout.needsShippingAddress && !isCollectibleHubNftCheckout;

  const selectedCountryCode = useMemo(() => {
    if (!selectedAddress) return undefined;
    return apiAddresses.find(a => a.id === selectedAddress)?.country;
  }, [selectedAddress, apiAddresses]);

  const hasAllShippingSelected = useMemo(() => {
    return checkoutItems.every(item => {
      if (item.contractType !== 'PHYSICAL_GOOD') return true;
      if (!item.shippingZones?.length) return false;
      const sel = selectedShipping[item.id];
      return sel && sel.zoneName && sel.rateName;
    });
  }, [checkoutItems, selectedShipping]);

  const canSubmit =
    !isRwaCheckoutBlocked &&
    !hasCollectibleQuantityIssue &&
    isCollectibleHolderWalletReady &&
    (!needsShippingAddress || !!selectedAddress) &&
    hasAllShippingSelected &&
    !hasShippingPricingIssue &&
    !isSubmitting;

  const supplyQuoteLines = useMemo(
    () =>
      checkoutItems.map(item => {
        const sel = selectedShipping[item.id];
        return {
          vendorPeerID: item.vendor.peerID,
          listingSlug: item.listingSlug,
          listingHash: item.listingHash ?? '',
          quantity: item.quantity,
          options: item.options?.map(opt => ({ [opt.name]: opt.value })),
          shippingOption: sel?.zoneName,
          shippingService: sel?.rateName,
        };
      }),
    [checkoutItems, selectedShipping]
  );

  const supplyQuote = useCheckoutSupplyQuote(
    supplyQuoteLines,
    checkoutItems.length > 0 && !isLoading
  );

  // ---- Auto-update shipping when address country changes ----
  useEffect(() => {
    if (!selectedCountryCode) return;

    const current = selectedShippingRef.current;
    const updates: Record<string, ShippingSelection | null> = {};
    let changed = false;

    checkoutItems.forEach(item => {
      if (item.contractType !== 'PHYSICAL_GOOD' || !item.shippingZones) return;
      const sel = current[item.id];
      if (sel) {
        const zone = item.shippingZones.find(z => z.name === sel.zoneName);
        if (zone && isZoneAvailable(zone, selectedCountryCode)) return;
      }
      const available = item.shippingZones.find(z => isZoneAvailable(z, selectedCountryCode));
      if (available?.rates?.[0]) {
        updates[item.id] = {
          zoneName: available.name,
          rateName: available.rates[0].name,
          zoneId: available.id,
          rateId: available.rates[0].id,
        };
        changed = true;
      } else if (sel) {
        updates[item.id] = null;
        changed = true;
      }
    });

    if (changed) {
      setSelectedShipping(prev => {
        const next = { ...prev };
        Object.entries(updates).forEach(([id, val]) => {
          if (val === null) delete next[id];
          else next[id] = val;
        });
        return next;
      });
    }
  }, [selectedCountryCode, checkoutItems]);

  // ---- Fetch applicable automatic discounts and auto-apply qualifying ones ----
  useEffect(() => {
    const vendorPID = checkoutItems[0]?.vendor?.peerID;
    if (!checkoutItems.length || !vendorPID) return;
    let cancelled = false;
    discountsApi
      .getApplicableDiscounts(vendorPID)
      .then(result => {
        if (cancelled) return;
        setApplicableDiscounts(result);
        const currentSubtotal = checkoutItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        const autoApplied: AppliedDiscount[] = result
          .filter(d => {
            if (d.minPurchaseType === 'min_amount' && d.minAmount) {
              return currentSubtotal >= Number(d.minAmount);
            }
            return true;
          })
          .map(d => {
            const numValue = Number(d.value) || 0;
            return {
              id: d.title,
              title: d.title,
              valueType: d.valueType as AppliedDiscount['valueType'],
              value: numValue,
              savedAmount: calculateDiscountAmount(d.valueType, numValue, currentSubtotal),
              currency: d.currency || checkoutItems[0]?.currency || '',
              auto: true,
            };
          });
        if (autoApplied.length > 0) {
          setAppliedDiscounts(prev => {
            const manual = prev.filter(d => !d.auto);
            return [...manual, ...autoApplied];
          });
        }
      })
      .catch(() => {
        // Applicable discounts are optional
      });
    return () => {
      cancelled = true;
    };
  }, [checkoutItems]);

  const handleApplyDiscountCode = useCallback(
    async (code: string) => {
      setIsValidatingDiscount(true);
      try {
        const vendorPID = checkoutItems[0]?.vendor?.peerID;
        if (!vendorPID) throw new Error('Missing vendor');
        const result = await discountsApi.validateDiscountCode(vendorPID, { code });

        if (result.valid) {
          const alreadyApplied = appliedDiscounts.some(ad => ad.code === code);
          if (alreadyApplied) {
            toast({ title: t('checkout.discount.alreadyApplied'), variant: 'destructive' });
            return;
          }
          const numValue = Number(result.value) || 0;
          const savedAmount = calculateDiscountAmount(result.valueType, numValue, subtotal);
          setAppliedDiscounts(prev => [
            ...prev,
            {
              id: code,
              title: result.title,
              code,
              valueType: result.valueType as AppliedDiscount['valueType'],
              value: numValue,
              savedAmount,
              currency,
            },
          ]);
          toast({ title: t('checkout.discount.applied') });
        }
      } catch (err) {
        const msg = (err as Error).message;
        toast({
          title: t('checkout.discount.invalid'),
          description: msg || undefined,
          variant: 'destructive',
        });
      } finally {
        setIsValidatingDiscount(false);
      }
    },
    [subtotal, currency, appliedDiscounts, checkoutItems, toast, t]
  );

  const handleRemoveDiscount = useCallback((id: string) => {
    setAppliedDiscounts(prev => prev.filter(d => d.id !== id));
  }, []);

  // ---- Create order ----
  const handleCreateOrder = useCallback(async () => {
    if (!checkoutItems.length) {
      toast({ title: t('checkout.noItems'), variant: 'destructive' });
      return;
    }
    if (hasMissingContractType) {
      toast({
        title: t('order.missingContractTypeTitle'),
        description: t('order.missingContractTypeBody'),
        variant: 'destructive',
      });
      return;
    }
    if (hasMixedContractTypes) {
      toast({
        title: t('order.mixedContractTypesTitle'),
        description: t('order.mixedContractTypesBody'),
        variant: 'destructive',
      });
      return;
    }
    if (isRwaCheckoutBlocked) {
      toast({
        title: t('checkout.rwaNotSupported'),
        variant: 'destructive',
      });
      return;
    }
    if (hasCollectibleQuantityIssue) {
      toast({
        title: t('collectibles.checkout.onePerOrderTitle'),
        description: t('collectibles.checkout.onePerOrderDesc'),
        variant: 'destructive',
      });
      return;
    }
    if (requiresCollectibleHolderWallet && !collectibleSolanaWallet) {
      toast({
        title: t('collectibles.checkout.holderWalletTitle'),
        description: isCollectibleHolderWalletWrongNamespace
          ? t('collectibles.checkout.holderWalletWrongNamespace')
          : t('collectibles.checkout.holderWalletMissing'),
        variant: 'destructive',
      });
      return;
    }
    if (needsShippingAddress && !selectedAddress) {
      toast({ title: t('checkout.selectAddressFirst'), variant: 'destructive' });
      return;
    }
    if (!hasAllShippingSelected) {
      toast({ title: t('checkout.selectShippingFirst'), variant: 'destructive' });
      return;
    }
    if (hasShippingPricingIssue) {
      toast({
        title: t('checkout.loadFailed'),
        description: t('checkout.loadFailedDesc'),
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedApiAddress = apiAddresses.find(a => a.id === selectedAddress);
      const addressData =
        needsShippingAddress && selectedApiAddress ? toOrderAddress(selectedApiAddress) : undefined;

      const discountCodes = appliedDiscounts.filter(d => d.code).map(d => d.code!);
      const affiliateReferral = referralSessionForSeller(checkoutItems[0]?.vendor.peerID);

      const result = await ordersApi.createOrder({
        vendorId: checkoutItems[0]?.vendor.peerID,
        affiliateReferralSessionID: affiliateReferral?.referralSessionID,
        discountCodes: discountCodes.length > 0 ? discountCodes : undefined,
        items: checkoutItems.map(item => {
          const payload: {
            listingHash: string;
            quantity: number;
            options?: OrderItemOption[];
            memo?: string;
            shipping?: { name: string; service: string; zoneId?: string; rateId?: string };
            fulfillment?: string;
            hubSlotID?: string;
            nftMint?: string;
            certNumber?: string;
            holderWallet?: string;
          } = {
            listingHash: item.listingHash || item.id,
            quantity: item.quantity,
            memo: orderNote || undefined,
          };
          if (item.options && item.options.length > 0) {
            payload.options = item.options;
          }

          if (item.isAuthoritativeCollectibleTitle) {
            if (item.fulfillment) payload.fulfillment = item.fulfillment;
            if (item.hubSlotID) payload.hubSlotID = item.hubSlotID;
            if (item.nftMint) payload.nftMint = item.nftMint;
            if (item.certNumber) payload.certNumber = item.certNumber;
            if (collectibleSolanaWallet) {
              payload.holderWallet = collectibleSolanaWallet;
            }
          }

          if (item.contractType === 'PHYSICAL_GOOD') {
            const sel = selectedShipping[item.id];
            if (sel) {
              payload.shipping = {
                name: sel.zoneName,
                service: sel.rateName,
                ...(sel.zoneId && { zoneId: sel.zoneId }),
                ...(sel.rateId && { rateId: sel.rateId }),
              };
            }
          }
          return payload;
        }),
        address: addressData
          ? {
              name: addressData.name,
              street: addressData.street,
              city: addressData.city,
              state: addressData.state,
              postalCode: addressData.postalCode,
              country: addressData.country,
            }
          : undefined,
        pricingCoin: currency,
      });

      // Build payment URL
      const paymentUrl = new URL('/payment', window.location.origin);
      paymentUrl.searchParams.set('orderID', result.orderID);
      paymentUrl.searchParams.set('paymentPolicy', checkoutPaymentPolicy);
      persistCheckoutPaymentPolicy(checkoutPaymentPolicy, result.orderID);

      if (result.amount) {
        const divisibility = result.amount.currency?.divisibility ?? 2;
        const totalAmount = Number(result.amount.amount) / Math.pow(10, divisibility);
        paymentUrl.searchParams.set('amount', String(totalAmount));
        paymentUrl.searchParams.set('currency', result.amount.currency?.code || '');
      }

      if (checkoutItems.length > 0) {
        const first = checkoutItems[0];
        paymentUrl.searchParams.set('title', first.title);
        paymentUrl.searchParams.set('vendorName', first.vendor.name);
        paymentUrl.searchParams.set('vendorPeerID', first.vendor.peerID);
        paymentUrl.searchParams.set('quantity', String(first.quantity));
        paymentUrl.searchParams.set('contractType', first.contractType || 'SERVICE');
        if (first.image) paymentUrl.searchParams.set('image', first.image);
      }

      router.push(paymentUrl.toString());
    } catch (error) {
      const affiliateReferral = referralSessionForSeller(checkoutItems[0]?.vendor.peerID);
      if (affiliateReferral && shouldClearSellerAffiliateReferralOnError(error)) {
        clearSellerAffiliateReferralSession();
      }
      console.error('Create order failed:', error);
      toast({
        title: t('checkout.createOrderFailed'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedAddress,
    checkoutItems,
    orderNote,
    router,
    t,
    toast,
    isRwaCheckoutBlocked,
    hasCollectibleQuantityIssue,
    needsShippingAddress,
    selectedShipping,
    hasAllShippingSelected,
    hasShippingPricingIssue,
    apiAddresses,
    currency,
    appliedDiscounts,
    hasMissingContractType,
    hasMixedContractTypes,
    requiresCollectibleHolderWallet,
    collectibleSolanaWallet,
    isCollectibleHolderWalletWrongNamespace,
    checkoutPaymentPolicy,
  ]);

  return {
    checkoutItems,
    isLoading,
    error,
    vendor,

    addresses,
    selectedAddress,
    setSelectedAddress,
    addressActions: {
      showDrawer: showAddressDrawer,
      setShowDrawer: setShowAddressDrawer,
      showForm: showAddressForm,
      setShowForm: setShowAddressForm,
      editingAddress,
      setEditingAddress,
      apiAddresses,
      isSaving: isSavingAddress,
      isLoading: isLoadingAddresses,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      defaultAddress,
    },

    selectedShipping,
    handleShippingChange,
    selectedCountryCode,

    subtotal,
    shippingTotal,
    taxTotal,
    total,
    currency,

    updateQuantity: handleUpdateQuantity,
    orderNote,
    setOrderNote,
    handleCreateOrder,
    isSubmitting,
    canSubmit,
    hasMixedContractTypes,
    hasMissingContractType,

    appliedDiscounts,
    applicableDiscounts,
    discountTotal,
    isValidatingDiscount,
    handleApplyDiscountCode,
    handleRemoveDiscount,

    isRwaToken,
    isRwaCheckoutBlocked,
    isCollectibleHubNftCheckout,
    requiresCollectibleHolderWallet,
    collectibleHolderWallet: collectibleSolanaWallet,
    isCollectibleHolderWalletReady,
    isCollectibleHolderWalletWrongNamespace,
    connectCollectibleHolderWallet,
    isCollectibleHolderConnecting: appKitInitializing,
    rwaTradeMode,
    needsShippingAddress,
    hasAllShippingSelected,
    hasShippingPricingIssue,
    hasFreeShippingSelection,
    supplyQuote,
  };
}
