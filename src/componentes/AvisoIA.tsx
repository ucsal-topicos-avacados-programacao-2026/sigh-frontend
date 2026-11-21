import { Info } from 'lucide-react'
import { useId, type ReactNode } from 'react'

export const TITULO_DO_AVISO_DE_IA = 'Sugestão gerada por IA — sujeita à validação profissional'

interface PropriedadesAvisoIA {
  aviso?: string
  metadado?: string
  children?: ReactNode
}

export function AvisoIA({ aviso, metadado, children }: PropriedadesAvisoIA) {
  const tituloId = useId()
  const corpoId = useId()
  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-3">
      <div className="flex gap-3 rounded-painel border border-ia-borda bg-ia-fundo px-4 py-3">
        <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-ia" />
        <div>
          <p id={tituloId} className="text-corpo font-semibold text-ia">
            {TITULO_DO_AVISO_DE_IA}
          </p>
          {aviso && (
            <p id={corpoId} className="mt-1 text-corpo text-corpo-alerta">
              {aviso}
            </p>
          )}
          {metadado && <p className="mt-1 text-rotulo text-texto-suave">{metadado}</p>}
        </div>
      </div>
      {children && (
        <div role="group" aria-labelledby={tituloId} aria-describedby={aviso ? corpoId : undefined} className="text-corpo text-texto">
          {children}
        </div>
      )}
    </section>
  )
}
