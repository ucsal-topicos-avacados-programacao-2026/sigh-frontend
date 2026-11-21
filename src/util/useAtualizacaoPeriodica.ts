import { useEffect, useRef } from 'react'

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
