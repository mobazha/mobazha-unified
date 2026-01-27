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
import {
  useWallet,
  useCurrency,
  useI18n,
  ordersApi,
  getImageUrl,
  getTransactionService,
} from '@mobazha/core';
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
  // 原始订单金额（最小单位，用于传统订单支付）
  rawOrderAmount?: number;
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
  const { isConnected, isConnecting, connect, getSigner } = useWallet();

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
        // 注意：API 返回两种可能的结构：
        // 1. 旧结构: contract.vendorListings, contract.buyerOrder
        // 2. 新结构: contract.orderOpen.listings, contract.orderOpen.items
        const contract = order?.contract as any;
        const orderOpen = contract?.orderOpen;

        // 优先使用 orderOpen 结构（新 API），回退到旧结构
        let rawListings: any[] = [];
        let orderItems: any[] = [];
        let orderAmount = 0;
        let pricingCurrency = 'USD';
        let pricingDivisibility = 2;
        let shippingInfo: any = null;
        let vendorInfo: any = null;
        let paymentAddress = '';
        let memo = '';

        if (orderOpen) {
          // 新结构：orderOpen 包含 listings（每个元素是 {cid, listing, signature}）和 items
          rawListings = orderOpen.listings || [];
          orderItems = orderOpen.items || [];
          orderAmount = Number(orderOpen.amount) || 0;
          shippingInfo = orderOpen.shipping;
          memo = orderOpen.alternateContactInfo || '';

          // 从第一个 listing 提取定价信息
          const firstListingData = rawListings[0]?.listing;
          if (firstListingData?.metadata?.pricingCurrency) {
            pricingCurrency = firstListingData.metadata.pricingCurrency.code || 'USD';
            pricingDivisibility = firstListingData.metadata.pricingCurrency.divisibility || 2;
          }
          vendorInfo = firstListingData?.vendorID;
        } else {
          // 旧结构
          rawListings = contract?.vendorListings || [];
          orderItems = contract?.buyerOrder?.items || [];
          shippingInfo = contract?.buyerOrder?.shipping;
          memo = contract?.buyerOrder?.alternateContactInfo || '';
          paymentAddress = contract?.buyerOrder?.payment?.address || '';

          // 从第一个 listing 提取定价信息
          if (rawListings[0]?.metadata?.pricingCurrency) {
            pricingCurrency = rawListings[0].metadata.pricingCurrency.code || 'USD';
            pricingDivisibility = rawListings[0].metadata.pricingCurrency.divisibility || 2;
          }
          vendorInfo = rawListings[0]?.vendorID;
        }

        // 统一处理 listings（兼容新旧结构）
        const normalizedListings = rawListings.map((item: any) => {
          // 新结构: { cid, listing: {...}, signature }
          // 旧结构: 直接是 listing 对象
          return item.listing || item;
        });

        // 判断是否为 RWA Token（优先使用 URL 参数）
        const metadata = normalizedListings[0]?.metadata as any;
        const contractType = urlContractType || metadata?.contractType;
        const isRwa = urlIsRwaToken || contractType === 'RWA_TOKEN';
        const rwaMode = urlRwaTradeMode ? parseInt(urlRwaTradeMode, 10) : metadata?.rwaTradeMode;
        const escrowTimeout = urlEscrowTimeout
          ? parseInt(urlEscrowTimeout, 10)
          : metadata?.rwaEscrowTimeoutSeconds || metadata?.escrowTimeoutSeconds || 86400;
        const tokenCode =
          urlTokenCode || (normalizedListings[0]?.item as any)?.cryptoListingCurrencyCode;

        // 转换为 OrderDetails 格式
        let items = normalizedListings.map((listing: any, index: number) => {
          const orderItem = orderItems[index] || {};
          // 价格在最小单位中，需要根据 divisibility 转换
          const rawPrice = Number(listing.item?.price) || 0;
          const divisibility =
            listing.metadata?.pricingCurrency?.divisibility || pricingDivisibility;
          const price = rawPrice / Math.pow(10, divisibility);
          const currency = listing.metadata?.pricingCurrency?.code || pricingCurrency;
          const imageUrl = listing.item?.images?.[0]?.medium || listing.item?.images?.[0]?.small;

          return {
            id: listing.slug || `item-${index}`,
            title: listing.item?.title || 'Unknown Product',
            price,
            currency,
            quantity: Number(orderItem.quantity) || Number(orderItem.quantity64) || 1,
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

        // 计算总价
        // 优先级：1. URL 参数  2. orderOpen.amount（转换后）  3. 计算值
        const totalFromUrl = urlAmount ? parseFloat(urlAmount) : 0;
        const totalFromOrderOpen =
          orderAmount > 0 ? orderAmount / Math.pow(10, pricingDivisibility) : 0;
        const calculatedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const finalTotal =
          totalFromUrl > 0
            ? totalFromUrl
            : totalFromOrderOpen > 0
              ? totalFromOrderOpen
              : calculatedTotal;

        const orderDetailsData: OrderDetails = {
          orderID: contract?.OrderID || contract?.orderID || orderID,
          status: order?.state || 'AWAITING_PAYMENT',
          items,
          vendor: {
            name:
              vendorInfo?.handle || vendorInfo?.peerID?.slice(0, 8) || urlVendorName || 'Unknown',
            peerID: vendorInfo?.peerID || urlVendorPeerID || '',
          },
          shippingAddress: {
            name: shippingInfo?.shipTo || shippingInfo?.name || '',
            street: shippingInfo?.address || shippingInfo?.street || '',
            city: shippingInfo?.city || '',
            state: shippingInfo?.state || '',
            country: shippingInfo?.country || '',
            postalCode: shippingInfo?.postalCode || '',
          },
          memo,
          subtotal: finalTotal,
          total: finalTotal,
          currency: items[0]?.currency || urlCurrency || pricingCurrency,
          paymentAddress,
          // RWA 相关
          isRwaToken: isRwa,
          rwaTradeMode: rwaMode,
          rwaEscrowTimeoutSeconds: escrowTimeout,
          cryptoListingCurrencyCode: tokenCode,
          contractType,
          // 保存原始订单金额（用于传统订单支付）
          rawOrderAmount: orderAmount,
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

  // 获取支付信息（支付地址和金额）
  const paymentInfo = useMemo(() => {
    if (!rawOrder) return null;

    const contract = rawOrder.contract;
    const payment = contract?.buyerOrder?.payment;
    const vendorConfirmation = contract?.vendorOrderConfirmation;

    // 优先使用卖家确认的支付地址和金额
    const paymentAddress = vendorConfirmation?.paymentAddress || payment?.address;
    const paymentAmount = vendorConfirmation?.requestedAmount || payment?.amount;
    const paymentCoin = payment?.coin || selectedTokenId || 'ETH';

    return {
      address: paymentAddress,
      amount: paymentAmount,
      coin: paymentCoin,
    };
  }, [rawOrder, selectedTokenId]);

  // 获取代币精度（用于支付计算）
  const getTokenDecimals = useCallback((coin: string): number => {
    const upperCoin = (coin || '').toUpperCase();
    // 主流稳定币精度映射
    if (upperCoin.includes('USDT') || upperCoin.includes('USDC')) {
      return 6;
    }
    if (upperCoin.includes('DAI')) {
      return 18;
    }
    // ETH 和其他原生代币默认 18 位
    return 18;
  }, []);

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

    if (!isConnected) {
      toast({
        title: t('payment.connectWalletFirst'),
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. 计算支付金额（需要传给后端 API）
      // 获取支付代币精度
      const getPaymentTokenDivisibility = (coin: string): number => {
        const upperCoin = (coin || '').toUpperCase();
        if (upperCoin.includes('USDT') || upperCoin.includes('USDC')) return 6;
        if (upperCoin.includes('DAI')) return 18;
        if (upperCoin.includes('ETH')) return 18;
        if (upperCoin.includes('BTC')) return 8;
        return 6; // 默认 6
      };

      let paymentAmountForApi = 0;
      if (orderDetails) {
        const isRwaToken = orderDetails.isRwaToken;
        if (isRwaToken) {
          // RWA Token 订单：从 fiat 金额计算稳定币金额
          const totalInFiat = orderDetails.total;
          const paymentTokenDivisibility = getPaymentTokenDivisibility(selectedTokenId);
          paymentAmountForApi = Math.round(totalInFiat * Math.pow(10, paymentTokenDivisibility));
        } else {
          // 传统订单：使用 rawOrderAmount 并转换精度
          const rawAmount = orderDetails.rawOrderAmount || 0;
          const pricingDivisibility = 2; // USD 精度
          const paymentTokenDivisibility = getPaymentTokenDivisibility(selectedTokenId);
          const multiplier = Math.pow(10, paymentTokenDivisibility - pricingDivisibility);
          paymentAmountForApi = Math.round(rawAmount * multiplier);
        }
      }

      // 2. 获取钱包地址
      const signer = await getSigner();
      const payerAddress = signer ? await signer.getAddress() : undefined;

      // 3. 获取支付指令（传入金额、付款地址和仲裁人）
      // 如果启用了支付保护且选择了仲裁人，传入仲裁人 peerID
      const moderatorPeerID =
        paymentProtectionEnabled && paymentModerator?.peerID ? paymentModerator.peerID : undefined;

      const response = await ordersApi.getPaymentInstructions({
        orderId: orderID!,
        coin: selectedTokenId,
        amount: paymentAmountForApi,
        payerAddress: payerAddress,
        moderator: moderatorPeerID,
      });

      // 4. 检查是否为外部钱包支付（UTXO 链如 BTC/LTC）
      if (response.paymentType === 'external_wallet') {
        // TODO: 显示外部钱包支付模态框
        toast({
          title: t('payment.externalWalletRequired'),
          description: t('payment.pleaseUseExternalWallet'),
        });
        setIsProcessing(false);
        return;
      }

      // 5. 验证必要的支付数据
      if (!response.instructions) {
        throw new Error(t('payment.noPaymentInstructions'));
      }

      const { to, data, value } = response.instructions;

      if (!to) {
        throw new Error(t('payment.noPaymentAddress'));
      }

      // 6. 验证 signer（已在前面获取）
      if (!signer) {
        throw new Error(t('payment.signerNotAvailable'));
      }

      // 7. 初始化交易服务
      const transactionService = getTransactionService();
      const initResult = await transactionService.initializeWithSigner(signer);
      if (!initResult) {
        throw new Error(t('payment.providerNotAvailable'));
      }

      // 8. 使用交易服务执行支付（包含 ERC20 授权和交易执行）
      const { paymentData } = response;
      const paymentTokenAddress = paymentData?.paymentTokenAddress;
      const contractAddress = paymentData?.contractAddress || to;

      // 使用已计算的支付金额（paymentAmountForApi）
      const paymentAmount = paymentAmountForApi;

      toast({
        title: t('payment.confirmInWallet'),
        description: t('payment.pleaseConfirmTransaction'),
      });

      // 执行合约支付（自动处理 ERC20 授权）
      const txResult = await transactionService.executeContractPayment(
        paymentTokenAddress,
        contractAddress,
        paymentAmount?.toString() || '0',
        { to, data, value: value || '0' }
      );

      if (!txResult.success) {
        throw new Error(txResult.error || t('payment.transactionFailed'));
      }

      const txHash = txResult.transactionHash!;

      toast({
        title: t('payment.transactionSent'),
        description: `${t('payment.txHash')}: ${txHash.slice(0, 10)}...`,
      });

      // 7. 通知后端支付完成（使用 /v1/order/payment API）
      // 与移动端保持一致：直接使用后端返回的 paymentData，只添加 transactionID 和 timestamp
      try {
        const { paymentData: pd } = response;
        if (pd) {
          // 后端返回的 paymentData 已包含 toAddress、orderID、coin、amount、method 等所有必要字段
          const submitData = {
            ...pd,
            transactionID: txHash,
            timestamp: new Date().toISOString(),
          };
          await ordersApi.submitPayment(submitData);
        } else {
          // 如果后端没有返回 paymentData，跳过提交
        }
      } catch {
        // 即使后端返回错误，交易已经发出，仍然算成功
      }

      // 8. 支付成功，跳转到订单详情
      toast({
        title: t('payment.success'),
        description: t('payment.paymentComplete'),
      });

      router.push(`/orders/${orderDetails.orderID}`);
    } catch (error) {
      console.error('[Payment] Payment failed:', error);

      // 用户取消交易的情况
      const errorMessage = (error as Error).message || '';
      if (
        errorMessage.includes('rejected') ||
        errorMessage.includes('denied') ||
        errorMessage.includes('cancelled')
      ) {
        toast({
          title: t('payment.cancelled'),
          description: t('payment.userCancelledTransaction'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('payment.failed'),
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    orderDetails,
    orderID,
    selectedTokenId,
    paymentProtectionEnabled,
    paymentModerator,
    isConnected,
    getSigner,
    router,
    t,
    toast,
  ]);

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
