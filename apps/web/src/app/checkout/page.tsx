'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@mobazha/ui';
import { Button, Card } from '@mobazha/ui';
import { useWallet, ChainId, getChainInfo, getMainnetChains } from '@mobazha/core';

// Types
interface ShippingAddress {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
}

interface CheckoutItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  vendor: {
    name: string;
    peerID: string;
  };
}

interface Moderator {
  id: string;
  name: string;
  avatar: string;
  fee: number; // 百分比
  rating: number;
  verified: boolean;
}

// Mock data
const mockAddresses: ShippingAddress[] = [
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

const mockModerators: Moderator[] = [
  {
    id: 'mod1',
    name: 'TrustGuard',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=mod1',
    fee: 1,
    rating: 4.9,
    verified: true,
  },
  {
    id: 'mod2',
    name: 'SafeEscrow',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=mod2',
    fee: 0.5,
    rating: 4.7,
    verified: true,
  },
  {
    id: 'mod3',
    name: 'CryptoMediator',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=mod3',
    fee: 1.5,
    rating: 4.8,
    verified: false,
  },
];

const mockItems: CheckoutItem[] = [
  {
    id: '1',
    title: 'Premium Wireless Headphones with Active Noise Cancellation',
    price: 299.99,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
    vendor: { name: 'TechGear Store', peerID: 'QmVendor123' },
  },
  {
    id: '2',
    title: 'Smart Watch Pro - Health & Fitness Tracker',
    price: 449.99,
    quantity: 2,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop',
    vendor: { name: 'TechGear Store', peerID: 'QmVendor123' },
  },
];

// 获取链图标
function getChainIcon(chainId: ChainId): string {
  const icons: Record<number, string> = {
    [ChainId.ETHEREUM]: '⟠',
    [ChainId.BSC]: '⬡',
    [ChainId.POLYGON]: '⬡',
    [ChainId.ARBITRUM]: '◈',
    [ChainId.OPTIMISM]: '◎',
    [ChainId.AVALANCHE]: '◆',
  };
  return icons[chainId] || '○';
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isConnected, isConnecting, walletInfo, connect, disconnect, switchChain } = useWallet();

  const [selectedAddress, setSelectedAddress] = useState<string>(
    mockAddresses.find(a => a.isDefault)?.id || ''
  );
  const [selectedChain, setSelectedChain] = useState<ChainId>(ChainId.ETHEREUM);
  const [selectedModerator, setSelectedModerator] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [step, _setStep] = useState<'shipping' | 'payment' | 'confirm'>('shipping');
  // _setStep will be used in future for multi-step checkout
  void _setStep;

  // 获取可用链
  const availableChains = getMainnetChains();

  // 同步钱包链 - 只依赖 walletInfo?.chainId，避免函数引用导致无限循环
  useEffect(() => {
    if (walletInfo?.chainId) {
      setSelectedChain(walletInfo.chainId as ChainId);
    }
  }, [walletInfo?.chainId]);

  // Calculate totals
  const subtotal = mockItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const moderatorFee =
    selectedModerator && mockModerators.find(m => m.id === selectedModerator)?.fee
      ? subtotal * (mockModerators.find(m => m.id === selectedModerator)!.fee / 100)
      : 0;
  const total = subtotal + moderatorFee;

  // 获取当前链信息 - 完整空值检查避免运行时错误
  const currentChainInfo = getChainInfo(selectedChain);
  const nativeSymbol = currentChainInfo?.nativeCurrency?.symbol || 'ETH';

  // Mock exchange rate (实际应从 API 获取)
  const exchangeRate = 2500; // USD per ETH
  const cryptoAmount = total / exchangeRate;

  // 连接钱包
  const handleConnect = useCallback(async () => {
    await connect();
  }, [connect]);

  // 切换链
  const handleSwitchChain = useCallback(
    async (chainId: ChainId) => {
      const success = await switchChain(chainId);
      if (success) {
        setSelectedChain(chainId);
      }
    },
    [switchChain]
  );

  // 处理支付
  const handlePlaceOrder = useCallback(async () => {
    if (!selectedAddress) {
      alert('Please select a shipping address');
      return;
    }

    if (!isConnected) {
      alert('Please connect your wallet');
      return;
    }

    if (!selectedModerator) {
      alert('Please select a moderator for escrow protection');
      return;
    }

    setIsProcessing(true);

    try {
      // TODO: 实际的托管合约调用
      // const escrowService = getEscrowService();
      // const result = await escrowService.createNativeEscrow({
      //   orderId: 'ORD-' + Date.now(),
      //   amount: cryptoAmount.toString(),
      //   seller: 'SELLER_ADDRESS',
      //   moderator: 'MODERATOR_ADDRESS',
      //   releaseTime: 30 * 24 * 60 * 60, // 30 days
      // });

      // Mock order creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Success
      alert('Order placed successfully! Redirecting to order details...');
      router.push('/orders/ORD-NEW');
    } catch (error) {
      alert('Failed to place order: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAddress, selectedModerator, isConnected, router]);

  // 缩短地址显示
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container size="xl">
          {/* Page Header */}
          <HStack gap="md" align="center" className="mb-8">
            <Link
              href="/cart"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Checkout</h1>
          </HStack>

          {/* Progress Steps */}
          <div className="mb-8">
            <HStack justify="center" gap="lg">
              {['shipping', 'payment', 'confirm'].map((s, i) => (
                <HStack key={s} gap="sm" align="center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === s
                        ? 'bg-emerald-500 text-white'
                        : i < ['shipping', 'payment', 'confirm'].indexOf(step)
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-sm capitalize ${step === s ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}
                  >
                    {s}
                  </span>
                  {i < 2 && <div className="w-16 h-0.5 bg-slate-200 dark:bg-slate-700" />}
                </HStack>
              ))}
            </HStack>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Wallet Connection */}
              <Card padding="lg">
                <HStack justify="between" align="center" className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Connect Wallet
                  </h2>
                  {isConnected && (
                    <Button variant="ghost" size="sm" onClick={disconnect}>
                      Disconnect
                    </Button>
                  )}
                </HStack>

                {!isConnected ? (
                  <VStack gap="md" align="center" className="py-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-center max-w-sm">
                      Connect your external wallet (MetaMask, Trust Wallet, etc.) to pay with
                      cryptocurrency
                    </p>
                    <Button onClick={handleConnect} disabled={isConnecting} size="lg">
                      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </Button>
                  </VStack>
                ) : (
                  <VStack gap="md">
                    {/* Connected Wallet Info */}
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <HStack justify="between" align="center">
                        <HStack gap="md" align="center">
                          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                            {walletInfo?.provider?.[0] || 'W'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {walletInfo?.provider || 'Wallet'}
                            </p>
                            <p className="text-sm text-slate-500 font-mono">
                              {walletInfo?.address && shortenAddress(walletInfo.address)}
                            </p>
                          </div>
                        </HStack>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {parseFloat(walletInfo?.balance || '0').toFixed(4)} {nativeSymbol}
                          </p>
                        </div>
                      </HStack>
                    </div>

                    {/* Chain Selection */}
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Select Network
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {availableChains.map(chain => (
                          <button
                            key={chain.id}
                            onClick={() => handleSwitchChain(chain.id)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              selectedChain === chain.id
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <HStack gap="sm" align="center">
                              <span className="text-xl">{getChainIcon(chain.id)}</span>
                              <span className="font-medium text-slate-900 dark:text-white text-sm">
                                {chain.shortName}
                              </span>
                            </HStack>
                          </button>
                        ))}
                      </div>
                    </div>
                  </VStack>
                )}
              </Card>

              {/* Shipping Address */}
              <Card padding="lg">
                <HStack justify="between" align="center" className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Shipping Address
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddressForm(!showAddressForm)}
                  >
                    + Add New
                  </Button>
                </HStack>

                <VStack gap="md">
                  {mockAddresses.map(address => (
                    <button
                      key={address.id}
                      onClick={() => setSelectedAddress(address.id)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedAddress === address.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <HStack justify="between" align="start">
                        <div>
                          <HStack gap="sm" align="center" className="mb-1">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {address.name}
                            </span>
                            {address.isDefault && (
                              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </HStack>
                          <p className="text-slate-600 dark:text-slate-400 text-sm">
                            {address.street}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400 text-sm">
                            {address.city}, {address.state} {address.postalCode}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400 text-sm">
                            {address.country}
                          </p>
                          <p className="text-slate-500 text-sm mt-1">{address.phone}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedAddress === address.id
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {selectedAddress === address.id && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </HStack>
                    </button>
                  ))}
                </VStack>
              </Card>

              {/* Moderator Selection */}
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Select Moderator
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                  A moderator helps resolve disputes between buyers and sellers. Choose one to
                  enable escrow protection.
                </p>

                <VStack gap="md">
                  {mockModerators.map(moderator => (
                    <button
                      key={moderator.id}
                      onClick={() => setSelectedModerator(moderator.id)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedModerator === moderator.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <HStack justify="between" align="center">
                        <HStack gap="md" align="center">
                          <img
                            src={moderator.avatar}
                            alt={moderator.name}
                            className="w-12 h-12 rounded-full bg-slate-200"
                          />
                          <div>
                            <HStack gap="sm" align="center">
                              <span className="font-medium text-slate-900 dark:text-white">
                                {moderator.name}
                              </span>
                              {moderator.verified && (
                                <svg
                                  className="w-4 h-4 text-blue-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </HStack>
                            <HStack gap="md" className="mt-1">
                              <span className="text-sm text-slate-500">Fee: {moderator.fee}%</span>
                              <span className="text-sm text-slate-500">⭐ {moderator.rating}</span>
                            </HStack>
                          </div>
                        </HStack>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedModerator === moderator.id
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {selectedModerator === moderator.id && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </HStack>
                    </button>
                  ))}

                  <Link
                    href="/moderators"
                    className="text-sm text-emerald-600 hover:text-emerald-700 text-center"
                  >
                    Browse all moderators →
                  </Link>
                </VStack>
              </Card>

              {/* Order Note */}
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Order Note (Optional)
                </h2>
                <textarea
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Add a note for the seller..."
                />
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card padding="lg" className="sticky top-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Order Summary
                </h2>

                {/* Items */}
                <VStack gap="md" className="mb-6">
                  {mockItems.map(item => (
                    <HStack key={item.id} gap="sm" align="start">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
                          {item.title}
                        </p>
                        <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </HStack>
                  ))}
                </VStack>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                  <HStack justify="between">
                    <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      ${subtotal.toFixed(2)}
                    </span>
                  </HStack>

                  <HStack justify="between">
                    <span className="text-slate-600 dark:text-slate-400">Shipping</span>
                    <span className="font-medium text-emerald-600">Free</span>
                  </HStack>

                  {selectedModerator && (
                    <HStack justify="between">
                      <span className="text-slate-600 dark:text-slate-400">Moderator Fee</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        ${moderatorFee.toFixed(2)}
                      </span>
                    </HStack>
                  )}

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                    <HStack justify="between">
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">
                        Total
                      </span>
                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-600">${total.toFixed(2)}</p>
                        {isConnected && (
                          <p className="text-sm text-slate-500">
                            ≈ {cryptoAmount.toFixed(6)} {nativeSymbol}
                          </p>
                        )}
                      </div>
                    </HStack>
                  </div>
                </div>

                {/* Payment Info */}
                {isConnected && (
                  <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <HStack justify="between" align="center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Pay with</span>
                      <HStack gap="sm" align="center">
                        <span className="text-lg">{getChainIcon(selectedChain)}</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {currentChainInfo?.name}
                        </span>
                      </HStack>
                    </HStack>
                  </div>
                )}

                <Button
                  fullWidth
                  size="lg"
                  className="mt-6"
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || !isConnected || !selectedAddress || !selectedModerator}
                >
                  {isProcessing ? (
                    <HStack gap="sm" align="center" justify="center">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
                      <span>Processing...</span>
                    </HStack>
                  ) : !isConnected ? (
                    'Connect Wallet to Pay'
                  ) : (
                    `Pay ${cryptoAmount.toFixed(6)} ${nativeSymbol}`
                  )}
                </Button>

                {/* Warnings */}
                {!selectedModerator && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Please select a moderator for escrow protection
                    </p>
                  </div>
                )}

                {/* Security Note */}
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>Secure payment with multi-sig escrow protection</span>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
