'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import {
  PaymentMethodSummary,
  PaymentProtectionCard,
  CheckoutBottomBar,
} from '@/components/Payment';
import { OrderSummaryCard } from '@/components/Order';
import { RwaPurchaseFlow } from '@/components/RwaToken';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { usePaymentSelector } from '@/hooks';
import { useWallet, useCurrency, useI18n, ordersApi, getImageUrl } from '@mobazha/core';
import type { Order } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';

// Types
interface OrderDetails {
  orderID: string;
  status: string;
  items: {
    id: string;
    title: string;
    price: number;
    currency: string;
    quantity: number;
    image: string;
  }[];
  vendor: {
    name: string;
    peerID: string;
  };
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  memo?: string;
  subtotal: number;
  total: number;
  currency: string;
  paymentAddress?: string;
  paymentAmount?: {
    amount: string;
    currency: string;
  };
  // RWA 相关
  isRwaToken?: boolean;
  rwaTradeMode?: number;
  rwaEscrowTimeoutSeconds?: number;
  cryptoListingCurrencyCode?: string;
  contractType?: string;
}

/**
 * Payment Page - 支付阶段
 *
 * 用户在此页面：
 * 1. 查看订单摘要（只读）
 * 2. 选择支付方式
 * 3. 选择是否启用支付保护
 * 4. 选择仲裁人
 * 5. 点击"支付"执行支付
 *
 * 入口：
 * - 创建订单后跳转 /payment?orderID=xxx
 * - 从订单详情页点击"支付" /payment?orderID=xxx
 */
