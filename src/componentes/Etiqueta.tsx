import type { LucideIcon } from 'lucide-react'

export type TomDaEtiqueta =
  | 'info'
  | 'sucesso'
  | 'atencao'
  | 'erro'
  | 'neutro'
  | 'risco-vermelho'
  | 'risco-laranja'
  | 'risco-amarelo'
  | 'risco-verde'
  | 'risco-azul'

const TOM: Record<TomDaEtiqueta, string> = {
  info: 'border-info-borda bg-info-fundo text-info',
  sucesso: 'border-sucesso-borda bg-sucesso-fundo text-sucesso',
  atencao: 'border-atencao-borda bg-atencao-fundo text-atencao',
  erro: 'border-erro-borda bg-erro-fundo text-erro',
  neutro: 'border-neutro-borda bg-neutro-fundo text-neutro',
  'risco-vermelho': 'border-erro-borda bg-risco-vermelho-fundo text-risco-vermelho',
  'risco-laranja': 'border-orange-200 bg-risco-laranja-fundo text-risco-laranja',
  'risco-amarelo': 'border-atencao-borda bg-risco-amarelo-fundo text-risco-amarelo',
  'risco-verde': 'border-sucesso-borda bg-risco-verde-fundo text-risco-verde',
  'risco-azul': 'border-info-borda bg-risco-azul-fundo text-risco-azul',
}

export function Etiqueta({ tom, texto, icone: Icone }: { tom: TomDaEtiqueta; texto: string; icone?: LucideIcon }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-etiqueta border px-2 py-0.5 text-rotulo font-semibold whitespace-nowrap ${TOM[tom]}`}>
      {Icone && <Icone size={12} aria-hidden="true" />}
      {texto}
    </span>
  )
}
