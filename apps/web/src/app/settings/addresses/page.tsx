'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, useToast } from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { ChevronLeft, Plus, MapPin, Edit2, Trash2 } from 'lucide-react';

interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

// TODO: 集成真实 API - 替换 mock 数据，使用后端地址管理 API
const mockAddresses: Address[] = [
  {
    id: '1',
    name: 'Home',
    street: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'United States',
    isDefault: true,
  },
  {
    id: '2',
    name: 'Office',
    street: '456 Market Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94103',
    country: 'United States',
    isDefault: false,
  },
];

export default function AddressesSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>(mockAddresses);
  const [showAddModal, setShowAddModal] = useState(false);
  const [_editingAddress, setEditingAddress] = useState<Address | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  const handleAddAddress = () => {
    const newAddress: Address = {
      id: Date.now().toString(),
      ...formData,
      isDefault: addresses.length === 0,
    };
    setAddresses([...addresses, newAddress]);
    setShowAddModal(false);
    setFormData({ name: '', street: '', city: '', state: '', postalCode: '', country: '' });
    toast({ title: t('common.success'), description: 'Address added' });
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses(addresses.filter(a => a.id !== id));
    toast({ title: t('common.success'), description: 'Address deleted' });
  };

  const handleSetDefault = (id: string) => {
    setAddresses(
      addresses.map(a => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
  };

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t('settings.sidebar.addresses')}</h1>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('common.add')}
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('settingsExtended.noAddresses')}</p>
          <Button className="mt-4" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('settingsExtended.addAddress')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map(address => (
            <Card key={address.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{address.name}</p>
                      {address.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {t('common.default')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{address.street}</p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.state} {address.postalCode}
                    </p>
                    <p className="text-sm text-muted-foreground">{address.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!address.isDefault && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(address.id)}>
                      {t('common.setDefault')}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setEditingAddress(address)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteAddress(address.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Address Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.addAddress')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('common.name')}</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Home, Office, etc."
              />
            </div>
            <div>
              <Label>{t('address.street')}</Label>
              <Input
                value={formData.street}
                onChange={e => setFormData({ ...formData, street: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('address.city')}</Label>
                <Input
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('address.state')}</Label>
                <Input
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('address.postalCode')}</Label>
                <Input
                  value={formData.postalCode}
                  onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('address.country')}</Label>
                <Input
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleAddAddress}>
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
