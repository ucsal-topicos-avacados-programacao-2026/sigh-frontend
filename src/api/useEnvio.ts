import { useCallback, useState } from 'react'
import { ErroApi } from '@/api/cliente'

export function useEnvio() {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string>()

  const enviar = useCallback(async (acao: () => Promise<unknown>) => {
    setEnviando(true)
    setErro(undefined)
    try {
      await acao()
      return true
    } catch (falha) {
      if (!(falha instanceof ErroApi && falha.status === 401)) {
        setErro(falha instanceof Error ? falha.message : 'Algo deu errado. Tente de novo.')
      }
      return false
    } finally {
      setEnviando(false)
    }
  }, [])

  const limparErro = useCallback(() => setErro(undefined), [])
  return { enviando, erro, enviar, limparErro }
}
