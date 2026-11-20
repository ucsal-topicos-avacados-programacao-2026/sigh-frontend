import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'

interface PropriedadesDialogo {
  aberto: boolean
  titulo: string
  mensagem: ReactNode
  /** Verbo da confirmação: "Encerrar atendimento". */
  rotuloConfirmar: string
  perigo?: boolean
  enviando?: boolean
  erro?: string
  aoConfirmar: () => void
  aoCancelar: () => void
}

/**
 * Confirmação de ação que não tem volta. O &lt;dialog&gt; nativo com showModal deixa o resto da página inerte,
 * prende o foco e trata o Esc. O foco começa no "Cancelar" e volta ao botão que abriu o diálogo.
 */
export function DialogoConfirmacao({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar,
  perigo = false,
  enviando = false,
  erro,
  aoConfirmar,
  aoCancelar,
}: PropriedadesDialogo) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const cancelar = useRef<HTMLButtonElement>(null)
  const anterior = useRef<Element | null>(null)
  const tituloId = useId()
  const mensagemId = useId()

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento || !aberto) return
    anterior.current = document.activeElement
    if (!elemento.open) elemento.showModal()
    document.body.style.overflow = 'hidden'
    cancelar.current?.focus()
    // Fechar ou desmontar (fim da sessão no meio, por exemplo) sempre destrava a rolagem e devolve o foco.
    return () => {
      if (elemento.open) elemento.close()
      document.body.style.overflow = ''
      if (anterior.current instanceof HTMLElement) anterior.current.focus()
    }
  }, [aberto])

  return (
    <dialog
      ref={dialogo}
      role="alertdialog"
      aria-labelledby={tituloId}
      aria-describedby={mensagemId}
      onCancel={(evento) => {
        evento.preventDefault()
        if (!enviando) aoCancelar()
      }}
      // Se o navegador fechar o diálogo por conta própria (Esc repetido), o estado acompanha.
      onClose={() => {
        if (aberto) aoCancelar()
      }}
      className="m-auto w-[min(100%-32px,440px)] rounded-painel bg-superficie p-6 shadow-dialogo backdrop:bg-slate-900/40"
    >
      <h2 id={tituloId} className="text-titulo-secao font-semibold text-texto-forte">
        {titulo}
      </h2>
      <div id={mensagemId} className="mt-2 text-corpo text-texto">
        {mensagem}
      </div>
      {erro && (
        <div className="mt-4">
          <Alerta tom="erro">{erro}</Alerta>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Botao ref={cancelar} variante="secundario" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </Botao>
        <Botao variante={perigo ? 'perigo' : 'primario'} onClick={aoConfirmar} carregando={enviando} textoCarregando="Enviando…">
          {rotuloConfirmar}
        </Botao>
      </div>
    </dialog>
  )
}
