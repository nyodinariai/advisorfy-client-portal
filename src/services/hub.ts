import api from '@/lib/api';

/** Espelha HubService.ComunicadoView. */
export interface ComunicadoView {
  id: string;
  titulo: string;
  texto: string | null;
  rotulo: string | null;
  detalhe: string | null;
  link: string | null;
  textoDoLink: string | null;
}

/** Por referência de opção (a mesma do login): favorita e último acesso. */
export interface OpcaoExtra {
  favorita: boolean;
  ultimoAcesso: string | null;
}

/** Espelha HubService.Hub: o que a tela de entrada mostra, para o mundo da pessoa. */
export interface HubResponse {
  avisos: ComunicadoView[];
  divulgacoes: ComunicadoView[];
  treinamentos: ComunicadoView[];
  opcoes: Record<string, OpcaoExtra>;
}

/** A tela de entrada ainda não tem sessão: o token de pré-autenticação do login vai no corpo de cada chamada. */
export const hubService = {
  carregar: (preAuthToken: string) => api.post<HubResponse>('/api/auth/hub', { preAuthToken }).then((r) => r.data),
  favoritar: (preAuthToken: string, ref: string, favorita: boolean) => api.post('/api/auth/hub/favorita', { preAuthToken, ref, favorita }).then((r) => r.data),
  registrar: (preAuthToken: string, comunicadoId: string, evento: 'VISUALIZACAO' | 'CLIQUE') =>
    api.post('/api/auth/hub/evento', { preAuthToken, comunicadoId, evento }).then((r) => r.data),
};
