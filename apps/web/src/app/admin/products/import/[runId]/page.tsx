'use client';

import { useParams } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { ProductImportWorkbenchPanel } from '@/components/admin/product-import/ProductImportWorkbenchPanel';

export default function ProductImportWorkbenchPage() {
  const { t } = useI18n();
  const params = useParams();
  const runId = typeof params?.runId === 'string' ? params.runId : '';

  if (!runId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t('admin.productImport.workbench.missingRun')}
      </div>
    );
  }

  return <ProductImportWorkbenchPanel key={runId} runId={runId} />;
}
