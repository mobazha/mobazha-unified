'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack, Card, Button, Input } from '@mobazha/ui';

// Types
interface ProductForReview {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  seller: {
    id: string;
    peerID: string;
    name: string;
    avatar?: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

// Mock data
const mockProducts: ProductForReview[] = [
  {
    id: 'prod1',
    title: 'Handmade Leather Wallet',
    description: 'Premium quality handcrafted leather wallet with card slots and coin pocket.',
    price: 49.99,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop'],
    category: 'Fashion',
    seller: {
      id: 'seller1',
      peerID: 'QmSeller1',
      name: 'John Crafts',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    },
    status: 'pending',
    submittedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod2',
    title: 'Vintage Camera Collection',
    description: 'Rare vintage Polaroid camera from the 1970s in working condition.',
    price: 199.99,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop'],
    category: 'Electronics',
    seller: {
      id: 'seller2',
      peerID: 'QmSeller2',
      name: 'Vintage Finds',
    },
    status: 'pending',
    submittedAt: '2024-01-14T15:30:00Z',
  },
  {
    id: 'prod3',
    title: 'Organic Honey Set',
    description: 'Set of 3 organic honey jars from local beekeepers.',
    price: 35.0,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop'],
    category: 'Food',
    seller: {
      id: 'seller3',
      peerID: 'QmSeller3',
      name: 'Natural Goods',
    },
    status: 'approved',
    submittedAt: '2024-01-10T09:00:00Z',
    reviewedAt: '2024-01-10T14:00:00Z',
  },
  {
    id: 'prod4',
    title: 'Suspicious Item',
    description: 'This listing has been flagged for review due to policy concerns.',
    price: 999.99,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1633354931133-27b31e6f8b51?w=400&h=400&fit=crop'],
    category: 'Other',
    seller: {
      id: 'seller4',
      peerID: 'QmSeller4',
      name: 'Unknown Seller',
    },
    status: 'flagged',
    submittedAt: '2024-01-13T08:00:00Z',
    reviewNote: 'Flagged for potential policy violation',
  },
];

export default function MarketplaceProductsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [products, setProducts] = useState<ProductForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'flagged'>(
    'pending'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductForReview | null>(null);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setProducts(mockProducts);
      setLoading(false);
    }, 500);
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesFilter = filter === 'all' || product.status === filter;
    const matchesSearch =
      !searchQuery ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.seller.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleApprove = useCallback(async (productId: string, note: string) => {
    setProcessingId(productId);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? {
              ...p,
              status: 'approved' as const,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
            }
          : p
      )
    );
    setProcessingId(null);
    setSelectedProduct(null);
    setReviewNote('');
  }, []);

  const handleReject = useCallback(async (productId: string, note: string) => {
    setProcessingId(productId);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? {
              ...p,
              status: 'rejected' as const,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
            }
          : p
      )
    );
    setProcessingId(null);
    setSelectedProduct(null);
    setReviewNote('');
  }, []);

  const handleFlag = useCallback(async (productId: string, note: string) => {
    setProcessingId(productId);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? {
              ...p,
              status: 'flagged' as const,
              reviewNote: note,
            }
          : p
      )
    );
    setProcessingId(null);
    setSelectedProduct(null);
    setReviewNote('');
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    flagged: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <Container className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container>
          {/* Back Button & Title */}
          <HStack justify="between" align="center" className="mb-6">
            <HStack gap="md" align="center">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
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
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Product Approvals
                </h1>
                <p className="text-slate-500 text-sm">Review and approve product listings</p>
              </div>
            </HStack>
            <Link
              href={`/marketplace/${slug}/admin`}
              className="text-emerald-600 hover:text-emerald-700 text-sm"
            >
              ← Back to Admin
            </Link>
          </HStack>

          {/* Search & Filters */}
          <Card padding="md" className="mb-6">
            <VStack gap="md">
              <Input
                placeholder="Search products or sellers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
              <HStack gap="sm" className="flex-wrap">
                {(['pending', 'approved', 'rejected', 'flagged', 'all'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === status
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    {status === 'pending' && (
                      <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                        {products.filter(p => p.status === 'pending').length}
                      </span>
                    )}
                    {status === 'flagged' && (
                      <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                        {products.filter(p => p.status === 'flagged').length}
                      </span>
                    )}
                  </button>
                ))}
              </HStack>
            </VStack>
          </Card>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <Card padding="lg" className="text-center">
              <p className="text-slate-500">No {filter !== 'all' ? filter : ''} products found.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <Card key={product.id} padding="none" hoverable className="overflow-hidden">
                  {/* Product Image */}
                  <div className="relative aspect-square">
                    <Image
                      src={product.images[0] || '/placeholder.jpg'}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                    <span
                      className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${statusColors[product.status]}`}
                    >
                      {product.status}
                    </span>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {product.title}
                    </h3>
                    <p className="text-lg font-bold text-emerald-600 mt-1">
                      {formatPrice(product.price, product.currency)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Seller Info */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <HStack justify="between" align="center">
                        <div className="text-sm">
                          <p className="text-slate-500">Seller</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {product.seller.name}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">{product.category}</span>
                      </HStack>
                      <p className="text-xs text-slate-400 mt-1">
                        Submitted {formatDate(product.submittedAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    {(product.status === 'pending' || product.status === 'flagged') && (
                      <HStack gap="sm" className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedProduct(product)}
                        >
                          Review
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleApprove(product.id, '')}
                          disabled={processingId === product.id}
                        >
                          Approve
                        </Button>
                      </HStack>
                    )}

                    {product.reviewNote && (
                      <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs text-slate-500">
                        Note: {product.reviewNote}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </main>

      {/* Review Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Review Product
            </h2>

            {/* Product Preview */}
            <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <HStack gap="md" align="start">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={selectedProduct.images[0] || '/placeholder.jpg'}
                    alt={selectedProduct.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {selectedProduct.title}
                  </h3>
                  <p className="text-emerald-600 font-bold">
                    {formatPrice(selectedProduct.price, selectedProduct.currency)}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">By {selectedProduct.seller.name}</p>
                </div>
              </HStack>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Review Note (required for rejection)
              </label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Reason for your decision..."
              />
            </div>

            <HStack gap="sm" justify="end" className="flex-wrap">
              <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFlag(selectedProduct.id, reviewNote)}
                disabled={processingId === selectedProduct.id}
                className="border-orange-500 text-orange-500 hover:bg-orange-50"
              >
                Flag
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReject(selectedProduct.id, reviewNote)}
                disabled={processingId === selectedProduct.id || !reviewNote}
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                Reject
              </Button>
              <Button
                onClick={() => handleApprove(selectedProduct.id, reviewNote)}
                disabled={processingId === selectedProduct.id}
              >
                {processingId === selectedProduct.id ? 'Processing...' : 'Approve'}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}
