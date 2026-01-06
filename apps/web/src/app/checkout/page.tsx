'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@mobazha/ui';
import { Button, Card, Avatar } from '@mobazha/ui';

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

interface PaymentMethod {
  type: string;
  name: string;
  icon: string;
  color: string;
  address?: string;
  balance?: number;
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

const paymentMethods: PaymentMethod[] = [
  { type: 'BTC', name: 'Bitcoin', icon: '₿', color: '#F7931A', balance: 0.0523 },
  { type: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627EEA', balance: 1.245 },
  { type: 'USDT', name: 'Tether', icon: '₮', color: '#26A17B', balance: 1500.0 },
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

// Mock exchange rates
const exchangeRates: Record<string, number> = {
  BTC: 43000,
  ETH: 2400,
  USDT: 1,
};

export default function CheckoutPage() {
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState<string>(
    mockAddresses.find(a => a.isDefault)?.id || ''
  );
  const [selectedPayment, setSelectedPayment] = useState<string>('BTC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [orderNote, setOrderNote] = useState('');

  // Calculate totals
  const subtotal = mockItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 0; // Free shipping
  const total = subtotal + shipping;

  // Convert to crypto
  const cryptoAmount = total / exchangeRates[selectedPayment];
  const selectedMethod = paymentMethods.find(m => m.type === selectedPayment);

  const handlePlaceOrder = useCallback(async () => {
    if (!selectedAddress) {
      alert('Please select a shipping address');
      return;
    }

    setIsProcessing(true);

    try {
      // Mock order creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Success
      alert('Order placed successfully! Redirecting to order details...');
      router.push('/orders/ORD-NEW');
    } catch {
      alert('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAddress, router]);

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
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

              {/* Payment Method */}
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Payment Method
                </h2>

                <VStack gap="md">
                  {paymentMethods.map(method => (
                    <button
                      key={method.type}
                      onClick={() => setSelectedPayment(method.type)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedPayment === method.type
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <HStack justify="between" align="center">
                        <HStack gap="md" align="center">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: method.color }}
                          >
                            {method.icon}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {method.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              Balance: {method.balance?.toFixed(4)} {method.type}
                            </p>
                          </div>
                        </HStack>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPayment === method.type
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {selectedPayment === method.type && (
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

                {/* Insufficient balance warning */}
                {selectedMethod &&
                  selectedMethod.balance !== undefined &&
                  cryptoAmount > selectedMethod.balance && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <HStack gap="sm" align="center">
                        <svg
                          className="w-5 h-5 text-amber-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span className="text-amber-700 dark:text-amber-400 text-sm">
                          Insufficient balance. Please deposit more {selectedPayment} to your
                          wallet.
                        </span>
                      </HStack>
                    </div>
                  )}
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

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                    <HStack justify="between">
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">
                        Total
                      </span>
                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-600">${total.toFixed(2)}</p>
                        <p className="text-sm text-slate-500">
                          ≈ {cryptoAmount.toFixed(6)} {selectedPayment}
                        </p>
                      </div>
                    </HStack>
                  </div>
                </div>

                <Button
                  fullWidth
                  size="lg"
                  className="mt-6"
                  onClick={handlePlaceOrder}
                  disabled={
                    isProcessing ||
                    !selectedAddress ||
                    (selectedMethod?.balance !== undefined && cryptoAmount > selectedMethod.balance)
                  }
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
                  ) : (
                    `Pay ${cryptoAmount.toFixed(6)} ${selectedPayment}`
                  )}
                </Button>

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
                  <span>Secure payment with escrow protection</span>
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
