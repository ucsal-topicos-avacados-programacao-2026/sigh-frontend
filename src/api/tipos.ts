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

/** Linha do log de auditoria (RF-008), imutável (RN-006). */
export interface RegistroAuditoria {
  id: string
  prontuarioId: string | null
  profissional: string
  perfil: Perfil
  instituicao: string | null
  ocorridoEm: string
  finalidade: string
  emergencia: boolean
  /** Só nos acessos de emergência (RN-003). */
  justificativa: string | null
}

export interface IndicadorInstituicao {
  instituicaoId: string
  instituicao: string
  totalAcessos: number
  acessosEmergencia: number
}

export type TipoAnalise = 'ALERTA' | 'PARECER'
export type ConclusaoAnalise = 'PENDENTE' | 'REGULAR' | 'INDEVIDO' | 'INCONCLUSIVO'

export interface AnaliseAuditoria {
  id: string
  registroAuditoriaId: string
  tipo: TipoAnalise
  conclusao: ConclusaoAnalise
  descricao: string
  registradaEm: string
}

/** Período fechado, em datas (AAAA-MM-DD), como a API recebe. */
export interface Periodo {
  inicio: string
  fim: string
}

export type CategoriaLeito = 'ENFERMARIA' | 'UTI' | 'ISOLAMENTO' | 'PEDIATRICO'
export type StatusLeito = 'LIVRE' | 'OCUPADO' | 'EM_HIGIENIZACAO' | 'BLOQUEADO'
export type StatusAtendimento = 'ABERTO' | 'EM_TRIAGEM' | 'EM_ATENDIMENTO' | 'ENCERRADO'
export type StatusSolicitacaoTransferencia = 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'CANCELADA'

export const NOME_DA_CATEGORIA: Record<CategoriaLeito, string> = {
  ENFERMARIA: 'Enfermaria',
  UTI: 'UTI',
  ISOLAMENTO: 'Isolamento',
  PEDIATRICO: 'Pediátrico',
}

export interface Leito {
  id: string
  instituicaoId: string
  codigo: string
  setor: string
  categoria: CategoriaLeito
  status: StatusLeito
}

export interface ResumoDeAlta {
  id: string
  criadoEm: string
  autor: string
}

/** Internação em andamento num leito da instituição (GET /internacoes). */
export interface InternacaoAtiva {
  id: string
  atendimentoId: string
  paciente: string
  leitoId: string
  leitoCodigo: string
  setor: string
  categoria: CategoriaLeito
  admitidaEm: string
  /** Resumos de alta feitos desde a admissão, sem o texto clínico. */
  resumosDeAlta: ResumoDeAlta[]
  solicitacaoPendenteId: string | null
}

/** Atendimento em aberto sem internação: candidato a internar, ou na fila de espera sem leito livre. */
export interface AtendimentoSemLeito {
  atendimentoId: string
  paciente: string
  chegadaEm: string
  status: StatusAtendimento
  motivo: string
}

export interface SolicitacaoTransferencia {
  id: string
  internacaoId: string
  paciente: string
  instituicaoOrigemId: string
  instituicaoOrigem: string
  instituicaoDestinoId: string
  categoria: CategoriaLeito
  status: StatusSolicitacaoTransferencia
  solicitadaEm: string
  decididaEm: string | null
  leitoDestinoId: string | null
  motivoRecusa: string | null
}

export type CorRisco = 'VERMELHO' | 'LARANJA' | 'AMARELO' | 'VERDE' | 'AZUL'

/** Todos opcionais na API; a pressão vai como "120/80". */
export interface SinaisVitais {
  pressaoArterial?: string
  frequenciaCardiaca?: number
  frequenciaRespiratoria?: number
  temperatura?: number
  saturacaoOxigenio?: number
}

export interface Triagem {
  id: string
  atendimentoId: string
  sintomas: string
  sinaisVitais: SinaisVitais | null
  corSugerida: CorRisco | null
  corConfirmada: CorRisco | null
  confirmadaEm: string | null
}

/** Paciente com classificação confirmada, na fila por prioridade (GET /triagens/fila). */
export interface PacienteNaFila {
  triagemId: string
  atendimentoId: string
  pacienteNome: string
  corConfirmada: CorRisco
  chegadaEm: string
  minutosDeEspera: number
  tempoMaximoExcedido: boolean
}

/** Atendimento sem classificação confirmada (GET /triagens/aguardando). */
export interface AguardandoTriagem {
  atendimentoId: string
  paciente: string
  chegadaEm: string
  motivo: string
  triagemPendente: { id: string; sintomas: string; corSugerida: CorRisco | null } | null
}

/** Histórico visto pelo profissional no atendimento (GET /atendimentos/{id}/historico). */
export interface HistoricoDoAtendimento {
  registros: RegistroDoHistorico[]
  /** Há registros escondidos pela restrição do paciente, que só o acesso de emergência mostra. */
  possuiInformacoesRestritas: boolean
  acessoDeEmergencia: boolean
}
