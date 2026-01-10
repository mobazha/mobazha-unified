'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VStack, HStack } from '@/components/layouts';
import { Input } from '@/components/ui/input-compat';
import {
  useAccessControl,
  useUserStore,
  useGroupContext,
  type StoreAccessCheckResult,
} from '@mobazha/core';
import { ShieldX, ShieldCheck, Clock, Send, Loader2 } from 'lucide-react';

interface StoreAccessGuardProps {
  /** 店铺所有者的 peerID */
  storePeerID: string;
  /** 子组件（店铺内容） */
  children: React.ReactNode;
  /** 是否是自己的店铺（跳过检查） */
  isOwnStore?: boolean;
}

/**
 * 店铺访问权限守卫组件
 *
 * 检查当前用户是否有权限访问指定店铺。
 * 如果有权限，渲染子组件；否则显示访问受限提示。
 */
export function StoreAccessGuard({
  storePeerID,
  children,
  isOwnStore = false,
}: StoreAccessGuardProps) {
  const { profile, isAuthenticated } = useUserStore();
  const requestorPeerID = profile?.peerID || '';
  const { context: groupContext } = useGroupContext();

  const {
    checkAccess,
    submitRequest,
    error: accessError,
  } = useAccessControl({
    storePeerID,
    requestorPeerID,
    autoCheck: false,
  });

  const [accessCheck, setAccessCheck] = useState<StoreAccessCheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // 检查访问权限
  useEffect(() => {
    const doCheck = async () => {
      // 如果是自己的店铺，跳过检查
      if (isOwnStore) {
        setChecking(false);
        setAccessCheck({
          hasFullAccess: true,
          hasGroupAccess: false,
          accessType: 'whitelist',
          needsRequest: false,
        });
        return;
      }

      // 如果未登录，暂时允许访问（后端会处理权限）
      if (!isAuthenticated || !requestorPeerID) {
        setChecking(false);
        // 默认允许访问，实际权限由后端控制
        setAccessCheck({
          hasFullAccess: true,
          hasGroupAccess: false,
          accessType: 'whitelist',
          needsRequest: false,
        });
        return;
      }

      setChecking(true);
      try {
        const result = await checkAccess(storePeerID, requestorPeerID);
        setAccessCheck(result);
      } catch (err) {
        console.error('[StoreAccessGuard] Check error:', err);
        // 出错时默认允许访问
        setAccessCheck({
          hasFullAccess: true,
          hasGroupAccess: false,
          accessType: 'whitelist',
          needsRequest: false,
        });
      } finally {
        setChecking(false);
      }
    };

    doCheck();
  }, [storePeerID, requestorPeerID, isAuthenticated, isOwnStore, checkAccess]);

  // 提交访问申请
  const handleSubmitRequest = useCallback(async () => {
    if (!requestorPeerID) return;

    setSubmitting(true);
    try {
      const result = await submitRequest({
        storePeerID,
        requestorPeerID,
        note: requestNote.trim() || undefined,
      });

      if (result) {
        setRequestSubmitted(true);
        setShowRequestModal(false);
      }
    } catch (err) {
      console.error('[StoreAccessGuard] Submit request error:', err);
    } finally {
      setSubmitting(false);
    }
  }, [storePeerID, requestorPeerID, requestNote, submitRequest]);

  // 加载中
  if (checking) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 有访问权限，渲染子组件
  if (accessCheck?.hasFullAccess || accessCheck?.hasGroupAccess) {
    return <>{children}</>;
  }

  // 申请已提交
  if (requestSubmitted || accessCheck?.requestStatus === 'pending') {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="max-w-md w-full text-center">
          <VStack gap="lg" align="center" className="py-8">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">访问申请已提交</h2>
              <p className="text-muted-foreground">
                您的访问申请正在等待店铺所有者审核，请耐心等待。
              </p>
            </div>
          </VStack>
        </Card>
      </div>
    );
  }

  // 申请被拒绝
  if (accessCheck?.requestStatus === 'rejected') {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="max-w-md w-full text-center">
          <VStack gap="lg" align="center" className="py-8">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">访问申请被拒绝</h2>
              <p className="text-muted-foreground">很抱歉，您的访问申请未能通过审核。</p>
            </div>
          </VStack>
        </Card>
      </div>
    );
  }

  // 需要申请访问
  if (accessCheck?.needsRequest) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="max-w-md w-full text-center">
          <VStack gap="lg" align="center" className="py-8">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">私密店铺</h2>
              <p className="text-muted-foreground mb-4">此店铺需要申请访问权限才能浏览商品。</p>
              {groupContext && (
                <p className="text-sm text-blue-600 mb-4">
                  您正在通过 {groupContext.chatTitle || groupContext.chatId} 群组访问
                </p>
              )}
              <Button onClick={() => setShowRequestModal(true)}>
                <Send className="w-4 h-4 mr-2" />
                申请访问
              </Button>
            </div>
          </VStack>
        </Card>

        {/* 申请访问弹窗 */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <h2 className="text-xl font-bold text-foreground mb-6">申请访问</h2>

              <VStack gap="lg">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    申请说明（可选）
                  </label>
                  <textarea
                    value={requestNote}
                    onChange={e => setRequestNote(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="简要说明您的访问目的..."
                  />
                </div>

                {accessError && <p className="text-sm text-red-600">{accessError}</p>}
              </VStack>

              <HStack justify="end" gap="sm" className="mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button onClick={handleSubmitRequest} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    '提交申请'
                  )}
                </Button>
              </HStack>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // 默认情况：无访问权限
  return (
    <div className="flex justify-center items-center py-20">
      <Card className="max-w-md w-full text-center">
        <VStack gap="lg" align="center" className="py-8">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">无法访问</h2>
            <p className="text-muted-foreground">您目前没有权限访问此店铺。</p>
          </div>
        </VStack>
      </Card>
    </div>
  );
}

export default StoreAccessGuard;
