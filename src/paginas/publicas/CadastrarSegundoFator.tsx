import { Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { cadastrarSegundoFator } from '@/api/auth'
import { ErroApi } from '@/api/cliente'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { useToast } from '@/componentes/Toast'
import { CampoDoCodigo } from '@/paginas/publicas/CampoDoCodigo'
import { CartaoDeEntrada } from '@/paginas/publicas/CartaoDeEntrada'
import { PRAZO_ESGOTADO, useConfirmacaoDoCodigo } from '@/paginas/publicas/useConfirmacaoDoCodigo'

type Situacao =
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; uri: string; segredo: string }
  | { tipo: 'jaCadastrado'; mensagem: string }
  | { tipo: 'erro'; mensagem: string }

function segredoDa(uri: string) {
  const segredo = new URL(uri).searchParams.get('secret') ?? ''
  return segredo.replace(/(.{4})/g, '$1 ').trim()
}

export function CadastrarSegundoFator() {
  const { entradaPendente, iniciarEntrada, sair } = useSessao()
  const navegar = useNavigate()
  const { avisar } = useToast()
  const { codigo, setCodigo, erro, erroGeral, enviando, campo, confirmar, voltar } = useConfirmacaoDoCodigo()
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'carregando' })
  const [copiaFalhou, setCopiaFalhou] = useState(false)
  const h1 = useRef<HTMLHeadingElement>(null)
  const pedidoFeito = useRef<string | null>(null)

  useEffect(() => {
    document.title = 'Cadastro do segundo fator · SIGH'
    h1.current?.focus()
  }, [])

  const pedir = useCallback(async (token: string) => {
    setSituacao({ tipo: 'carregando' })
    try {
      const { uriAutenticador } = await cadastrarSegundoFator(token)
      setSituacao({ tipo: 'pronto', uri: uriAutenticador, segredo: segredoDa(uriAutenticador) })
    } catch (falha) {
      if (falha instanceof ErroApi && falha.status === 401) {
        sair(PRAZO_ESGOTADO)
        navegar('/entrar', { replace: true })
      } else if (falha instanceof ErroApi && falha.status === 422) setSituacao({ tipo: 'jaCadastrado', mensagem: falha.message })
      else setSituacao({ tipo: 'erro', mensagem: falha instanceof Error ? falha.message : 'Não foi possível gerar o QR code.' })
    }
  }, [sair, navegar])

  useEffect(() => {
    if (!entradaPendente || pedidoFeito.current === entradaPendente.token) return
    pedidoFeito.current = entradaPendente.token
    void pedir(entradaPendente.token)
  }, [entradaPendente, pedir])

  if (!entradaPendente) return <Navigate to="/entrar" replace />

  async function copiar(segredo: string) {
    try {
      await navigator.clipboard.writeText(segredo.replace(/\s/g, ''))
      setCopiaFalhou(false)
      avisar('Segredo copiado.')
    } catch {
      setCopiaFalhou(true)
    }
  }

  const pronto = situacao.tipo === 'pronto'
  return (
    <CartaoDeEntrada largo>
      <h1 ref={h1} tabIndex={-1} data-foco-programatico className="text-titulo-pagina font-semibold text-texto-forte">
        Cadastre o segundo fator
      </h1>
      <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-corpo text-texto">
        <li>Instale um aplicativo autenticador no celular.</li>
        <li>Leia o QR code abaixo ou digite o segredo no aplicativo.</li>
        <li>Digite o código de 6 dígitos que o aplicativo mostrar.</li>
      </ol>

      <div className="mt-6">
        {situacao.tipo === 'carregando' && (
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <div aria-hidden="true" className="size-48 rounded-painel bg-borda-divisoria" />
            <p role="status" className="text-corpo text-texto-suave">
              Gerando o QR code…
            </p>
          </div>
        )}
        {pronto && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div role="img" aria-label="QR code para cadastrar o SIGH no aplicativo autenticador" className="w-fit rounded-painel border border-borda bg-white p-4">
              <QRCodeSVG value={situacao.uri} size={192} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-corpo font-medium text-corpo-alerta">Segredo para digitar no aplicativo</p>
              <code className="font-mono text-destaque break-all text-texto select-all">{situacao.segredo}</code>
              <div>
                <Botao variante="secundario" icone={Copy} onClick={() => void copiar(situacao.segredo)}>
                  Copiar segredo
                </Botao>
              </div>
              {copiaFalhou && <Alerta tom="info">Não foi possível copiar. Selecione o segredo e copie manualmente.</Alerta>}
            </div>
          </div>
        )}
        {situacao.tipo === 'jaCadastrado' && (
          <Alerta
            tom="atencao"
            acao={
              <Botao
                onClick={() => {
                  iniciarEntrada({ token: entradaPendente.token, etapa: 'VALIDAR_SEGUNDO_FATOR' })
                  navegar('/entrar/segundo-fator', { replace: true })
                }}
              >
                Ir para a confirmação do código
              </Botao>
            }
          >
            {situacao.mensagem}
          </Alerta>
        )}
        {situacao.tipo === 'erro' && (
          <Alerta tom="erro" acao={<Botao variante="secundario" onClick={() => void pedir(entradaPendente.token)}>Tentar de novo</Botao>}>
            {situacao.mensagem}
          </Alerta>
        )}
      </div>

      <p className="mt-4 text-corpo text-texto-suave">
        Se você sair desta tela antes de ativar, um novo QR code será gerado na próxima entrada e o atual deixará de valer.
      </p>
      <form noValidate onSubmit={confirmar} className="mt-6 flex flex-col gap-5">
        <CampoDoCodigo ref={campo} valor={codigo} aoMudar={setCodigo} erro={erro} desabilitado={!pronto} />
        <div role="alert">{erroGeral && <Alerta tom="erro" anunciar={false}>{erroGeral}</Alerta>}</div>
        <Botao type="submit" variante="entrada" larguraTotal disabled={!pronto} carregando={enviando} textoCarregando="Ativando…">
          Ativar segundo fator
        </Botao>
      </form>
      <div className="mt-4">
        <Botao variante="texto" onClick={voltar}>
          Voltar ao login
        </Botao>
      </div>
    </CartaoDeEntrada>
  )
}
