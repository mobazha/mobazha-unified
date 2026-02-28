'use client';

import React, { useState } from 'react';
import { useI18n } from '@mobazha/core';
import { STORE_PRESETS } from '@/components/store-sections';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PresetPickerProps {
  open: boolean;
  onSelect: (presetId: string) => void;
  onClose: () => void;
}

export function PresetPicker({ open, onSelect, onClose }: PresetPickerProps) {
  const { t } = useI18n();
  const [pendingPresetId, setPendingPresetId] = useState<string | null>(null);

  const handlePresetClick = (presetId: string) => {
    setPendingPresetId(presetId);
  };

  const handleConfirm = () => {
    if (pendingPresetId) {
      onSelect(pendingPresetId);
      setPendingPresetId(null);
    }
  };

  const handleCancelConfirm = () => {
    setPendingPresetId(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={v => {
          if (!v) onClose();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.storeBranding.chooseTemplate')}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {STORE_PRESETS.map(preset => {
                const { theme, sections } = preset.config;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetClick(preset.id)}
                    className="text-left border border-border rounded-lg p-4 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex gap-1.5 mb-3">
                      <div
                        className="w-8 h-8 rounded-full border border-border"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <div
                        className="w-8 h-8 rounded-full border border-border"
                        style={{ backgroundColor: theme.secondaryColor }}
                      />
                      <div
                        className="w-8 h-8 rounded-full border border-border"
                        style={{ backgroundColor: theme.accentColor }}
                      />
                    </div>
                    <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                      {preset.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {sections.length} section(s) · {theme.fontFamily}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingPresetId}
        onOpenChange={v => {
          if (!v) handleCancelConfirm();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.storeBranding.presetConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.storeBranding.presetConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirm}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {t('admin.storeBranding.applyPreset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
