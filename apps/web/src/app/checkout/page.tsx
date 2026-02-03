'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { AddressSummary, AddressDrawer, AddressFormModal } from '@/components/Address';
import type { Address } from '@/components/Address';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import {
  productDataService,
  profileApi,
  ordersApi,
  productsApi,
  getImageUrl,
  useCurrency,
  useI18n,
  useShippingAddresses,
} from '@mobazha/core';
import type { Product, UserProfile, DisplayAddress, ShippingOption } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';

// Types
interface CheckoutItem {
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
  // RWA 相关字段
  listingHash?: string;
  contractType?: string;
  rwaTradeMode?: number;
  rwaEscrowTimeoutSeconds?: number;
  cryptoListingCurrencyCode?: string;
  // 运费选项（物理商品）
  shippingOptions?: ShippingOption[];
}

/**
 * 将 DisplayAddress (API 格式) 转换为前端展示用的 Address 格式
 */
function toFrontendAddress(addr: DisplayAddress): Address {
  return {
    id: addr.id,
    name: addr.name,
    street: addr.addressLineOne + (addr.addressLineTwo ? `, ${addr.addressLineTwo}` : ''),
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    phone: addr.phone || '',
    isDefault: addr.isDefault,
  };
}

/**
 * 将 DisplayAddress 转换为订单 API 使用的地址格式
 */
function toOrderAddress(addr: DisplayAddress) {
  return {
    name: addr.name, // shipTo
    street: addr.addressLineOne + (addr.addressLineTwo ? `, ${addr.addressLineTwo}` : ''),
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    addressNotes: addr.addressNotes,
  };
}

/**
 * 获取运费价格
 * API 返回的实际字段是 firstFreight，但某些情况下可能使用 price
 */
function getShippingPrice(service: ShippingOption['services'][0], option?: ShippingOption): number {
  // 本地自提免运费
  if (option?.type === 'LOCAL_PICKUP') {
    return 0;
  }

  // 优先使用 firstFreight（API 实际返回的字段）
  if (service.firstFreight !== undefined && service.firstFreight !== null) {
    return service.firstFreight;
  }

  // 兼容 price 字段
  if (service.price !== undefined && service.price !== null) {
    return service.price;
  }

  return 0;
}

/**
 * 获取续件费
 */
function getAdditionalItemPrice(service: ShippingOption['services'][0]): number {
  // 优先使用 renewalUnitPrice
  if (service.renewalUnitPrice !== undefined && service.renewalUnitPrice > 0) {
    return service.renewalUnitPrice;
  }

  // 兼容 additionalItemPrice 字段
  if (service.additionalItemPrice !== undefined && service.additionalItemPrice > 0) {
    return service.additionalItemPrice;
  }

  return 0;
}

/**
 * 检查运费选项是否适用于某个国家
 * @param option 运费选项
 * @param countryCode 国家代码 (ISO 3166-1 alpha-2)
 * @returns 是否适用
 */
function isShippingOptionAvailable(
  option: ShippingOption,
  countryCode: string | undefined
): boolean {
  // 如果没有国家代码，显示所有选项
  if (!countryCode) return true;

  // 如果没有配置 regions 或为空数组，视为全球可用
  if (!option.regions || option.regions.length === 0) return true;

  // 检查是否包含 "ALL" 或用户国家代码
  const upperCountry = countryCode.toUpperCase();
  return option.regions.some(
    region => region.toUpperCase() === 'ALL' || region.toUpperCase() === upperCountry
  );
}

/**
 * Checkout Page - 下单阶段
 *
 * 用户在此页面：
 * 1. 确认商品信息
 * 2. 选择收货地址
 * 3. 添加订单备注
 * 4. 点击"下单"创建订单
 *
 * 创建订单成功后，跳转到 /payment?orderID=xxx 进行支付
 */
