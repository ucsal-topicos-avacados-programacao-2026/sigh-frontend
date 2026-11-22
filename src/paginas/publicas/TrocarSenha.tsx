import { KeyRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { trocarSenhaInicial } from '@/api/auth'
import { ErroApi } from '@/api/cliente'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { CampoSenha } from '@/componentes/Campo'
import { CartaoDeEntrada } from '@/paginas/publicas/CartaoDeEntrada'
import { PRAZO_ESGOTADO } from '@/paginas/publicas/useConfirmacaoDoCodigo'
import { erroDaNovaSenha } from '@/paginas/senha/regrasDeSenha'

export function TrocarSenha() {
  const { entradaPendente, iniciarEntrada, concluirEntrada, sair } = useSessao()
  const navegar = useNavigate()
  const local = useLocation()
  const destino = (local.state as { de?: string } | null)?.de ?? '/'
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string>()
  const [erroGeral, setErroGeral] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const h1 = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = 'Troque a sua senha · SIGH'
    h1.current?.focus()
  }, [])

  if (!entradaPendente) return <Navigate to="/entrar" replace />

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!entradaPendente) return
    const problema = erroDaNovaSenha(senha, confirmacao)
    setErro(problema)
    setErroGeral(undefined)
    if (problema) return
    setEnviando(true)
    try {
      const resposta = await trocarSenhaInicial(entradaPendente.token, senha)
      if (resposta.etapa === 'ACESSO_LIBERADO') {
        await concluirEntrada(resposta.token)
        navegar(destino, { replace: true })
        return
      }
      iniciarEntrada({ token: resposta.token, etapa: resposta.etapa })
      navegar(resposta.etapa === 'CADASTRAR_SEGUNDO_FATOR' ? '/entrar/segundo-fator/cadastro' : '/entrar/segundo-fator', {
        state: { de: destino },
        replace: true,
      })
    } catch (falha) {
      if (falha instanceof ErroApi && falha.status === 401) {
        sair(PRAZO_ESGOTADO)
        navegar('/entrar', { replace: true })
        return
      }
      setErroGeral(falha instanceof Error ? falha.message : 'Não foi possível trocar a senha.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <CartaoDeEntrada>
      <h1 ref={h1} tabIndex={-1} data-foco-programatico className="text-titulo-pagina font-semibold text-texto-forte">
        Troque a sua senha
      </h1>
      <p className="mt-2 text-corpo text-texto-suave">
        Você entrou com uma senha temporária. Escolha uma senha só sua para continuar. Você tem 5 minutos para concluir esta etapa.
      </p>
      <form onSubmit={enviar} noValidate className="mt-6 grid gap-4">
        <CampoSenha
          rotulo="Nova senha"
          ajuda="De 10 a 72 caracteres, com letras e números."
          autoComplete="new-password"
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value)
            setErro(undefined)
          }}
          erro={erro}
        />
        <CampoSenha
          rotulo="Repita a nova senha"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => {
            setConfirmacao(e.target.value)
            setErro(undefined)
          }}
        />
        {erroGeral && (
          <Alerta tom="erro" anunciar={false} titulo="A senha não foi trocada">
            {erroGeral}
          </Alerta>
        )}
        <Botao type="submit" icone={KeyRound} carregando={enviando} textoCarregando="Trocando…">
          Trocar senha e continuar
        </Botao>
      </form>
    </CartaoDeEntrada>
  )
}
