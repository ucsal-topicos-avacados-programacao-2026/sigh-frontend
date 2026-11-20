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
