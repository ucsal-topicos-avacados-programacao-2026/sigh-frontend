import { requisicao } from '@/api/cliente'
import type {
  AcessoDoPaciente,
  AlvoDeRestricao,
  AutorizacaoAdicional,
  Consentimento,
  ConsentimentosDoPaciente,
  InstituicaoDaRede,
  PacienteGerenciado,
  Pagina,
  RegistroDoHistorico,
  Restricao,
} from '@/api/tipos'

/** Rotas do paciente e do representante legal sobre os dados de um paciente que ele gerencia. */
const base = (pacienteId: string) => `/api/pacientes/${encodeURIComponent(pacienteId)}`

export const gerenciados = (sinal?: AbortSignal) => requisicao<PacienteGerenciado[]>('GET', '/api/pacientes/gerenciados', { sinal })

export const historico = (pacienteId: string, sinal?: AbortSignal) =>
  requisicao<RegistroDoHistorico[]>('GET', `${base(pacienteId)}/historico`, { sinal })

export const acessos = (pacienteId: string, pagina: number, tamanho: number, sinal?: AbortSignal) =>
  requisicao<Pagina<AcessoDoPaciente>>('GET', `${base(pacienteId)}/acessos`, { consulta: { page: pagina, size: tamanho }, sinal })

export const consentimentos = (pacienteId: string, sinal?: AbortSignal) =>
  requisicao<ConsentimentosDoPaciente>('GET', `${base(pacienteId)}/consentimentos`, { sinal })

/** O paciente só autoriza ou revoga; a recusa (NEGADO) é só no primeiro cadastro. */
export const decidirConsentimento = (pacienteId: string, decisao: 'AUTORIZADO' | 'REVOGADO') =>
  requisicao<Consentimento>('POST', `${base(pacienteId)}/consentimentos`, { corpo: { decisao } })

export const restricoes = (pacienteId: string, sinal?: AbortSignal) =>
  requisicao<Restricao[]>('GET', `${base(pacienteId)}/restricoes`, { sinal })

export const restringir = (pacienteId: string, alvo: AlvoDeRestricao) =>
  requisicao<Restricao>('POST', `${base(pacienteId)}/restricoes`, { corpo: alvo })

export const encerrarRestricao = (pacienteId: string, restricaoId: string) =>
  requisicao<Restricao>('POST', `${base(pacienteId)}/restricoes/${encodeURIComponent(restricaoId)}/encerramento`)

export const autorizacoes = (pacienteId: string, sinal?: AbortSignal) =>
  requisicao<AutorizacaoAdicional[]>('GET', `${base(pacienteId)}/autorizacoes`, { sinal })

export const autorizar = (pacienteId: string, instituicaoId: string, alvo: AlvoDeRestricao) =>
  requisicao<AutorizacaoAdicional>('POST', `${base(pacienteId)}/autorizacoes`, { corpo: { instituicaoId, ...alvo } })

export const revogarAutorizacao = (pacienteId: string, autorizacaoId: string) =>
  requisicao<AutorizacaoAdicional>('POST', `${base(pacienteId)}/autorizacoes/${encodeURIComponent(autorizacaoId)}/revogacao`)

export const instituicoesDaRede = (sinal?: AbortSignal) => requisicao<InstituicaoDaRede[]>('GET', '/api/instituicoes', { sinal })
