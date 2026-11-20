import { useId, type ReactNode } from 'react'

interface PropriedadesPainel {
  titulo: string
  subtitulo?: string
  acoes?: ReactNode
  carregando?: boolean
  children: ReactNode
  /** Sem o espaçamento interno, para tabela ocupar a largura do painel. */
  semRespiro?: boolean
}

export function Painel({ titulo, subtitulo, acoes, carregando = false, semRespiro = false, children }: PropriedadesPainel) {
  const id = useId()
  return (
    <section aria-labelledby={id} aria-busy={carregando || undefined} className="rounded-painel border border-borda bg-superficie">
      <div className="flex min-h-16 flex-col gap-3 border-b border-borda-divisoria px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 id={id} className="text-destaque font-semibold text-texto-forte">
            {titulo}
          </h2>
          {subtitulo && <p className="mt-1 text-corpo text-texto-suave">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
      <div className={semRespiro ? '' : 'p-4 sm:p-5'}>{children}</div>
    </section>
  )
}
