import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router'
import { App } from '@/App'
import type { Perfil, UsuarioLogado } from '@/api/tipos'
import { SessaoProvider } from '@/auth/SessaoProvider'
import { ProvedorDeToast } from '@/componentes/Toast'
import { tokenFicticio } from '@/testes/tokens'

type Resposta = { status: number; corpo?: unknown }
export type Rotas = Record<string, Resposta | ((corpo: unknown, url: string) => Resposta)>

export function simularApi(rotas: Rotas) {
  const chamadas: { chave: string; corpo: unknown; autorizacao?: string; url: string }[] = []
  const simulado = vi.fn(async (url: string, init: RequestInit = {}) => {
    const caminho = new URL(url, 'http://localhost').pathname
    const chave = `${init.method ?? 'GET'} ${caminho}`
    const corpo = init.body ? JSON.parse(String(init.body)) : undefined
    chamadas.push({ chave, corpo, autorizacao: (init.headers as Record<string, string>)?.Authorization, url })
    const rota = rotas[chave]
    if (!rota) return new Response(JSON.stringify({ detail: `sem rota simulada: ${chave}` }), { status: 404 })
    const { status, corpo: resposta } = typeof rota === 'function' ? rota(corpo, url) : rota
    return new Response(resposta === undefined ? null : JSON.stringify(resposta), {
      status,
      headers: resposta === undefined ? {} : { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', simulado)
  return chamadas
}

export function usuario(perfis: Perfil[], vinculos: UsuarioLogado['vinculos'] = []): UsuarioLogado {
  return { login: 'pessoa.teste', nome: 'Pessoa de Teste', perfis, vinculos }
}

export const HOSPITAL_A = { instituicaoId: 'hospital-a', instituicaoNome: 'Hospital A' }
export const HOSPITAL_B = { instituicaoId: 'hospital-b', instituicaoNome: 'Hospital B' }

export function renderizar(rota: string, logado?: UsuarioLogado, rotas: Rotas = {}) {
  if (logado) {
    window.sessionStorage.setItem('sigh.token', tokenFicticio(logado.login, logado.perfis))
    rotas = { 'GET /usuarios/eu': { status: 200, corpo: logado }, ...rotas }
  }
  const chamadas = simularApi(rotas)
  const resultado = render(
    <StrictMode>
      <MemoryRouter initialEntries={[rota]}>
        <SessaoProvider>
          <ProvedorDeToast>
            <App />
          </ProvedorDeToast>
        </SessaoProvider>
      </MemoryRouter>
    </StrictMode>,
  )
  return { ...resultado, chamadas }
}
