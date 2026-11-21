import { useCallback, useEffect, useRef, useState } from 'react'
import { ErroApi } from '@/api/cliente'

export interface Consulta<T> {
  dados: T | undefined
  carregando: boolean
  erro: string | undefined
  recarregar: () => void
}

export function useConsulta<T>(buscar: ((sinal: AbortSignal) => Promise<T>) | null, dependencias: readonly unknown[]): Consulta<T> {
  const [estado, setEstado] = useState<{ dados?: T; carregando: boolean; erro?: string }>({ carregando: buscar !== null })
  const [versao, setVersao] = useState(0)
  const buscarRef = useRef(buscar)
  useEffect(() => {
    buscarRef.current = buscar
  })

  useEffect(() => {
    const atual = buscarRef.current
    if (!atual) return
    const controle = new AbortController()
    setEstado((anterior) => ({ dados: anterior.dados, carregando: true }))
    Promise.resolve()
      .then(() => {
        if (controle.signal.aborted) throw new DOMException('cancelada', 'AbortError')
        return atual(controle.signal)
      })
      .then(
      (dados) => {
        if (!controle.signal.aborted) setEstado({ dados, carregando: false })
      },
      (falha: unknown) => {
        if (controle.signal.aborted) return
        const erro = falha instanceof Error ? falha.message : 'Algo deu errado.'
        setEstado({ carregando: false, erro: falha instanceof ErroApi && falha.status === 401 ? undefined : erro })
      },
    )
    return () => controle.abort()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  return { dados: estado.dados, carregando: estado.carregando, erro: estado.erro, recarregar }
}
