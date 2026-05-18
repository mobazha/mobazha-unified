'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header, Footer, MobilePageHeader } from '@/components';
import {
  PaymentMethodSummary,
  PaymentProtectionCard,
  CheckoutBottomBar,
  TransactionOverlay,
  FiatPaymentSection,
  TronGasHint,
  ExternalWalletPayment,
} from '@/components/Payment';
import type {
  PaymentStep,
  FiatPaymentSuccessResult,
  ExternalWalletPaymentInfo,
} from '@/components/Payment';
import { getTokenById } from '@/components/Payment/config';
import { OrderSummaryCard } from '@/components/Order';
import { RwaPurchaseFlow } from '@/components/RwaToken';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { CheckoutProgressBar } from '@/components/Checkout/CheckoutProgressBar';
import { usePaymentSelector } from '@/hooks';
import {
  useWallet,
  useTronWallet,
  useCurrency,
  useRateFreshness,
  useI18n,
  ordersApi,
  profileApi,
  getImageUrl,
  getTransactionService,
  getPaymentExecutor,
  resolveChainCategory,
  convertCurrency,
  toMinimalUnit,
  getBaseRateSymbol,
} from '@mobazha/core';
import type { Order } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import { useHaptic } from '@/lib/platform';

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
    avatar?: string;
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
  shipping: number;
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

interface FiatConfirmationContext {
  providerID: string;
  amount?: number;
}

function buildConfirmationUrl(details: OrderDetails, fiat?: FiatConfirmationContext): string {
  const url = new URL('/checkout/confirmation', window.location.origin);
  url.searchParams.set('orderID', details.orderID);
  url.searchParams.set('total', String(details.total));
  url.searchParams.set('currency', details.currency);
  if (details.items[0]?.title) url.searchParams.set('title', details.items[0].title);
  if (details.items[0]?.id) url.searchParams.set('slug', details.items[0].id);
  if (details.vendor?.name) url.searchParams.set('vendorName', details.vendor.name);
  if (fiat?.providerID) {
    url.searchParams.set('fiatProvider', fiat.providerID);
    if (typeof fiat.amount === 'number' && Number.isFinite(fiat.amount) && fiat.amount > 0) {
      url.searchParams.set('fiatAmount', String(Math.floor(fiat.amount)));
    }
  }
  return url.toString();
}

