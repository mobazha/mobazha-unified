'use client';

import { Outlet } from 'react-router-dom';
import { AiSectionShell } from '@/components/admin/ai/AiSectionShell';

export default function AdminAiSectionLayoutVite() {
  return (
    <AiSectionShell>
      <Outlet />
    </AiSectionShell>
  );
}
