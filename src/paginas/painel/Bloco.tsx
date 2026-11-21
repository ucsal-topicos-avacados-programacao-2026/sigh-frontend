import { useId, type ReactNode } from 'react'

/** Bloco do painel: título pequeno (h2) e o conteúdo. A posição na grade vem de quem usa. */
export function Bloco({ titulo, acao, className = '', children }: { titulo: string; acao?: ReactNode; className?: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col rounded-painel border border-borda bg-superficie p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h2 id={id} className="text-corpo font-semibold text-texto-medio">
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  )
}
