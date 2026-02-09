'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { useToast } from '@/components/ui/use-toast';

// Types
interface Application {
  id: string;
  applicantName: string;
  applicantAvatar: string;
  message: string;
  productCount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface PendingProduct {
  id: string;
  title: string;
  image: string;
  price: number;
  sellerName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: 'owner' | 'admin' | 'moderator' | 'seller' | 'member';
  joinedAt: string;
  productCount?: number;
}

// Mock data
const mockApplications: Application[] = [
  {
    id: 'app1',
    applicantName: 'NewSeller123',
    applicantAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=new1',
    message: 'I want to sell electronics and gadgets in this marketplace.',
    productCount: 5,
    status: 'pending',
    createdAt: '2024-01-20T10:00:00',
  },
  {
    id: 'app2',
    applicantName: 'TechDeals',
    applicantAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
    message: 'Professional seller with experience in computer hardware.',
    productCount: 12,
    status: 'pending',
    createdAt: '2024-01-19T15:30:00',
  },
];

const mockPendingProducts: PendingProduct[] = [
  {
    id: 'pp1',
    title: 'Gaming Mouse RGB',
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=200&h=200&fit=crop',
    price: 79.99,
    sellerName: 'GamerGear',
    status: 'pending',
    createdAt: '2024-01-20T12:00:00',
  },
  {
    id: 'pp2',
    title: 'USB-C Hub 7-in-1',
    image: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e8?w=200&h=200&fit=crop',
    price: 49.99,
    sellerName: 'TechPro',
    status: 'pending',
    createdAt: '2024-01-20T11:30:00',
  },
];

const mockMembers: Member[] = [
  {
    id: 'm1',
    name: 'TechAdmin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    role: 'owner',
    joinedAt: '2023-01-01',
  },
  {
    id: 'm2',
    name: 'ModHelper',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mod',
    role: 'moderator',
    joinedAt: '2023-03-15',
  },
  {
    id: 'm3',
    name: 'AudioPro',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=audio',
    role: 'seller',
    joinedAt: '2023-06-15',
    productCount: 45,
  },
  {
    id: 'm4',
    name: 'WatchWorld',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=watch',
    role: 'seller',
    joinedAt: '2023-07-20',
    productCount: 32,
  },
];

export default function MarketplaceAdminPage() {
  const params = useParams();
  const { t } = useI18n();
  const { toast } = useToast();
  const slug = params.slug as string;

  const [activeTab, setActiveTab] = useState<'applications' | 'products' | 'members' | 'settings'>(
    'applications'
  );
  const [applications, setApplications] = useState(mockApplications);
  const [pendingProducts, setPendingProducts] = useState(mockPendingProducts);

  const handleReviewApplication = (appId: string, approved: boolean) => {
    setApplications(prev =>
      prev.map(app =>
        app.id === appId ? { ...app, status: approved ? 'approved' : 'rejected' } : app
      )
    );
    toast({
      title: approved
        ? t('marketplace.admin.applicationApproved')
        : t('marketplace.admin.applicationRejected'),
      variant: approved ? 'success' : 'default',
    });
  };

  const handleReviewProduct = (productId: string, approved: boolean) => {
    setPendingProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, status: approved ? 'approved' : 'rejected' } : p))
    );
    toast({
      title: approved
        ? t('marketplace.admin.productApproved')
        : t('marketplace.admin.productRejected'),
      variant: approved ? 'success' : 'default',
    });
  };

  const pendingApplicationsCount = applications.filter(a => a.status === 'pending').length;
  const pendingProductsCount = pendingProducts.filter(p => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="xl">
          {/* Back Link */}
          <Link
            href={`/marketplace/${slug}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Marketplace
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Marketplace Admin</h1>
            <p className="text-muted-foreground">
              Manage sellers, products, and marketplace settings
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <nav className="p-2">
                  {[
                    {
                      id: 'applications',
                      label: 'Seller Applications',
                      count: pendingApplicationsCount,
                    },
                    { id: 'products', label: 'Product Approvals', count: pendingProductsCount },
                    { id: 'members', label: 'Members', count: mockMembers.length },
                    { id: 'settings', label: 'Settings' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as typeof activeTab)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === item.id
                          ? 'bg-primary/8 text-primary'
                          : 'text-muted-foreground hover:bg-surface-hover'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            activeTab === item.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Applications Tab */}
              {activeTab === 'applications' && (
                <Card>
                  <h2 className="text-xl font-bold text-foreground mb-6">Seller Applications</h2>

                  {applications.filter(a => a.status === 'pending').length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No pending applications</p>
                    </div>
                  ) : (
                    <VStack gap="lg">
                      {applications
                        .filter(a => a.status === 'pending')
                        .map(app => (
                          <div key={app.id} className="p-4 border border-border rounded-lg">
                            <HStack justify="between" align="start" className="mb-4">
                              <HStack gap="md" align="center">
                                <img
                                  src={app.applicantAvatar}
                                  alt={app.applicantName}
                                  className="w-12 h-12 rounded-full bg-muted"
                                />
                                <div>
                                  <h3 className="font-semibold text-foreground">
                                    {app.applicantName}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {app.productCount} products •{' '}
                                    {new Date(app.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </HStack>
                              <HStack gap="sm">
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewApplication(app.id, true)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReviewApplication(app.id, false)}
                                >
                                  Reject
                                </Button>
                              </HStack>
                            </HStack>
                            <p className="text-muted-foreground">{app.message}</p>
                          </div>
                        ))}
                    </VStack>
                  )}
                </Card>
              )}

              {/* Products Tab */}
              {activeTab === 'products' && (
                <Card>
                  <h2 className="text-xl font-bold text-foreground mb-6">Product Approvals</h2>

                  {pendingProducts.filter(p => p.status === 'pending').length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No pending products</p>
                    </div>
                  ) : (
                    <VStack gap="md">
                      {pendingProducts
                        .filter(p => p.status === 'pending')
                        .map(product => (
                          <div key={product.id} className="p-4 border border-border rounded-lg">
                            <HStack justify="between" align="center">
                              <HStack gap="md" align="center">
                                <img
                                  src={product.image}
                                  alt={product.title}
                                  className="w-16 h-16 rounded-lg object-cover bg-muted"
                                />
                                <div>
                                  <h3 className="font-semibold text-foreground">{product.title}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    by {product.sellerName} • ${product.price}
                                  </p>
                                </div>
                              </HStack>
                              <HStack gap="sm">
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewProduct(product.id, true)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReviewProduct(product.id, false)}
                                >
                                  Reject
                                </Button>
                              </HStack>
                            </HStack>
                          </div>
                        ))}
                    </VStack>
                  )}
                </Card>
              )}

              {/* Members Tab */}
              {activeTab === 'members' && (
                <Card>
                  <HStack justify="between" align="center" className="mb-6">
                    <h2 className="text-xl font-bold text-foreground">Members</h2>
                    <Input
                      placeholder={t('marketplace.admin.searchPlaceholder')}
                      aria-label="Search members"
                      className="w-64"
                    />
                  </HStack>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Member
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Role
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Products
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Joined
                          </th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockMembers.map(member => (
                          <tr key={member.id} className="border-b border-border">
                            <td className="py-3 px-4">
                              <HStack gap="md" align="center">
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="w-10 h-10 rounded-full bg-muted"
                                />
                                <span className="font-medium text-foreground">{member.name}</span>
                              </HStack>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 text-xs rounded-full capitalize ${
                                  member.role === 'owner'
                                    ? 'bg-primary/15 text-primary'
                                    : member.role === 'admin'
                                      ? 'bg-info/15 text-info'
                                      : member.role === 'seller'
                                        ? 'bg-success/15 text-success'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {member.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {member.productCount ?? '-'}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(member.joinedAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button size="sm" variant="ghost">
                                Manage
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <VStack gap="lg">
                  <Card>
                    <h2 className="text-xl font-bold text-foreground mb-6">General Settings</h2>

                    <VStack gap="lg">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Marketplace Name
                        </label>
                        <Input defaultValue="Tech Gadgets Hub" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Description
                        </label>
                        <textarea
                          rows={4}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          defaultValue="Your one-stop shop for the latest tech gadgets..."
                        />
                      </div>

                      <Button>Save Changes</Button>
                    </VStack>
                  </Card>

                  <Card>
                    <h2 className="text-xl font-bold text-foreground mb-6">Approval Settings</h2>

                    <VStack gap="md">
                      <label className="flex items-center justify-between">
                        <span className="text-muted-foreground">Require seller approval</span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-muted-foreground">Require product approval</span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-muted-foreground">Allow public join</span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                        />
                      </label>
                    </VStack>
                  </Card>

                  <Card className="border-destructive/20">
                    <h2 className="text-xl font-bold text-destructive mb-4">Danger Zone</h2>
                    <p className="text-muted-foreground mb-4">
                      Permanently delete this marketplace. This action cannot be undone.
                    </p>
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/8"
                    >
                      Delete Marketplace
                    </Button>
                  </Card>
                </VStack>
              )}
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