function formatCryptoAmountForSummary(rawAmount: string, decimals: number): string {
  const num = Number(rawAmount);
  if (!num || !Number.isFinite(num)) return '0';
  const result = num / Math.pow(10, decimals);
  return result.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

function buildFiatPaymentCoin(providerID: string, currency: string): string {
  const provider = (providerID || '').trim().toLowerCase();
  const resolvedCurrency = (currency || '').trim().toUpperCase() || 'USD';
  if (!provider) {
    throw new Error('fiat provider is required');
  }
  return `fiat:${provider}:${resolvedCurrency}`;
}

function hasExchangeRateForConversion(
  rates: Record<string, number>,
  fromCurrency?: string,
  toCurrency?: string
): boolean {
  if (!fromCurrency || !toCurrency) return false;

  const fromCode = getBaseRateSymbol(fromCurrency.toUpperCase());
  const toCode = getBaseRateSymbol(toCurrency.toUpperCase());
  if (fromCode === toCode) return true;

  return rates[fromCode] > 0 && rates[toCode] > 0;
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
  const { renderPairedPrice, rates } = useCurrency();
  const { secondsAgo } = useRateFreshness('payment');
  const { t } = useI18n();
  const { toast } = useToast();
  const haptic = useHaptic();
  const evmWallet = useWallet();
  const tronWallet = useTronWallet();

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
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [submittedTxHash, setSubmittedTxHash] = useState<string>();
  const [paymentError, setPaymentError] = useState<string>();
  const isProcessing = paymentStep !== 'idle' && paymentStep !== 'failed';
  const [paymentProtectionEnabled, setPaymentProtectionEnabled] = useState(true);

  // 使用支付选择器 Hook
  const {
    selectedTokenId,
    selectedFiatProvider,
    selectedModerator: paymentModerator,
    openPaymentSelector,
    openModeratorSelector,
    restoreFromSession,
    setVendorPeerID,
  } = usePaymentSelector();

  const selectedPaymentCoin = useMemo(() => {
    const tokenId = (selectedTokenId || '').trim();
    if (!tokenId) return '';
    return getTokenById(tokenId)?.assetId?.trim() || tokenId;
  }, [selectedTokenId]);

  // 链类别检测与统一钱包状态
  const chainCategory = selectedPaymentCoin ? resolveChainCategory(selectedPaymentCoin) : null;
  const isTronPayment = chainCategory === 'tron';
  const isUtxoPayment = chainCategory === 'utxo';
  const isConnected = isTronPayment ? tronWallet.isConnected : evmWallet.isConnected;
  const isConnecting = isTronPayment ? tronWallet.isConnecting : evmWallet.isConnecting;
  const connect = isTronPayment
    ? () => tronWallet.connect().then(() => undefined)
    : evmWallet.connect;
  const getSigner = evmWallet.getSigner;

  // UTXO 外部钱包支付信息（BTC/LTC/BCH/ZEC）
  const [externalWalletInfo, setExternalWalletInfo] = useState<ExternalWalletPaymentInfo | null>(
    null
  );

  // 切换支付方式时清除外部钱包信息
  useEffect(() => {
    setExternalWalletInfo(null);
  }, [selectedTokenId]);

  // beforeunload: warn user when payment is in progress
  useEffect(() => {
    if (!isProcessing) return;
    const handler = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isProcessing]);

  // Payment window countdown (45 min from order creation)
  const [paymentTimeRemaining, setPaymentTimeRemaining] = useState<string | null>(null);
  const [paymentExpired, setPaymentExpired] = useState(false);

  useEffect(() => {
    if (!rawOrder) return;

    const rawContract = rawOrder.contract as any;
    const backendExpiresAt = rawContract?.ExpiresAt || rawContract?.expiresAt;
    let expiresAt: number;

    if (backendExpiresAt) {
      expiresAt = new Date(backendExpiresAt).getTime();
      if (isNaN(expiresAt)) return;
    } else {
      const orderTimestamp = rawOrder.contract?.orderOpen?.timestamp;
      if (!orderTimestamp) return;
      const FALLBACK_PAYMENT_WINDOW_MS = 60 * 60 * 1000;
      const orderCreatedAt = new Date(orderTimestamp).getTime();
      if (isNaN(orderCreatedAt)) return;
      expiresAt = orderCreatedAt + FALLBACK_PAYMENT_WINDOW_MS;
    }

    const updateTimer = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        setPaymentTimeRemaining(null);
        setPaymentExpired(true);
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setPaymentTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      setPaymentExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rawOrder]);

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

  // 设置卖家 PeerID 以获取可用法币支付方式
  useEffect(() => {
    if (orderDetails?.vendor?.peerID) {
      setVendorPeerID(orderDetails.vendor.peerID);
    }
  }, [orderDetails?.vendor?.peerID, setVendorPeerID]);

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
        // 使用 orderOpen 结构（与桌面端一致）
        const contract = order?.contract as any;
        const orderOpen = contract?.orderOpen;

        if (!orderOpen) {
          throw new Error('Invalid order data: orderOpen not found');
        }

        // orderOpen 包含 listings（每个元素是 {cid, listing, signature}）和 items
        const rawListings: any[] = orderOpen.listings || [];
        const orderItems: any[] = orderOpen.items || [];
        const orderAmount = Number(orderOpen.amount) || 0;
        const shippingInfo = orderOpen.shipping;
        const memo = orderOpen.alternateContactInfo || '';

        // 从第一个 listing 提取定价信息
        const firstListingData = rawListings[0]?.listing;
        let pricingCurrency = 'USD';
        let pricingDivisibility = 2;
        if (firstListingData?.metadata?.pricingCurrency) {
          pricingCurrency = firstListingData.metadata.pricingCurrency.code || 'USD';
          pricingDivisibility = firstListingData.metadata.pricingCurrency.divisibility || 2;
        }
        const vendorInfo = firstListingData?.vendorID;

        // 处理 listings（每个元素是 {cid, listing, signature}）
        const normalizedListings = rawListings.map((item: any) => item.listing || item);

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
        const calculatedSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const finalTotal =
          totalFromUrl > 0
            ? totalFromUrl
            : totalFromOrderOpen > 0
              ? totalFromOrderOpen
              : calculatedSubtotal;
        // 运费 = 总价 - 商品小计（如果总价大于小计则差额为运费）
        const shippingAmount = Math.max(0, finalTotal - calculatedSubtotal);

        // 获取卖家 profile（包括名称和头像）
        const vendorPeerID = vendorInfo?.peerID || urlVendorPeerID || '';
        let vendorName = vendorInfo?.handle || urlVendorName || t('order.seller');
        let vendorAvatar: string | undefined;

        if (vendorPeerID) {
          try {
            const vendorProfile = await profileApi.getProfile(vendorPeerID);
            if (vendorProfile) {
              vendorName = vendorProfile.name || vendorProfile.handle || vendorName;
              // 获取头像 URL
              const avatarHash =
                vendorProfile.avatarHashes?.medium ||
                vendorProfile.avatarHashes?.small ||
                vendorProfile.avatarHashes?.tiny;
              if (avatarHash) {
                vendorAvatar = getImageUrl(avatarHash);
              }
            }
          } catch {
            // 获取 profile 失败时使用默认值
            console.warn('Failed to fetch vendor profile for:', vendorPeerID);
          }
        }

        const orderDetailsData: OrderDetails = {
          orderID: contract?.OrderID || contract?.orderID || orderID,
          status: order?.state || 'AWAITING_PAYMENT',
          items,
          vendor: {
            name: vendorName,
            peerID: vendorPeerID,
            avatar: vendorAvatar,
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
          subtotal: calculatedSubtotal,
          shipping: shippingAmount,
          total: finalTotal,
          currency: items[0]?.currency || urlCurrency || pricingCurrency,
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
              name: urlVendorName || t('order.seller'),
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
            shipping: 0,
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

  // 调解员费用仅在发生纠纷时从卖家收益中扣除，支付时无需计入
  const totalWithFee = orderDetails?.total || 0;

  const nativeSymbol = selectedTokenId || '';
  const canPreviewCryptoAmount = hasExchangeRateForConversion(
    rates,
    orderDetails?.currency,
    selectedTokenId || undefined
  );
  const cryptoAmount = canPreviewCryptoAmount
    ? convertCurrency(totalWithFee, orderDetails?.currency || 'USD', selectedTokenId!)
    : null;
  const cryptoAmountDisplay =
    cryptoAmount !== null && cryptoAmount > 0 ? cryptoAmount.toFixed(6) : undefined;

  // 执行支付（仅加密货币，法币由 FiatPaymentSection 独立处理）
  const handlePayment = useCallback(async () => {
    if (selectedFiatProvider) return;

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

    setPaymentStep('confirming');
    setPaymentError(undefined);
    setSubmittedTxHash(undefined);

    try {
      // 1. 计算支付金额（仅 RWA Token 需要客户端计算，普通订单由后端统一计算）
      let paymentAmountForApi: string | undefined;
      if (orderDetails?.isRwaToken) {
        const totalInFiat = orderDetails.total;
        const isDAI = selectedTokenId.toUpperCase().includes('DAI');
        const stableCoinDivisibility = isDAI ? 18 : 6;
        paymentAmountForApi = String(
          Math.round(totalInFiat * Math.pow(10, stableCoinDivisibility))
        );
      }

      // 2. 获取钱包地址（UTXO 链不需要前端钱包地址）
      let payerAddress: string | undefined;
      if (!isUtxoPayment) {
        if (isTronPayment) {
          payerAddress = tronWallet.address ?? undefined;
        } else {
          const signer = await getSigner();
          payerAddress = signer ? await signer.getAddress() : undefined;
        }
      }

      // 3. 获取支付指令（传入金额、付款地址和仲裁人）
      const moderatorPeerID =
        paymentProtectionEnabled && paymentModerator?.peerID ? paymentModerator.peerID : undefined;

      const response = await ordersApi.getPaymentInstructions({
        orderId: orderID!,
        coin: selectedPaymentCoin,
        payerAddress,
        refundAddress: payerAddress,
        moderator: moderatorPeerID,
      });

      // 4. Use backend-computed amount for ERC20 approval (non-RWA orders)
      if (!orderDetails?.isRwaToken && response.paymentData?.amount) {
        paymentAmountForApi = response.paymentData.amount;
      }

      // 5. 检查是否为地址监听支付（UTXO: BTC/LTC/BCH/ZEC, Safe: EVM address-monitored）
      if (
        response.paymentType === 'external_wallet' ||
        response.paymentType === 'safe_address_monitored' ||
        isUtxoPayment
      ) {
        const addr = response.paymentAddress || response.paymentData?.payerAddress || '';
        const tokenInfo = selectedTokenId ? getTokenById(selectedTokenId) : null;
        setExternalWalletInfo({
          paymentAddress: addr,
          paymentURI: response.paymentURI,
          amount: response.amount || response.paymentData?.amount || '0',
          coin: selectedTokenId || response.coin || selectedPaymentCoin,
          decimals: tokenInfo?.decimals ?? 8,
          qrCodeData: response.qrCodeData,
          expiresAt: response.expiresAt,
          orderID: orderID!,
        });
        setPaymentStep('idle');
        return;
      }

      // 6. client_signed 路径：需要钱包连接和支付指令
      if (!isConnected) {
        toast({
          title: t('payment.connectWalletFirst'),
          variant: 'destructive',
        });
        setPaymentStep('idle');
        return;
      }

      if (!response.instructions) {
        throw new Error(t('payment.noPaymentInstructions'));
      }

      const { to, data, value } = response.instructions;

      if (!to) {
        throw new Error(t('payment.noPaymentAddress'));
      }

      let txResult;

      if (isTronPayment) {
        // ── TRON 支付路径 ──
        const tronWeb = tronWallet.getTronWeb();
        if (!tronWeb) {
          throw new Error(t('payment.signerNotAvailable'));
        }

        const executor = getPaymentExecutor('TRON', selectedPaymentCoin);
        if (!executor) {
          throw new Error(t('payment.providerNotAvailable'));
        }

        const initOk = await executor.initialize(tronWeb);
        if (!initOk) {
          throw new Error(t('payment.providerNotAvailable'));
        }

        const { paymentData } = response;
        txResult = await executor.executeContractPayment(response.instructions, {
          tokenAddress: paymentData?.paymentTokenAddress,
          contractAddress: paymentData?.contractAddress || to,
          amount: paymentAmountForApi ?? '0',
        });
      } else {
        // ── EVM 支付路径 ──
        const signer = await getSigner();
        if (!signer) {
          throw new Error(t('payment.signerNotAvailable'));
        }

        const transactionService = getTransactionService();
        const initResult = await transactionService.initializeWithSigner(signer);
        if (!initResult) {
          throw new Error(t('payment.providerNotAvailable'));
        }

        const { paymentData } = response;
        const paymentTokenAddress = paymentData?.paymentTokenAddress;
        const contractAddress = paymentData?.contractAddress || to;
        const paymentAmount = paymentAmountForApi;

        txResult = await transactionService.executeContractPayment(
          paymentTokenAddress,
          contractAddress,
          paymentAmount?.toString() || '0',
          { to, data, value: value || '0' }
        );
      }

      if (!txResult.success) {
        throw new Error(txResult.error || t('payment.transactionFailed'));
      }

      const txHash = txResult.transactionHash!;
      setSubmittedTxHash(txHash);
      setPaymentStep('submitted');

      // 7. 通知后端支付完成
      setPaymentStep('completing');
      try {
        const { paymentData: pd } = response;
        if (pd) {
          const submitData = {
            ...pd,
            transactionID: txHash,
            timestamp: new Date().toISOString(),
            ...(txResult.blockNumber ? { blockHeight: txResult.blockNumber } : {}),
          };
          await ordersApi.submitPayment(submitData);
        }
      } catch {
        // 交易已上链，后端通知失败不影响支付结果
      }

      // 8. 支付成功，跳转到订单确认页
      haptic.success();
      setPaymentStep('success');
      await new Promise(resolve => setTimeout(resolve, 1200));
      router.push(buildConfirmationUrl(orderDetails));
    } catch (error) {
      console.error('[Payment] Payment failed:', error);

      const msg = (error as Error).message || '';
      const isCancelled =
        msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled');

      if (!isCancelled) haptic.error();
      setPaymentError(isCancelled ? t('payment.userCancelledTransaction') : msg);
      setPaymentStep('failed');
    }
  }, [
    orderDetails,
    orderID,
    selectedTokenId,
    selectedPaymentCoin,
    selectedFiatProvider,
    paymentProtectionEnabled,
    paymentModerator,
    isConnected,
    isTronPayment,
    isUtxoPayment,
    tronWallet,
    getSigner,
    router,
    t,
    toast,
    haptic,
  ]);

  // Error state
  if (error && !isLoadingOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MobilePageHeader title={t('payment.title')} />
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
              <Button onClick={() => router.back()}>{t('common.back')}</Button>
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
      <MobilePageHeader title={t('payment.title')} />

      <main className="py-4 sm:py-8 pb-24 sm:pb-8">
        <Container size="xl">
          {/* Desktop Page Header */}
          <h1 className="hidden lg:block text-2xl font-bold text-foreground mb-8">
            {t('payment.title')}
          </h1>

          <CheckoutProgressBar currentStep="payment" className="mb-6 sm:mb-8" />

          {/* Payment window countdown — hidden when ExternalWalletPayment is shown (it has its own countdown) */}
          {(paymentTimeRemaining || paymentExpired) && !externalWalletInfo && (
            <div
              className={`mb-4 sm:mb-6 p-3 rounded-lg border text-center ${
                paymentExpired
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-warning/8 border-warning/20'
              }`}
            >
              <p
                className={`text-xs ${paymentExpired ? 'text-destructive' : 'text-muted-foreground'} mb-0.5`}
              >
                {paymentExpired
                  ? t('payment.paymentWindowExpired')
                  : t('payment.paymentWindowRemaining')}
              </p>
              {paymentTimeRemaining && (
                <p className="text-xl font-mono font-bold text-warning">{paymentTimeRemaining}</p>
              )}
            </div>
          )}

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
                      router.push(buildConfirmationUrl(orderDetails));
                    }}
                    onCancel={() => router.back()}
                  />
                ) : (
                  <>
                    {externalWalletInfo ? (
                      <ExternalWalletPayment
                        paymentInfo={externalWalletInfo}
                        tokenId={selectedTokenId || undefined}
                        onRefresh={() => {
                          setExternalWalletInfo(null);
                          handlePayment();
                        }}
                        onClose={() => {
                          setExternalWalletInfo(null);
                          router.push(`/orders/${orderDetails.orderID}`);
                        }}
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
                              selectedFiatProvider={selectedFiatProvider}
                              onEdit={() => openPaymentSelector('/payment?orderID=' + orderID)}
                            />
                          </CardContent>
                        </Card>

                        {/* Fiat Payment Form (Stripe / PayPal) */}
                        {selectedFiatProvider && (
                          <Card>
                            <CardContent className="p-4 sm:p-6">
                              <FiatPaymentSection
                                providerID={selectedFiatProvider}
                                vendorPeerID={orderDetails.vendor.peerID}
                                orderID={orderDetails.orderID}
                                amount={toMinimalUnit(orderDetails.total, orderDetails.currency)}
                                currency={orderDetails.currency}
                                description={orderDetails.items[0]?.title}
                                returnUrl={buildConfirmationUrl(orderDetails, {
                                  providerID: selectedFiatProvider,
                                  amount: toMinimalUnit(orderDetails.total, orderDetails.currency),
                                })}
                                onPaymentSuccess={async (result: FiatPaymentSuccessResult) => {
                                  try {
                                    const submitResult = await ordersApi.submitPayment({
                                      orderID: orderDetails.orderID,
                                      transactionID: result.transactionID,
                                      coin: buildFiatPaymentCoin(
                                        result.providerID,
                                        result.currency
                                      ),
                                      amount: String(result.amount),
                                      timestamp: new Date().toISOString(),
                                      method: 5, // FIAT
                                    });
                                    if (submitResult?.success === false) {
                                      throw new Error(
                                        submitResult.error || 'submit payment failed'
                                      );
                                    }
                                    router.push(
                                      buildConfirmationUrl(orderDetails, {
                                        providerID: result.providerID,
                                        amount: result.amount,
                                      })
                                    );
                                  } catch (err) {
                                    const message =
                                      err instanceof Error ? err.message : t('fiat.genericError');
                                    toast({
                                      title: t('fiat.paymentBeingConfirmed'),
                                      description: message,
                                      variant: 'destructive',
                                    });
                                    router.push(
                                      buildConfirmationUrl(orderDetails, {
                                        providerID: result.providerID,
                                        amount: result.amount,
                                      })
                                    );
                                  }
                                }}
                                onPaymentError={msg => {
                                  toast({
                                    title: t('fiat.genericError'),
                                    description: msg,
                                    variant: 'destructive',
                                  });
                                }}
                              />
                            </CardContent>
                          </Card>
                        )}

                        {/* Payment Protection (crypto only) */}
                        {!selectedFiatProvider && (
                          <PaymentProtectionCard
                            enabled={paymentProtectionEnabled}
                            onEnabledChange={setPaymentProtectionEnabled}
                            selectedModerator={paymentModerator}
                            onChangeModerator={() =>
                              openModeratorSelector('/payment?orderID=' + orderID)
                            }
                            protectionDays={45}
                          />
                        )}
                      </>
                    )}
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
                            {t('payment.subtotal')}
                          </span>
                          <span className="font-medium text-foreground text-xs sm:text-sm">
                            {renderPairedPrice(orderDetails.subtotal, orderDetails.currency, {
                              isMinimalUnit: false,
                            })}
                          </span>
                        </HStack>

                        {orderDetails.shipping > 0 && (
                          <HStack justify="between">
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {t('payment.shipping')}
                            </span>
                            <span className="font-medium text-foreground text-xs sm:text-sm">
                              {renderPairedPrice(orderDetails.shipping, orderDetails.currency, {
                                isMinimalUnit: false,
                              })}
                            </span>
                          </HStack>
                        )}

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
                          {externalWalletInfo ? (
                            <p className="text-xs text-muted-foreground">
                              ={' '}
                              {formatCryptoAmountForSummary(
                                externalWalletInfo.amount,
                                externalWalletInfo.decimals ?? 8
                              )}{' '}
                              {nativeSymbol.toUpperCase()}
                            </p>
                          ) : selectedTokenId && cryptoAmountDisplay ? (
                            <p className="text-xs text-muted-foreground">
                              ≈ {cryptoAmountDisplay} {nativeSymbol}
                              {secondsAgo !== null && (
                                <span className="ml-1.5 opacity-60">
                                  ({t('payment.rateUpdated', { seconds: secondsAgo })})
                                </span>
                              )}
                            </p>
                          ) : null}
                        </div>
                      </HStack>

                      {/* TRON Gas Hint */}
                      {isTronPayment && (
                        <div className="mb-3">
                          <TronGasHint trxBalance={tronWallet.trxBalance} />
                        </div>
                      )}

                      {/* Pay Button - Desktop (crypto only) */}
                      {selectedFiatProvider ? (
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">{t('fiat.sectionTitle')}</p>
                        </div>
                      ) : externalWalletInfo ? (
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">
                            {t('payment.waitingForPayment')}
                          </p>
                        </div>
                      ) : (
                        <Button
                          className="w-full touch-feedback hidden sm:flex"
                          size="default"
                          onClick={handlePayment}
                          disabled={
                            isProcessing ||
                            isConnecting ||
                            paymentExpired ||
                            !selectedTokenId ||
                            (isConnected && paymentProtectionEnabled && !paymentModerator)
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
                          ) : isUtxoPayment ? (
                            t('payment.getPaymentInfo')
                          ) : cryptoAmountDisplay ? (
                            `${t('payment.pay')} ${cryptoAmountDisplay} ${nativeSymbol}`
                          ) : (
                            t('payment.pay')
                          )}
                        </Button>
                      )}

                      {/* Warnings */}
                      {!selectedTokenId && !selectedFiatProvider && (
                        <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-warning/8 border border-warning/20 rounded-md sm:rounded-lg">
                          <p className="text-xs sm:text-sm text-warning">
                            {t('payment.selectPaymentMethodWarning')}
                          </p>
                        </div>
                      )}
                      {!selectedFiatProvider && paymentProtectionEnabled && !paymentModerator && (
                        <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-warning/8 border border-warning/20 rounded-md sm:rounded-lg">
                          <p className="text-xs sm:text-sm text-warning">
                            {t('payment.selectModeratorWarning')}
                          </p>
                        </div>
                      )}

                      {/* Security Note */}
                      <div className="mt-3 sm:mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
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

      {/* Mobile Bottom Bar (crypto only, fiat uses FiatPaymentSection) */}
      {orderDetails && !orderDetails.isRwaToken && !selectedFiatProvider && !externalWalletInfo && (
        <CheckoutBottomBar
          totalAmount={totalWithFee}
          currency={orderDetails.currency}
          cryptoAmount={cryptoAmountDisplay}
          cryptoCurrency={nativeSymbol}
          paymentMethod={selectedTokenId || undefined}
          onPay={handlePayment}
          onConnect={handlePayment}
          isLoading={isProcessing}
          isConnected={true}
          isConnecting={isConnecting}
          disabled={
            paymentExpired || !selectedTokenId || (paymentProtectionEnabled && !paymentModerator)
          }
        />
      )}

      <TransactionOverlay
        step={paymentStep}
        txHash={submittedTxHash}
        tokenId={selectedTokenId || undefined}
        errorMessage={paymentError}
        onRetry={() => {
          setPaymentStep('idle');
          setPaymentError(undefined);
        }}
        onClose={() => {
          setPaymentStep('idle');
          setPaymentError(undefined);
        }}
      />
    </div>
  );
}
