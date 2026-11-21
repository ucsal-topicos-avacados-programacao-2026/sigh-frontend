import { requisicao } from '@/api/cliente'
import type { AtendimentoEmAndamento, HistoricoDoAtendimento, RegistroClinicoRequisicao, RegistroDoHistorico, ResumoIA } from '@/api/tipos'

/** Histórico do paciente no atendimento, para médico e enfermeiro. A consulta fica na auditoria (RF-008). */
export const historicoDoAtendimento = (atendimentoId: string, sinal?: AbortSignal) =>
  requisicao<HistoricoDoAtendimento>('GET', `/atendimentos/${encodeURIComponent(atendimentoId)}/historico`, { sinal })

/** Acesso de emergência com justificativa (RF-010, RN-003): mostra também o que o paciente restringiu. */
export const acessoDeEmergencia = (atendimentoId: string, justificativa: string) =>
  requisicao<HistoricoDoAtendimento>('POST', `/atendimentos/${encodeURIComponent(atendimentoId)}/historico/emergencia`, {
    corpo: { justificativa },
  })

/** Atendimentos em andamento na instituição: já começaram com o médico e saíram da fila de triagem. */
export const atendimentosEmAndamento = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<AtendimentoEmAndamento[]>('GET', '/atendimentos/em-andamento', { consulta: { instituicaoId }, sinal })

/** Evolução, diagnóstico (CID-10), prescrição, exame, alergia ou resumo de alta (RF-006, RF-007). */
export const registrarNoAtendimento = (atendimentoId: string, dados: RegistroClinicoRequisicao) =>
  requisicao<RegistroDoHistorico>('POST', `/atendimentos/${encodeURIComponent(atendimentoId)}/registros`, { corpo: dados })

export const encerrarAtendimento = (atendimentoId: string) =>
  requisicao<void>('POST', `/atendimentos/${encodeURIComponent(atendimentoId)}/encerramento`)

/** Pede o resumo por IA (202): ele é gerado em segundo plano; consulte até sair de SOLICITADO (RF-004). */
export const pedirResumo = (atendimentoId: string) =>
  requisicao<ResumoIA>('POST', `/atendimentos/${encodeURIComponent(atendimentoId)}/resumos`)

export const consultarResumo = (resumoId: string, sinal?: AbortSignal) =>
  requisicao<ResumoIA>('GET', `/resumos/${encodeURIComponent(resumoId)}`, { sinal })

/** O médico confere e valida o resumo gerado (RN-008). */
export const validarResumo = (resumoId: string) => requisicao<ResumoIA>('POST', `/resumos/${encodeURIComponent(resumoId)}/validacao`)
