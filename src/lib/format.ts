import { formatCnpj as formatarCnpj } from '@/lib/cnpj';

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));

export const formatDateLong = (dateString: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(
    new Date(dateString)
  );

export const formatCnpj = (cnpj: string) => formatarCnpj(cnpj);
