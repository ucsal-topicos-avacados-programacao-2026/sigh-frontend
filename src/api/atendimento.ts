import { requisicao } from '@/api/cliente'
import type { AtendimentoEmAndamento, HistoricoDoAtendimento, RegistroClinicoRequisicao, RegistroDoHistorico, ResumoIA } from '@/api/tipos'

export const historicoDoAtendimento = (atendimentoId: string, sinal?: AbortSignal) =>
  requisicao<HistoricoDoAtendimento>('GET', `/atendimentos/${encodeURIComponent(atendimentoId)}/historico`, { sinal })

export const acessoDeEmergencia = (atendimentoId: string, justificativa: string) =>
  requisicao<HistoricoDoAtendimento>('POST', `/atendimentos/${encodeURIComponent(atendimentoId)}/historico/emergencia`, {
    corpo: { justificativa },
  })

export const atendimentosEmAndamento = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<AtendimentoEmAndamento[]>('GET', '/atendimentos/em-andamento', { consulta: { instituicaoId }, sinal })

export const registrarNoAtendimento = (atendimentoId: string, dados: RegistroClinicoRequisicao) =>
  requisicao<RegistroDoHistorico>('POST', `/atendimentos/${encodeURIComponent(atendimentoId)}/registros`, { corpo: dados })

export const encerrarAtendimento = (atendimentoId: string) =>
  requisicao<void>('POST', `/atendimentos/${encodeURIComponent(atendimentoId)}/encerramento`)

export const pedirResumo = (atendimentoId: string) =>
  requisicao<ResumoIA>('POST', `/atendimentos/${encodeURIComponent(atendimentoId)}/resumos`)

export const consultarResumo = (resumoId: string, sinal?: AbortSignal) =>
  requisicao<ResumoIA>('GET', `/resumos/${encodeURIComponent(resumoId)}`, { sinal })

export const validarResumo = (resumoId: string) => requisicao<ResumoIA>('POST', `/resumos/${encodeURIComponent(resumoId)}/validacao`)
