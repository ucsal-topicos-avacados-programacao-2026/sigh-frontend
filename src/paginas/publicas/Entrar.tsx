import { ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { entrar } from '@/api/auth'
import { ErroApi } from '@/api/cliente'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { CampoSenha, CampoTexto } from '@/componentes/Campo'
import { CartaoDeEntrada } from '@/paginas/publicas/CartaoDeEntrada'

export function Entrar() {
  const { iniciarEntrada, concluirEntrada, aviso } = useSessao()
  const navegar = useNavigate()
  const local = useLocation()
  const destino = (local.state as { de?: string } | null)?.de ?? '/'
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<{ login?: string; senha?: string }>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const campoLogin = useRef<HTMLInputElement>(null)
  const campoSenha = useRef<HTMLInputElement>(null)
  const botao = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    document.title = 'Entrar · SIGH'
    campoLogin.current?.focus()
  }, [])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const locais = {
      login: login.trim() ? undefined : 'Digite o seu login.',
      senha: senha ? undefined : 'Digite a sua senha.',
    }
    setErros(locais)
    setErroGeral(null)
    if (locais.login) return campoLogin.current?.focus()
    if (locais.senha) return campoSenha.current?.focus()
    setEnviando(true)
    try {
      const resposta = await entrar(login.trim(), senha)
      if (resposta.etapa === 'ACESSO_LIBERADO') {
        await concluirEntrada(resposta.token)
        navegar(destino, { replace: true })
        return
      }
      iniciarEntrada({ token: resposta.token, etapa: resposta.etapa })
      const rotaDaEtapa = {
        TROCAR_SENHA: '/entrar/trocar-senha',
        CADASTRAR_SEGUNDO_FATOR: '/entrar/segundo-fator/cadastro',
        VALIDAR_SEGUNDO_FATOR: '/entrar/segundo-fator',
      }
      navegar(rotaDaEtapa[resposta.etapa], { state: { de: destino } })
    } catch (falha) {
      if (falha instanceof ErroApi && Object.keys(falha.campos).length > 0) {
        setErros({ login: falha.campos.login, senha: falha.campos.senha })
      } else {
        setErroGeral(falha instanceof Error ? falha.message : 'Não foi possível entrar.')
        setSenha('')
        botao.current?.focus()
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <CartaoDeEntrada>
      <h1 className="text-titulo-pagina font-semibold text-texto-forte">Entre na sua conta</h1>
      <p className="mt-2 text-corpo text-texto-suave">Use suas credenciais institucionais para continuar.</p>
      {aviso && (
        <div className="mt-6">
          <Alerta tom={aviso.tom}>{aviso.texto}</Alerta>
        </div>
      )}
      <form noValidate onSubmit={enviar} className="mt-8 flex flex-col gap-5">
        <CampoTexto
          ref={campoLogin}
          rotulo="Login"
          name="login"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={login}
          onChange={(evento) => setLogin(evento.target.value)}
          erro={erros.login}
        />
        <CampoSenha
          ref={campoSenha}
          rotulo="Senha"
          name="senha"
          autoComplete="current-password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          erro={erros.senha}
        />
        <div role="alert">{erroGeral && <Alerta tom="erro" anunciar={false}>{erroGeral}</Alerta>}</div>
        <Botao ref={botao} type="submit" variante="entrada" larguraTotal iconeFinal={ChevronRight} carregando={enviando} textoCarregando="Entrando…">
          Acessar plataforma
        </Botao>
      </form>
      <p className="mt-4 text-corpo text-texto-suave">Esqueceu a senha? Procure o suporte de TI da sua instituição.</p>
    </CartaoDeEntrada>
  )
}
