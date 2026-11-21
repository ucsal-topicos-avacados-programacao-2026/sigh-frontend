import type { Perfil } from '@/api/tipos'

const CHAVE = 'sigh.token'

export interface DadosDoToken {
  login: string
  perfis: Perfil[]
  expiraEm: number
}

function decodificarBase64Url(trecho: string) {
  const base64 = trecho.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(trecho.length / 4) * 4, '=')
  const binario = atob(base64)
  const bytes = Uint8Array.from(binario, (letra) => letra.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function lerToken(token: string): DadosDoToken | null {
  const partes = token.split('.')
  if (partes.length !== 3 || !partes[1]) return null
  try {
    const conteudo = JSON.parse(decodificarBase64Url(partes[1])) as { sub?: unknown; exp?: unknown; autorizacoes?: unknown }
    if (typeof conteudo.sub !== 'string' || typeof conteudo.exp !== 'number') return null
    const autorizacoes = Array.isArray(conteudo.autorizacoes) ? conteudo.autorizacoes : []
    const perfis = autorizacoes
      .filter((a): a is string => typeof a === 'string' && a.startsWith('ROLE_'))
      .map((a) => a.slice('ROLE_'.length) as Perfil)
    return { login: conteudo.sub, perfis, expiraEm: conteudo.exp * 1000 }
  } catch {
    return null
  }
}

export function tokenValido(token: string | null, agora = Date.now()): token is string {
  if (!token) return false
  const dados = lerToken(token)
  return dados !== null && dados.expiraEm > agora
}

function armazenamento(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function tokenGuardado(): string | null {
  const token = armazenamento()?.getItem(CHAVE) ?? null
  if (!tokenValido(token)) {
    armazenamento()?.removeItem(CHAVE)
    return null
  }
  return token
}

export function guardarToken(token: string) {
  armazenamento()?.setItem(CHAVE, token)
}

export function apagarToken() {
  armazenamento()?.removeItem(CHAVE)
}
