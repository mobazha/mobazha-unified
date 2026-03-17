'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import {
  ProductCard,
  ProductCardSkeleton,
  type ProductContractType,
  type RwaTradeMode,
} from '@/components/ProductCard';
import { Container, HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui';
import {
  profileApi,
  productDataService,
  socialApi,
  imagesApi,
  useI18n,
  useUserStore,
  useChatStore,
  getImageUrl,
  useVerifiedModerators,
  useAccessControl,
  stripHtmlTags,
  sanitizeHtml,
  collectionsApi,
  useStorefrontConfigPublic,
  useStoreListings,
  useMyListings,
  usePrefetchProduct,
  queryKeys,
} from '@mobazha/core';
import { useQueryClient } from '@tanstack/react-query';
import type { UserProfile, ProductListItem, Image, Collection } from '@mobazha/core';
import {
  Settings,
  Camera,
  Layers,
  Package,
  Lock,
  ShieldCheck,
  Plus,
  Upload,
  Ban,
  ImageIcon,
  FileText,
} from 'lucide-react';
import { ShareButton } from '@/components/Share';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { useProductModal } from '@/hooks';
import { getProfileWithDedup } from '@/utils/requestDedup';
import {
  RwaTab,
  StoreListingsToolbar,
  type FilterState,
  type CategoryItem,
  defaultFilterState,
  FilterSheet,
  FilterSidebar,
  StoreReviewsTab,
  FollowTab,
  OfflineBanner,
} from '@/components/store';
import { StoreSections } from '@/components/store-sections';
import { BrandedHeroHeader } from '@/components/store-sections/BrandedHeroHeader';
import { SellerTrustBadge } from '@/components/Trust/SellerTrustBadge';

const STORE_PAGE_EXCLUDE_TYPES = new Set(['testimonials', 'store-tabs']);

const defaultStats = {
  followerCount: 0,
  followingCount: 0,
  listingCount: 0,
  ratingCount: 0,
  averageRating: 0,
};

type TabType = 'about' | 'products' | 'rwa' | 'reviews' | 'following' | 'followers';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function StorePage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const { openProduct, isMobile } = useProductModal();
  const { hasVerifiedMod } = useVerifiedModerators();
  const peerId = params.peerId as string;
  const {
    isAuthenticated,
    profile: currentUserProfile,
    updateProfile,
    fetchProfile: refreshCurrentUserProfile,
  } = useUserStore();
  const openChatDrawer = useChatStore(state => state.openDrawer);

  // 判断是否是自己的店铺
  const isOwnStore = isAuthenticated && currentUserProfile?.peerID === peerId;

  // 访问权限检查（仅对私密店铺生效）
  const { accessCheck } = useAccessControl({
    storePeerID: peerId,
    requestorPeerID: currentUserProfile?.peerID || '',
    autoCheck: !isOwnStore && isAuthenticated,
  });

  const { config: storefrontConfig } = useStorefrontConfigPublic(peerId);
  const hasSections = !!storefrontConfig?.sections?.length;
  const hasHeroSection = !!storefrontConfig?.sections?.some(
    s => s.type === 'hero' && s.visible !== false
  );
  const heroMode = hasSections && hasHeroSection ? 'fused' : 'separate';

  const filteredSections = useMemo(() => {
    if (!storefrontConfig) return storefrontConfig;
    const exclude = new Set(STORE_PAGE_EXCLUDE_TYPES);
    if (heroMode === 'fused') exclude.add('hero');
    return {
      ...storefrontConfig,
      sections: storefrontConfig.sections.filter(s => !exclude.has(s.type)),
    };
  }, [storefrontConfig, heroMode]);

  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [isFollowing, setIsFollowing] = useState(false);

  // 当 peerId 变化时重置 activeTab 为默认值
  // 这样从关注列表点击另一个店铺时，不会停留在关注 tab
  useEffect(() => {
    setActiveTab('products');
  }, [peerId]);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlockedUser, setIsBlockedUser] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<UserProfile | null>(null);
  const {
    listings: storeListings,
    isLoading: storeListingsLoading,
    isOffline: storeIsOffline,
  } = useStoreListings(isOwnStore ? null : peerId);
  const { listings: myListings, isLoading: myListingsLoading } = useMyListings();
  const products = isOwnStore ? myListings : storeListings;
  const productsLoading = isOwnStore ? myListingsLoading : storeListingsLoading;
  const isOffline = !isOwnStore && storeIsOffline;
  const prefetchProduct = usePrefetchProduct();
  const queryClient = useQueryClient();
  const [storeCollections, setStoreCollections] = useState<Collection[]>([]);

  // 筛选相关状态
  const [filter, setFilter] = useState<FilterState>(defaultFilterState);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Welcome 弹窗状态
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  // 编辑相关状态
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [headerUploading, setHeaderUploading] = useState(false);
  const [pendingAvatarHashes, setPendingAvatarHashes] = useState<Image | null>(null);
  const [pendingHeaderHashes, setPendingHeaderHashes] = useState<Image | null>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const [previewHeaderUrl, setPreviewHeaderUrl] = useState<string | null>(null);
  const previewAvatarUrlRef = useRef(previewAvatarUrl);
  previewAvatarUrlRef.current = previewAvatarUrl;
  const previewHeaderUrlRef = useRef(previewHeaderUrl);
  previewHeaderUrlRef.current = previewHeaderUrl;
  useEffect(() => {
    return () => {
      if (previewAvatarUrlRef.current) URL.revokeObjectURL(previewAvatarUrlRef.current);
      if (previewHeaderUrlRef.current) URL.revokeObjectURL(previewHeaderUrlRef.current);
    };
  }, []);
  const [cropDialogSrc, setCropDialogSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'avatar' | 'cover' | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    shortDescription: '',
    location: '',
    about: '',
    email: '',
    phoneNumber: '',
    website: '',
  });

  // 商品删除相关状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ slug: string; title: string } | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // 用于跟踪已加载的数据
  const storeLoadedRef = useRef<string | null>(null);
  // 获取店铺数据
  useEffect(() => {
    // 如果已经加载过相同的数据，直接返回
    const loadKey = `${peerId}-${isOwnStore}`;
    if (storeLoadedRef.current === loadKey) return;

    let isCancelled = false;

    const fetchStoreData = async () => {
      if (!peerId) return;

      setIsLoading(true);
      try {
        // 如果是自己的店铺，使用当前用户的 profile
        if (isOwnStore && currentUserProfile) {
          if (!isCancelled) {
            setStore(currentUserProfile);
            storeLoadedRef.current = loadKey;
          }
        } else {
          const profileData = await getProfileWithDedup(peerId, () =>
            profileApi.getProfile(peerId)
          );
          if (!isCancelled) {
            // 无论 profileData 是否为空，都标记为已尝试加载，防止重复请求
            storeLoadedRef.current = loadKey;
            if (profileData) {
              setStore(profileData);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch store profile:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchStoreData();

    return () => {
      isCancelled = true;
    };
  }, [peerId, isOwnStore, currentUserProfile]);

  // 当 store 数据变化时，更新编辑表单
  useEffect(() => {
    if (store && isOwnStore) {
      setEditForm({
        name: store.name || '',
        shortDescription: store.shortDescription || '',
        location: store.location || '',
        about: store.about || '',
        email: store.contactInfo?.email || '',
        phoneNumber: store.contactInfo?.phoneNumber || '',
        website: store.contactInfo?.website || '',
      });
    }
  }, [store, isOwnStore]);

  // 获取店铺集合列表（商品列表通过 useStoreListings / useMyListings 获取）
  useEffect(() => {
    if (!peerId || productsLoading) return;

    let isCancelled = false;
    collectionsApi
      .listPublishedCollections(peerId, 1, 20)
      .then(res => {
        if (!isCancelled) setStoreCollections(res || []);
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [peerId, productsLoading]);

  // 检查是否已关注该店铺（仅当不是自己的店铺时）
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!peerId || !isAuthenticated || isOwnStore) return;

      try {
        const following = await socialApi.isFollowing(peerId);
        setIsFollowing(following);
      } catch (err) {
        console.error('Failed to check follow status:', err);
      }
    };

    checkFollowStatus();
  }, [peerId, isAuthenticated, isOwnStore]);

  // 检查是否已屏蔽该用户（仅当不是自己的店铺时）
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!peerId || !isAuthenticated || isOwnStore) return;

      try {
        const blocked = await socialApi.isBlocked(peerId);
        setIsBlockedUser(blocked);
      } catch (err) {
        console.error('Failed to check block status:', err);
      }
    };

    checkBlockStatus();
  }, [peerId, isAuthenticated, isOwnStore]);

  // 检查是否显示 Welcome 弹窗（仅当是自己的店铺、商品为空、且未关闭过时）
  useEffect(() => {
    if (isOwnStore && !productsLoading && products.length === 0) {
      const dismissed = localStorage.getItem('dismissedStoreWelcome');
      if (!dismissed) {
        setShowWelcomeDialog(true);
      }
    }
  }, [isOwnStore, productsLoading, products.length]);

  // 关闭 Welcome 弹窗
  const handleCloseWelcome = useCallback(() => {
    setShowWelcomeDialog(false);
    localStorage.setItem('dismissedStoreWelcome', 'true');
  }, []);

  // 关注/取消关注处理
  const handleFollowToggle = async () => {
    if (!isAuthenticated || followLoading || isOwnStore) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await socialApi.unfollowUser(peerId);
        setIsFollowing(false);
      } else {
        await socialApi.followUser(peerId);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  // 屏蔽/取消屏蔽处理
  const handleBlockToggle = async () => {
    if (!isAuthenticated || blockLoading || isOwnStore) return;

    setBlockLoading(true);
    try {
      if (isBlockedUser) {
        await socialApi.unblockUser(peerId);
        setIsBlockedUser(false);
      } else {
        await socialApi.blockUser(peerId);
        setIsBlockedUser(true);
      }
    } catch (err) {
      console.error('Failed to toggle block:', err);
    } finally {
      setBlockLoading(false);
    }
  };

  // 筛选后的商品列表
  // 判断商品是否为 RWA 商品（仅检查 contractType）
  const isRwaProduct = useCallback((product: ProductListItem) => {
    return product.contractType?.toUpperCase() === 'RWA_TOKEN';
  }, []);

  // 从非 RWA 商品数据中提取 productType 列表
  const categories = useMemo((): CategoryItem[] => {
    const categoryMap = new Map<string, number>();

    products
      .filter(product => !isRwaProduct(product))
      .forEach(product => {
        if (product.productType) {
          categoryMap.set(product.productType, (categoryMap.get(product.productType) || 0) + 1);
        }
      });

    return Array.from(categoryMap.entries())
      .map(([value, count]) => ({
        value,
        label: value,
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products, isRwaProduct]);

  const productTitles = useMemo(
    () => products.filter(p => !isRwaProduct(p) && p.title).map(p => p.title as string),
    [products, isRwaProduct]
  );

  // 筛选后的商品列表（排除 RWA 商品，RWA 商品显示在数字资产 Tab）
  const filteredProducts = useMemo(() => {
    // 首先过滤掉 RWA 商品
    let result = products.filter(product => !isRwaProduct(product));

    // 搜索过滤（仅按标题搜索）
    if (filter.search.trim()) {
      const searchLower = filter.search.toLowerCase();
      result = result.filter(product => product.title?.toLowerCase().includes(searchLower));
    }

    // 分类过滤（基于 productType）
    if (filter.category !== 'all') {
      result = result.filter(product => product.productType === filter.category);
    }

    // 类型过滤（RWA_TOKEN 已被排除，所以这里的 rwa_token 选项实际上不会匹配任何商品）
    if (filter.type !== 'all') {
      result = result.filter(product => {
        const contractType = product.contractType?.toLowerCase();
        switch (filter.type) {
          case 'physical_good':
            return contractType === 'physical_good';
          case 'digital_good':
            return contractType === 'digital_good';
          case 'service':
            return contractType === 'service';
          default:
            return true;
        }
      });
    }

    // 免运费过滤
    if (filter.freeShipping) {
      result = result.filter(product => product.freeShipping && product.freeShipping.length > 0);
    }

    // 排序
    switch (filter.sortBy) {
      case 'price-asc':
        result.sort((a, b) => (a.price?.amount || 0) - (b.price?.amount || 0));
        break;
      case 'price-desc':
        result.sort((a, b) => (b.price?.amount || 0) - (a.price?.amount || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'newest':
        // 由于 ProductListItem 没有 timestamp，保持原始顺序（通常 API 返回的是最新的在前）
        break;
      default:
        // relevance - 保持原始顺序
        break;
    }

    return result;
  }, [products, filter, isRwaProduct]);

  // 编辑表单变更处理
  const handleEditChange = useCallback((field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const openCropDialog = useCallback(
    (file: File, target: 'avatar' | 'cover') => {
      if (file.size > MAX_IMAGE_SIZE) {
        toast({
          title: t('common.error'),
          description: t('settingsModal.fileTooLarge'),
          variant: 'destructive',
        });
        return;
      }
      const url = URL.createObjectURL(file);
      setCropDialogSrc(url);
      setCropTarget(target);
    },
    [toast, t]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'cover') => {
      const file = e.target.files?.[0];
      if (file) openCropDialog(file, target);
      e.target.value = '';
    },
    [openCropDialog]
  );

  const handleCropComplete = useCallback(
    async (blob: Blob) => {
      const target = cropTarget;
      if (!target) return;

      const localUrl = URL.createObjectURL(blob);
      if (target === 'avatar') {
        if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl);
        setPreviewAvatarUrl(localUrl);
      } else {
        if (previewHeaderUrl) URL.revokeObjectURL(previewHeaderUrl);
        setPreviewHeaderUrl(localUrl);
      }

      if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
      setCropDialogSrc(null);
      setCropTarget(null);

      const file = new File([blob], `${target}.jpg`, { type: 'image/jpeg' });
      let success = false;
      if (target === 'avatar') {
        setAvatarUploading(true);
        try {
          const imageHashes = await imagesApi.uploadAvatarImage(file);
          if (imageHashes) {
            setPendingAvatarHashes(imageHashes);
            success = true;
          }
        } catch (err) {
          console.error('Failed to upload avatar:', err);
        } finally {
          setAvatarUploading(false);
        }
      } else {
        setHeaderUploading(true);
        try {
          const imageHashes = await imagesApi.uploadHeaderImage(file);
          if (imageHashes) {
            setPendingHeaderHashes(imageHashes);
            success = true;
          }
        } catch (err) {
          console.error('Failed to upload header:', err);
        } finally {
          setHeaderUploading(false);
        }
      }

      if (!success) {
        toast({
          title: t('common.error'),
          description: t('settingsModal.uploadFailed'),
          variant: 'destructive',
        });
      }
    },
    [cropTarget, cropDialogSrc, previewAvatarUrl, previewHeaderUrl, toast, t]
  );

  const handleCoverDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleCoverDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as HTMLElement)) return;
    setIsDragOver(false);
  }, []);

  const handleCoverDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        openCropDialog(file, 'cover');
      }
    },
    [openCropDialog]
  );

  // 保存编辑
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const profileData: Record<string, unknown> = {
        name: editForm.name,
        shortDescription: editForm.shortDescription,
        location: editForm.location,
        about: editForm.about,
        contactInfo: {
          email: editForm.email,
          phoneNumber: editForm.phoneNumber,
          website: editForm.website,
        },
      };

      if (pendingAvatarHashes) {
        profileData.avatarHashes = pendingAvatarHashes;
      }

      if (pendingHeaderHashes) {
        profileData.headerHashes = pendingHeaderHashes;
      }

      const success = await updateProfile(profileData);
      if (success) {
        setIsEditing(false);
        setPendingAvatarHashes(null);
        setPendingHeaderHashes(null);
        if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl);
        if (previewHeaderUrl) URL.revokeObjectURL(previewHeaderUrl);
        setPreviewAvatarUrl(null);
        setPreviewHeaderUrl(null);
        await refreshCurrentUserProfile();
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    editForm,
    updateProfile,
    pendingAvatarHashes,
    pendingHeaderHashes,
    previewAvatarUrl,
    previewHeaderUrl,
    refreshCurrentUserProfile,
  ]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    if (store) {
      setEditForm({
        name: store.name || '',
        shortDescription: store.shortDescription || '',
        location: store.location || '',
        about: store.about || '',
        email: store.contactInfo?.email || '',
        phoneNumber: store.contactInfo?.phoneNumber || '',
        website: store.contactInfo?.website || '',
      });
    }
    setPendingAvatarHashes(null);
    setPendingHeaderHashes(null);
    if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl);
    if (previewHeaderUrl) URL.revokeObjectURL(previewHeaderUrl);
    setPreviewAvatarUrl(null);
    setPreviewHeaderUrl(null);
    setIsEditing(false);
  }, [store, previewAvatarUrl, previewHeaderUrl]);

  // 发消息
  const handleMessage = () => {
    // Open chat drawer
    // TODO: 后续可以添加逻辑来自动选择或创建与该用户的聊天房间
    openChatDrawer();
  };

  // 编辑商品
  const handleEditListing = useCallback(
    (slug: string) => {
      router.push(`/listing/edit/${slug}`);
    },
    [router]
  );

  // 克隆商品
  const handleCloneListing = useCallback(
    (slug: string) => {
      router.push(`/listing/new?clone=${slug}`);
    },
    [router]
  );

  // 打开删除确认对话框
  const handleOpenDeleteDialog = useCallback((slug: string, title: string) => {
    setProductToDelete({ slug, title });
    setDeleteDialogOpen(true);
  }, []);

  // 确认删除商品
  const handleConfirmDelete = useCallback(async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      await productDataService.deleteListing(productToDelete.slug);
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast({
        title: t('common.success'),
        description: t('listing.deleteSuccess'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('listing.deleteFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  }, [productToDelete, t, toast]);

  // 获取店铺的统计数据 - 使用实际的 products.length 来保持一致性
  const stats = store?.stats || defaultStats;

  // 分别计算普通商品和 RWA 商品数量（使用统一的 isRwaProduct 辅助函数）
  const { storeListingCount, rwaListingCount } = useMemo(() => {
    let storeCount = 0;
    let rwaCount = 0;

    products.forEach(product => {
      if (isRwaProduct(product)) {
        rwaCount++;
      } else {
        storeCount++;
      }
    });

    return { storeListingCount: storeCount, rwaListingCount: rwaCount };
  }, [products, isRwaProduct]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Skeleton variant="rectangular" height={200} />
        <Container size="xl" className="py-8">
          <HStack gap="lg" align="start">
            <Skeleton variant="circular" width={120} height={120} />
            <VStack gap="sm" className="flex-1">
              <Skeleton variant="text" height={32} width="40%" />
              <Skeleton variant="text" height={20} width="60%" />
            </VStack>
          </HStack>
        </Container>
        <Footer />
      </div>
    );
  }

  // 如果没有找到店铺数据
  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container size="xl" className="py-20">
          <VStack gap="md" align="center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">{t('profile.noProfileData')}</h2>
            <p className="text-muted-foreground">{t('common.error')}</p>
          </VStack>
        </Container>
        <Footer />
      </div>
    );
  }

  // Cross-store image hint: for other stores, pass peerID so the gateway can
  // on-demand fetch from standalone stores (E'+D Level 2.5).
  const storeImageHint = isOwnStore ? undefined : peerId;

  // 获取显示用的头像和封面图（优先本地预览，其次 IPFS hash）
  const displayAvatarUrl =
    previewAvatarUrl ||
    getImageUrl(pendingAvatarHashes?.medium || store.avatarHashes?.medium, storeImageHint);
  const displayHeaderUrl =
    previewHeaderUrl ||
    getImageUrl(pendingHeaderHashes?.large || store.headerHashes?.large, storeImageHint);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {isOffline && <OfflineBanner />}

      <main>
        {heroMode === 'fused' ? (
          /* ── Fused mode: BrandedHeroHeader ── */
          <>
            <BrandedHeroHeader
              store={store}
              peerId={peerId}
              stats={stats}
              isOwnStore={isOwnStore}
              isAuthenticated={isAuthenticated}
              storefrontConfig={storefrontConfig}
              isFollowing={isFollowing}
              followLoading={followLoading}
              onFollowToggle={handleFollowToggle}
              isBlocked={isBlockedUser}
              blockLoading={blockLoading}
              onBlockToggle={handleBlockToggle}
              onMessage={handleMessage}
              onTabChange={tab => setActiveTab(tab as TabType)}
            />

            {/* Private store access notice */}
            {store.private && accessCheck?.hasFullAccess && !isOwnStore && (
              <Container size="xl">
                <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-success/15 text-success text-sm border border-success/20">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>{t('storeAccess.fullAccessGranted')}</span>
                </div>
              </Container>
            )}
          </>
        ) : (
          /* ── Separate mode: original Cover + Profile Card ── */
          <div className="relative">
            {/* Cover Image */}
            <div
              className="h-32 sm:h-48 md:h-64 bg-gradient-to-br from-primary/80 to-primary/60 relative overflow-hidden group"
              onDragOver={isOwnStore ? handleCoverDragOver : undefined}
              onDragLeave={isOwnStore ? handleCoverDragLeave : undefined}
              onDrop={isOwnStore ? handleCoverDrop : undefined}
            >
              {displayHeaderUrl && (
                <img
                  src={displayHeaderUrl}
                  alt={`${store.name || peerId.slice(0, 8)} store header`}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

              {/* Drag overlay */}
              {isOwnStore && isDragOver && (
                <div className="absolute inset-0 bg-primary/30 border-2 border-dashed border-primary-foreground/60 flex items-center justify-center z-20 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <ImageIcon className="w-8 h-8" />
                    <p className="text-sm font-medium">{t('settings.dragOrClickCover')}</p>
                  </div>
                </div>
              )}

              {/* Upload progress overlay */}
              {headerUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                  <div className="flex flex-col items-center gap-3">
                    <span className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent" />
                    <p className="text-white text-sm">{t('common.uploading')}</p>
                  </div>
                </div>
              )}

              {isOwnStore && !headerUploading && (
                <>
                  <input
                    ref={headerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileSelect(e, 'cover')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => headerInputRef.current?.click()}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-2 px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-black/50 hover:bg-black/70 text-white rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('settings.loadHeader')}</span>
                  </button>
                </>
              )}
            </div>

            {/* Store Info - 白色背景卡片 */}
            <Container size="xl" className="relative">
              <div className="bg-background -mt-12 sm:-mt-16 rounded-t-2xl pt-4 px-4 sm:px-6">
                {/* 头像和信息 */}
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 -mt-10 sm:-mt-12">
                    <Avatar
                      src={displayAvatarUrl}
                      name={store.name || peerId.slice(0, 8)}
                      size="xl"
                      className="ring-4 ring-background w-20 h-20 sm:w-24 sm:h-24 shadow-lg"
                    />
                    {isOwnStore && (
                      <>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={e => handleFileSelect(e, 'avatar')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          className="absolute -bottom-1 -right-1 z-10 w-7 h-7 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center shadow-md transition-colors border-2 border-background cursor-pointer"
                        >
                          {avatarUploading ? (
                            <span className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                          ) : (
                            <Camera className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* 信息区域 */}
                  <div className="flex-1 min-w-0 pt-1">
                    {/* 名称和操作按钮 */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h1 className="text-lg sm:text-xl font-bold text-foreground">
                            {store.name || peerId.slice(0, 8)}
                          </h1>
                          {/* 隐私店铺徽标 */}
                          {store.private && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning shrink-0"
                              title={t('storeAccess.privateStore')}
                            >
                              <Lock className="h-3 w-3" />
                              {t('storeAccess.privateStoreBadge') || t('common.private')}
                            </span>
                          )}
                        </div>
                        {/* 位置 + 评分（桌面端） */}
                        <div className="flex items-center gap-3 mt-0.5">
                          {store.location && (
                            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                              <span>📍</span>
                              <span>{store.location}</span>
                            </p>
                          )}
                          {/* 评分 - 点击进入评价 Tab */}
                          <button
                            onClick={() => setActiveTab('reviews')}
                            className="hover:opacity-80 transition-opacity"
                          >
                            <SellerTrustBadge
                              compact
                              rating={stats.averageRating}
                              reviewCount={stats.ratingCount}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Actions — wrap on mobile for better touch targets */}
                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                        {isOwnStore ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  hasSections ? '/admin/storefront' : '/settings/page-profile'
                                )
                              }
                              size="sm"
                              className="touch-feedback gap-1.5 min-h-[44px] sm:min-h-0"
                            >
                              <Settings className="h-4 w-4" />
                              <span className="hidden sm:inline">
                                {t('settingsModal.customize')}
                              </span>
                            </Button>
                            <Link href="/listing/new">
                              <Button
                                variant="outline"
                                size="sm"
                                className="touch-feedback gap-1.5 min-h-[44px] sm:min-h-0"
                              >
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {t('userPage.createListing')}
                                </span>
                              </Button>
                            </Link>
                            <Link href="/listing/import">
                              <Button
                                variant="outline"
                                size="sm"
                                className="touch-feedback gap-1.5 min-h-[44px] sm:min-h-0"
                              >
                                <Upload className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {t('userPage.importListings')}
                                </span>
                              </Button>
                            </Link>
                          </>
                        ) : (
                          <>
                            <Button
                              variant={isFollowing ? 'outline' : 'default'}
                              onClick={handleFollowToggle}
                              disabled={followLoading || !isAuthenticated}
                              size="sm"
                              className="touch-feedback min-h-[44px] sm:min-h-0"
                            >
                              {followLoading ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                              ) : isFollowing ? (
                                t('profile.unfollow')
                              ) : (
                                t('profile.follow')
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="touch-feedback min-h-[44px] sm:min-h-0"
                              onClick={handleMessage}
                            >
                              {t('profile.message')}
                            </Button>
                            <Button
                              variant={isBlockedUser ? 'destructive' : 'outline'}
                              onClick={handleBlockToggle}
                              disabled={blockLoading || !isAuthenticated}
                              size="sm"
                              className="touch-feedback min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
                              title={isBlockedUser ? t('profile.unblock') : t('profile.block')}
                            >
                              {blockLoading ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </Button>
                            <ShareButton
                              url={
                                typeof window !== 'undefined'
                                  ? window.location.href
                                  : `/store/${peerId}`
                              }
                              title={store.name || peerId.slice(0, 8)}
                              description={
                                store.shortDescription
                                  ? stripHtmlTags(store.shortDescription)
                                  : undefined
                              }
                              embedType="store"
                              embedIdentifier={peerId}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* 简介 */}
                    {store.shortDescription && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 line-clamp-2">
                        {stripHtmlTags(store.shortDescription)}
                      </p>
                    )}
                  </div>
                </div>

                {/* 统计数据：关注中 / 粉丝 - 点击可查看列表 */}
                <div className="flex items-center gap-4 md:gap-6 mt-3 pt-3 border-t border-border text-sm md:text-base">
                  <button
                    onClick={() => setActiveTab('following')}
                    className="flex items-baseline gap-1 min-h-[44px] sm:min-h-0 hover:text-primary transition-colors"
                  >
                    <span className="font-semibold text-foreground">{stats.followingCount}</span>
                    <span className="text-muted-foreground hover:text-primary">
                      {t('profile.following')}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('followers')}
                    className="flex items-baseline gap-1 min-h-[44px] sm:min-h-0 hover:text-primary transition-colors"
                  >
                    <span className="font-semibold text-foreground">{stats.followerCount}</span>
                    <span className="text-muted-foreground hover:text-primary">
                      {t('profile.followers')}
                    </span>
                  </button>
                </div>

                {/* 私密店铺完整访问权限提示 */}
                {store.private && accessCheck?.hasFullAccess && !isOwnStore && (
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-success/15 text-success text-sm border border-success/20">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>{t('storeAccess.fullAccessGranted')}</span>
                  </div>
                )}
              </div>
            </Container>
          </div>
        )}

        {hasSections && (
          <StoreSections
            peerId={peerId}
            profile={store ?? undefined}
            ownerConfig={filteredSections}
          />
        )}

        {/* Tabs — always visible (branded sections + tabs coexist) */}
        <>
          {/* Tabs */}
          <div className="sticky top-16 z-30 bg-background border-b border-border">
            <Container size="xl">
              <div className="relative">
                <div className="flex items-center px-4 sm:px-6 overflow-x-auto scrollbar-hide">
                  <HStack gap="md" className="flex-nowrap">
                    {/* 简介 Tab */}
                    <button
                      onClick={() => setActiveTab('about')}
                      className={`whitespace-nowrap px-4 sm:px-5 py-3.5 text-sm sm:text-base font-medium transition-colors border-b-2 touch-feedback ${
                        activeTab === 'about'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t('profile.about')}
                    </button>

                    {/* 商品 Tab */}
                    <button
                      onClick={() => setActiveTab('products')}
                      className={`whitespace-nowrap px-4 sm:px-5 py-3.5 text-sm sm:text-base font-medium transition-colors border-b-2 touch-feedback ${
                        activeTab === 'products'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t('profile.listings')}
                      {storeListingCount > 0 && (
                        <span className="ml-1.5 text-xs sm:text-sm opacity-70">
                          {storeListingCount}
                        </span>
                      )}
                    </button>

                    {/* RWA 数字资产 Tab */}
                    <button
                      onClick={() => setActiveTab('rwa')}
                      className={`whitespace-nowrap px-4 sm:px-5 py-3.5 text-sm sm:text-base font-medium transition-colors border-b-2 touch-feedback ${
                        activeTab === 'rwa'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t('profile.rwa')}
                      {rwaListingCount > 0 && (
                        <span className="ml-1.5 text-xs sm:text-sm opacity-70">
                          {rwaListingCount}
                        </span>
                      )}
                    </button>

                    {/* 评价 Tab */}
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className={`whitespace-nowrap px-4 sm:px-5 py-3.5 text-sm sm:text-base font-medium transition-colors border-b-2 touch-feedback ${
                        activeTab === 'reviews'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t('profile.reviews')}
                      {stats.ratingCount > 0 && (
                        <span className="ml-1.5 text-xs sm:text-sm opacity-70">
                          {stats.ratingCount}
                        </span>
                      )}
                    </button>
                  </HStack>
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
              </div>
            </Container>
          </div>

          {/* Tab Content */}
          <div className="py-2 sm:py-4">
            {activeTab === 'products' && (
              <Container size="xl">
                {/* 桌面端：左侧边栏 + 右侧内容 */}
                <div className="flex gap-6">
                  {/* 左侧筛选边栏 - 仅桌面端显示 */}
                  {!productsLoading && storeListingCount > 0 && (
                    <FilterSidebar
                      filter={filter}
                      onFilterChange={setFilter}
                      categories={categories}
                      className="hidden lg:block"
                    />
                  )}

                  {/* 右侧主内容区 */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* 顶部工具栏：搜索 + 数量 + 排序 */}
                    {!productsLoading && storeListingCount > 0 && (
                      <StoreListingsToolbar
                        filter={filter}
                        onFilterChange={setFilter}
                        totalCount={storeListingCount}
                        filteredCount={filteredProducts.length}
                        categories={categories}
                        onOpenMobileFilter={() => setIsFilterSheetOpen(true)}
                        productTitles={productTitles}
                        compact
                      />
                    )}

                    {/* Collections Section */}
                    {storeCollections.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                          <Layers className="w-4 h-4" />
                          {t('admin.nav.collections')}
                        </h3>
                        <div className="relative">
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {storeCollections.map(col => (
                              <Link
                                key={col.id}
                                href={`/store/${peerId}/collection/${col.id}`}
                                className="flex-none w-36 rounded-lg border border-border hover:border-primary/50 transition-colors overflow-hidden"
                              >
                                {col.image ? (
                                  <img
                                    src={getImageUrl(col.image, storeImageHint)}
                                    alt={col.title}
                                    className="w-full h-20 object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-20 bg-muted flex items-center justify-center">
                                    <Layers className="w-6 h-6 text-muted-foreground/30" />
                                  </div>
                                )}
                                <div className="p-2">
                                  <p className="text-xs font-medium truncate">{col.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {col.products?.length || 0}{' '}
                                    {t('listing.tabs.productType').toLowerCase()}
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </div>
                          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
                        </div>
                      </div>
                    )}

                    {/* Products Grid */}
                    {productsLoading ? (
                      <Grid cols={3} colsMobile={2} colsTablet={3} gap="md">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <ProductCardSkeleton key={i} />
                        ))}
                      </Grid>
                    ) : filteredProducts.length > 0 ? (
                      <Grid cols={3} colsMobile={2} colsTablet={3} gap="md">
                        {filteredProducts.map((product, index) => (
                          <Link
                            key={`${product.slug}-${index}`}
                            href={`/product/${product.slug}?peerID=${peerId}`}
                            onClick={e => {
                              // 桌面端使用弹框
                              if (!isMobile) {
                                e.preventDefault();
                                openProduct(product.slug, peerId);
                              }
                            }}
                          >
                            <ProductCard
                              title={product.title}
                              imageUrl={getImageUrl(product.thumbnail?.medium, storeImageHint)}
                              price={Number(product.price?.amount || 0)}
                              currency={product.price?.currency?.code || 'USD'}
                              divisibility={product.price?.currency?.divisibility}
                              // 在店铺页面内不显示店名和头像（已经在店铺里了，无需重复显示）
                              vendorPeerID={peerId}
                              rating={product.averageRating}
                              reviewCount={product.ratingCount}
                              freeShipping={product.freeShipping && product.freeShipping.length > 0}
                              contractType={product.contractType as ProductContractType}
                              tokenStandard={product.tokenStandard}
                              rwaTradeMode={product.rwaTradeMode as RwaTradeMode}
                              hasVerifiedModerator={hasVerifiedMod(product.moderators)}
                              isOwnListing={isOwnStore}
                              onReport={() => {
                                /* TODO: 打开举报对话框 */
                              }}
                              onBlock={() => {
                                /* TODO: 实现屏蔽卖家功能 */
                              }}
                              // 自己商品的快捷操作
                              onEdit={
                                isOwnStore ? () => handleEditListing(product.slug) : undefined
                              }
                              onClone={
                                isOwnStore ? () => handleCloneListing(product.slug) : undefined
                              }
                              onDelete={
                                isOwnStore
                                  ? () => handleOpenDeleteDialog(product.slug, product.title)
                                  : undefined
                              }
                            />
                          </Link>
                        ))}
                      </Grid>
                    ) : storeListingCount > 0 ? (
                      // 有商品但筛选后为空
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-medium text-foreground mb-2">
                          {t('empty.noProductsFound')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t('empty.tryAdjustingFilters')}
                        </p>
                      </div>
                    ) : (
                      // 店铺本身没有普通商品（但可能有 RWA 商品）
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-medium text-foreground mb-2">
                          {t('empty.noProductsFound')}
                        </h3>
                        <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Container>
            )}

            {activeTab === 'rwa' && (
              <Container size="xl">
                <RwaTab peerId={peerId} isOwnStore={isOwnStore} products={products} />
              </Container>
            )}

            {activeTab === 'about' && (
              <Container size="xl">
                <Grid cols={3} colsMobile={1} gap="md">
                  <div className="lg:col-span-2">
                    <Card className="p-4 sm:p-6">
                      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
                        {t('profile.about')}
                      </h2>
                      <div className="prose prose-sm sm:prose prose-slate dark:prose-invert max-w-none">
                        {store.about ? (
                          <div
                            className="text-sm sm:text-base text-muted-foreground [&>p]:mb-3 [&>p:last-child]:mb-0"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(store.about) }}
                          />
                        ) : (
                          <p className="text-sm sm:text-base text-muted-foreground">
                            {t('common.noData')}
                          </p>
                        )}
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <SellerTrustBadge
                      rating={stats.averageRating}
                      reviewCount={stats.ratingCount}
                      memberSince={store.lastModified}
                    />

                    <Card className="p-4 sm:p-6">
                      <h3 className="font-semibold text-foreground mb-3 text-base">
                        {t('profile.contactInformation')}
                      </h3>
                      <VStack gap="sm" align="stretch">
                        {store.contactInfo?.email && (
                          <div>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {t('profile.email')}
                            </span>
                            <a
                              href={`mailto:${store.contactInfo.email}`}
                              className="block font-medium text-primary hover:underline text-sm min-h-[44px] sm:min-h-0 flex items-center"
                            >
                              {store.contactInfo.email}
                            </a>
                          </div>
                        )}
                        {store.contactInfo?.phoneNumber && (
                          <div>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {t('profile.phone')}
                            </span>
                            <a
                              href={`tel:${store.contactInfo.phoneNumber}`}
                              className="block font-medium text-primary hover:underline text-sm min-h-[44px] sm:min-h-0 flex items-center"
                            >
                              {store.contactInfo.phoneNumber}
                            </a>
                          </div>
                        )}
                        {store.contactInfo?.website && (
                          <div>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {t('profile.website')}
                            </span>
                            <a
                              href={store.contactInfo.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block font-medium text-primary hover:underline text-sm"
                            >
                              {store.contactInfo.website}
                            </a>
                          </div>
                        )}
                        {!store.contactInfo?.email &&
                          !store.contactInfo?.phoneNumber &&
                          !store.contactInfo?.website && (
                            <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                          )}
                      </VStack>
                    </Card>

                    <Card className="p-4 sm:p-6 mt-4">
                      <Link
                        href={`/store/${peerId}/policies`}
                        className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {t('profile.storePolicy')}
                      </Link>
                    </Card>
                  </div>
                </Grid>
              </Container>
            )}

            {activeTab === 'reviews' && <StoreReviewsTab peerID={peerId} />}

            {activeTab === 'following' && <FollowTab peerID={peerId} type="following" />}

            {activeTab === 'followers' && <FollowTab peerID={peerId} type="followers" />}
          </div>
        </>
      </main>

      <Footer />

      {/* 编辑资料对话框 */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('profile.editProfile')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 基本信息 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('profile.name')}</label>
              <Input
                value={editForm.name}
                onChange={e => handleEditChange('name', e.target.value)}
                placeholder={t('profile.name')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('profile.bio')}</label>
              <Input
                value={editForm.shortDescription}
                onChange={e => handleEditChange('shortDescription', e.target.value)}
                placeholder={t('profile.bio')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('profile.location')}</label>
              <Input
                value={editForm.location}
                onChange={e => handleEditChange('location', e.target.value)}
                placeholder={t('profile.location')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('profile.about')}</label>
              <textarea
                value={editForm.about}
                onChange={e => handleEditChange('about', e.target.value)}
                placeholder={t('profile.about')}
                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* 联系信息 */}
            <div className="pt-4 border-t border-border">
              <h4 className="font-medium text-foreground mb-3">
                {t('profile.contactInformation')}
              </h4>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.email')}
                  </label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={e => handleEditChange('email', e.target.value)}
                    placeholder={t('profile.email')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.phone')}
                  </label>
                  <Input
                    type="tel"
                    value={editForm.phoneNumber}
                    onChange={e => handleEditChange('phoneNumber', e.target.value)}
                    placeholder={t('profile.phone')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.website')}
                  </label>
                  <Input
                    type="url"
                    value={editForm.website}
                    onChange={e => handleEditChange('website', e.target.value)}
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
              ) : null}
              {t('profile.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 移动端筛选底部弹窗 */}
      <FilterSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        filter={filter}
        onFilterChange={setFilter}
        categories={categories}
      />

      {/* Welcome 弹窗 - 新店铺首次进入时显示 */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{t('userPage.storeWelcomeCalloutTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">{t('userPage.storeWelcomeCalloutBody')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCloseWelcome} className="flex-1">
              {t('userPage.storeWelcomeCalloutBtnClose')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleCloseWelcome();
                router.push('/settings/page-profile');
              }}
              className="flex-1"
            >
              {t('settingsModal.customize')}
            </Button>
            <Link href="/listing/new" className="flex-1">
              <Button onClick={handleCloseWelcome} className="w-full">
                {t('userPage.createListing')}
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除商品确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('listingCard.confirmDelete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('listingCard.confirmDelete.body')}
              {productToDelete && (
                <span className="block mt-2 font-medium text-foreground">
                  &quot;{productToDelete.title}&quot;
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  {t('common.deleting')}
                </span>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Crop Dialog */}
      {cropDialogSrc && cropTarget && (
        <ImageCropDialog
          open={!!cropDialogSrc}
          onOpenChange={open => {
            if (!open) {
              if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
              setCropDialogSrc(null);
              setCropTarget(null);
            }
          }}
          imageSrc={cropDialogSrc}
          aspect={cropTarget === 'cover' ? 16 / 5 : 1}
          cropShape={cropTarget === 'avatar' ? 'round' : 'rect'}
          title={cropTarget === 'cover' ? t('settings.adjustCover') : t('settings.adjustAvatar')}
          sizeHint={
            cropTarget === 'cover' ? t('settings.coverSizeHint') : t('settings.avatarSizeHint')
          }
          onCropComplete={handleCropComplete}
          isUploading={cropTarget === 'cover' ? headerUploading : avatarUploading}
        />
      )}
    </div>
  );
}