export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { renderPairedPrice } = useCurrency();
  const { t } = useI18n();
  const { toast } = useToast();
  const { isConnected, isConnecting, connect } = useWallet();

  // 从 URL 获取参数
  const orderID = searchParams.get('orderID');
  const urlIsRwaToken = searchParams.get('isRwaToken') === 'true';
  const urlRwaTradeMode = searchParams.get('rwaTradeMode');
  const urlEscrowTimeout = searchParams.get('escrowTimeout');
  const urlTokenCode = searchParams.get('tokenCode');

  // 从 URL 获取订单信息（由 checkout 页面传递）
  const urlAmount = searchParams.get('amount');
  const urlCurrency = searchParams.get('currency');
  const urlTitle = searchParams.get('title');
  const urlVendorName = searchParams.get('vendorName');
  const urlVendorPeerID = searchParams.get('vendorPeerID');
  const urlQuantity = searchParams.get('quantity');
  const urlContractType = searchParams.get('contractType');
  const urlImage = searchParams.get('image');

  // 订单数据状态
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [rawOrder, setRawOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 支付状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentProtectionEnabled, setPaymentProtectionEnabled] = useState(true);

  // 使用支付选择器 Hook
  const {
    selectedTokenId,
    selectedModerator: paymentModerator,
    openPaymentSelector,
    openModeratorSelector,
    restoreFromSession,
  } = usePaymentSelector();

  // 页面聚焦时恢复 sessionStorage 状态
  useEffect(() => {
    restoreFromSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restoreFromSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [restoreFromSession]);

  // 加载订单详情
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderID) {
        setError(t('payment.noOrderID'));
        setIsLoadingOrder(false);
        return;
      }

      setIsLoadingOrder(true);
      setError(null);

      try {
        // 调用真实的订单详情 API
        const order = await ordersApi.getOrderDetails(orderID);
        setRawOrder(order);

        // 从订单中提取商品信息
        const contract = order?.contract;
        const listings = contract?.vendorListings || [];
        const orderItems = contract?.buyerOrder?.items || [];

        // 判断是否为 RWA Token（优先使用 URL 参数）
        const metadata = listings[0]?.metadata as any;
        const contractType = urlContractType || metadata?.contractType;
        const isRwa = urlIsRwaToken || contractType === 'RWA_TOKEN';
        const rwaMode = urlRwaTradeMode ? parseInt(urlRwaTradeMode, 10) : metadata?.rwaTradeMode;
        const escrowTimeout = urlEscrowTimeout
          ? parseInt(urlEscrowTimeout, 10)
          : metadata?.rwaEscrowTimeoutSeconds || metadata?.escrowTimeoutSeconds || 86400;
        const tokenCode = urlTokenCode || (listings[0]?.item as any)?.cryptoListingCurrencyCode;

        // 转换为 OrderDetails 格式
        // 注意：订单详情 API 返回的 listing.item.price 已经是转换后的值（不是最小单位）
        let items = listings.map((listing, index) => {
          const orderItem = orderItems[index] || {};
          const price = Number(listing.item?.price) || 0;
          const currency = listing.metadata?.pricingCurrency?.code || 'USD';
          const imageUrl = listing.item?.images?.[0]?.medium || listing.item?.images?.[0]?.small;

          return {
            id: listing.slug || `item-${index}`,
            title: listing.item?.title || 'Unknown Product',
            price,
            currency,
            quantity: Number(orderItem.quantity) || 1,
            image: getImageUrl(imageUrl) || '',
          };
        });

        // 如果 API 返回的数据为空，使用 URL 参数中的信息
        if (items.length === 0 && urlTitle && urlAmount) {
          const priceNum = parseFloat(urlAmount);
          const quantityNum = parseInt(urlQuantity || '1', 10);
          items = [
            {
              id: 'item-from-url',
              title: urlTitle,
              price: priceNum / quantityNum, // 单价
              currency: urlCurrency || 'USD',
              quantity: quantityNum,
              image: urlImage || '',
            },
          ];
        }

        // 获取地址信息
        const shipping = contract?.buyerOrder?.shipping as any;

        // 计算总价（优先使用 URL 参数中的金额）
        const totalFromUrl = urlAmount ? parseFloat(urlAmount) : 0;
        const calculatedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const finalTotal = totalFromUrl > 0 ? totalFromUrl : calculatedTotal;

        const orderDetailsData: OrderDetails = {
          orderID: (contract as any)?.OrderID || (contract as any)?.orderID || orderID,
          status: order?.state || 'AWAITING_PAYMENT',
          items,
          vendor: {
            name:
              listings[0]?.vendorID?.handle ||
              listings[0]?.vendorID?.peerID?.slice(0, 8) ||
              urlVendorName ||
              'Unknown',
            peerID: listings[0]?.vendorID?.peerID || urlVendorPeerID || '',
          },
          shippingAddress: {
            name: shipping?.shipTo || shipping?.name || '',
            street: shipping?.address || shipping?.street || '',
            city: shipping?.city || '',
            state: shipping?.state || '',
            country: shipping?.country || '',
            postalCode: shipping?.postalCode || '',
          },
          memo: contract?.buyerOrder?.alternateContactInfo,
          subtotal: finalTotal,
          total: finalTotal,
          currency: items[0]?.currency || urlCurrency || 'USD',
          paymentAddress: contract?.buyerOrder?.payment?.address,
          // RWA 相关
          isRwaToken: isRwa,
          rwaTradeMode: rwaMode,
          rwaEscrowTimeoutSeconds: escrowTimeout,
          cryptoListingCurrencyCode: tokenCode,
          contractType,
        };

        setOrderDetails(orderDetailsData);
      } catch (err) {
        console.error('Failed to fetch order details:', err);

        // API 调用失败时，尝试使用 URL 参数构建订单详情
        if (urlTitle && urlAmount) {
          const priceNum = parseFloat(urlAmount);
          const quantityNum = parseInt(urlQuantity || '1', 10);

          const fallbackOrderDetails: OrderDetails = {
            orderID,
            status: 'AWAITING_PAYMENT',
            items: [
              {
                id: 'item-from-url',
                title: urlTitle,
                price: priceNum / quantityNum,
                currency: urlCurrency || 'USD',
                quantity: quantityNum,
                image: urlImage || '',
              },
            ],
            vendor: {
              name: urlVendorName || 'Unknown',
              peerID: urlVendorPeerID || '',
            },
            shippingAddress: {
              name: '',
              street: '',
              city: '',
              state: '',
              country: '',
              postalCode: '',
            },
            subtotal: priceNum,
            total: priceNum,
            currency: urlCurrency || 'USD',
            isRwaToken: urlIsRwaToken,
            rwaTradeMode: urlRwaTradeMode ? parseInt(urlRwaTradeMode, 10) : undefined,
            rwaEscrowTimeoutSeconds: urlEscrowTimeout ? parseInt(urlEscrowTimeout, 10) : undefined,
            cryptoListingCurrencyCode: urlTokenCode || undefined,
            contractType: urlContractType || undefined,
          };

          setOrderDetails(fallbackOrderDetails);
        } else {
          setError(t('payment.loadOrderFailed'));
        }
      } finally {
        setIsLoadingOrder(false);
      }
    };

    fetchOrderDetails();
  }, [
    orderID,
    t,
    urlIsRwaToken,
    urlRwaTradeMode,
    urlEscrowTimeout,
    urlTokenCode,
    urlAmount,
    urlCurrency,
    urlTitle,
    urlVendorName,
    urlVendorPeerID,
    urlQuantity,
    urlContractType,
    urlImage,
  ]);

  // 计算仲裁员费用
  const moderatorFee = React.useMemo(() => {
    if (!paymentProtectionEnabled || !paymentModerator?.fee || !orderDetails) return 0;
    const { fee } = paymentModerator;
    const subtotal = orderDetails.subtotal;

    if (fee.feeType === 'percentage' && fee.percentage !== undefined) {
      return subtotal * (fee.percentage / 100);
    } else if (fee.feeType === 'fixed' && fee.fixedFee) {
      return parseFloat(String(fee.fixedFee.amount)) || 0;
    } else if (fee.feeType === 'percentage_plus_fixed') {
      const percentageFee = fee.percentage !== undefined ? subtotal * (fee.percentage / 100) : 0;
      const fixedFee = fee.fixedFee ? parseFloat(String(fee.fixedFee.amount)) || 0 : 0;
      return percentageFee + fixedFee;
    }
    return 0;
  }, [paymentProtectionEnabled, paymentModerator, orderDetails]);

  const totalWithFee = (orderDetails?.total || 0) + moderatorFee;

  // Mock exchange rate (TODO: 从 API 获取)
  const exchangeRate = 2500;
  const cryptoAmount = totalWithFee / exchangeRate;
  const nativeSymbol = 'ETH'; // TODO: 根据选择的支付方式确定

  // 执行支付
  const handlePayment = useCallback(async () => {
    if (!orderDetails) {
      toast({
        title: t('payment.noOrderData'),
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTokenId) {
      toast({
        title: t('payment.selectPaymentMethod'),
        variant: 'destructive',
      });
      return;
    }

    if (paymentProtectionEnabled && !paymentModerator) {
      toast({
        title: t('payment.selectModerator'),
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // TODO: 调用真实的支付 API
      // 1. 获取支付指令
      // const instructions = await orderApi.getPaymentInstructions(orderID, selectedTokenId);

      // 2. 执行支付交易
      // await walletService.sendTransaction({
      //   to: instructions.paymentAddress,
      //   value: instructions.amount,
      // });

      // 3. 提交支付确认
      // await orderApi.fundOrder({
      //   orderID,
      //   coinType: selectedTokenId,
      //   address: instructions.paymentAddress,
      //   amount: instructions.amount,
      // });

      // Mock 支付
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 支付成功，跳转到订单详情
      toast({
        title: t('payment.success'),
      });
      router.push(`/orders/${orderDetails.orderID}`);
    } catch (error) {
      toast({
        title: t('payment.failed'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [orderDetails, selectedTokenId, paymentProtectionEnabled, paymentModerator, router, t, toast]);

  // Error state
  if (error && !isLoadingOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8">
          <Container size="md">
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-destructive mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {t('payment.errorTitle')}
              </h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.back()}>{t('common.goBack')}</Button>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

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
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('payment.title')}</h1>
          </HStack>

          {/* Loading State */}
          {isLoadingOrder ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton variant="text" height={24} width="40%" className="mb-4" />
                    <Skeleton variant="rounded" height={100} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton variant="text" height={24} width="50%" className="mb-4" />
                    <Skeleton variant="rounded" height={60} />
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton variant="text" height={24} width="60%" className="mb-4" />
                    <Skeleton variant="rounded" height={120} className="mb-4" />
                    <Skeleton variant="rounded" height={40} />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : orderDetails ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Order Summary (Read-only) */}
                <OrderSummaryCard
                  orderID={orderDetails.orderID}
                  items={orderDetails.items}
                  vendor={orderDetails.vendor}
                  shippingAddress={
                    // 只有物理商品才显示收货地址
                    orderDetails.contractType === 'PHYSICAL_GOOD' &&
                    orderDetails.shippingAddress?.street
                      ? orderDetails.shippingAddress
                      : undefined
                  }
                  memo={orderDetails.memo}
                />

                {/* RWA Token 支付流程 */}
                {orderDetails.isRwaToken ? (
                  <RwaPurchaseFlow
                    order={rawOrder!}
                    rwaTradeMode={orderDetails.rwaTradeMode}
                    escrowTimeoutSeconds={orderDetails.rwaEscrowTimeoutSeconds}
                    cryptoListingCurrencyCode={orderDetails.cryptoListingCurrencyCode}
                    onSuccess={() => {
                      toast({ title: t('payment.success') });
                      router.push(`/orders/${orderDetails.orderID}`);
                    }}
                    onCancel={() => router.back()}
                  />
                ) : (
                  <>
                    {/* Payment Method Selection */}
                    <Card>
                      <CardContent className="p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                          {t('payment.paymentMethod')}
                        </h2>
                        <PaymentMethodSummary
                          selectedTokenId={selectedTokenId}
                          onEdit={() => openPaymentSelector('/payment?orderID=' + orderID)}
                        />
                      </CardContent>
                    </Card>

                    {/* Payment Protection */}
                    <PaymentProtectionCard
                      enabled={paymentProtectionEnabled}
                      onEnabledChange={setPaymentProtectionEnabled}
                      selectedModerator={paymentModerator}
                      onChangeModerator={() => openModeratorSelector('/payment?orderID=' + orderID)}
                      protectionDays={45}
                    />
                  </>
                )}
              </div>

              {/* Payment Summary - 仅非 RWA 商品显示 */}
              {!orderDetails.isRwaToken && (
                <div className="space-y-4 sm:space-y-6">
                  <Card className="sticky top-4">
                    <CardContent className="p-4 sm:p-6">
                      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                        {t('payment.paymentSummary')}
                      </h2>

                      <VStack gap="sm" className="border-b border-border pb-3 mb-3">
                        <HStack justify="between">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {t('payment.orderTotal')}
                          </span>
                          <span className="font-medium text-foreground text-xs sm:text-sm">
                            {renderPairedPrice(orderDetails.total, orderDetails.currency, {
                              isMinimalUnit: false,
                            })}
                          </span>
                        </HStack>

                        {paymentProtectionEnabled && paymentModerator && moderatorFee > 0 && (
                          <HStack justify="between">
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {t('payment.moderatorFee')}
                            </span>
                            <span className="font-medium text-foreground text-xs sm:text-sm">
                              {renderPairedPrice(moderatorFee, orderDetails.currency, {
                                isMinimalUnit: false,
                              })}
                            </span>
                          </HStack>
                        )}
                      </VStack>

                      <HStack justify="between" className="mb-4">
                        <span className="text-base sm:text-lg font-semibold text-foreground">
                          {t('payment.totalToPay')}
                        </span>
                        <div className="text-right">
                          <p className="text-lg sm:text-xl font-bold text-primary">
                            {renderPairedPrice(totalWithFee, orderDetails.currency, {
                              isMinimalUnit: false,
                            })}
                          </p>
                          {selectedTokenId && (
                            <p className="text-xs text-muted-foreground">
                              ≈ {cryptoAmount.toFixed(6)} {nativeSymbol}
                            </p>
                          )}
                        </div>
                      </HStack>

                      {/* Pay Button - Desktop */}
                      <Button
                        className="w-full touch-feedback hidden sm:flex"
                        size="default"
                        onClick={!isConnected ? connect : handlePayment}
                        disabled={
                          isProcessing ||
                          isConnecting ||
                          (isConnected &&
                            (!selectedTokenId || (paymentProtectionEnabled && !paymentModerator)))
                        }
                      >
                        {isProcessing ? (
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
                            <span>{t('payment.processing')}</span>
                          </HStack>
                        ) : isConnecting ? (
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
                            <span>{t('payment.connecting')}</span>
                          </HStack>
                        ) : !isConnected ? (
                          t('payment.connectWallet')
                        ) : (
                          `${t('payment.pay')} ${cryptoAmount.toFixed(6)} ${nativeSymbol}`
                        )}
                      </Button>

                      {/* Warnings */}
                      {!selectedTokenId && (
                        <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md sm:rounded-lg">
                          <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                            {t('payment.selectPaymentMethodWarning')}
                          </p>
                        </div>
                      )}
                      {paymentProtectionEnabled && !paymentModerator && (
                        <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md sm:rounded-lg">
                          <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                            {t('payment.selectModeratorWarning')}
                          </p>
                        </div>
                      )}

                      {/* Security Note */}
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
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <span>{t('payment.securityNote')}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : null}
        </Container>
      </main>

      <Footer />

      {/* Mobile Bottom Bar - 仅非 RWA 商品显示 */}
      {orderDetails && !orderDetails.isRwaToken && (
        <CheckoutBottomBar
          totalAmount={totalWithFee}
          currency={orderDetails.currency}
          cryptoAmount={cryptoAmount.toFixed(6)}
          cryptoCurrency={nativeSymbol}
          paymentMethod={selectedTokenId || undefined}
          onPay={handlePayment}
          onConnect={connect}
          isLoading={isProcessing}
          isConnected={isConnected}
          isConnecting={isConnecting}
          disabled={!selectedTokenId || (paymentProtectionEnabled && !paymentModerator)}
        />
      )}
    </div>
  );
}
