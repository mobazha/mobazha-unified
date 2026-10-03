'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

interface FieldErrorProps {
  /**
   * Either a translation key (preferred, produced by useListingForm) or an
   * already translated message. Keys that are missing fall back to the raw
   * string, so callers can keep passing literal messages during migration.
   */
  message?: string;
  className?: string;
}

/**
 * Inline validation message rendered next to the field it belongs to.
 * Announces itself to assistive technology and follows the destructive colour
 * token used by the form inputs.
 */
export function FieldError({ message, className }: FieldErrorProps) {
  const { t } = useI18n();

  if (!message) return null;

  return (
    <p role="alert" className={cn('mt-1 text-xs text-destructive', className)}>
      {t(message)}
    </p>
  );
}

export default FieldError;
