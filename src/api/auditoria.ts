import { requisicao } from '@/api/cliente'
import type { AnaliseAuditoria, ConclusaoAnalise, IndicadorInstituicao, Pagina, Periodo, RegistroAuditoria, TipoAnalise } from '@/api/tipos'

/** Rotas do Auditor/Gestor de rede. Só leitura do log, mais o registro de análise: nada altera nem apaga o log (RN-006). */

export interface FiltroDoLog extends Periodo {
  instituicaoId?: string
  /** true: só emergências; ausente: todos. */
  emergencia?: boolean
}

export const registros = (filtro: FiltroDoLog, pagina: number, tamanho: number, sinal?: AbortSignal) =>
  requisicao<Pagina<RegistroAuditoria>>('GET', '/auditoria/registros', {
    consulta: { ...filtro, page: pagina, size: tamanho },
    sinal,
  })

export const emergenciasPendentes = (pagina: number, tamanho: number, sinal?: AbortSignal) =>
  requisicao<Pagina<RegistroAuditoria>>('GET', '/auditoria/emergencias/pendentes', { consulta: { page: pagina, size: tamanho }, sinal })

export const indicadores = (periodo: Periodo, sinal?: AbortSignal) =>
  requisicao<IndicadorInstituicao[]>('GET', '/auditoria/indicadores', { consulta: { ...periodo }, sinal })

export const analises = (tipo: TipoAnalise, pagina: number, tamanho: number, sinal?: AbortSignal) =>
  requisicao<Pagina<AnaliseAuditoria>>('GET', '/auditoria/analises', { consulta: { tipo, page: pagina, size: tamanho }, sinal })

export const registrarAnalise = (registroId: string, dados: { tipo: TipoAnalise; conclusao: ConclusaoAnalise; descricao: string }) =>
  requisicao<AnaliseAuditoria>('POST', `/auditoria/registros/${encodeURIComponent(registroId)}/analises`, { corpo: dados })
