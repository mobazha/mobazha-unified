'use client';

import { Outlet } from 'react-router-dom';
import HelpLayout from './layout';

export default function HelpLayoutVite() {
  return (
    <HelpLayout>
      <Outlet />
    </HelpLayout>
  );
}
