'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, FileText, Receipt, Circle,
  CalendarDays, List as ListIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { useActivityDeadlines } from '@/features/calendario/queries';
import { useDas } from '@/features/fiscal/queries';
import type { CalendarEvent } from '@/features/calendario/types';
import { formatCurrency } from '@/lib/format';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

const EVENT_VISUALS: Record<string, { icon: typeof FileText; className: string }> = {
  das: { icon: Receipt, className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  NF: { icon: FileText, className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  FOLHA: { icon: FileText, className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  OUTRO: { icon: FileText, className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
};

function eventVisual(event: CalendarEvent) {
  const key = event.type === 'das' ? 'das' : (event.category ?? 'OUTRO');
  return EVENT_VISUALS[key] ?? EVENT_VISUALS.OUTRO;
}

// ---------------------------------------------------------------------------
// Event badge
// ---------------------------------------------------------------------------

function EventBadge({ event }: { event: CalendarEvent }) {
  if (event.type === 'das') {
    return (
      <div className="flex items-center gap-1 rounded px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px] font-medium truncate">
        <Receipt className="size-2.5 shrink-0" />
        <span className="truncate">DAS</span>
      </div>
    );
  }

  const colors: Record<string, string> = {
    NF: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    FOLHA: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    OUTRO: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  };

  return (
    <div
      className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium truncate ${colors[event.category ?? 'OUTRO']}`}
    >
      <FileText className="size-2.5 shrink-0" />
      <span className="truncate">{event.title}</span>
    </div>
  );
}

function DaysBadge({ date }: { date: Date }) {
  const days = daysUntil(date);
  const label = days < 0 ? 'Atrasado' : days === 0 ? 'Hoje' : `${days}d`;
  const className =
    days < 0
      ? 'border-red-300 text-red-700 dark:text-red-400'
      : days <= 3
      ? 'border-orange-300 text-orange-700 dark:text-orange-400'
      : '';
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CalendarioPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { data: deadlines, isLoading: deadlinesLoading } = useActivityDeadlines();
  const { data: dasList } = useDas(companyId);

  const events = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = [];

    deadlines?.forEach((d) => {
      const date = new Date(year, month, d.diaDoMes);
      result.push({
        id: `deadline-${d.id}`,
        title: d.titulo,
        date,
        type: 'deadline',
        category: d.categoria,
        status: 'PENDENTE',
        deadlineId: d.id,
      });
    });

    dasList?.forEach((das) => {
      const date = new Date(das.vencimento);
      if (date.getMonth() === month && date.getFullYear() === year) {
        result.push({
          id: `das-${das.id}`,
          title: `DAS ${das.competencia}`,
          date,
          type: 'das',
          valor: das.valor,
          dasId: das.id,
        });
      }
    });

    return result;
  }, [deadlines, dasList, year, month]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events.forEach((e) => {
      const day = e.date.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(e);
    });
    return map;
  }, [events]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [events]
  );

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => {
    const day = i < firstDay ? null : i - firstDay + 1;
    return day;
  });

  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Calendário de Atividades</h1>

      <Card>
        {/* Month navigation */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-base font-semibold">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <Tabs defaultValue="calendario">
          <div className="border-b px-4 pt-3">
            <TabsList>
              <TabsTrigger value="calendario">
                <CalendarDays className="mr-1.5 size-4" />
                Calendário
              </TabsTrigger>
              <TabsTrigger value="lista">
                <ListIcon className="mr-1.5 size-4" />
                Lista
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Calendário */}
          <TabsContent value="calendario" className="mt-0">
            <CardContent className="p-0">
              {/* Day names */}
              <div className="grid grid-cols-7 border-b text-center">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="py-2 text-xs font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {deadlinesLoading ? (
                <div className="grid grid-cols-7 gap-px p-4">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7">
                  {cells.map((day, idx) => {
                    const isToday =
                      day !== null &&
                      day === today.getDate() &&
                      month === today.getMonth() &&
                      year === today.getFullYear();
                    const dayEvents = day ? eventsByDay[day] ?? [] : [];

                    return (
                      <div
                        key={idx}
                        className={`min-h-[80px] border-b border-r p-1.5 ${
                          !day ? 'bg-muted/30' : ''
                        }`}
                      >
                        {day && (
                          <>
                            <span
                              className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                                isToday
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-foreground'
                              }`}
                            >
                              {day}
                            </span>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 2).map((ev) => (
                                <button
                                  key={ev.id}
                                  type="button"
                                  className="w-full text-left"
                                  onClick={() => setSelectedEvent(ev)}
                                >
                                  <EventBadge event={ev} />
                                </button>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="flex items-center gap-0.5 px-1 text-[10px] text-muted-foreground">
                                  <Circle className="size-1.5 fill-current" />
                                  +{dayEvents.length - 2}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </TabsContent>

          {/* Lista */}
          <TabsContent value="lista" className="mt-0">
            <CardContent>
              {deadlinesLoading ? (
                <div className="divide-y">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : sortedEvents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum evento neste mês.
                </p>
              ) : (
                <div className="divide-y">
                  {sortedEvents.map((ev) => {
                    const visual = eventVisual(ev);
                    const Icon = visual.icon;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedEvent(ev)}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${visual.className}`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{ev.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {DAY_NAMES[ev.date.getDay()]}, dia {ev.date.getDate()}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {ev.valor != null && (
                            <span className="text-sm font-semibold">{formatCurrency(ev.valor)}</span>
                          )}
                          <DaysBadge date={ev.date} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Event detail drawer */}
      <Sheet open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedEvent?.title}</SheetTitle>
          </SheetHeader>
          {selectedEvent && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2 rounded-lg border p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">
                    {selectedEvent.date.toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium">
                    {selectedEvent.type === 'das' ? 'Guia DAS' : 'Prazo de atividade'}
                  </span>
                </div>
                {selectedEvent.valor && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-semibold">{formatCurrency(selectedEvent.valor)}</span>
                  </div>
                )}
                {selectedEvent.category && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Categoria</span>
                    <Badge variant="outline">{selectedEvent.category}</Badge>
                  </div>
                )}
              </div>
              {selectedEvent.type === 'deadline' && selectedEvent.category === 'NF' && (
                <a
                  href="/documentos"
                  className="block rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-center text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  Enviar notas fiscais
                </a>
              )}
              {selectedEvent.type === 'das' && (
                <a
                  href="/impostos"
                  className="block rounded-lg border border-blue-400/40 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-center text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                >
                  Ver guia de imposto
                </a>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
