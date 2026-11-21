import { useEffect, useRef } from 'react'

/**
 * Chama a função a cada intervalo, enquanto a aba está visível (estado "em tempo real" sem servidor de eventos).
 * Ao voltar para a aba, atualiza na hora.
 */
export function useAtualizacaoPeriodica(atualizar: () => void, intervaloMs: number) {
  const atual = useRef(atualizar)
  useEffect(() => {
    atual.current = atualizar
  })
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') atual.current()
    }, intervaloMs)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') atual.current()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [intervaloMs])
}
