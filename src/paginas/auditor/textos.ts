import type { ConclusaoAnalise, Periodo, TipoAnalise } from '@/api/tipos'
import type { TomDaEtiqueta } from '@/componentes/Etiqueta'
import { hojeIso } from '@/util/datas'

export const CONCLUSAO: Record<ConclusaoAnalise, { texto: string; tom: TomDaEtiqueta }> = {
  PENDENTE: { texto: 'Pendente', tom: 'neutro' },
  REGULAR: { texto: 'Regular', tom: 'sucesso' },
  INDEVIDO: { texto: 'Indevido', tom: 'erro' },
  INCONCLUSIVO: { texto: 'Inconclusivo', tom: 'atencao' },
}

export const NOME_DO_TIPO_DE_ANALISE: Record<TipoAnalise, string> = {
  PARECER: 'Parecer',
  ALERTA: 'Alerta de possível acesso indevido',
}

/** Últimos 30 dias, contando hoje. */
export function periodoPadrao(hoje = new Date()): Periodo {
  const inicio = new Date(hoje)
  inicio.setDate(inicio.getDate() - 29)
  return { inicio: hojeIso(inicio), fim: hojeIso(hoje) }
}

/** Erro do período para os campos, ou nada quando está certo. A API confere de novo (422). */
export function errosDoPeriodo(periodo: Periodo): { inicio?: string; fim?: string } {
  const erros: { inicio?: string; fim?: string } = {}
  if (!periodo.inicio) erros.inicio = 'Informe a data inicial.'
  if (!periodo.fim) erros.fim = 'Informe a data final.'
  if (periodo.inicio && periodo.fim && periodo.fim < periodo.inicio) erros.fim = 'A data final é anterior à inicial.'
  return erros
}

/** Código curto de um registro do log, para conferir entre telas: os 8 primeiros caracteres do id. */
export const codigoDoRegistro = (id: string) => id.slice(0, 8).toUpperCase()
