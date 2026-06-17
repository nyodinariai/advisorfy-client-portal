'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Receipt,
  Users,
  BarChart3,
  ClipboardList,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/inicio', label: 'Início', icon: LayoutDashboard },
  { href: '/calendario', label: 'Calendário', icon: CalendarDays },
  { href: '/notas-fiscais', label: 'Notas Fiscais', icon: FileText },
  { href: '/impostos', label: 'Impostos', icon: Receipt },
  { href: '/folha', label: 'Folha de Pagamento', icon: Users },
  { href: '/demonstracoes', label: 'Demonstrações', icon: BarChart3 },
  { href: '/obrigacoes', label: 'Obrigações', icon: ClipboardList },
  { href: '/minha-empresa', label: 'Minha Empresa', icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <Building2 className="size-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight">AccountOS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
