'use client';

import { useI18n } from '@mobazha/core';
import type { InventoryPolicy } from '@mobazha/core';

interface InventoryPolicyFieldProps {
  value: InventoryPolicy;
  onChange: (value: InventoryPolicy) => void;
  className?: string;
}

export function InventoryPolicyField({ value, onChange, className }: InventoryPolicyFieldProps) {
  const { t } = useI18n();
  const continueSelling = value === 'continue';

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">
            {t('listing.inventoryPolicy.label')}
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('listing.inventoryPolicy.helper')}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={continueSelling}
          onClick={() => onChange(continueSelling ? 'deny' : 'continue')}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            continueSelling ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              continueSelling ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
