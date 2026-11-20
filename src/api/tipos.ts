/** Tipos que espelham os records da API (sigh-backend). Escritos à mão: a API não publica OpenAPI. */

export type Perfil = 'PACIENTE' | 'ENFERMEIRO' | 'MEDICO' | 'ADMINISTRATIVO' | 'AUDITOR_GESTOR'

export const PERFIS_DE_INSTITUICAO: readonly Perfil[] = ['ENFERMEIRO', 'MEDICO', 'ADMINISTRATIVO']

export const NOME_DO_PERFIL: Record<Perfil, string> = {
  PACIENTE: 'Paciente',
  ENFERMEIRO: 'Enfermeiro',
  MEDICO: 'Médico',
  ADMINISTRATIVO: 'Administrativo',
  AUDITOR_GESTOR: 'Auditor/Gestor de rede',
}

export type EtapaAutenticacao = 'ACESSO_LIBERADO' | 'VALIDAR_SEGUNDO_FATOR' | 'CADASTRAR_SEGUNDO_FATOR'

export interface TokenResposta {
  token: string
  etapa: EtapaAutenticacao
}

export interface CadastroSegundoFatorResposta {
  uriAutenticador: string
}

export interface VinculoAtivo {
  instituicaoId: string
  instituicaoNome: string
  perfis: Perfil[]
}

export interface UsuarioLogado {
  login: string
  nome: string
  perfis: Perfil[]
  vinculos: VinculoAtivo[]
}

/** PagedModel do Spring. */
export interface Pagina<T> {
  content: T[]
  page: { size: number; number: number; totalElements: number; totalPages: number }
}

/** Paciente já cadastrado na rede (POST /api/pacientes/busca). */
export interface PacienteResumo {
  id: string
  nome: string
  /** ISO, AAAA-MM-DD. */
  dataNascimento: string
}

/** Manifestação do paciente sobre o compartilhamento amplo no primeiro cadastro (RF-002). Ausente: não se manifestou. */
export type ManifestacaoInicial = 'AUTORIZADO' | 'NEGADO'

export interface AdmissaoRequisicao {
  cpf: string
  instituicaoId: string
  motivo: string
  /** Só no primeiro cadastro; com o CPF já na rede, a API ignora os três. */
  nome?: string
  dataNascimento?: string
  consentimentoInicial?: ManifestacaoInicial
}

export interface AdmissaoResposta {
  pacienteId: string
  prontuarioId: string
  atendimentoId: string
  /** false: o CPF já estava na rede e o atendimento foi vinculado ao prontuário existente (RN-004). */
  novoCadastro: boolean
}
