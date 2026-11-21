import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type TomDoAlerta = 'info' | 'sucesso' | 'atencao' | 'erro'

const TOM: Record<TomDoAlerta, { icone: LucideIcon; caixa: string; titulo: string; papel: 'alert' | 'status' }> = {
  info: { icone: Info, caixa: 'border-info-borda bg-info-fundo', titulo: 'text-info', papel: 'status' },
  sucesso: { icone: CircleCheck, caixa: 'border-sucesso-borda bg-sucesso-fundo', titulo: 'text-sucesso', papel: 'status' },
  atencao: { icone: TriangleAlert, caixa: 'border-atencao-borda bg-atencao-fundo', titulo: 'text-atencao', papel: 'alert' },
  erro: { icone: CircleAlert, caixa: 'border-erro-borda bg-erro-fundo', titulo: 'text-erro', papel: 'alert' },
}

interface PropriedadesAlerta {
  tom: TomDoAlerta
  titulo?: string
  children?: ReactNode
  anunciar?: boolean
  acao?: ReactNode
  aoFechar?: () => void
}

export function Alerta({ tom, titulo, children, anunciar = true, acao, aoFechar }: PropriedadesAlerta) {
  const { icone: Icone, caixa, titulo: corDoTitulo, papel } = TOM[tom]
  return (
    <div role={anunciar ? papel : undefined} className={`flex gap-3 rounded-painel border px-4 py-3 ${caixa}`}>
      <Icone size={20} aria-hidden="true" className={`mt-0.5 shrink-0 ${corDoTitulo}`} />
      <div className="min-w-0 flex-1">
        {titulo && <p className={`text-corpo font-semibold ${corDoTitulo}`}>{titulo}</p>}
        {children && <div className={`text-corpo text-corpo-alerta ${titulo ? 'mt-1' : ''}`}>{children}</div>}
        {acao && <div className="mt-3">{acao}</div>}
      </div>
      {aoFechar && tom === 'info' && (
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar aviso"
          className="inline-flex size-alvo shrink-0 items-center justify-center rounded-controle text-texto-medio hover:text-texto-forte lg:size-8"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export function RegiaoDeAlerta({ children }: { children?: ReactNode }) {
  return <div aria-live="polite">{children}</div>
}
