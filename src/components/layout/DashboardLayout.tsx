import React from 'react';
import { getSidebarData } from './Sidebar';
import DashboardShell from './DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { menuItems, userInfo } = await getSidebarData();

  return (
    <DashboardShell menuItems={menuItems} userInfo={userInfo}>
      {children}
    </DashboardShell>
  );
}
