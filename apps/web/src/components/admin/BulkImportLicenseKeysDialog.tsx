'use client';

import { useMemo, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useI18n, parseLicenseKeyLines, importLicenseKeysForProducts } from '@mobazha/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export interface BulkImportLicenseTarget {
  slug: string;
  title: string;
}

interface BulkImportLicenseKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: BulkImportLicenseTarget[];
  onComplete: (successCount: number, importedTotal: number) => void;
}

export function BulkImportLicenseKeysDialog({
  open,
  onOpenChange,
  targets,
  onComplete,
}: BulkImportLicenseKeysDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [keysBySlug, setKeysBySlug] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const assignments = useMemo(
    () =>
      targets.map(target => ({
        slug: target.slug,
        keys: parseLicenseKeyLines(keysBySlug[target.slug] ?? ''),
      })),
    [targets, keysBySlug]
  );

  const totalKeys = useMemo(
    () => assignments.reduce((sum, item) => sum + item.keys.length, 0),
    [assignments]
  );

  const handleSubmit = async () => {
    const withKeys = assignments.filter(a => a.keys.length > 0);
    if (withKeys.length === 0) return;
    setSubmitting(true);
    try {
      const results = await importLicenseKeysForProducts(assignments);
      const successes = results.filter(r => r.ok);
      const importedTotal = successes.reduce((sum, r) => sum + (r.imported ?? 0), 0);
      const failedCount = results.filter(r => !r.ok && r.error !== 'no_keys').length;

      if (successes.length > 0) {
        toast({
          title: t('admin.products.bulkImportSuccess', {
            products: successes.length,
            keys: importedTotal,
          }),
        });
      }
      if (failedCount > 0) {
        toast({
          title: t('common.error'),
          description: t('admin.products.bulkImportPartialFail', { count: failedCount }),
          variant: 'destructive',
        });
      }
      onComplete(successes.length, importedTotal);
      onOpenChange(false);
      setKeysBySlug({});
    } catch {
      toast({
        title: t('common.error'),
        description: t('listing.digital.importFailed'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !submitting && onOpenChange(open)}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            {t('admin.products.bulkImportTitle')}
          </DialogTitle>
          <DialogDescription>{t('admin.products.bulkImportDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {targets.map(target => {
            const parsed = parseLicenseKeyLines(keysBySlug[target.slug] ?? '');
            return (
              <div key={target.slug} className="rounded-lg border border-border p-3 space-y-2">
                <Label htmlFor={`keys-${target.slug}`} className="font-medium">
                  {target.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({parsed.length})
                  </span>
                </Label>
                <Textarea
                  id={`keys-${target.slug}`}
                  value={keysBySlug[target.slug] ?? ''}
                  onChange={e =>
                    setKeysBySlug(prev => ({ ...prev, [target.slug]: e.target.value }))
                  }
                  placeholder={t('admin.products.bulkImportPlaceholder')}
                  rows={4}
                  disabled={submitting}
                  className="font-mono text-xs"
                />
              </div>
            );
          })}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || totalKeys === 0}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('admin.products.bulkImportConfirm', { count: totalKeys })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
