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

/** Paciente cujos dados o usuário gerencia: o próprio cadastro ou um representado (BE-15). */
export interface PacienteGerenciado {
  pacienteId: string
  nome: string
  relacao: 'TITULAR' | 'REPRESENTANTE_LEGAL'
}

export type TipoRegistro = 'DIAGNOSTICO' | 'PRESCRICAO' | 'EXAME' | 'ALERGIA' | 'EVOLUCAO' | 'RESUMO_ALTA'

export const NOME_DO_TIPO_DE_REGISTRO: Record<TipoRegistro, string> = {
  DIAGNOSTICO: 'Diagnóstico',
  PRESCRICAO: 'Prescrição',
  EXAME: 'Exame',
  ALERGIA: 'Alergia',
  EVOLUCAO: 'Evolução',
  RESUMO_ALTA: 'Resumo de alta',
}

export interface RegistroDoHistorico {
  id: string
  tipo: TipoRegistro
  criadoEm: string
  conteudo: string
  categoriaInformacao: string | null
  codigoCID10: string | null
  instituicaoOrigemId: string
  instituicaoOrigem: string
  /** Coberto por uma restrição vigente do paciente (RF-009). */
  restrito: boolean
}

export interface AcessoDoPaciente {
  ocorridoEm: string
  profissional: string
  perfil: Perfil
  instituicao: string | null
  finalidade: string
  emergencia: boolean
}

export type DecisaoConsentimento = 'AUTORIZADO' | 'NEGADO' | 'REVOGADO'

export interface Consentimento {
  id: string
  versao: number
  tipo: 'AMPLO' | 'ADICIONAL'
  decisao: DecisaoConsentimento
  vigenteDesde: string
}

export interface ConsentimentosDoPaciente {
  /** null: o paciente nunca se manifestou. */
  vigente: Consentimento | null
  /** Da versão mais antiga para a mais recente. */
  historico: Consentimento[]
}

export interface Restricao {
  id: string
  categoria: string | null
  registroId: string | null
  inicioEm: string
  fimEm: string | null
  vigente: boolean
  definidaPor: string
  encerradaPor: string | null
}

export interface AutorizacaoAdicional {
  id: string
  versao: number
  instituicaoId: string
  instituicao: string
  categoria: string | null
  registroId: string | null
  decisao: DecisaoConsentimento
  vigenteDesde: string
}

/** O que restringir ou liberar: uma categoria de informação ou um registro (nunca os dois). */
export type AlvoDeRestricao = { categoria: string; registroId?: undefined } | { registroId: string; categoria?: undefined }

export interface InstituicaoDaRede {
  id: string
  nome: string
}
