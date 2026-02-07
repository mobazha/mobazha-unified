'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { useUserGroups, useUserStore, useI18n, type UserGroupMember } from '@mobazha/core';
import { Loader2, UserPlus, Trash2, Users } from 'lucide-react';

export default function UserGroupMembersPage() {
  const { t } = useI18n();
  const params = useParams();
  const groupId = parseInt(params.groupId as string);

  const { profile, isAuthenticated } = useUserStore();
  const ownerPeerID = profile?.peerID || '';

  const { groups, loadGroups, loadMembers, addMember, removeMember } = useUserGroups({
    ownerPeerID,
    autoLoad: false,
  });

  const [members, setMembers] = useState<UserGroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPeerID, setNewPeerID] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // 获取当前用户组
  const currentGroup = groups.find(g => g.id === groupId);

  // 加载用户组和成员
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !ownerPeerID || isNaN(groupId)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 加载用户组列表
        await loadGroups(ownerPeerID);
        // 加载成员
        const memberList = await loadMembers(groupId);
        setMembers(memberList);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, ownerPeerID, groupId, loadGroups, loadMembers]);

  // 添加成员
  const handleAddMember = useCallback(async () => {
    if (!newPeerID.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const result = await addMember(groupId, newPeerID.trim());
      if (result) {
        setMembers(prev => [...prev, result]);
        setShowAddModal(false);
        setNewPeerID('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.addFailed'));
    } finally {
      setSaving(false);
    }
  }, [groupId, newPeerID, addMember]);

  // 移除成员
  const handleRemoveMember = useCallback(async () => {
    if (removingMemberId === null) return;

    setSaving(true);
    setError(null);

    try {
      const success = await removeMember(groupId, removingMemberId);
      if (success) {
        setMembers(prev => prev.filter(m => m.id !== removingMemberId));
        setRemovingMemberId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.removeFailed'));
    } finally {
      setSaving(false);
    }
  }, [groupId, removingMemberId, removeMember]);

  // 格式化 peerID 显示
  const formatPeerID = (peerID: string) => {
    if (peerID.length <= 16) return peerID;
    return `${peerID.slice(0, 8)}...${peerID.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="lg">
          {/* Back Link */}
          <Link
            href="/settings/user-groups"
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
            {t('settings.sidebar.userGroups')}
          </Link>

          <HStack justify="between" align="center" className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {currentGroup?.name || t('settings.accessControl.userGroup')} -{' '}
                {t('common.members')}
              </h1>
              <p className="text-muted-foreground">
                {members.length} {t('common.members')}
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated}>
              <UserPlus className="w-4 h-4 mr-2" />
              {t('settings.accessControl.addMember')}
            </Button>
          </HStack>

          {/* Error Message */}
          {error && <div className="bg-error/8 text-error p-4 rounded-lg mb-6">{error}</div>}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Members List */}
          {!loading && members.length > 0 && (
            <VStack gap="sm">
              {members.map(member => (
                <Card key={member.id} className="p-4">
                  <HStack justify="between" align="center">
                    <HStack gap="md" align="center">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{formatPeerID(member.peerID)}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.accessControl.addedOn')}{' '}
                          {new Date(member.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </HStack>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error hover:text-error"
                      onClick={() => setRemovingMemberId(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </HStack>
                </Card>
              ))}
            </VStack>
          )}

          {/* Empty State */}
          {!loading && members.length === 0 && (
            <Card className="text-center py-12">
              <VStack gap="md" align="center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t('settings.accessControl.noMembers')}
                </h3>
                <p className="text-muted-foreground">
                  {t('settings.accessControl.addFirstMember')}
                </p>
                <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('settings.accessControl.addMember')}
                </Button>
              </VStack>
            </Card>
          )}
        </Container>
      </main>

      <Footer />

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-6">
              {t('settings.accessControl.addMember')}
            </h2>

            <VStack gap="lg">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Peer ID *
                </label>
                <Input
                  value={newPeerID}
                  onChange={e => setNewPeerID(e.target.value)}
                  placeholder={t('settings.accessControl.peerIdPlaceholder')}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.accessControl.peerIdHint')}
                </p>
              </div>
            </VStack>

            <HStack justify="end" gap="sm" className="mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddModal(false);
                  setNewPeerID('');
                }}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAddMember} disabled={!newPeerID.trim() || saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.adding')}
                  </>
                ) : (
                  t('common.add')
                )}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      {/* Remove Confirmation AlertDialog */}
      <AlertDialog
        open={removingMemberId !== null}
        onOpenChange={open => !open && setRemovingMemberId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.accessControl.removeMember')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.accessControl.removeMemberConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-error hover:bg-error"
              disabled={saving}
            >
              {saving ? t('common.removing') : t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
