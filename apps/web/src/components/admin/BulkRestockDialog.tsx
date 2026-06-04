'use client';

import { useMemo, useState } from 'react';
import { Loader2, PackagePlus } from 'lucide-react';
import { useI18n, restockTrackedProducts } from '@mobazha/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export interface BulkRestockTarget {
  slug: string;
  title: string;
}

interface BulkRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: BulkRestockTarget[];
  onComplete: (successCount: number) => void;
}

export function BulkRestockDialog({
  open,
  onOpenChange,
  targets,
  onComplete,
}: BulkRestockDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [addQuantity, setAddQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const quantity = useMemo(() => parseInt(addQuantity, 10) || 0, [addQuantity]);

  const handleSubmit = async () => {
    if (quantity <= 0 || targets.length === 0) return;
    setSubmitting(true);
    try {
      const results = await restockTrackedProducts(
        targets.map(target => target.slug),
        quantity
      );
      const successCount = results.filter(r => r.ok).length;
      const failedCount = results.length - successCount;
      if (successCount > 0) {
        toast({
          title: t('admin.products.bulkRestockSuccess', { count: successCount }),
        });
      }
      if (failedCount > 0) {
        toast({
          title: t('common.error'),
          description: t('admin.products.bulkRestockPartialFail', { count: failedCount }),
          variant: 'destructive',
        });
      }
      onComplete(successCount);
      onOpenChange(false);
      setAddQuantity('1');
    } catch {
      toast({
        title: t('common.error'),
        description: t('common.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !submitting && onOpenChange(open)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5" />
            {t('admin.products.bulkRestockTitle')}
          </DialogTitle>
          <DialogDescription>{t('admin.products.bulkRestockDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="bulk-restock-qty">{t('admin.products.bulkRestockQuantityLabel')}</Label>
            <Input
              id="bulk-restock-qty"
              type="number"
              min={1}
              value={addQuantity}
              onChange={e => setAddQuantity(e.target.value)}
              disabled={submitting}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.products.bulkRestockQuantityHint')}
            </p>
          </div>

          <ul className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border text-sm">
            {targets.map(target => (
              <li key={target.slug} className="px-3 py-2 truncate">
                {target.title}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || quantity <= 0}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('admin.products.bulkRestockConfirm', { count: targets.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
