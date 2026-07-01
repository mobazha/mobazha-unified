'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui';
import { useI18n, useShippingAddresses, toDisplayAddressUI } from '@mobazha/core';
import type { Address as ApiAddress, DisplayAddress, DisplayAddressUI } from '@mobazha/core';
import { Plus, MapPin, Edit2, Trash2, Loader2 } from 'lucide-react';
import { AddressFormModal } from '@/components/Address';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { EmptyState } from '@/components/ui/empty-state';

export default function AddressesSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  // 使用真实的地址管理 hook
  const {
    addresses: apiAddresses,
    isLoading,
    isSaving,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useShippingAddresses();

  // 将 API 地址转换为 UI 格式
  const addresses = useMemo(() => apiAddresses.map(toDisplayAddressUI), [apiAddresses]);

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DisplayAddress | null>(null);

  // 添加地址
  const handleAddAddress = useCallback(
    async (address: ApiAddress) => {
      const success = await addAddress(address);
      if (success) {
        toast({ title: t('address.added') });
        setShowAddModal(false);
      }
      return success;
    },
    [addAddress, toast, t]
  );

  // 更新地址
  const handleUpdateAddress = useCallback(
    async (address: ApiAddress) => {
      if (!editingAddress) return false;
      const success = await updateAddress(editingAddress.id, address);
      if (success) {
        toast({ title: t('address.updated') });
        setEditingAddress(null);
      }
      return success;
    },
    [editingAddress, updateAddress, toast, t]
  );

  // 删除地址
  const handleDeleteAddress = useCallback(
    async (id: string) => {
      const success = await deleteAddress(id);
      if (success) {
        toast({ title: t('address.deleted') });
      }
    },
    [deleteAddress, toast, t]
  );

  // 设为默认地址
  const handleSetDefault = useCallback(
    async (id: string) => {
      const success = await setDefaultAddress(id);
      if (success) {
        toast({ title: t('address.setAsDefault') });
      }
    },
    [setDefaultAddress, toast, t]
  );

  // 打开编辑模态框
  const handleEdit = useCallback(
    (uiAddress: DisplayAddressUI) => {
      // 找到对应的 API 地址
      const apiAddr = apiAddresses.find(a => a.id === uiAddress.id);
      if (apiAddr) {
        setEditingAddress(apiAddr);
      }
    },
    [apiAddresses]
  );

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.addresses')}
        description={t('settingsModal.addressesDescription')}
        actions={
          addresses.length > 0 ? (
            <Button size="sm" onClick={() => setShowAddModal(true)} disabled={isSaving}>
              <Plus className="w-4 h-4 mr-2" />
              {t('address.addAddress')}
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <Card className="p-4 md:p-6">
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </Card>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t('settingsExtended.noAddresses')}
          description={t('me.addressesDesc')}
          action={{ label: t('address.addAddress'), onClick: () => setShowAddModal(true) }}
        />
      ) : (
        <Card className="p-4 md:p-6">
          <div className="space-y-3">
            {addresses.map(address => (
              <div
                key={address.id}
                className="flex items-start justify-between py-3 first:pt-0 last:pb-0 border-b border-border last:border-0"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{address.name || t('address.noName')}</p>
                      {address.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {t('common.default')}
                        </span>
                      )}
                    </div>
                    {address.street && (
                      <p className="text-sm text-muted-foreground mt-1">{address.street}</p>
                    )}
                    {(address.city || address.state || address.postalCode) && (
                      <p className="text-sm text-muted-foreground">
                        {[address.city, address.state, address.postalCode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    {address.country && (
                      <p className="text-sm text-muted-foreground">{address.country}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!address.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(address.id)}
                      disabled={isSaving}
                    >
                      {t('address.setDefault')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(address)}
                    disabled={isSaving}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteAddress(address.id)}
                    disabled={isSaving}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Address Modal */}
      <AddressFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddAddress}
        isSaving={isSaving}
      />

      {/* Edit Address Modal */}
      <AddressFormModal
        isOpen={!!editingAddress}
        onClose={() => setEditingAddress(null)}
        onSave={handleUpdateAddress}
        address={editingAddress}
        isSaving={isSaving}
      />
    </div>
  );
}
