import { useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { validarSegundoFator } from '@/api/auth'
import { ErroApi } from '@/api/cliente'
import { useSessao } from '@/auth/SessaoProvider'
import { validarCodigo } from '@/paginas/publicas/validarCodigo'

export const PRAZO_ESGOTADO = { texto: 'O tempo para confirmar o segundo fator acabou. Entre de novo.', tom: 'atencao' } as const

export function useConfirmacaoDoCodigo() {
  const { entradaPendente, concluirEntrada, sair } = useSessao()
  const navegar = useNavigate()
  const destino = (useLocation().state as { de?: string } | null)?.de ?? '/'
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | undefined>()
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  async function confirmar(evento: FormEvent) {
    evento.preventDefault()
    if (!entradaPendente) return
    const local = validarCodigo(codigo)
    setErro(local)
    setErroGeral(null)
    if (local) return campo.current?.focus()
    setEnviando(true)
    try {
      const resposta = await validarSegundoFator(entradaPendente.token, codigo)
      await concluirEntrada(resposta.token)
      navegar(destino, { replace: true })
    } catch (falha) {
      if (falha instanceof ErroApi && falha.status === 401 && falha.message.includes('Código')) {
        setErro(falha.message)
        setCodigo('')
        campo.current?.focus()
      } else if (falha instanceof ErroApi && falha.status === 401) {
        sair(PRAZO_ESGOTADO)
        navegar('/entrar', { replace: true })
      } else {
        setErroGeral(falha instanceof Error ? falha.message : 'Não foi possível confirmar o código.')
      }
    } finally {
      setEnviando(false)
    }
  }

  function voltar() {
    sair()
    navegar('/entrar', { replace: true })
  }

  return { entradaPendente, codigo, setCodigo, erro, erroGeral, enviando, campo, confirmar, voltar }
}
