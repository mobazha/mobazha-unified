'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';

interface Props {
  hasMixedContractTypes: boolean;
  hasMissingContractType: boolean;
}

/** Inline alert when checkout cart has mixed or missing contract types. */
export function CheckoutContractTypeAlert({
  hasMixedContractTypes,
  hasMissingContractType,
}: Props) {
  const { t } = useI18n();

  if (!hasMixedContractTypes && !hasMissingContractType) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
    >
      <p className="font-medium">
        {hasMixedContractTypes
          ? t('order.mixedContractTypesTitle')
          : t('order.missingContractTypeTitle')}
      </p>
      <p className="mt-1 text-muted-foreground">
        {hasMixedContractTypes
          ? t('order.mixedContractTypesBody')
          : t('order.missingContractTypeBody')}
      </p>
    </div>
  );
}
