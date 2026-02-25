'use client';

import React from 'react';
import { AddressDrawer, AddressFormModal } from '@/components/Address';
import type { Address as FrontendAddress } from '@/components/Address';
import { useI18n } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import type { AddressActions } from './types';

interface Props {
  addressActions: AddressActions;
  addresses: FrontendAddress[];
  selectedAddress: string;
  onSelectAddress: (id: string) => void;
}

export function CheckoutAddressModals({
  addressActions,
  addresses,
  selectedAddress,
  onSelectAddress,
}: Props) {
  const { t } = useI18n();
  const { toast } = useToast();

  return (
    <>
      <AddressDrawer
        isOpen={addressActions.showDrawer}
        onClose={() => addressActions.setShowDrawer(false)}
        addresses={addresses}
        selectedAddressId={selectedAddress}
        onSelect={onSelectAddress}
        onAddNew={() => {
          addressActions.setEditingAddress(null);
          addressActions.setShowForm(true);
        }}
        onEdit={addr => {
          const apiAddr = addressActions.apiAddresses.find(a => a.id === addr.id);
          if (apiAddr) {
            addressActions.setEditingAddress(apiAddr);
            addressActions.setShowForm(true);
          }
        }}
        onDelete={async addressId => {
          const success = await addressActions.deleteAddress(addressId);
          if (success) {
            toast({ title: t('address.deleted') });
            if (selectedAddress === addressId) {
              onSelectAddress(addressActions.defaultAddress?.id || '');
            }
          }
        }}
        onSetDefault={async addressId => {
          const success = await addressActions.setDefaultAddress(addressId);
          if (success) toast({ title: t('address.setAsDefault') });
        }}
        isLoading={addressActions.isLoading}
      />

      <AddressFormModal
        isOpen={addressActions.showForm}
        onClose={() => {
          addressActions.setShowForm(false);
          addressActions.setEditingAddress(null);
        }}
        address={addressActions.editingAddress}
        isSaving={addressActions.isSaving}
        onSave={async address => {
          let success: boolean;
          if (addressActions.editingAddress) {
            success = await addressActions.updateAddress(addressActions.editingAddress.id, address);
          } else {
            success = await addressActions.addAddress(address);
          }
          if (success) {
            toast({
              title: addressActions.editingAddress ? t('address.updated') : t('address.added'),
            });
            addressActions.setShowForm(false);
            addressActions.setEditingAddress(null);
          }
          return success;
        }}
      />
    </>
  );
}
