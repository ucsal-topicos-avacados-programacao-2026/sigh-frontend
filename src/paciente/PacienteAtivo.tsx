import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { gerenciados as buscarGerenciados } from '@/api/paciente'
import type { PacienteGerenciado } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { useSessao } from '@/auth/SessaoProvider'

interface PacienteAtivo {
  carregando: boolean
  erro: string | undefined
  gerenciados: PacienteGerenciado[]
  ativo: PacienteGerenciado | null
  escolher: (pacienteId: string) => void
  recarregar: () => void
}

const Contexto = createContext<PacienteAtivo | null>(null)

export function PacienteAtivoProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSessao()
  const ehPaciente = usuario?.perfis.includes('PACIENTE') ?? false
  const consulta = useConsulta(ehPaciente ? (sinal) => buscarGerenciados(sinal) : null, [ehPaciente, usuario?.login])
  const [escolhido, setEscolhido] = useState<string | null>(null)

  const valor = useMemo<PacienteAtivo>(() => {
    const lista = consulta.dados ?? []
    const ativo =
      lista.find((p) => p.pacienteId === escolhido) ?? lista.find((p) => p.relacao === 'TITULAR') ?? lista[0] ?? null
    return {
      carregando: consulta.carregando,
      erro: consulta.erro,
      gerenciados: lista,
      ativo,
      escolher: setEscolhido,
      recarregar: consulta.recarregar,
    }
  }, [consulta.dados, consulta.carregando, consulta.erro, consulta.recarregar, escolhido])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function usePacienteAtivo() {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('usePacienteAtivo precisa estar dentro de PacienteAtivoProvider')
  return contexto
}