export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { renderPairedPrice, fromMinimalUnit } = useCurrency();
  const { t } = useI18n();
  const { toast } = useToast();

  // 从 URL 参数获取商品信息
  const productSlug = searchParams.get('slug');
  const vendorPeerID = searchParams.get('peerID');
  const initialQuantity = parseInt(searchParams.get('quantity') || '1', 10);

  // 商品加载状态
  const [isLoadingProduct, setIsLoadingProduct] = useState(!!productSlug);
  const [_product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<UserProfile | null>(null);
  void _product; // Reserved for future use
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);

  // 修改商品数量
  const handleUpdateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCheckoutItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, quantity: newQuantity } : item))
    );
  }, []);

  // 地址管理 - 使用真实数据
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

  // 将 API 地址转换为前端格式
  const addresses = useMemo(() => apiAddresses.map(toFrontendAddress), [apiAddresses]);

  // 地址和订单状态
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [showAddressDrawer, setShowAddressDrawer] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DisplayAddress | null>(null);
  const [orderNote, setOrderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 当地址加载完成后，自动选择默认地址
  // Bug Fix: 移除 selectedAddress 依赖，避免循环检查
  useEffect(() => {
    if (defaultAddress) {
      setSelectedAddress(prev => prev || defaultAddress.id);
    }
  }, [defaultAddress]);

  // 运费选项状态（物理商品用）
  // key: itemId, value: { optionName, serviceName }
  const [selectedShipping, setSelectedShipping] = useState<
    Record<string, { optionName: string; serviceName: string }>
  >({});

  // 从 URL 参数获取商品数据
  useEffect(() => {
    const fetchProductData = async () => {
      if (!productSlug) {
        setIsLoadingProduct(false);
        return;
      }

      setIsLoadingProduct(true);

      try {
        // 获取商品详情
        const productData = await productDataService.getProduct(
          productSlug,
          vendorPeerID || undefined
        );

        if (productData) {
          setProduct(productData);

          // 获取卖家信息
          const sellerPeerID = productData.vendorID?.peerID;
          if (sellerPeerID) {
            try {
              const vendorData = await profileApi.getProfile(sellerPeerID);
              setVendor(vendorData);
            } catch (err) {
              console.error('Failed to fetch vendor:', err);
            }
          }

          // 转换为 CheckoutItem 格式
          // 注意：productDataService.getProduct() 返回的 price 已经是转换后的值（不是最小单位）
          const price = Number(productData.item.price) || 0;
          const currency = productData.metadata?.pricingCurrency?.code || 'USD';
          const imageUrl =
            productData.item.images?.[0]?.medium || productData.item.images?.[0]?.small;

          // 获取 listing hash (CID) - 通过 listingindex API 获取
          // listing 详情 API 不返回 CID，需要从 listingindex 中查找
          let listingHash = '';
          try {
            const listingIndex = await productsApi.getStoreListingIndex(sellerPeerID || '');
            const listingMeta = listingIndex.find(l => l.slug === productSlug);
            listingHash = listingMeta?.cid || '';
          } catch (e) {
            console.error('Failed to get listing CID from listingindex:', e);
          }

          // 如果仍然没有 CID，尝试从 productData 中获取（某些 API 可能返回）
          if (!listingHash) {
            listingHash = (productData as any).hash || (productData as any).cid || '';
          }

          if (!listingHash) {
            console.warn('No listing hash (CID) found for product:', productSlug);
          }

          const item: CheckoutItem = {
            id: productData.slug,
            title: productData.item.title,
            price,
            currency,
            quantity: initialQuantity,
            image: getImageUrl(imageUrl) || '',
            vendor: {
              name: sellerPeerID?.slice(0, 8) || 'Unknown',
              peerID: sellerPeerID || '',
            },
            // RWA 相关字段
            listingHash,
            contractType: productData.metadata?.contractType,
            rwaTradeMode: productData.metadata?.rwaTradeMode,
            rwaEscrowTimeoutSeconds: productData.metadata?.rwaEscrowTimeoutSeconds,
            cryptoListingCurrencyCode: productData.item?.cryptoListingCurrencyCode,
            // 运费选项（物理商品）
            shippingOptions: productData.shippingOptions,
          };

          setCheckoutItems([item]);

          // 如果是物理商品且有运费选项，自动选择第一个
          if (
            productData.metadata?.contractType === 'PHYSICAL_GOOD' &&
            productData.shippingOptions &&
            productData.shippingOptions.length > 0
          ) {
            const firstOption = productData.shippingOptions[0];
            const firstService = firstOption.services?.[0];
            if (firstOption && firstService) {
              setSelectedShipping({
                [productData.slug]: {
                  optionName: firstOption.name,
                  serviceName: firstService.name,
                },
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch product for checkout:', err);
      } finally {
        setIsLoadingProduct(false);
      }
    };

    fetchProductData();
  }, [productSlug, vendorPeerID, initialQuantity]);

  // 更新 vendor name 当 vendor 数据加载完成
  const vendorName = vendor?.name;
  useEffect(() => {
    if (vendorName && checkoutItems.length > 0 && checkoutItems[0].vendor.name !== vendorName) {
      setCheckoutItems(prev =>
        prev.map(item => ({
          ...item,
          vendor: {
            ...item.vendor,
            name: vendorName || item.vendor.name,
          },
        }))
      );
    }
  }, [vendorName, checkoutItems]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [checkoutItems]);

  const shippingTotal = useMemo(() => {
    return checkoutItems.reduce((sum, item) => {
      if (item.contractType !== 'PHYSICAL_GOOD') return sum;
      if (!item.shippingOptions || item.shippingOptions.length === 0) return sum;
      const selection = selectedShipping[item.id];
      if (!selection) return sum;
      const selectedOption = item.shippingOptions.find(
        option => option.name === selection.optionName
      );
      const selectedService = selectedOption?.services.find(
        service => service.name === selection.serviceName
      );
      if (!selectedService) return sum;
      // 运费数据是最小单位（如 cents），需要转换为标准单位（如 dollars）
      const currency = selectedOption?.currency || item.currency;
      const shippingPriceRaw = getShippingPrice(selectedService, selectedOption);
      const additionalPriceRaw = getAdditionalItemPrice(selectedService);
      const shippingPrice = fromMinimalUnit(shippingPriceRaw, currency);
      const additionalPrice = fromMinimalUnit(additionalPriceRaw, currency);
      const extraItems = Math.max(item.quantity - 1, 0);
      return sum + shippingPrice + additionalPrice * extraItems;
    }, 0);
  }, [checkoutItems, selectedShipping, fromMinimalUnit]);

  const total = subtotal + shippingTotal; // 下单阶段不计算仲裁费，仲裁费在支付阶段计算

  // 判断是否为 RWA 商品
  const isRwaToken = useMemo(() => {
    return checkoutItems.some(item => item.contractType === 'RWA_TOKEN');
  }, [checkoutItems]);

  // 判断是否需要收货地址（只要有物理商品就需要）
  const needsShippingAddress = useMemo(() => {
    // 如果没有商品，不需要地址
    if (checkoutItems.length === 0) return false;
    // 只要有任何物理商品就需要收货地址
    return checkoutItems.some(item => item.contractType === 'PHYSICAL_GOOD');
  }, [checkoutItems]);

  // 获取当前选中地址的国家代码
  const selectedCountryCode = useMemo(() => {
    if (!selectedAddress) return undefined;
    const address = apiAddresses.find(a => a.id === selectedAddress);
    return address?.country;
  }, [selectedAddress, apiAddresses]);

  // 当地址改变时，重新选择适用的运费选项
  useEffect(() => {
    if (!selectedCountryCode) return;

    // 检查当前选中的运费选项是否适用于新地址
    checkoutItems.forEach(item => {
      if (item.contractType !== 'PHYSICAL_GOOD' || !item.shippingOptions) return;

      const currentSelection = selectedShipping[item.id];
      if (currentSelection) {
        const currentOption = item.shippingOptions.find(
          opt => opt.name === currentSelection.optionName
        );
        // 如果当前选项适用于新地址，不需要重新选择
        if (currentOption && isShippingOptionAvailable(currentOption, selectedCountryCode)) {
          return;
        }
      }

      // 重新选择第一个适用的运费选项
      const availableOption = item.shippingOptions.find(opt =>
        isShippingOptionAvailable(opt, selectedCountryCode)
      );
      if (availableOption && availableOption.services?.[0]) {
        setSelectedShipping(prev => ({
          ...prev,
          [item.id]: {
            optionName: availableOption.name,
            serviceName: availableOption.services[0].name,
          },
        }));
      } else {
        // 如果没有适用的选项，清空选择
        setSelectedShipping(prev => {
          const newState = { ...prev };
          delete newState[item.id];
          return newState;
        });
      }
    });
  }, [selectedCountryCode, checkoutItems, selectedShipping]);

  // 获取 RWA 交易模式
  const rwaTradeMode = useMemo(() => {
    const rwaItem = checkoutItems.find(item => item.contractType === 'RWA_TOKEN');
    return rwaItem?.rwaTradeMode;
  }, [checkoutItems]);

  // 检查物理商品是否都选择了运费选项
  const hasAllShippingSelected = useMemo(() => {
    return checkoutItems.every(item => {
      // 非物理商品不需要运费选项
      if (item.contractType !== 'PHYSICAL_GOOD') return true;
      // Bug Fix: 物理商品必须有运费选项配置，否则视为配置错误
      if (!item.shippingOptions || item.shippingOptions.length === 0) return false;
      const selection = selectedShipping[item.id];
      return selection && selection.optionName && selection.serviceName;
    });
  }, [checkoutItems, selectedShipping]);

  // 创建订单
  const handleCreateOrder = useCallback(async () => {
    // 只有物理商品需要地址
    if (needsShippingAddress && !selectedAddress) {
      toast({
        title: t('checkout.selectAddressFirst'),
        variant: 'destructive',
      });
      return;
    }

    // 检查运费选项
    if (!hasAllShippingSelected) {
      toast({
        title: t('checkout.selectShippingFirst') || 'Please select shipping option',
        variant: 'destructive',
      });
      return;
    }

    if (checkoutItems.length === 0) {
      toast({
        title: t('checkout.noItems'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 获取选中的地址数据（仅物理商品需要）
      const selectedApiAddress = apiAddresses.find(a => a.id === selectedAddress);
      const addressData =
        needsShippingAddress && selectedApiAddress ? toOrderAddress(selectedApiAddress) : undefined;

      // 调用真实的创建订单 API
      const result = await ordersApi.createOrder({
        items: checkoutItems.map(item => {
          const itemData: {
            listingHash: string;
            quantity: number;
            memo?: string;
            shipping?: { name: string; service: string };
          } = {
            listingHash: item.listingHash || item.id,
            quantity: item.quantity,
            memo: orderNote || undefined, // 订单备注放在 items 里
          };

          // 物理商品需要添加运费选项
          if (item.contractType === 'PHYSICAL_GOOD') {
            const shippingSelection = selectedShipping[item.id];
            if (shippingSelection) {
              itemData.shipping = {
                name: shippingSelection.optionName,
                service: shippingSelection.serviceName,
              };
            }
          }

          return itemData;
        }),
        // 只有物理商品才发送地址
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
        // 定价币种
        pricingCoin: checkoutItems[0]?.currency || 'USD',
      });

      // 构建支付页面 URL，包含订单和 RWA 相关参数
      const paymentUrl = new URL('/payment', window.location.origin);
      paymentUrl.searchParams.set('orderID', result.orderID);

      // 传递订单金额信息（从 createOrder 返回的数据）
      if (result.amount) {
        // amount.amount 是以最小单位表示的金额（如 1500 = $15.00）
        const divisibility = result.amount.currency?.divisibility ?? 2;
        const totalAmount = Number(result.amount.amount) / Math.pow(10, divisibility);
        paymentUrl.searchParams.set('amount', String(totalAmount));
        paymentUrl.searchParams.set('currency', result.amount.currency?.code || 'USD');
      }

      // 传递商品和卖家信息
      if (checkoutItems.length > 0) {
        const firstItem = checkoutItems[0];
        paymentUrl.searchParams.set('title', firstItem.title);
        paymentUrl.searchParams.set('vendorName', firstItem.vendor.name);
        paymentUrl.searchParams.set('vendorPeerID', firstItem.vendor.peerID);
        paymentUrl.searchParams.set('quantity', String(firstItem.quantity));
        paymentUrl.searchParams.set('contractType', firstItem.contractType || 'SERVICE');
        if (firstItem.image) {
          paymentUrl.searchParams.set('image', firstItem.image);
        }
      }

      // 传递 RWA 相关信息
      if (isRwaToken) {
        paymentUrl.searchParams.set('isRwaToken', 'true');
        if (rwaTradeMode !== undefined) {
          paymentUrl.searchParams.set('rwaTradeMode', String(rwaTradeMode));
        }
        const rwaItem = checkoutItems.find(item => item.contractType === 'RWA_TOKEN');
        if (rwaItem?.rwaEscrowTimeoutSeconds) {
          paymentUrl.searchParams.set('escrowTimeout', String(rwaItem.rwaEscrowTimeoutSeconds));
        }
        if (rwaItem?.cryptoListingCurrencyCode) {
          paymentUrl.searchParams.set('tokenCode', rwaItem.cryptoListingCurrencyCode);
        }
      }

      // 创建成功，跳转到支付页面
      router.push(paymentUrl.toString());
    } catch (error) {
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
    isRwaToken,
    rwaTradeMode,
    needsShippingAddress,
    selectedShipping,
    hasAllShippingSelected,
    apiAddresses,
  ]);

  // 格式化商品价格
  const formatItemPrice = (item: CheckoutItem) => {
    return renderPairedPrice(item.price * item.quantity, item.currency);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8 pb-24 sm:pb-8">
        <Container size="xl">
          {/* Page Header */}
          <HStack gap="sm" align="center" className="mb-4 sm:mb-8">
            <button
              onClick={() => router.back()}
              className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors touch-feedback"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('checkout.title')}</h1>
          </HStack>

          {/* Loading State */}
          {isLoadingProduct ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton variant="text" height={24} width="40%" className="mb-4" />
                    <Skeleton variant="rounded" height={100} />
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton variant="text" height={24} width="60%" className="mb-4" />
                    <Skeleton variant="rounded" height={80} className="mb-4" />
                    <Skeleton variant="rounded" height={40} />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : checkoutItems.length === 0 ? (
            // Empty State
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-muted-foreground mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {t('checkout.noItems')}
              </h2>
              <p className="text-muted-foreground mb-4">{t('checkout.addItemsFirst')}</p>
              <Link href="/marketplace">
                <Button>{t('checkout.browseMarketplace')}</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* RWA 交易提示 */}
                {isRwaToken && (
                  <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-purple-600 dark:text-purple-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                            {t('checkout.rwaTransaction')}
                          </h3>
                          <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                            {rwaTradeMode === 1
                              ? t('checkout.rwaConfirmRequiredHint')
                              : t('checkout.rwaInstantHint')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Shipping Address - 仅物理商品显示 */}
                {needsShippingAddress && (
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                        {t('checkout.shippingAddress')}
                      </h2>
                      <AddressSummary
                        address={addresses.find(a => a.id === selectedAddress)}
                        onEdit={() => setShowAddressDrawer(true)}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Shipping Option - 仅物理商品且有运费选项时显示 */}
                {checkoutItems.some(
                  item =>
                    item.contractType === 'PHYSICAL_GOOD' &&
                    item.shippingOptions &&
                    item.shippingOptions.some(opt =>
                      isShippingOptionAvailable(opt, selectedCountryCode)
                    )
                ) && (
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                        {t('checkout.shippingMethod') || 'Shipping Method'}
                      </h2>
                      <VStack gap="md">
                        {checkoutItems
                          .filter(
                            item =>
                              item.contractType === 'PHYSICAL_GOOD' &&
                              item.shippingOptions &&
                              item.shippingOptions.some(opt =>
                                isShippingOptionAvailable(opt, selectedCountryCode)
                              )
                          )
                          .map(item => (
                            <div key={item.id} className="space-y-2">
                              {item
                                .shippingOptions!.filter(option =>
                                  isShippingOptionAvailable(option, selectedCountryCode)
                                )
                                .map(option => (
                                  <div key={option.name} className="space-y-1.5">
                                    {option.services.map(service => {
                                      const isSelected =
                                        selectedShipping[item.id]?.optionName === option.name &&
                                        selectedShipping[item.id]?.serviceName === service.name;
                                      // 运费数据是最小单位，renderPairedPrice 会自动转换
                                      const currency = option.currency || item.currency;
                                      const shippingPrice = getShippingPrice(service, option);
                                      return (
                                        <label
                                          key={`${option.name}-${service.name}`}
                                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                            isSelected
                                              ? 'border-primary bg-primary/5'
                                              : 'border-border hover:border-primary/50'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="radio"
                                              name={`shipping-${item.id}`}
                                              checked={isSelected}
                                              onChange={() => {
                                                setSelectedShipping(prev => ({
                                                  ...prev,
                                                  [item.id]: {
                                                    optionName: option.name,
                                                    serviceName: service.name,
                                                  },
                                                }));
                                              }}
                                              className="w-4 h-4 text-primary"
                                            />
                                            <div>
                                              <p className="text-sm font-medium text-foreground">
                                                {option.name} - {service.name}
                                              </p>
                                              {service.estimatedDelivery && (
                                                <p className="text-xs text-muted-foreground">
                                                  {service.estimatedDelivery}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <span className="text-sm font-semibold text-foreground">
                                            {shippingPrice === 0
                                              ? t('checkout.free') || 'Free'
                                              : renderPairedPrice(shippingPrice, currency)}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                ))}
                            </div>
                          ))}
                      </VStack>
                    </CardContent>
                  </Card>
                )}

                {/* Order Note */}
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3">
                      {t('checkout.orderNote')}
                    </h2>
                    <textarea
                      value={orderNote}
                      onChange={e => setOrderNote(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md sm:rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                      placeholder={t('checkout.orderNotePlaceholder')}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="space-y-4 sm:space-y-6">
                <Card className="sticky top-4">
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                      {t('checkout.orderSummary')}
                    </h2>

                    {/* Items */}
                    <VStack gap="md" className="mb-4 sm:mb-6">
                      {checkoutItems.map(item => (
                        <div key={item.id} className="border border-border rounded-lg p-3">
                          <HStack gap="sm" align="start">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.5}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                                  {item.title}
                                </p>
                                {/* RWA 徽章 */}
                                {item.contractType === 'RWA_TOKEN' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex-shrink-0">
                                    RWA
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.vendor.name}
                              </p>
                              {/* RWA 交易模式提示 */}
                              {item.contractType === 'RWA_TOKEN' && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {item.rwaTradeMode === 1
                                    ? t('listing.rwa.confirmRequired')
                                    : t('listing.rwa.instantTrade')}
                                </p>
                              )}
                              <p className="text-sm font-semibold text-primary mt-1">
                                {renderPairedPrice(item.price, item.currency)}
                              </p>
                            </div>
                          </HStack>
                          {/* Quantity Selector */}
                          <HStack
                            justify="between"
                            align="center"
                            className="mt-3 pt-3 border-t border-border"
                          >
                            <span className="text-xs text-muted-foreground">
                              {t('checkout.quantity')}
                            </span>
                            <HStack gap="xs" align="center">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M20 12H4"
                                  />
                                </svg>
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val >= 1) {
                                    handleUpdateQuantity(item.id, val);
                                  }
                                }}
                                className="w-14 h-8 text-center font-medium text-foreground border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-md border border-border hover:bg-muted transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                  />
                                </svg>
                              </button>
                            </HStack>
                            <p className="font-semibold text-foreground text-sm">
                              {formatItemPrice(item)}
                            </p>
                          </HStack>
                        </div>
                      ))}
                    </VStack>

                    <div className="border-t border-border pt-3 sm:pt-4 space-y-2 sm:space-y-3">
                      <HStack justify="between">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {t('checkout.subtotal')}
                        </span>
                        <span className="font-medium text-foreground text-xs sm:text-sm">
                          {renderPairedPrice(subtotal, checkoutItems[0]?.currency || 'USD')}
                        </span>
                      </HStack>

                      {/* 运费 - 仅物理商品显示 */}
                      {needsShippingAddress && (
                        <HStack justify="between">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {t('checkout.shipping')}
                          </span>
                          <span className="font-medium text-primary text-xs sm:text-sm">
                            {!hasAllShippingSelected
                              ? t('checkout.selectShippingFirst')
                              : shippingTotal === 0
                                ? t('checkout.free')
                                : renderPairedPrice(
                                    shippingTotal,
                                    checkoutItems[0]?.currency || 'USD'
                                  )}
                          </span>
                        </HStack>
                      )}

                      <div className="border-t border-border pt-2 sm:pt-3">
                        <HStack justify="between">
                          <span className="text-base sm:text-lg font-semibold text-foreground">
                            {t('checkout.total')}
                          </span>
                          <p className="text-lg sm:text-xl font-bold text-primary">
                            {renderPairedPrice(total, checkoutItems[0]?.currency || 'USD')}
                          </p>
                        </HStack>
                      </div>
                    </div>

                    {/* Create Order Button - Desktop */}
                    <Button
                      className="w-full mt-4 sm:mt-6 touch-feedback hidden sm:flex"
                      size="default"
                      onClick={handleCreateOrder}
                      disabled={
                        isSubmitting ||
                        (needsShippingAddress && !selectedAddress) ||
                        !hasAllShippingSelected ||
                        checkoutItems.length === 0
                      }
                    >
                      {isSubmitting ? (
                        <HStack gap="sm" align="center" justify="center">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>{t('checkout.creatingOrder')}</span>
                        </HStack>
                      ) : (
                        t('checkout.placeOrder')
                      )}
                    </Button>

                    {/* Warnings - 仅物理商品需要地址 */}
                    {needsShippingAddress && !selectedAddress && (
                      <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md sm:rounded-lg">
                        <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                          {t('checkout.selectAddressWarning')}
                        </p>
                      </div>
                    )}

                    {/* Info Note */}
                    <div className="mt-3 sm:mt-4 flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{t('checkout.paymentNextStep')}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </Container>
      </main>

      <Footer />

      {/* Mobile Bottom Bar */}
      {checkoutItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-sm border-t border-border p-3 safe-area-bottom sm:hidden z-50">
          <HStack justify="between" align="center">
            <div>
              <p className="text-xs text-muted-foreground">{t('checkout.total')}</p>
              <p className="text-lg font-bold text-primary">
                {renderPairedPrice(total, checkoutItems[0]?.currency || 'USD')}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleCreateOrder}
              disabled={
                isSubmitting ||
                (needsShippingAddress && !selectedAddress) ||
                !hasAllShippingSelected
              }
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <HStack gap="xs" align="center">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{t('checkout.creating')}</span>
                </HStack>
              ) : (
                t('checkout.placeOrder')
              )}
            </Button>
          </HStack>
        </div>
      )}

      {/* Address Drawer */}
      <AddressDrawer
        isOpen={showAddressDrawer}
        onClose={() => setShowAddressDrawer(false)}
        addresses={addresses}
        selectedAddressId={selectedAddress}
        onSelect={setSelectedAddress}
        onAddNew={() => {
          setEditingAddress(null);
          setShowAddressForm(true);
        }}
        onEdit={addr => {
          // 找到对应的 API 地址
          const apiAddr = apiAddresses.find(a => a.id === addr.id);
          if (apiAddr) {
            setEditingAddress(apiAddr);
            setShowAddressForm(true);
          }
        }}
        onDelete={async addressId => {
          const success = await deleteAddress(addressId);
          if (success) {
            toast({
              title: t('address.deleted') || 'Address deleted',
            });
            // 如果删除的是当前选中的地址，清除选择
            if (selectedAddress === addressId) {
              setSelectedAddress(defaultAddress?.id || '');
            }
          }
        }}
        onSetDefault={async addressId => {
          const success = await setDefaultAddress(addressId);
          if (success) {
            toast({
              title: t('address.setAsDefault') || 'Address set as default',
            });
          }
        }}
        isLoading={isLoadingAddresses}
      />

      {/* 地址编辑表单 */}
      <AddressFormModal
        isOpen={showAddressForm}
        onClose={() => {
          setShowAddressForm(false);
          setEditingAddress(null);
        }}
        address={editingAddress}
        isSaving={isSavingAddress}
        onSave={async address => {
          let success: boolean;
          if (editingAddress) {
            // 编辑现有地址
            success = await updateAddress(editingAddress.id, address);
          } else {
            // 添加新地址
            success = await addAddress(address);
          }

          if (success) {
            toast({
              title: editingAddress
                ? t('address.updated') || 'Address updated'
                : t('address.added') || 'Address added',
            });
            setShowAddressForm(false);
            setEditingAddress(null);
          }
          return success;
        }}
      />
    </div>
  );
}
