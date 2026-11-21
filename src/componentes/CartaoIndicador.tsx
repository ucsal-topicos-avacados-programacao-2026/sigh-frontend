import type { LucideIcon } from 'lucide-react'

interface Indicador {
  rotulo: string
  valor: string
  nota?: string
  icone?: LucideIcon
}

export function GradeDeIndicadores({ indicadores, carregando = false }: { indicadores: Indicador[]; carregando?: boolean }) {
  return (
    <dl aria-busy={carregando || undefined} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {indicadores.map(({ rotulo, valor, nota, icone: Icone }) => (
        <div key={rotulo} className="relative rounded-painel border border-borda bg-superficie p-4">
          <span aria-hidden="true" className="absolute top-0 right-3 left-3 h-0.5 bg-info" />
          <dt className="flex items-start justify-between gap-3 text-corpo font-medium text-texto-suave">
            {rotulo}
            {Icone && <Icone size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-info" />}
          </dt>
          <dd className="mt-2 text-indicador font-semibold text-texto-forte tabular-nums">{carregando ? '—' : valor}</dd>
          {nota && <dd className="mt-1 text-rotulo text-texto-suave">{nota}</dd>}
        </div>
      ))}
    </dl>
  )
}
