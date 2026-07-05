'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from '@/components/portal/Sidebar';
import { Header } from '@/components/portal/Header';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'LEAD') {
      router.replace('/onboarding');
    }
  }, [user, router]);

  if (!user || user.role === 'LEAD') return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 p-7 w-full max-w-[1280px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
