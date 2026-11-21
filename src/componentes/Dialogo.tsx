import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface PropriedadesDialogo {
  aberto: boolean
  titulo: string
  descricao?: ReactNode
  aoFechar: () => void
  bloqueado?: boolean
  children: ReactNode
}

export function Dialogo({ aberto, titulo, descricao, aoFechar, bloqueado = false, children }: PropriedadesDialogo) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const anterior = useRef<Element | null>(null)
  const tituloId = useId()
  const descricaoId = useId()

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento || !aberto) return
    anterior.current = document.activeElement
    if (!elemento.open) elemento.showModal()
    document.body.style.overflow = 'hidden'
    const primeiro = elemento.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
    primeiro?.focus()
    return () => {
      if (elemento.open) elemento.close()
      document.body.style.overflow = ''
      if (anterior.current instanceof HTMLElement) anterior.current.focus()
    }
  }, [aberto])

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={tituloId}
      aria-describedby={descricao ? descricaoId : undefined}
      onCancel={(evento) => {
        evento.preventDefault()
        if (!bloqueado) aoFechar()
      }}
      onClose={() => {
        if (aberto) aoFechar()
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(100%-32px,560px)] overflow-y-auto rounded-painel bg-superficie p-6 shadow-dialogo backdrop:bg-slate-900/40"
    >
      {aberto && (
        <>
          <div className="flex items-start justify-between gap-3">
            <h2 id={tituloId} className="text-titulo-secao font-semibold text-texto-forte">
              {titulo}
            </h2>
            <button
              type="button"
              onClick={() => !bloqueado && aoFechar()}
              aria-label="Fechar"
              className="-mt-1 -mr-2 inline-flex size-alvo shrink-0 items-center justify-center rounded-controle text-texto-medio hover:text-texto-forte lg:size-9"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {descricao && (
            <div id={descricaoId} className="mt-2 text-corpo text-texto">
              {descricao}
            </div>
          )}
          <div className="mt-5">{children}</div>
        </>
      )}
    </dialog>
  )
}
