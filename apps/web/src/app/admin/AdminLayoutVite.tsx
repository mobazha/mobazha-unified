'use client';

import { Outlet } from 'react-router-dom';
import AdminLayout from './layout';

export default function AdminLayoutVite() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
