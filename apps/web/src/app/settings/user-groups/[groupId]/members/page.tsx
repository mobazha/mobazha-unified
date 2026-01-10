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
import { useUserGroups, useUserStore, type UserGroupMember } from '@mobazha/core';
import { Loader2, UserPlus, Trash2, Users } from 'lucide-react';

export default function UserGroupMembersPage() {
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
        setError(err instanceof Error ? err.message : '加载失败');
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
      setError(err instanceof Error ? err.message : '添加失败');
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
      setError(err instanceof Error ? err.message : '移除失败');
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
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-slate-900 dark:hover:text-white mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回用户组
          </Link>

          <HStack justify="between" align="center" className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {currentGroup?.name || '用户组'} - 成员管理
              </h1>
              <p className="text-muted-foreground">
                管理该用户组的成员，共 {members.length} 位成员
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated}>
              <UserPlus className="w-4 h-4 mr-2" />
              添加成员
            </Button>
          </HStack>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

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
                          添加于 {new Date(member.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </HStack>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
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
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">暂无成员</h3>
                <p className="text-muted-foreground">添加成员到此用户组</p>
                <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  添加成员
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
            <h2 className="text-xl font-bold text-foreground mb-6">添加成员</h2>

            <VStack gap="lg">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Peer ID *
                </label>
                <Input
                  value={newPeerID}
                  onChange={e => setNewPeerID(e.target.value)}
                  placeholder="输入用户的 Peer ID"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Peer ID 以 Qm 开头，是用户的唯一标识
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
                取消
              </Button>
              <Button onClick={handleAddMember} disabled={!newPeerID.trim() || saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    添加中...
                  </>
                ) : (
                  '添加'
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
            <AlertDialogTitle>移除成员</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从此用户组移除该成员吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving ? '移除中...' : '移除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
