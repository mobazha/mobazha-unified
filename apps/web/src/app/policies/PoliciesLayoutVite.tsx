'use client';

import { Outlet } from 'react-router-dom';
import PoliciesLayout from './layout';

export default function PoliciesLayoutVite() {
  return (
    <PoliciesLayout>
      <Outlet />
    </PoliciesLayout>
  );
}
