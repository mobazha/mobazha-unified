'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n, discountsApi } from '@mobazha/core';
import type { Discount } from '@mobazha/core';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DiscountForm } from '@/components/admin/DiscountForm';

export default function EditDiscountPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const discountID = params.id as string;

  const [discount, setDiscount] = useState<Discount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await discountsApi.getDiscount(discountID);
        setDiscount(d);
      } catch {
        toast({ variant: 'destructive', title: t('admin.discounts.fetchError') });
        router.push('/admin/discounts');
      } finally {
        setLoading(false);
      }
    })();
  }, [discountID, t, toast, router]);

  const handleSave = useCallback(
    async (data: Partial<Discount>) => {
      try {
        setSaving(true);
        await discountsApi.updateDiscount(discountID, data);
        toast({ title: t('admin.discounts.saved') });
        router.push('/admin/discounts');
      } catch {
        toast({ variant: 'destructive', title: t('admin.discounts.saveError') });
      } finally {
        setSaving(false);
      }
    },
    [discountID, t, toast, router]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!discount) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/discounts')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.discounts.editTitle')}</h1>
      </div>
      <DiscountForm
        initial={discount}
        onSave={handleSave}
        onCancel={() => router.push('/admin/discounts')}
        saving={saving}
      />
    </div>
  );
}
