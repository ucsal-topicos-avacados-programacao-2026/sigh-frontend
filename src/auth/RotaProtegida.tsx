import type { ReactNode } from 'react'
import { Navigate, matchPath, useLocation } from 'react-router'
import { podeAcessar, type RotaComPerfis } from '@/auth/permissoes'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { SemPermissao } from '@/paginas/comuns/PaginasComuns'
import { NaoEncontradaPublica } from '@/paginas/publicas/NaoEncontradaPublica'
import { ITENS_DE_MENU } from '@/rotas'

function enderecoConhecido(caminho: string) {
  return caminho === '/' || ITENS_DE_MENU.some((item) => matchPath({ path: item.caminho, end: true }, caminho))
}

export function RotaProtegida({ rota, children }: { rota?: RotaComPerfis; children: ReactNode }) {
  const { estado, usuario, instituicaoAtiva, recarregar, sair } = useSessao()
  const local = useLocation()
  if (estado === 'anonimo') {
    if (!enderecoConhecido(local.pathname)) return <NaoEncontradaPublica />
    return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  }
  if (estado === 'indisponivel') {
    return (
      <main className="mx-auto max-w-[560px] p-6">
        <Alerta
          tom="erro"
          titulo="Não foi possível falar com o servidor"
          acao={
            <div className="flex flex-wrap gap-2">
              <Botao onClick={recarregar}>Tentar de novo</Botao>
              <Botao variante="secundario" onClick={() => sair({ texto: 'Você saiu do SIGH.', tom: 'info' })}>
                Sair
              </Botao>
            </div>
          }
        >
          Confira a conexão e tente de novo. A sua sessão continua aberta.
        </Alerta>
      </main>
    )
  }
  if (estado === 'carregando' || !usuario) {
    return (
      <p role="status" className="p-6 text-corpo text-texto-suave">
        Carregando…
      </p>
    )
  }
  if (rota && !podeAcessar(rota, { perfis: usuario.perfis, instituicaoAtiva })) return <SemPermissao />
  return <>{children}</>
}
