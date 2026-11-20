import { forwardRef } from 'react'
import { CampoTexto } from '@/componentes/Campo'

interface PropriedadesCodigo {
  valor: string
  aoMudar: (valor: string) => void
  erro?: string
  descritoPor?: string
  desabilitado?: boolean
}

/** Um único campo para os 6 dígitos (não seis caixas). Não envia sozinho ao completar (WCAG 3.2.2). */
export const CampoDoCodigo = forwardRef<HTMLInputElement, PropriedadesCodigo>(function CampoDoCodigo(
  { valor, aoMudar, erro, descritoPor, desabilitado },
  ref,
) {
  return (
    <CampoTexto
      ref={ref}
      rotulo="Código de 6 dígitos"
      ajuda="O código muda a cada 30 segundos."
      name="codigo"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      maxLength={6}
      value={valor}
      onChange={(evento) => aoMudar(evento.target.value.replace(/\D/g, '').slice(0, 6))}
      erro={erro}
      disabled={desabilitado}
      aria-describedby={descritoPor}
      className="!min-h-12 max-w-[200px] text-titulo-secao font-semibold tracking-[.25em] tabular-nums"
    />
  )
})
