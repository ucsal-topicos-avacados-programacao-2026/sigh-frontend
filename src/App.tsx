import { Navigate, Route, Routes } from 'react-router'
import { RotaProtegida } from '@/auth/RotaProtegida'
import { useSessao } from '@/auth/SessaoProvider'
import { AppLayout } from '@/layout/AppLayout'
import { EmConstrucao, Inicio, NaoEncontrada } from '@/paginas/comuns/PaginasComuns'
import { CadastrarSegundoFator } from '@/paginas/publicas/CadastrarSegundoFator'
import { Entrar } from '@/paginas/publicas/Entrar'
import { ValidarSegundoFator } from '@/paginas/publicas/ValidarSegundoFator'
import { ITENS_DE_MENU } from '@/rotas'

/** Telas de entrada só sem sessão: quem já entrou vai para o início. */
function SoSemSessao({ children }: { children: React.ReactNode }) {
  const { estado } = useSessao()
  if (estado === 'autenticado') return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<SoSemSessao><Entrar /></SoSemSessao>} />
      <Route path="/entrar/segundo-fator" element={<SoSemSessao><ValidarSegundoFator /></SoSemSessao>} />
      <Route path="/entrar/segundo-fator/cadastro" element={<SoSemSessao><CadastrarSegundoFator /></SoSemSessao>} />
      <Route element={<RotaProtegida><AppLayout /></RotaProtegida>}>
        <Route index element={<Inicio />} />
        {ITENS_DE_MENU.map((item) => (
          <Route key={item.caminho} path={item.caminho} element={<RotaProtegida rota={item}><EmConstrucao item={item} /></RotaProtegida>} />
        ))}
        {/* Endereço desconhecido: sem sessão, a guarda leva ao login; com sessão, "não encontrada" no shell. */}
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}
