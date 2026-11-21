import { requisicao } from '@/api/cliente'
import type { HistoricoDoAtendimento } from '@/api/tipos'

/** Histórico do paciente no atendimento, para médico e enfermeiro. A consulta fica na auditoria (RF-008). */
export const historicoDoAtendimento = (atendimentoId: string, sinal?: AbortSignal) =>
  requisicao<HistoricoDoAtendimento>('GET', `/atendimentos/${encodeURIComponent(atendimentoId)}/historico`, { sinal })

/** Acesso de emergência com justificativa (RF-010, RN-003): mostra também o que o paciente restringiu. */
export const acessoDeEmergencia = (atendimentoId: string, justificativa: string) =>
  requisicao<HistoricoDoAtendimento>('POST', `/atendimentos/${encodeURIComponent(atendimentoId)}/historico/emergencia`, {
    corpo: { justificativa },
  })
