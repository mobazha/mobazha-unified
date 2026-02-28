'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import type { StoreSection, SectionType } from '@mobazha/core';
import { ADDABLE_SECTION_TYPES } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { SECTION_REGISTRY } from '@/components/store-sections';

interface AddSectionPickerProps {
  open: boolean;
  existingSections: StoreSection[];
  onAdd: (type: SectionType) => void;
  onClose: () => void;
}

const SINGLE_INSTANCE_TYPES: SectionType[] = [
  'hero',
  'announcement-bar',
  'product-grid',
  'store-tabs',
];

export function AddSectionPicker({
  open,
  existingSections,
  onAdd,
  onClose,
}: AddSectionPickerProps) {
  const { t } = useI18n();

  const existingTypes = new Set(existingSections.map(s => s.type));
  const available = ADDABLE_SECTION_TYPES.filter(type => {
    if (SINGLE_INSTANCE_TYPES.includes(type) && existingTypes.has(type)) {
      return false;
    }
    return true;
  });

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('admin.storeBranding.addSection')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {available.map(type => {
              const meta = SECTION_REGISTRY.find(m => m.type === type);
              if (!meta) return null;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onAdd(type)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center group"
                >
                  <span className="text-2xl">{meta.icon}</span>
                  <span className="text-xs font-medium group-hover:text-primary transition-colors">
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                    {meta.description}
                  </span>
                </button>
              );
            })}
          </div>

          {available.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('admin.storeBranding.allSectionsAdded')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
