'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import {
  PaymentMethodSummary,
  PaymentProtectionCard,
  CheckoutBottomBar,
} from '@/components/Payment';
import { OrderSummaryCard } from '@/components/Order';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { usePaymentSelector } from '@/hooks';
import { useWallet, useCurrency, useI18n } from '@mobazha/core';
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

  // 从 URL 获取订单 ID
  const orderID = searchParams.get('orderID');

  // 订单数据状态
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
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
        setError(t('payment.noOrderID', 'No order ID provided'));
        setIsLoadingOrder(false);
        return;
      }

      setIsLoadingOrder(true);
      setError(null);

      try {
        // TODO: 调用真实的订单详情 API
        // const details = await orderApi.getOrderDetails(orderID);

        // Mock 订单数据
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockOrder: OrderDetails = {
          orderID,
          status: 'AWAITING_PAYMENT',
          items: [
            {
              id: 'product-1',
              title: 'Sample Product - Digital Art NFT Collection',
              price: 99.99,
              currency: 'USD',
              quantity: 1,
              image: '',
            },
          ],
          vendor: {
            name: 'Digital Art Store',
            peerID: '12D3KooW...',
          },
          shippingAddress: {
            name: 'John Doe',
            street: '123 Main Street, Apt 4B',
            city: 'San Francisco',
            state: 'CA',
            country: 'United States',
            postalCode: '94102',
          },
          memo: 'Please handle with care',
          subtotal: 99.99,
          total: 99.99,
          currency: 'USD',
        };

        setOrderDetails(mockOrder);
      } catch (err) {
        console.error('Failed to fetch order details:', err);
        setError(t('payment.loadOrderFailed', 'Failed to load order details'));
      } finally {
        setIsLoadingOrder(false);
      }
    };

    fetchOrderDetails();
  }, [orderID, t]);

  // 计算仲裁员费用
  const moderatorFee = React.useMemo(() => {
    if (!paymentProtectionEnabled || !paymentModerator?.fee || !orderDetails) return 0;
    const { fee } = paymentModerator;
    const subtotal = orderDetails.subtotal;

    if (fee.feeType === 'percentage' && fee.percentage !== undefined) {
      return subtotal * (fee.percentage / 100);
    } else if (fee.feeType === 'fixed' && fee.fixedFee) {
      return parseFloat(fee.fixedFee.amount) || 0;
    } else if (fee.feeType === 'percentage_plus_fixed') {
      const percentageFee = fee.percentage !== undefined ? subtotal * (fee.percentage / 100) : 0;
      const fixedFee = fee.fixedFee ? parseFloat(fee.fixedFee.amount) || 0 : 0;
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
        title: t('payment.noOrderData', 'No order data'),
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTokenId) {
      toast({
        title: t('payment.selectPaymentMethod', 'Please select a payment method'),
        variant: 'destructive',
      });
      return;
    }

    if (paymentProtectionEnabled && !paymentModerator) {
      toast({
        title: t('payment.selectModerator', 'Please select a moderator for payment protection'),
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
        title: t('payment.success', 'Payment successful!'),
      });
      router.push(`/orders/${orderDetails.orderID}`);
    } catch (error) {
      toast({
        title: t('payment.failed', 'Payment failed'),
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
                {t('payment.errorTitle', 'Unable to Load Order')}
              </h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.back()}>{t('common.goBack', 'Go Back')}</Button>
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
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {t('payment.title', 'Payment')}
            </h1>
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
                  shippingAddress={orderDetails.shippingAddress}
                  memo={orderDetails.memo}
                />

                {/* Payment Method Selection */}
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                      {t('payment.paymentMethod', 'Payment Method')}
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
              </div>

              {/* Payment Summary */}
              <div className="space-y-4 sm:space-y-6">
                <Card className="sticky top-4">
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                      {t('payment.paymentSummary', 'Payment Summary')}
                    </h2>

                    <VStack gap="sm" className="border-b border-border pb-3 mb-3">
                      <HStack justify="between">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {t('payment.orderTotal', 'Order Total')}
                        </span>
                        <span className="font-medium text-foreground text-xs sm:text-sm">
                          {renderPairedPrice(orderDetails.total, orderDetails.currency)}
                        </span>
                      </HStack>

                      {paymentProtectionEnabled && paymentModerator && moderatorFee > 0 && (
                        <HStack justify="between">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {t('payment.moderatorFee', 'Moderator Fee')}
                          </span>
                          <span className="font-medium text-foreground text-xs sm:text-sm">
                            {renderPairedPrice(moderatorFee, orderDetails.currency)}
                          </span>
                        </HStack>
                      )}
                    </VStack>

                    <HStack justify="between" className="mb-4">
                      <span className="text-base sm:text-lg font-semibold text-foreground">
                        {t('payment.totalToPay', 'Total to Pay')}
                      </span>
                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-primary">
                          {renderPairedPrice(totalWithFee, orderDetails.currency)}
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
                          <span>{t('payment.processing', 'Processing...')}</span>
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
                          <span>{t('payment.connecting', 'Connecting...')}</span>
                        </HStack>
                      ) : !isConnected ? (
                        t('payment.connectWallet', 'Connect Wallet to Pay')
                      ) : (
                        `${t('payment.pay', 'Pay')} ${cryptoAmount.toFixed(6)} ${nativeSymbol}`
                      )}
                    </Button>

                    {/* Warnings */}
                    {!selectedTokenId && (
                      <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md sm:rounded-lg">
                        <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                          {t(
                            'payment.selectPaymentMethodWarning',
                            'Please select a payment method'
                          )}
                        </p>
                      </div>
                    )}
                    {paymentProtectionEnabled && !paymentModerator && (
                      <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md sm:rounded-lg">
                        <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                          {t(
                            'payment.selectModeratorWarning',
                            'Please select a moderator for escrow protection'
                          )}
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
                      <span>
                        {t(
                          'payment.securityNote',
                          'Secure payment with multi-sig escrow protection'
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </Container>
      </main>

      <Footer />

      {/* Mobile Bottom Bar */}
      {orderDetails && (
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
