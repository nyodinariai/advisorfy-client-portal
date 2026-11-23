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

/** Espelha StatusDaEmpresaService.Status: a empresa do cliente em dia, com pendência (guia vencida e não paga, mensalidade em atraso) ou sem situação. */
export interface StatusDaEmpresa {
  situacao: 'EM_DIA' | 'COM_PENDENCIA' | 'INDISPONIVEL';
  guiasVencidas: number;
  mensalidadesEmAtraso: number;
}

/** Por referência de opção (a mesma do login): favorita, último acesso e, nas empresas do cliente, a situação (nulo nas demais opções). */
export interface OpcaoExtra {
  favorita: boolean;
  ultimoAcesso: string | null;
  status?: StatusDaEmpresa | null;
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
