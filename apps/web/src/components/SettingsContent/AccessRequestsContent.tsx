'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { useI18n, useAccessControl, useUserStore, getImageUrl } from '@mobazha/core';
import type { StoreAccessRequest, StoreAccessListItem } from '@mobazha/core';
import { Clock, CheckCircle, XCircle, Inbox, UserPlus, Trash2, ChevronLeft } from 'lucide-react';

type TabKey = 'pending' | 'approved' | 'rejected' | 'whitelist';

interface AccessRequestsContentProps {
  /** 是否显示返回按钮 */
  showBackButton?: boolean;
  /** 返回回调 */
  onBack?: () => void;
  /** 在 Modal 中使用时显示描述文字（页面中由 SettingsPageHeader 负责） */
  showDescription?: boolean;
}

/**
 * 访问申请管理内容组件
 * 可在独立页面和 Modal 中复用
 */
export const AccessRequestsContent: React.FC<AccessRequestsContentProps> = ({
  showBackButton = false,
  onBack,
  showDescription = false,
}) => {
  const { t, formatRelativeTime } = useI18n();
  const { profile } = useUserStore();
  const storePeerID = profile?.peerID;

  const {
    requests,
    requestsLoading,
    accessList,
    accessListLoading,
    error,
    loadRequests,
    loadAccessList,
    approveRequest,
    rejectRequest,
    addToList,
    removeFromList,
  } = useAccessControl({ storePeerID });

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [processingId, setProcessingId] = useState<number | string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<StoreAccessRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  // 添加白名单弹窗
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserPeerID, setNewUserPeerID] = useState('');

  // 分类统计
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  // 加载数据
  useEffect(() => {
    if (!storePeerID) return;

    if (activeTab === 'whitelist') {
      loadAccessList();
    } else {
      loadRequests(activeTab);
    }
  }, [activeTab, storePeerID, loadRequests, loadAccessList]);

  // 切换 Tab
  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
  }, []);

  // 批准申请
  const handleApprove = useCallback(
    async (requestId: number) => {
      setProcessingId(requestId);
      try {
        await approveRequest(requestId);
        setSelectedRequest(null);
        setReviewNote('');
        // 重新加载当前 tab
        loadRequests(activeTab);
      } finally {
        setProcessingId(null);
      }
    },
    [approveRequest, loadRequests, activeTab]
  );

  // 拒绝申请
  const handleReject = useCallback(
    async (requestId: number, note: string) => {
      setProcessingId(requestId);
      try {
        await rejectRequest(requestId, note);
        setSelectedRequest(null);
        setReviewNote('');
        // 重新加载当前 tab
        loadRequests(activeTab);
      } finally {
        setProcessingId(null);
      }
    },
    [rejectRequest, loadRequests, activeTab]
  );

  // 添加白名单用户
  const handleAddUser = useCallback(async () => {
    if (!newUserPeerID.trim()) return;

    setProcessingId('adding');
    try {
      const success = await addToList(newUserPeerID.trim());
      if (success) {
        setShowAddUserModal(false);
        setNewUserPeerID('');
        loadAccessList();
      }
    } finally {
      setProcessingId(null);
    }
  }, [newUserPeerID, addToList, loadAccessList]);

  // 从白名单移除
  const handleRemoveFromList = useCallback(
    async (requestorPeerID: string) => {
      setProcessingId(requestorPeerID);
      try {
        await removeFromList(requestorPeerID);
        loadAccessList();
      } finally {
        setProcessingId(null);
      }
    },
    [removeFromList, loadAccessList]
  );

  // 格式化时间
  const formatDate = (dateString: string) => {
    try {
      return formatRelativeTime(dateString);
    } catch {
      return dateString;
    }
  };

  // Tab 配置
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'pending', label: t('storeAccess.pendingRequests'), count: pendingRequests.length },
    { key: 'approved', label: t('storeAccess.approvedRequests'), count: approvedRequests.length },
    { key: 'rejected', label: t('storeAccess.rejectedRequests'), count: rejectedRequests.length },
    { key: 'whitelist', label: t('storeAccess.accessList'), count: accessList.length },
  ];

  // 状态样式配置 - 使用更深的绿色确保浅色模式下清晰
  const statusConfig = {
    pending: {
      color: 'bg-warning/15 text-warning',
      icon: <Clock className="w-3 h-3" />,
    },
    approved: {
      color: 'bg-success/15 text-success',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    rejected: {
      color: 'bg-destructive/15 text-destructive',
      icon: <XCircle className="w-3 h-3" />,
    },
  };

  // 当前显示的列表
  const getCurrentList = () => {
    switch (activeTab) {
      case 'pending':
        return pendingRequests;
      case 'approved':
        return approvedRequests;
      case 'rejected':
        return rejectedRequests;
      default:
        return [];
    }
  };

  const loading = activeTab === 'whitelist' ? accessListLoading : requestsLoading;
  const currentRequests = getCurrentList();

  return (
    <>
      {showDescription && (
        <p className="text-sm text-muted-foreground mb-4">
          {t('settings.accessControl.requestsDescription')}
        </p>
      )}
      <Card className="p-4 md:p-6">
        {showBackButton && onBack && (
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="border-b border-border">
          <div className="flex gap-6">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`relative py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-lg border border-border animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg border border-border bg-destructive/10 text-destructive mb-4">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && activeTab === 'whitelist' && (
          <div className="space-y-3">
            <Button variant="outline" onClick={() => setShowAddUserModal(true)} className="w-full">
              <UserPlus className="w-4 h-4 mr-2" />
              {t('storeAccess.addUser')}
            </Button>

            {accessList.length > 0 ? (
              accessList.map(item => (
                <WhitelistItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveFromList}
                  processing={processingId === item.requestorPeerID}
                  formatDate={formatDate}
                  t={t}
                />
              ))
            ) : (
              <div className="p-8 text-center rounded-lg border border-border">
                <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('storeAccess.noAccessList')}</p>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab !== 'whitelist' && (
          <div className="space-y-3">
            {currentRequests.length > 0 ? (
              currentRequests.map(req => (
                <RequestItem
                  key={req.id}
                  request={req}
                  statusConfig={statusConfig}
                  onApprove={handleApprove}
                  onReview={() => setSelectedRequest(req)}
                  processing={processingId === req.id}
                  formatDate={formatDate}
                  t={t}
                />
              ))
            ) : (
              <div className="p-8 text-center rounded-lg border border-border">
                <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('settings.accessControl.noRequests')}</p>
              </div>
            )}
          </div>
        )}

        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('settings.accessControl.reviewRequest')}</DialogTitle>
            </DialogHeader>

            {selectedRequest &&
              (() => {
                const profile = selectedRequest.requestorProfile;
                const displayName = profile?.name || selectedRequest.requestorName;
                const avatarHash =
                  profile?.avatarHashes?.small ||
                  profile?.avatarHashes?.tiny ||
                  selectedRequest.requestorAvatar;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Avatar
                        src={avatarHash ? getImageUrl(avatarHash) : undefined}
                        name={displayName || selectedRequest.requestorPeerID}
                        size="md"
                      />
                      <div>
                        <p className="font-medium">{displayName || t('common.anonymous')}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {selectedRequest.requestorPeerID.slice(0, 12)}...
                        </p>
                      </div>
                    </div>

                    {selectedRequest.note && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t('storeAccess.requestNote')}:
                        </p>
                        <p className="text-sm">{selectedRequest.note}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t('settings.accessControl.reviewNote')}
                      </label>
                      <textarea
                        value={reviewNote}
                        onChange={e => setReviewNote(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder={t('settings.accessControl.reviewNotePlaceholder')}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                        {t('common.cancel')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(selectedRequest.id, reviewNote)}
                        disabled={processingId === selectedRequest.id}
                        className="border-destructive text-destructive hover:bg-destructive/10"
                      >
                        {t('common.reject')}
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedRequest.id)}
                        disabled={processingId === selectedRequest.id}
                      >
                        {processingId === selectedRequest.id ? '...' : t('common.approve')}
                      </Button>
                    </div>
                  </div>
                );
              })()}
          </DialogContent>
        </Dialog>

        <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('storeAccess.addUser')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('storeAccess.peerIDLabel')}
                </label>
                <Input
                  value={newUserPeerID}
                  onChange={e => setNewUserPeerID(e.target.value)}
                  placeholder={t('storeAccess.peerIDPlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={!newUserPeerID.trim() || processingId === 'adding'}
                >
                  {processingId === 'adding' ? '...' : t('common.add')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </>
  );
};

// 申请项组件
interface RequestItemProps {
  request: StoreAccessRequest;
  statusConfig: Record<string, { color: string; icon: React.ReactNode }>;
  onApprove: (id: number) => void;
  onReview: () => void;
  processing: boolean;
  formatDate: (date: string) => string;
  t: (key: string) => string;
}

const RequestItem: React.FC<RequestItemProps> = ({
  request,
  statusConfig,
  onApprove,
  onReview,
  processing,
  formatDate,
  t,
}) => {
  // 从 requestorProfile 获取名称和头像
  const profile = request.requestorProfile;
  const displayName = profile?.name || request.requestorName;
  const avatarHash =
    profile?.avatarHashes?.small || profile?.avatarHashes?.tiny || request.requestorAvatar;

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-start gap-4">
        <Avatar
          src={avatarHash ? getImageUrl(avatarHash) : undefined}
          name={displayName || request.requestorPeerID}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium">{displayName || t('common.anonymous')}</h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig[request.status]?.color}`}
            >
              {statusConfig[request.status]?.icon}
              {t(`common.${request.status}`)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{formatDate(request.createdAt)}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            PeerID: {request.requestorPeerID.slice(0, 12)}...{request.requestorPeerID.slice(-6)}
          </p>
        </div>

        {request.status === 'pending' && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={onReview}>
              {t('common.review')}
            </Button>
            <Button size="sm" onClick={() => onApprove(request.id)} disabled={processing}>
              {processing ? '...' : t('common.approve')}
            </Button>
          </div>
        )}
      </div>

      {request.note && (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">{t('storeAccess.requestNote')}:</p>
          <p className="text-sm">{request.note}</p>
        </div>
      )}

      {request.reviewNote && (
        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">
            {t('settings.accessControl.reviewNote')}:
          </p>
          <p className="text-sm">{request.reviewNote}</p>
        </div>
      )}
    </Card>
  );
};

// 白名单项组件
interface WhitelistItemProps {
  item: StoreAccessListItem;
  onRemove: (peerID: string) => void;
  processing: boolean;
  formatDate: (date: string) => string;
  t: (key: string) => string;
}

const WhitelistItem: React.FC<WhitelistItemProps> = ({
  item,
  onRemove,
  processing,
  formatDate,
  t,
}) => {
  // 从 userProfile 获取名称和头像
  const profile = item.userProfile;
  const displayName = profile?.name;
  const avatarHash = profile?.avatarHashes?.small || profile?.avatarHashes?.tiny;

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={avatarHash ? getImageUrl(avatarHash) : undefined}
            name={displayName || item.requestorPeerID}
            size="md"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">{displayName || t('common.anonymous')}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {item.requestorPeerID.slice(0, 12)}...{item.requestorPeerID.slice(-6)}
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(item.addedAt)}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRemove(item.requestorPeerID)}
          disabled={processing}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

export default AccessRequestsContent;
