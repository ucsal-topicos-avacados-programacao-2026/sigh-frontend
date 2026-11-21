import { useEffect, useRef, type ReactNode } from 'react'

interface PropriedadesTitulo {
  titulo: string
  subtitulo?: string
  trilha?: string
  acoes?: ReactNode
  focar?: boolean
  tituloDaAba?: string
}

export function TituloPagina({ titulo, subtitulo, trilha, acoes, focar = true, tituloDaAba }: PropriedadesTitulo) {
  const h1 = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    document.title = `${tituloDaAba ?? titulo} · SIGH`
    if (focar) h1.current?.focus()
  }, [titulo, tituloDaAba, focar])
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {trilha && <p className="mb-2 text-rotulo text-texto-suave">{trilha}</p>}
        <h1 ref={h1} tabIndex={-1} data-foco-programatico className="text-titulo-pagina font-semibold text-texto-forte">
          {titulo}
        </h1>
        {subtitulo && <p className="mt-1 text-corpo text-texto-suave">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  )
}
