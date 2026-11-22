import { requisicao } from '@/api/cliente'
import type { CadastroSegundoFatorResposta, TokenResposta, UsuarioLogado } from '@/api/tipos'

export function entrar(login: string, senha: string) {
  return requisicao<TokenResposta>('POST', '/auth/login', { corpo: { login, senha } })
}

export function cadastrarSegundoFator(tokenPendente: string) {
  return requisicao<CadastroSegundoFatorResposta>('POST', '/auth/segundo-fator/cadastro', { token: tokenPendente })
}

export function validarSegundoFator(tokenPendente: string, codigo: string) {
  return requisicao<TokenResposta>('POST', '/auth/segundo-fator/validacao', { token: tokenPendente, corpo: { codigo } })
}

export function usuarioLogado(sinal?: AbortSignal) {
  return requisicao<UsuarioLogado>('GET', '/usuarios/eu', { sinal })
}

export function trocarSenhaInicial(tokenPendente: string, novaSenha: string) {
  return requisicao<TokenResposta>('POST', '/auth/senha/troca-inicial', { token: tokenPendente, corpo: { novaSenha } })
}

export function alterarSenha(senhaAtual: string, novaSenha: string) {
  return requisicao<void>('POST', '/auth/senha/alteracao', { corpo: { senhaAtual, novaSenha } })
}
