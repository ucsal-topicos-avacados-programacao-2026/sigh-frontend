
export type Perfil = 'PACIENTE' | 'ENFERMEIRO' | 'MEDICO' | 'ADMINISTRATIVO' | 'RECEPCAO' | 'AUDITOR_GESTOR'

export const PERFIS_DE_INSTITUICAO: readonly Perfil[] = ['ENFERMEIRO', 'MEDICO', 'ADMINISTRATIVO', 'RECEPCAO']

export const NOME_DO_PERFIL: Record<Perfil, string> = {
  PACIENTE: 'Paciente',
  ENFERMEIRO: 'Enfermeiro',
  MEDICO: 'Médico',
  ADMINISTRATIVO: 'Administrativo',
  RECEPCAO: 'Recepção',
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

export interface Pagina<T> {
  content: T[]
  page: { size: number; number: number; totalElements: number; totalPages: number }
}

export interface PacienteResumo {
  id: string
  nome: string
  dataNascimento: string
}

export type ManifestacaoInicial = 'AUTORIZADO' | 'NEGADO'

export interface AdmissaoRequisicao {
  cpf: string
  instituicaoId: string
  motivo: string
  nome?: string
  dataNascimento?: string
  consentimentoInicial?: ManifestacaoInicial
}

export interface AdmissaoResposta {
  pacienteId: string
  prontuarioId: string
  atendimentoId: string
  novoCadastro: boolean
}

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
  vigente: Consentimento | null
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

export type AlvoDeRestricao = { categoria: string; registroId?: undefined } | { registroId: string; categoria?: undefined }

export interface InstituicaoDaRede {
  id: string
  nome: string
}

export interface RegistroAuditoria {
  id: string
  prontuarioId: string | null
  profissional: string
  perfil: Perfil
  instituicao: string | null
  ocorridoEm: string
  finalidade: string
  emergencia: boolean
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

export interface InternacaoAtiva {
  id: string
  atendimentoId: string
  paciente: string
  leitoId: string
  leitoCodigo: string
  setor: string
  categoria: CategoriaLeito
  admitidaEm: string
  resumosDeAlta: ResumoDeAlta[]
  solicitacaoPendenteId: string | null
}

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
  sugestaoPreliminar: boolean
  situacaoSugestao: SituacaoSugestao | null
}

export type SituacaoSugestao = 'EM_ANDAMENTO' | 'PRONTA' | 'INDISPONIVEL'

export interface TriagemPendente {
  id: string
  sintomas: string
  sinaisVitais: SinaisVitais | null
  corSugerida: CorRisco | null
  sugestaoPreliminar: boolean
  situacaoSugestao: SituacaoSugestao | null
}

export interface PreClassificacao {
  situacao: SituacaoSugestao | null
}

export interface PacienteNaFila {
  triagemId: string
  atendimentoId: string
  pacienteNome: string
  corConfirmada: CorRisco
  chegadaEm: string
  minutosDeEspera: number
  tempoMaximoExcedido: boolean
}

export interface AguardandoTriagem {
  atendimentoId: string
  paciente: string
  chegadaEm: string
  motivo: string
  triagemPendente: TriagemPendente | null
}

export interface HistoricoDoAtendimento {
  registros: RegistroDoHistorico[]
  possuiInformacoesRestritas: boolean
  acessoDeEmergencia: boolean
}

export interface AtendimentoEmAndamento {
  atendimentoId: string
  paciente: string
  motivo: string
  chegadaEm: string
  inicioClinicoEm: string
  corConfirmada: CorRisco | null
  medicoResponsavel: string | null
  doUsuarioLogado: boolean
}

export interface RegistroClinicoRequisicao {
  tipo: TipoRegistro
  conteudo: string
  categoriaInformacao: string
  codigoCID10?: string
}

export type StatusResumo = 'SOLICITADO' | 'GERADO' | 'VALIDADO' | 'FALHOU'

export interface ResumoIA {
  id: string
  atendimentoId: string
  status: StatusResumo
  texto: string | null
  geradoEm: string | null
  modeloVersao: string | null
  registrosDeOrigem: string[]
  aviso: string
}

export type TipoInstituicao = 'PUBLICA' | 'PRIVADA'

export interface PainelDaInstituicao {
  instituicaoId: string
  instituicaoNome: string
  tipo: TipoInstituicao
  geradoEm: string
  leitos: { categoria: CategoriaLeito; status: StatusLeito; quantidade: number }[]
  aguardandoTriagem: { quantidade: number; maiorEsperaMinutos: number | null }
  fila: {
    cor: CorRisco
    quantidade: number
    maiorEsperaMinutos: number | null
    tempoMaximoMinutos: number
    acimaDoTempoMaximo: number
  }[]
  emAtendimento: number
  internados: number
  chegadasHoje: number
  transferencias: { recebidas: number; enviadas: number }
}
