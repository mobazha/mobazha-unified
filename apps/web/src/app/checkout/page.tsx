'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { AddressSummary, AddressDrawer } from '@/components/Address';
import type { Address } from '@/components/Address';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { productDataService, profileApi, getImageUrl, useCurrency, useI18n } from '@mobazha/core';
import type { Product, UserProfile } from '@mobazha/core';
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
}

// Mock data for addresses (TODO: 从 API 获取)
const mockAddresses: Address[] = [
  {
    id: '1',
    name: 'John Doe',
    street: '123 Main Street, Apt 4B',
    city: 'San Francisco',
    state: 'CA',
    country: 'United States',
    postalCode: '94102',
    phone: '+1 (555) 123-4567',
    isDefault: true,
  },
  {
    id: '2',
    name: 'John Doe',
    street: '456 Oak Avenue',
    city: 'Los Angeles',
    state: 'CA',
    country: 'United States',
    postalCode: '90001',
    phone: '+1 (555) 987-6543',
    isDefault: false,
  },
];

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
  const { renderPairedPrice } = useCurrency();
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

  // 地址和订单状态
  const [selectedAddress, setSelectedAddress] = useState<string>(
    mockAddresses.find(a => a.isDefault)?.id || ''
  );
  const [showAddressDrawer, setShowAddressDrawer] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          const price = Number(productData.item.price) || 0;
          const currency = productData.metadata?.pricingCurrency?.code || 'USD';
          const imageUrl =
            productData.item.images?.[0]?.medium || productData.item.images?.[0]?.small;

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
          };

          setCheckoutItems([item]);
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

  const total = subtotal; // 下单阶段不计算仲裁费，仲裁费在支付阶段计算

  // 创建订单
  const handleCreateOrder = useCallback(async () => {
    if (!selectedAddress) {
      toast({
        title: t('checkout.selectAddressFirst', 'Please select a shipping address'),
        variant: 'destructive',
      });
      return;
    }

    if (checkoutItems.length === 0) {
      toast({
        title: t('checkout.noItems', 'No items to checkout'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: 调用真实的创建订单 API
      // const orderData = {
      //   items: checkoutItems.map(item => ({
      //     listingHash: item.id,
      //     quantity: item.quantity,
      //   })),
      //   address: mockAddresses.find(a => a.id === selectedAddress),
      //   memo: orderNote,
      // };
      // const result = await orderApi.createOrder(orderData);

      // Mock 订单创建
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockOrderID = `Qm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

      // 创建成功，跳转到支付页面
      router.push(`/payment?orderID=${mockOrderID}`);
    } catch (error) {
      toast({
        title: t('checkout.createOrderFailed', 'Failed to create order'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedAddress, checkoutItems, router, t, toast]);

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
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {t('checkout.title', 'Checkout')}
            </h1>
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
                {t('checkout.noItems', 'No items to checkout')}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t('checkout.addItemsFirst', 'Please add items to your cart first')}
              </p>
              <Link href="/marketplace">
                <Button>{t('checkout.browseMarketplace', 'Browse Marketplace')}</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Shipping Address */}
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                      {t('checkout.shippingAddress', 'Shipping Address')}
                    </h2>
                    <AddressSummary
                      address={mockAddresses.find(a => a.id === selectedAddress)}
                      onEdit={() => setShowAddressDrawer(true)}
                    />
                  </CardContent>
                </Card>

                {/* Order Note */}
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3">
                      {t('checkout.orderNote', 'Order Note (Optional)')}
                    </h2>
                    <textarea
                      value={orderNote}
                      onChange={e => setOrderNote(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md sm:rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                      placeholder={t(
                        'checkout.orderNotePlaceholder',
                        'Add a note for the seller...'
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="space-y-4 sm:space-y-6">
                <Card className="sticky top-4">
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                      {t('checkout.orderSummary', 'Order Summary')}
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
                              <p className="text-sm font-medium text-foreground line-clamp-2">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.vendor.name}
                              </p>
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
                              {t('checkout.quantity', 'Qty')}
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
                          {t('checkout.subtotal', 'Subtotal')}
                        </span>
                        <span className="font-medium text-foreground text-xs sm:text-sm">
                          {renderPairedPrice(subtotal, checkoutItems[0]?.currency || 'USD')}
                        </span>
                      </HStack>

                      <HStack justify="between">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {t('checkout.shipping', 'Shipping')}
                        </span>
                        <span className="font-medium text-emerald-600 text-xs sm:text-sm">
                          {t('checkout.free', 'Free')}
                        </span>
                      </HStack>

                      <div className="border-t border-border pt-2 sm:pt-3">
                        <HStack justify="between">
                          <span className="text-base sm:text-lg font-semibold text-foreground">
                            {t('checkout.total', 'Total')}
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
                      disabled={isSubmitting || !selectedAddress || checkoutItems.length === 0}
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
                          <span>{t('checkout.creatingOrder', 'Creating Order...')}</span>
                        </HStack>
                      ) : (
                        t('checkout.placeOrder', 'Place Order')
                      )}
                    </Button>

                    {/* Warnings */}
                    {!selectedAddress && (
                      <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md sm:rounded-lg">
                        <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                          {t('checkout.selectAddressWarning', 'Please select a shipping address')}
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
                      <span>
                        {t(
                          'checkout.paymentNextStep',
                          'You will select payment method in the next step'
                        )}
                      </span>
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
              <p className="text-xs text-muted-foreground">{t('checkout.total', 'Total')}</p>
              <p className="text-lg font-bold text-primary">
                {renderPairedPrice(total, checkoutItems[0]?.currency || 'USD')}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleCreateOrder}
              disabled={isSubmitting || !selectedAddress}
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
                  <span>{t('checkout.creating', 'Creating...')}</span>
                </HStack>
              ) : (
                t('checkout.placeOrder', 'Place Order')
              )}
            </Button>
          </HStack>
        </div>
      )}

      {/* Address Drawer */}
      <AddressDrawer
        isOpen={showAddressDrawer}
        onClose={() => setShowAddressDrawer(false)}
        addresses={mockAddresses}
        selectedAddressId={selectedAddress}
        onSelect={setSelectedAddress}
      />
    </div>
  );
}
