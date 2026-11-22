import type { Perfil, TipoDeAcaoAdministrativa } from '@/api/tipos'

export const PERFIS_DE_INSTITUICAO: readonly Perfil[] = ['MEDICO', 'ENFERMEIRO', 'RECEPCAO', 'ADMINISTRATIVO']

export const PERFIS_COM_REGISTRO: readonly Perfil[] = ['MEDICO', 'ENFERMEIRO']

export const NOME_DA_ACAO: Record<TipoDeAcaoAdministrativa, string> = {
  USUARIO_CRIADO: 'Usuário criado',
  USUARIO_DESATIVADO: 'Usuário desativado',
  USUARIO_REATIVADO: 'Usuário reativado',
  SENHA_REDEFINIDA: 'Senha redefinida',
  SEGUNDO_FATOR_ZERADO: 'Segundo fator zerado',
  VINCULO_ADICIONADO: 'Vínculo adicionado',
  VINCULO_ENCERRADO: 'Vínculo encerrado',
}

export const REGISTRO_PROFISSIONAL: Partial<Record<Perfil, string>> = {
  MEDICO: 'CRM',
  ENFERMEIRO: 'COREN',
}
