'use client';

import { LogOut, Building2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

export function Header() {
  const { logout } = useAuth();
  const user = useAuthStore((s) => s.user);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      {/* Mobile menu placeholder */}
      <Button variant="ghost" size="icon" className="md:hidden">
        <Menu className="size-5" />
      </Button>

      {/* Company name */}
      <div className="hidden md:flex items-center gap-2 text-sm">
        <Building2 className="size-4 text-muted-foreground" />
        <span className="font-medium">{user?.companyName ?? '—'}</span>
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-normal hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </span>
          <span className="hidden sm:block">{user?.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">{user?.email}</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
