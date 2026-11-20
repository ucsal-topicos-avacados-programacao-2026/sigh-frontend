import { useEffect } from 'react'
import { Navigate } from 'react-router'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { CampoDoCodigo } from '@/paginas/publicas/CampoDoCodigo'
import { useConfirmacaoDoCodigo } from '@/paginas/publicas/useConfirmacaoDoCodigo'
import { CartaoDeEntrada } from '@/paginas/publicas/CartaoDeEntrada'

export function ValidarSegundoFator() {
  const { entradaPendente, codigo, setCodigo, erro, erroGeral, enviando, campo, confirmar, voltar } = useConfirmacaoDoCodigo()

  useEffect(() => {
    document.title = 'Segundo fator · SIGH'
    campo.current?.focus()
  }, [campo])

  if (!entradaPendente) return <Navigate to="/entrar" replace />
  return (
    <CartaoDeEntrada>
      <h1 className="text-titulo-pagina font-semibold text-texto-forte">Confirme o segundo fator</h1>
      <p id="mfa-instrucao" className="mt-2 text-corpo text-texto-suave">
        Abra o aplicativo autenticador e digite o código de 6 dígitos do SIGH. Você tem 5 minutos para concluir esta etapa.
      </p>
      <form noValidate onSubmit={confirmar} className="mt-8 flex flex-col gap-5">
        <CampoDoCodigo ref={campo} valor={codigo} aoMudar={setCodigo} erro={erro} descritoPor="mfa-instrucao" />
        <div role="alert">{erroGeral && <Alerta tom="erro" anunciar={false}>{erroGeral}</Alerta>}</div>
        <Botao type="submit" variante="entrada" larguraTotal carregando={enviando} textoCarregando="Confirmando…">
          Confirmar código
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
