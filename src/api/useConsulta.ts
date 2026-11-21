import { useCallback, useEffect, useRef, useState } from 'react'
import { ErroApi } from '@/api/cliente'

export interface Consulta<T> {
  dados: T | undefined
  carregando: boolean
  /** Mensagem para a tela; o 401 já encerrou a sessão no cliente e não chega aqui como erro de tela. */
  erro: string | undefined
  recarregar: () => void
}

/**
 * Carrega um recurso da API ao montar e quando as dependências mudam. Cancela a requisição anterior (troca de
 * paciente no meio do carregamento, por exemplo) e ignora respostas que chegam depois disso.
 */
export function useConsulta<T>(buscar: ((sinal: AbortSignal) => Promise<T>) | null, dependencias: readonly unknown[]): Consulta<T> {
  const [estado, setEstado] = useState<{ dados?: T; carregando: boolean; erro?: string }>({ carregando: buscar !== null })
  const [versao, setVersao] = useState(0)
  const buscarRef = useRef(buscar)
  // Antes do efeito da busca: ele sempre usa a função do último render.
  useEffect(() => {
    buscarRef.current = buscar
  })

  useEffect(() => {
    const atual = buscarRef.current
    if (!atual) return
    const controle = new AbortController()
    setEstado((anterior) => ({ dados: anterior.dados, carregando: true }))
    atual(controle.signal).then(
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
    // As dependências vêm de quem chama: são elas que dizem quando buscar de novo.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  return { dados: estado.dados, carregando: estado.carregando, erro: estado.erro, recarregar }
}
