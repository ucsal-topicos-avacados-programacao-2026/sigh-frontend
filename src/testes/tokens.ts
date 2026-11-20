import type { Perfil } from '@/api/tipos'

function base64Url(texto: string) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(texto)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Token fictício no formato da API (sem assinatura válida: o front não confere a assinatura). */
export function tokenFicticio(login: string, perfis: Perfil[], validoPorSegundos = 3600) {
  const cabecalho = base64Url(JSON.stringify({ alg: 'HS256' }))
  const conteudo = base64Url(
    JSON.stringify({
      sub: login,
      exp: Math.floor(Date.now() / 1000) + validoPorSegundos,
      autorizacoes: perfis.map((perfil) => `ROLE_${perfil}`),
    }),
  )
  return `${cabecalho}.${conteudo}.assinatura`
}
