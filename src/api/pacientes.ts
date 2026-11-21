import { requisicao } from '@/api/cliente'
import type { AdmissaoRequisicao, AdmissaoResposta, PacienteResumo } from '@/api/tipos'

export function buscarPacientePorCpf(cpf: string, instituicaoId: string, sinal?: AbortSignal) {
  return requisicao<PacienteResumo>('POST', '/api/pacientes/busca', { corpo: { cpf, instituicaoId }, sinal })
}

export function admitirPaciente(dados: AdmissaoRequisicao) {
  return requisicao<AdmissaoResposta>('POST', '/api/pacientes/admissoes', { corpo: dados })
}
