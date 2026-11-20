import { requisicao } from '@/api/cliente'
import type { AdmissaoRequisicao, AdmissaoResposta, PacienteResumo } from '@/api/tipos'

/** O CPF vai no corpo, nunca na URL, para não ficar em logs de acesso nem no histórico do navegador. */
export function buscarPacientePorCpf(cpf: string, instituicaoId: string, sinal?: AbortSignal) {
  return requisicao<PacienteResumo>('POST', '/api/pacientes/busca', { corpo: { cpf, instituicaoId }, sinal })
}

/** Abre o atendimento; se o CPF não existe na rede, cadastra o paciente, o prontuário e o consentimento inicial. */
export function admitirPaciente(dados: AdmissaoRequisicao) {
  return requisicao<AdmissaoResposta>('POST', '/api/pacientes/admissoes', { corpo: dados })
}
