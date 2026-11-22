'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, LayoutGrid, List, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hubService, type ComunicadoView, type HubResponse } from '@/services/hub';
import type { OpcaoDeAcesso, PreAuthResponse } from '@/types/auth';

/** Quantas opções entram na grade antes de "Mostrar mais". */
const LIMITE = 5;
/** Com poucas opções a busca e os filtros são ruído: só aparecem acima disto. */
const MINIMO_PARA_FERRAMENTAS = 3;

const ROTULO_TIPO: Record<OpcaoDeAcesso['tipo'], string> = {
  EMPRESA: 'Empresa',
  ESCRITORIO: 'Escritório contábil',
  CANDIDATURA: 'Candidatura de parceiro',
  PLATAFORMA: 'Plataforma',
};

/** O link vira um href: só endereço seguro, mesmo que o servidor já valide. */
const linkSeguro = (link: string | null) => (link && link.startsWith('https://') ? link : null);

const ultimoAcesso = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : null);

interface Props {
  preAuth: PreAuthResponse;
  /** Texto do título: "Minhas empresas" no portal, "Meu escritório" no ERP. */
  titulo: string;
  subtitulo: string;
  onSelect: (ref: string) => Promise<void>;
  onBack: () => void;
}

/**
 * A tela de entrada, depois do login e antes de escolher a empresa: as opções de acesso em primeiro lugar, um cartão de divulgação dentro da grade, os avisos importantes numa
 * faixa no topo e os treinamentos no fim. Tudo é autenticado só pelo token de pré-autenticação do login.
 */
