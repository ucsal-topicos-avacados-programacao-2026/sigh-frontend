import { Navigate, Route, Routes } from 'react-router'
import { RotaProtegida } from '@/auth/RotaProtegida'
import { useSessao } from '@/auth/SessaoProvider'
import { AppLayout } from '@/layout/AppLayout'
import type { ComponentType } from 'react'
import { EmConstrucao, Inicio, NaoEncontrada } from '@/paginas/comuns/PaginasComuns'
import { Internacoes } from '@/paginas/administrativo/Internacoes'
import { Leitos } from '@/paginas/administrativo/Leitos'
import { Auditoria } from '@/paginas/auditor/Auditoria'
import { Triagem } from '@/paginas/enfermeiro/Triagem'
import { Relatorios } from '@/paginas/auditor/Relatorios'
import { Consentimentos } from '@/paginas/paciente/Consentimentos'
import { MeuProntuario } from '@/paginas/paciente/MeuProntuario'
import { Pacientes } from '@/paginas/pacientes/Pacientes'
import { PacienteAtivoProvider } from '@/paciente/PacienteAtivo'
import { CadastrarSegundoFator } from '@/paginas/publicas/CadastrarSegundoFator'
import { Entrar } from '@/paginas/publicas/Entrar'
import { ValidarSegundoFator } from '@/paginas/publicas/ValidarSegundoFator'
import { ITENS_DE_MENU } from '@/rotas'

/** Telas já entregues, por caminho do menu. As outras mostram "Em construção" até o card delas. */
const PAGINAS: Partial<Record<string, ComponentType>> = {
  '/pacientes': Pacientes,
  '/leitos': Leitos,
  '/internacoes': Internacoes,
  '/triagem': Triagem,
  '/meu-prontuario': MeuProntuario,
  '/consentimentos': Consentimentos,
  '/auditoria': Auditoria,
  '/relatorios': Relatorios,
}

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
      <Route element={<RotaProtegida><PacienteAtivoProvider><AppLayout /></PacienteAtivoProvider></RotaProtegida>}>
        <Route index element={<Inicio />} />
        {ITENS_DE_MENU.map((item) => (
          <Route key={item.caminho} path={item.caminho} element={<RotaProtegida rota={item}><Pagina item={item} /></RotaProtegida>} />
        ))}
        {/* Endereço desconhecido: sem sessão, a guarda leva ao login; com sessão, "não encontrada" no shell. */}
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}

function Pagina({ item }: { item: (typeof ITENS_DE_MENU)[number] }) {
  const Entregue = PAGINAS[item.caminho]
  return Entregue ? <Entregue /> : <EmConstrucao item={item} />
}
