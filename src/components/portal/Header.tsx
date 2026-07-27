'use client';

import { usePathname } from 'next/navigation';
import { LogOut, Bell, Search, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

const PAGE_TITLES: Record<string, string> = {
  '/inicio': 'Início',
  '/calendario': 'Calendário',
  '/documentos': 'Documentos',
  '/impostos': 'Impostos & Guias',
  '/folha': 'Folha de Pagamento',
  '/demonstracoes': 'Demonstrações',
  '/obrigacoes': 'Obrigações',
  '/minha-empresa': 'Minha Empresa',
};

export function Header() {
  const { logout } = useAuth();
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();

  const firstName = user?.name?.split(' ')[0] ?? '';
  const pageTitle = PAGE_TITLES[pathname] ?? 'Portal';

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-4 px-7 border-b border-border"
      style={{
        height: '60px',
        background: 'oklch(from var(--card) l c h / 0.85)',
        backdropFilter: 'saturate(160%) blur(12px)',
        WebkitBackdropFilter: 'saturate(160%) blur(12px)',
      }}
    >
      {/* Mobile menu */}
      <button
        type="button"
        className="md:hidden flex items-center justify-center size-9 rounded-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Menu className="size-5" />
      </button>

      {/* Page heading */}
      <div className="hidden md:flex flex-col justify-center flex-1 min-w-0">
        {firstName && (
          <span className="text-[11.5px] text-muted-foreground leading-tight">
            Olá, {firstName}
          </span>
        )}
        <span className="text-[15px] font-semibold text-foreground leading-tight">
          {pageTitle}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-muted rounded-full px-3.5 py-2 text-muted-foreground min-w-[220px] border border-transparent focus-within:bg-card focus-within:border-border transition-all duration-[140ms]">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar documentos, guias..."
            className="flex-1 bg-transparent outline-none text-[13.5px] text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Bell */}
        <button
          type="button"
          className="flex items-center justify-center size-9 rounded-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Bell className="size-[17px]" />
        </button>

        {/* User avatar with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-9 items-center justify-center rounded-full bg-foreground text-background text-[12px] font-semibold outline-none hover:opacity-90 transition-opacity flex-shrink-0">
            {initials}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5">
              <p className="text-[13px] font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
