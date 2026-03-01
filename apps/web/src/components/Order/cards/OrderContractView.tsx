'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import type { Order as CoreOrder } from '@mobazha/core';

export interface OrderContractViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coreOrder?: CoreOrder | null;
  onCopy: () => void;
}

export const OrderContractView = memo(function OrderContractView({
  open,
  onOpenChange,
  coreOrder,
  onCopy,
}: OrderContractViewProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[85vh] sm:max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base font-semibold text-center">
            {t('order.actions.viewContract')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-background px-2 py-2.5">
          <pre className="text-[12px] leading-[18px] font-mono text-foreground whitespace-pre-wrap break-all px-2">
            {coreOrder ? JSON.stringify(coreOrder, null, 2) : t('common.noData')}
          </pre>
        </div>
        <div className="px-4 py-3 border-t shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button onClick={onCopy} className="w-full h-11 text-sm font-semibold gap-2">
            <Copy className="w-4 h-4" />
            {t('order.actions.copyToClipboard')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
