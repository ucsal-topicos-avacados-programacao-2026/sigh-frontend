import { useEffect, useRef, type ReactNode } from 'react'

interface PropriedadesTitulo {
  titulo: string
  subtitulo?: string
  /** Trilha: grupo do menu (texto, sem link). */
  trilha?: string
  acoes?: ReactNode
  /** Leva o foco para o h1 ao abrir a página (troca de rota). */
  focar?: boolean
  /** Título da aba, quando não é o próprio h1 ("Sem permissão"). */
  tituloDaAba?: string
}

/** h1 da página: define o título da aba ("Página · SIGH") e recebe o foco na troca de rota (WCAG 2.4.3). */
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
