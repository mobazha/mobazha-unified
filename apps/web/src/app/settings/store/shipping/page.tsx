'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  useToast,
  Skeleton,
} from '@/components/ui';
import { useI18n, useShippingOptions } from '@mobazha/core';
import type { ShippingOptionSetting } from '@mobazha/core';
import { ChevronLeft, Plus, Truck } from 'lucide-react';
import { VStack, HStack } from '@/components/layouts';
import {
  ShippingOptionCard,
  ShippingOptionForm,
  ShippingTemplateSelector,
} from '@/components/Shipping';

/**
 * 空状态组件 - 带模板选择器
 */
function EmptyState({
  onSelectTemplate,
}: {
  onSelectTemplate: (option: ShippingOptionSetting) => void;
}) {
  const { t } = useI18n();

  return (
    <Card className="p-6">
      <VStack gap="lg">
        <VStack gap="xs" align="center" className="text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Truck className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">
            {t('shippingConfig.noOptions') || 'No shipping options'}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('shippingConfig.noOptionsDesc') ||
              'Add shipping options to enable physical product delivery'}
          </p>
        </VStack>

        {/* 模板选择器 */}
        <ShippingTemplateSelector currency="USD" onSelect={onSelectTemplate} />
      </VStack>
    </Card>
  );
}

/**
 * 加载骨架屏
 */
function LoadingSkeleton() {
  return (
    <VStack gap="md">
      {[1, 2].map(i => (
        <Card key={i} className="p-4">
          <HStack justify="between" align="start">
            <VStack gap="xs" className="flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </VStack>
            <HStack gap="xs">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </HStack>
          </HStack>
        </Card>
      ))}
    </VStack>
  );
}

/**
 * 配送选项设置页面
 */
export default function ShippingOptionsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { options, isLoading, isSaving, error, addOption, updateOption, deleteOption, refetch } =
    useShippingOptions();

  // 表单状态
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<ShippingOptionSetting | null>(null);

  // 删除确认状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState<ShippingOptionSetting | null>(null);

  // 处理添加
  const handleAdd = useCallback(() => {
    setEditingOption(null);
    setShowForm(true);
  }, []);

  // 处理模板选择
  const handleSelectTemplate = useCallback((option: ShippingOptionSetting) => {
    setEditingOption(option);
    setShowForm(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((option: ShippingOptionSetting) => {
    setEditingOption(option);
    setShowForm(true);
  }, []);

  // 处理保存（添加或更新）
  const handleSave = useCallback(
    async (option: ShippingOptionSetting): Promise<boolean> => {
      if (editingOption?.id) {
        // 更新
        return await updateOption(editingOption.id, option);
      } else {
        // 添加
        return await addOption(option);
      }
    },
    [editingOption, addOption, updateOption]
  );

  // 处理删除确认
  const handleDeleteClick = useCallback((option: ShippingOptionSetting) => {
    setOptionToDelete(option);
    setShowDeleteConfirm(true);
  }, []);

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    if (!optionToDelete?.id) return;

    const success = await deleteOption(optionToDelete.id);
    if (success) {
      toast({
        title: t('common.success') || 'Success',
        description: t('shippingConfig.deleteSuccess') || 'Shipping option deleted',
      });
    } else {
      toast({
        title: t('common.error') || 'Error',
        description: t('shippingConfig.deleteFailed') || 'Failed to delete shipping option',
        variant: 'destructive',
      });
    }

    setShowDeleteConfirm(false);
    setOptionToDelete(null);
  }, [optionToDelete, deleteOption, toast, t]);

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings/store"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back') || 'Back'}</span>
        </Link>
      </div>

      {/* 标题和添加按钮 */}
      <HStack justify="between" align="center" className="mb-6">
        <h1 className="text-lg font-semibold">
          {t('settingsExtended.shippingOptions') || 'Shipping Options'}
        </h1>
        {options.length > 0 && (
          <Button onClick={handleAdd} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('shippingConfig.addOption') || 'Add Option'}
          </Button>
        )}
      </HStack>

      {/* 错误提示 */}
      {error && (
        <Card className="p-4 mb-4 border-destructive bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="link" size="sm" onClick={refetch} className="p-0 h-auto mt-1">
            {t('common.retry') || 'Retry'}
          </Button>
        </Card>
      )}

      {/* 内容区域 */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : options.length === 0 ? (
        <EmptyState onSelectTemplate={handleSelectTemplate} />
      ) : (
        <VStack gap="md">
          {options.map(option => (
            <ShippingOptionCard
              key={option.id || option.name}
              option={option}
              onEdit={() => handleEdit(option)}
              onDelete={() => handleDeleteClick(option)}
              disabled={isSaving}
            />
          ))}
        </VStack>
      )}

      {/* 添加/编辑表单 */}
      <ShippingOptionForm
        open={showForm}
        onOpenChange={setShowForm}
        initialOption={editingOption || undefined}
        onSave={handleSave}
        mode={editingOption ? 'edit' : 'create'}
      />

      {/* 删除确认弹窗 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t('shippingConfig.deleteConfirmTitle') || 'Delete Shipping Option'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('shippingConfig.deleteConfirmDesc') || 'Are you sure you want to delete'} &quot;
            {optionToDelete?.name || ''}&quot;?
          </p>
          <HStack gap="sm" justify="end" className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSaving}>
              {isSaving ? t('common.deleting') || 'Deleting...' : t('common.delete') || 'Delete'}
            </Button>
          </HStack>
        </DialogContent>
      </Dialog>
    </div>
  );
}
