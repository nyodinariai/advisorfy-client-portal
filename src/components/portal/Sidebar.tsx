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
  ChevronDown,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const navItems = [
  { href: '/inicio', label: 'Início', icon: LayoutDashboard },
  { href: '/calendario', label: 'Calendário', icon: CalendarDays },
  { href: '/notas-fiscais', label: 'Notas Fiscais', icon: FileText },
  { href: '/impostos', label: 'Impostos & Guias', icon: Receipt },
  { href: '/mensalidades', label: 'Mensalidades', icon: Wallet },
  { href: '/folha', label: 'Folha de Pagamento', icon: Users },
  { href: '/demonstracoes', label: 'Demonstrações', icon: BarChart3 },
  { href: '/obrigacoes', label: 'Obrigações', icon: ClipboardList },
  { href: '/minha-empresa', label: 'Minha Empresa', icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <aside className="hidden md:flex w-[252px] flex-col bg-card border-r border-border flex-shrink-0 sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-[18px] pt-[18px] pb-[14px] border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] bg-foreground text-background text-[11px] font-bold tracking-wide">
            A
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            AccountOS
          </span>
        </div>
      </div>

      {/* Company / user switcher */}
      <div className="px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-[10px] cursor-pointer transition-colors duration-[120ms] hover:bg-accent group">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-foreground text-background text-[11.5px] font-semibold"
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold text-foreground leading-tight truncate">
              {user?.name ?? '—'}
            </p>
            <p className="text-[11.5px] text-muted-foreground leading-tight truncate mt-[1px]">
              {user?.email ?? ''}
            </p>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0 opacity-60" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-[2px]">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-[11px] px-[11px] py-[9px] rounded-[9px] text-[14px] transition-all duration-[120ms]',
                active
                  ? 'bg-foreground text-background font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              style={!active ? { fontWeight: 450 } : undefined}
            >
              <Icon className="size-[15px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
