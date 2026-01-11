'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import {
  useProductGroups,
  useUserStore,
  getCasdoorUserId,
  dataService,
  useI18n,
  type ProductGroupItem,
  type ProductListItem,
} from '@mobazha/core';
import {
  Loader2,
  ChevronLeft,
  Plus,
  Trash2,
  Package,
  Edit2,
  Save,
  X,
  Search,
  Check,
} from 'lucide-react';

export default function ProductGroupDetailPage() {
  const params = useParams();
  const groupId = parseInt(params.groupId as string);
  const { t } = useI18n();

  const { profile, isAuthenticated } = useUserStore();
  const ownerPeerID = profile?.peerID || '';

  // 产品组使用 Casdoor userID
  const casdoorUserId = getCasdoorUserId();
  const userID = casdoorUserId || ownerPeerID;

  const { groups, loadGroups, updateGroup, loadItems, addItem, removeItem } = useProductGroups({
    userID,
    autoLoad: false,
  });

  const [items, setItems] = useState<ProductGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // 添加商品弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [myListings, setMyListings] = useState<ProductListItem[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [addingProducts, setAddingProducts] = useState(false);

  // 删除确认
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);

  // 获取当前产品组
  const currentGroup = groups.find(g => g.id === groupId);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !userID || isNaN(groupId)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await loadGroups(userID);
        const groupItems = await loadItems(groupId);
        setItems(groupItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, userID, groupId, loadGroups, loadItems]);

  // 初始化编辑状态
  useEffect(() => {
    if (currentGroup) {
      setEditName(currentGroup.name);
      setEditDescription(currentGroup.description || '');
    }
  }, [currentGroup]);

  // 保存编辑
  const handleSave = useCallback(async () => {
    if (!currentGroup || !editName.trim()) return;

    setSaving(true);
    try {
      await updateGroup(groupId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [currentGroup, editName, editDescription, groupId, updateGroup]);

  // 加载我的商品列表
  const loadMyListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const listings = await dataService.products.getMyListings();
      // 过滤掉已在组内的商品
      const existingSlugs = items.map(item => item.listingSlug);
      const availableListings = listings.filter(
        (listing: ProductListItem) => !existingSlugs.includes(listing.slug)
      );
      setMyListings(availableListings);
    } catch (err) {
      console.error('Load listings error:', err);
    } finally {
      setLoadingListings(false);
    }
  }, [items]);

  // 打开添加弹窗
  const handleOpenAddModal = useCallback(() => {
    setShowAddModal(true);
    setSelectedSlugs([]);
    setSearchQuery('');
    loadMyListings();
  }, [loadMyListings]);

  // 切换商品选择
  const toggleProductSelection = useCallback((slug: string) => {
    setSelectedSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  }, []);

  // 添加选中的商品
  const handleAddProducts = useCallback(async () => {
    if (selectedSlugs.length === 0 || !ownerPeerID) return;

    setAddingProducts(true);
    try {
      for (const slug of selectedSlugs) {
        await addItem(groupId, slug, ownerPeerID);
      }
      // 刷新商品列表
      const groupItems = await loadItems(groupId);
      setItems(groupItems);
      setShowAddModal(false);
      setSelectedSlugs([]);
    } catch (err) {
      console.error('Add products error:', err);
    } finally {
      setAddingProducts(false);
    }
  }, [selectedSlugs, ownerPeerID, groupId, addItem, loadItems]);

  // 移除商品
  const handleRemoveProduct = useCallback(
    async (slug: string) => {
      const success = await removeItem(groupId, slug);
      if (success) {
        setItems(prev => prev.filter(item => item.listingSlug !== slug));
      }
      setRemovingSlug(null);
    },
    [groupId, removeItem]
  );

  // 过滤商品
  const filteredListings = myListings.filter(
    listing =>
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Container className="py-8">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">产品组不存在</p>
              <Link href="/settings/access-control/product-groups">
                <Button>返回列表</Button>
              </Link>
            </Card>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <Container className="py-8">
          {/* 面包屑导航 */}
          <div className="mb-6">
            <Link
              href="/settings/access-control/product-groups"
              className="flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('settings.accessControl.productGroups')}
            </Link>
          </div>

          {/* 产品组信息 */}
          <Card className="p-6 mb-6">
            {isEditing ? (
              <VStack gap="md">
                <div>
                  <label className="text-sm font-medium mb-1 block">名称</label>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="产品组名称"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">描述</label>
                  <Input
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="产品组描述（可选）"
                  />
                </div>
                <HStack gap="sm">
                  <Button onClick={handleSave} disabled={saving || !editName.trim()}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    保存
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    取消
                  </Button>
                </HStack>
              </VStack>
            ) : (
              <HStack justify="between" align="start">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{currentGroup.name}</h1>
                  {currentGroup.description && (
                    <p className="text-muted-foreground">{currentGroup.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {items.length} 件商品
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  编辑
                </Button>
              </HStack>
            )}
          </Card>

          {/* 快捷操作 */}
          <div className="mb-6">
            <Link href={`/settings/access-control/product-groups/${groupId}/authorization`}>
              <Button variant="outline">
                {t('settings.accessControl.configureAccess')} →
              </Button>
            </Link>
          </div>

          {/* 商品列表 */}
          <Card className="p-6">
            <HStack justify="between" align="center" className="mb-4">
              <h2 className="text-lg font-semibold">商品列表</h2>
              <Button onClick={handleOpenAddModal} disabled={!isAuthenticated}>
                <Plus className="w-4 h-4 mr-2" />
                添加商品
              </Button>
            </HStack>

            {error && (
              <div className="text-red-500 text-sm mb-4">{error}</div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">暂无商品</p>
                <Button onClick={handleOpenAddModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加第一个商品
                </Button>
              </div>
            ) : (
              <VStack gap="sm">
                {items.map(item => (
                  <div
                    key={`${item.id}-${item.listingSlug}`}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <HStack gap="md" align="center">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.listingSlug}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.peerID?.substring(0, 20)}...
                        </p>
                      </div>
                    </HStack>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemovingSlug(item.listingSlug)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </VStack>
            )}
          </Card>
        </Container>
      </main>

      <Footer />

      {/* 添加商品弹窗 */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>添加商品到产品组</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 搜索框 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索商品..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 商品列表 */}
            <div className="flex-1 overflow-y-auto">
              {loadingListings ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {myListings.length === 0
                      ? '没有可添加的商品'
                      : '没有匹配的商品'}
                  </p>
                </div>
              ) : (
                <VStack gap="sm">
                  {filteredListings.map(listing => {
                    const isSelected = selectedSlugs.includes(listing.slug);
                    return (
                      <div
                        key={listing.slug}
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleProductSelection(listing.slug)}
                      >
                        <HStack gap="md" align="center">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {listing.thumbnail?.medium ? (
                              <img
                                src={listing.thumbnail.medium}
                                alt={listing.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{listing.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {listing.slug}
                            </p>
                          </div>
                        </HStack>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </div>
                    );
                  })}
                </VStack>
              )}
            </div>

            {/* 底部操作 */}
            <div className="pt-4 border-t mt-4">
              <HStack justify="between" align="center">
                <span className="text-sm text-muted-foreground">
                  已选择 {selectedSlugs.length} 件商品
                </span>
                <HStack gap="sm">
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>
                    取消
                  </Button>
                  <Button
                    onClick={handleAddProducts}
                    disabled={selectedSlugs.length === 0 || addingProducts}
                  >
                    {addingProducts ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    添加
                  </Button>
                </HStack>
              </HStack>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!removingSlug} onOpenChange={() => setRemovingSlug(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从产品组中移除商品 "{removingSlug}" 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removingSlug && handleRemoveProduct(removingSlug)}
            >
              移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
