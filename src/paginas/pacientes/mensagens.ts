import { ErroApi, ErroDeConexao } from '@/api/cliente'

/** Texto para o alerta geral da tela, a partir do erro da API. Os erros por campo vão para os campos. */
export function mensagemDoErro(falha: unknown) {
  if (falha instanceof ErroDeConexao) return falha.message
  if (falha instanceof ErroApi) {
    if (falha.status === 403) return 'Você não tem vínculo administrativo ativo nesta instituição. Confira a instituição no topo da página.'
    if (falha.status === 409) return 'Outra operação com este paciente aconteceu ao mesmo tempo. Busque o CPF de novo e repita.'
    if (falha.status >= 500) return 'O servidor não conseguiu concluir agora. Tente de novo em instantes.'
    return falha.message
  }
  return 'Algo deu errado. Tente de novo.'
}
