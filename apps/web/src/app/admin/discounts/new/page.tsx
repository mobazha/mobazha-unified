'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, discountsApi } from '@mobazha/core';
import type { Discount } from '@mobazha/core';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DiscountForm } from '@/components/admin/DiscountForm';

export default function NewDiscountPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(
    async (data: Partial<Discount>) => {
      try {
        setSaving(true);
        await discountsApi.createDiscount(data);
        toast({ title: t('admin.discounts.created') });
        router.push('/admin/discounts');
      } catch {
        toast({ variant: 'destructive', title: t('admin.discounts.createError') });
      } finally {
        setSaving(false);
      }
    },
    [t, toast, router]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/discounts')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.discounts.createTitle')}</h1>
      </div>
      <DiscountForm
        onSave={handleSave}
        onCancel={() => router.push('/admin/discounts')}
        saving={saving}
      />
    </div>
  );
}
