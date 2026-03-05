'use client';

import React from 'react';
import { StoreBrandingEditor } from '@/components/store-editor/StoreBrandingEditor';

export default function AdminStoreBrandingPage() {
  return <StoreBrandingEditor backHref="/admin/settings/store" />;
}