export function EntradaHub({ preAuth, titulo, subtitulo, onSelect, onBack }: Props) {
  const queryClient = useQueryClient();
  const chave = ['entrada-hub', preAuth.preAuthToken];
  const hub = useQuery({ queryKey: chave, queryFn: () => hubService.carregar(preAuth.preAuthToken), retry: false, staleTime: 60_000 });

  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState(false);
  const [soFavoritas, setSoFavoritas] = useState(false);
  const [ordem, setOrdem] = useState<'recente' | 'nome'>('recente');
  const [tudo, setTudo] = useState(false);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  const dados: HubResponse | undefined = hub.data;
  const extras = useMemo(() => dados?.opcoes ?? {}, [dados]);
  const divulgacoes = dados?.divulgacoes ?? [];

  const favoritar = useMutation({
    mutationFn: ({ ref, favorita }: { ref: string; favorita: boolean }) => hubService.favoritar(preAuth.preAuthToken, ref, favorita),
    onMutate: ({ ref, favorita }) => {
      queryClient.setQueryData<HubResponse>(chave, (atual) => (atual ? { ...atual, opcoes: { ...atual.opcoes, [ref]: { ...(atual.opcoes[ref] ?? { ultimoAcesso: null }), favorita } } } : atual));
    },
    onError: () => {
      toast.error('Não foi possível salvar o favorito.');
      void queryClient.invalidateQueries({ queryKey: chave });
    },
  });

  // A contagem de visualizações é uma por comunicado por abertura da tela; o clique conta cada vez.
  const vistos = useRef(new Set<string>());
  function contarVisualizacao(c: ComunicadoView) {
    if (vistos.current.has(c.id)) return;
    vistos.current.add(c.id);
    void hubService.registrar(preAuth.preAuthToken, c.id, 'VISUALIZACAO').catch(() => undefined);
  }
  useEffect(() => {
    (dados?.avisos ?? []).forEach(contarVisualizacao);
    (dados?.treinamentos ?? []).forEach(contarVisualizacao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);
  useEffect(() => {
    if (divulgacoes.length > 0) contarVisualizacao(divulgacoes[slide % divulgacoes.length]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, dados]);
  useEffect(() => {
    if (divulgacoes.length < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setSlide((s) => s + 1), 7000);
    return () => clearInterval(t);
  }, [divulgacoes.length]);

  const opcoes = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filtradas = preAuth.opcoes.filter((o) => o.tipo !== 'PLATAFORMA')
      .filter((o) => !q || o.nome.toLowerCase().includes(q))
      .filter((o) => !soFavoritas || extras[o.ref]?.favorita);
    return [...filtradas].sort((a, b) => {
      if (ordem === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
      const ta = extras[a.ref]?.ultimoAcesso ? new Date(extras[a.ref].ultimoAcesso as string).getTime() : 0;
      const tb = extras[b.ref]?.ultimoAcesso ? new Date(extras[b.ref].ultimoAcesso as string).getTime() : 0;
      return tb - ta || a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [preAuth.opcoes, busca, soFavoritas, ordem, extras]);

  const comFerramentas = preAuth.opcoes.length > MINIMO_PARA_FERRAMENTAS;
  const visiveis = tudo || !comFerramentas ? opcoes : opcoes.slice(0, LIMITE);

  async function entrar(ref: string) {
    setCarregando(ref);
    try {
      await onSelect(ref);
    } catch {
      toast.error('Não foi possível acessar. Tente novamente.');
      setCarregando(null);
    }
  }

  const promo = divulgacoes.length > 0 ? divulgacoes[slide % divulgacoes.length] : null;
  const link = promo ? linkSeguro(promo.link) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
        <span className="text-lg font-semibold tracking-tight">Advisorfy</span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{preAuth.nome}</span>
          <Button variant="outline" size="sm" onClick={onBack}>Trocar conta</Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        {(dados?.avisos ?? []).map((a) => {
          const href = linkSeguro(a.link);
          return (
            <div key={a.id} role="status" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm">
              <span className="font-semibold text-destructive">{a.titulo}</span>
              {a.texto && <span className="ml-2 text-foreground">{a.texto}</span>}
              {href && (
                <a
                  href={href} target="_blank" rel="noopener noreferrer" className="ml-2 font-medium underline"
                  onClick={() => void hubService.registrar(preAuth.preAuthToken, a.id, 'CLIQUE').catch(() => undefined)}
                >
                  {a.textoDoLink ?? 'Saiba mais'}
                </a>
              )}
            </div>
          );
        })}

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
        </div>

        {comFerramentas && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="entrada-busca" className="pl-9" placeholder="Busque sua empresa" aria-label="Buscar empresa" value={busca} onChange={(e) => { setBusca(e.target.value); setTudo(false); }} />
            </div>
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button type="button" aria-label="Grade" aria-pressed={!lista} onClick={() => setLista(false)} className={`px-3 py-2 ${!lista ? 'bg-muted' : ''}`}><LayoutGrid className="size-4" /></button>
              <button type="button" aria-label="Lista" aria-pressed={lista} onClick={() => setLista(true)} className={`px-3 py-2 ${lista ? 'bg-muted' : ''}`}><List className="size-4" /></button>
            </div>
            <button type="button" aria-pressed={soFavoritas} onClick={() => { setSoFavoritas((v) => !v); setTudo(false); }} className={`flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm ${soFavoritas ? 'bg-muted font-medium' : ''}`}>
              <Heart className="size-4" /> Favoritas
            </button>
            <select id="entrada-ordem" aria-label="Ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as 'recente' | 'nome')} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="recente">Último acesso: mais recentes</option>
              <option value="nome">Nome (A a Z)</option>
            </select>
          </div>
        )}

        <div className={lista ? 'flex flex-col gap-2' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
          {visiveis.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Nenhuma opção encontrada.</p>}
          {visiveis.map((o, indice) => {
            const extra = extras[o.ref];
            const acesso = ultimoAcesso(extra?.ultimoAcesso);
            return (
              <div key={o.ref} className="contents">
                <article className={`flex overflow-hidden rounded-2xl border border-border bg-card ${lista ? 'items-center' : 'flex-col'}`}>
                  <div className={`flex items-center justify-between bg-muted px-4 py-2.5 ${lista ? 'w-40 self-stretch' : ''}`}>
                    <span className="text-sm font-semibold">{ROTULO_TIPO[o.tipo]}</span>
                    {comFerramentas && o.tipo !== 'CANDIDATURA' && (
                      <button type="button" aria-label={`Favoritar ${o.nome}`} aria-pressed={!!extra?.favorita} onClick={() => favoritar.mutate({ ref: o.ref, favorita: !extra?.favorita })}>
                        <Heart className={`size-5 ${extra?.favorita ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-foreground text-lg font-semibold" aria-hidden="true">{o.nome.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-semibold leading-tight">{o.nome}</h2>
                      {acesso && <p className="text-xs text-muted-foreground">Último acesso em {acesso}</p>}
                    </div>
                  </div>
                  <div className="flex justify-end px-4 pb-4">
                    <Button className="min-w-36 rounded-full" disabled={carregando !== null} onClick={() => void entrar(o.ref)}>
                      {carregando === o.ref ? <Loader2 className="size-4 animate-spin" /> : 'Acessar'}
                    </Button>
                  </div>
                </article>
                {indice === 1 && !lista && promo && (
                  <article className="relative flex min-h-[210px] flex-col justify-end overflow-hidden rounded-2xl bg-foreground p-5 text-background">
                    <span className="self-start rounded-full bg-black/30 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">{promo.rotulo ?? 'Novidade'}</span>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight">{promo.titulo}</h2>
                    {promo.texto && <p className="mt-1 text-sm opacity-85">{promo.texto}</p>}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {link ? (
                        <a
                          href={link} target="_blank" rel="noopener noreferrer" className="rounded-full bg-background px-4 py-1.5 text-sm font-semibold text-foreground"
                          onClick={() => void hubService.registrar(preAuth.preAuthToken, promo.id, 'CLIQUE').catch(() => undefined)}
                        >
                          {promo.textoDoLink ?? 'Saiba mais'} →
                        </a>
                      ) : <span />}
                      {divulgacoes.length > 1 && (
                        <div className="flex gap-1.5">
                          {divulgacoes.map((d, k) => (
                            <button key={d.id} type="button" aria-label={`Divulgação ${k + 1}`} aria-current={k === slide % divulgacoes.length} onClick={() => setSlide(k)}
                              className={`h-2 rounded-full transition-all ${k === slide % divulgacoes.length ? 'w-5 bg-primary' : 'w-2 bg-white/40'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                )}
              </div>
            );
          })}
        </div>
        {comFerramentas && !tudo && opcoes.length > LIMITE && (
          <button type="button" className="self-center rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-muted" onClick={() => setTudo(true)}>Mostrar mais ⌄</button>
        )}

        {(dados?.treinamentos ?? []).length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">Meus treinamentos</h2>
            <p className="mb-3 mt-1 text-sm text-muted-foreground">Tire dúvidas ao vivo e assista a aulas gravadas.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(dados?.treinamentos ?? []).map((t) => {
                const href = linkSeguro(t.link);
                const miolo = (
                  <>
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">{t.rotulo ?? 'Treinamento'}</span>
                    <span className="font-semibold">{t.titulo}</span>
                    {t.detalhe && <span className="text-sm text-muted-foreground">{t.detalhe}</span>}
                  </>
                );
                return href ? (
                  <a key={t.id} href={href} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted"
                    onClick={() => void hubService.registrar(preAuth.preAuthToken, t.id, 'CLIQUE').catch(() => undefined)}>{miolo}</a>
                ) : (
                  <div key={t.id} className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-4 py-3">{miolo}</div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
