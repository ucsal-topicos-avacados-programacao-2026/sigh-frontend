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
import { AtendimentoDoPaciente } from '@/paginas/medico/AtendimentoDoPaciente'
import { Atendimentos } from '@/paginas/medico/Atendimentos'
import { Relatorios } from '@/paginas/auditor/Relatorios'
import { Consentimentos } from '@/paginas/paciente/Consentimentos'
import { MeuProntuario } from '@/paginas/paciente/MeuProntuario'
import { Pacientes } from '@/paginas/pacientes/Pacientes'
import { PainelDosHospitais } from '@/paginas/painel/PainelDosHospitais'
import { PacienteAtivoProvider } from '@/paciente/PacienteAtivo'
import { CadastrarSegundoFator } from '@/paginas/publicas/CadastrarSegundoFator'
import { Entrar } from '@/paginas/publicas/Entrar'
import { ValidarSegundoFator } from '@/paginas/publicas/ValidarSegundoFator'
import { ITENS_DE_MENU } from '@/rotas'

/** Telas já entregues, por caminho do menu. As outras mostram "Em construção" até o card delas. */
const PAGINAS: Partial<Record<string, ComponentType>> = {
  '/painel': PainelDosHospitais,
  '/pacientes': Pacientes,
  '/leitos': Leitos,
  '/internacoes': Internacoes,
  '/triagem': Triagem,
  '/atendimentos': Atendimentos,
  '/meu-prontuario': MeuProntuario,
  '/consentimentos': Consentimentos,
  '/auditoria': Auditoria,
  '/relatorios': Relatorios,
}

const ITEM_ATENDIMENTOS = ITENS_DE_MENU.find((item) => item.caminho === '/atendimentos')
if (!ITEM_ATENDIMENTOS) throw new Error('O item /atendimentos precisa existir em rotas.ts')
const ATENDIMENTO_DO_MEDICO = { ...ITEM_ATENDIMENTOS, perfis: ['MEDICO'] as const }

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
        {/* O atendimento de um paciente: só o médico registra e pede o resumo (AtendimentoController é de MEDICO). */}
        <Route path="/atendimentos/:atendimentoId" element={<RotaProtegida rota={ATENDIMENTO_DO_MEDICO}><AtendimentoDoPaciente /></RotaProtegida>} />
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
