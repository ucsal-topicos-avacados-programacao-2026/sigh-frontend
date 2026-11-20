import { Loader2, type LucideIcon } from 'lucide-react'
import type { ComponentPropsWithRef, ReactNode } from 'react'

type Variante = 'primario' | 'secundario' | 'perigo' | 'texto' | 'entrada'

const ESTILO: Record<Variante, string> = {
  primario:
    'rounded-controle bg-primaria text-white shadow-botao hover:bg-primaria-hover active:bg-primaria-ativa disabled:bg-superficie-desabilitada disabled:text-texto-suave disabled:shadow-none',
  secundario:
    'rounded-controle border border-borda bg-superficie text-corpo-alerta hover:border-slate-300 hover:bg-superficie-suave active:bg-superficie-desabilitada disabled:text-texto-suave',
  perigo: 'rounded-controle bg-perigo text-white hover:bg-perigo-hover active:bg-perigo-hover disabled:bg-superficie-desabilitada disabled:text-texto-suave',
  texto: 'rounded-controle px-0 text-link hover:text-link-hover hover:underline disabled:text-texto-suave',
  /** Botão das telas de entrada: azul e arredondado, como na referência visual. */
  entrada:
    'rounded-full bg-entrada text-white shadow-botao hover:bg-entrada-hover disabled:bg-superficie-desabilitada disabled:text-texto-suave disabled:shadow-none',
}

interface PropriedadesBotao extends ComponentPropsWithRef<'button'> {
  variante?: Variante
  icone?: LucideIcon
  /** Ícone depois do texto (ex.: seta de "Acessar plataforma"). */
  iconeFinal?: LucideIcon
  carregando?: boolean
  /** Texto enquanto carrega, no gerúndio ("Entrando…"). */
  textoCarregando?: string
  larguraTotal?: boolean
  children: ReactNode
}

export function Botao({
  variante = 'primario',
  icone: Icone,
  iconeFinal: IconeFinal,
  carregando = false,
  textoCarregando,
  larguraTotal = false,
  type = 'button',
  disabled,
  className = '',
  children,
  ...resto
}: PropriedadesBotao) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`inline-flex min-h-alvo items-center justify-center gap-2 px-4 text-corpo font-semibold transition-colors duration-150 disabled:cursor-not-allowed lg:min-h-controle ${larguraTotal ? 'w-full' : ''} ${ESTILO[variante]} ${className}`}
      {...resto}
    >
      {carregando ? (
        <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
      ) : (
        Icone && <Icone size={16} aria-hidden="true" />
      )}
      <span>{carregando && textoCarregando ? textoCarregando : children}</span>
      {!carregando && IconeFinal && <IconeFinal size={16} aria-hidden="true" />}
    </button>
  )
}

interface PropriedadesBotaoIcone extends ComponentPropsWithRef<'button'> {
  icone: LucideIcon
  /** Verbo e objeto: "Fechar menu", "Próxima página". */
  rotulo: string
  escuro?: boolean
}

/** Botão só de ícone: o rótulo vai para o leitor de tela (aria-label). */
export function BotaoIcone({ icone: Icone, rotulo, escuro = false, type = 'button', className = '', ...resto }: PropriedadesBotaoIcone) {
  return (
    <button
      type={type}
      aria-label={rotulo}
      className={`inline-flex size-alvo shrink-0 items-center justify-center rounded-controle transition-colors duration-150 lg:size-controle ${
        escuro ? 'text-lateral-texto hover:bg-lateral-hover hover:text-white' : 'text-texto-medio hover:bg-superficie-desabilitada hover:text-texto-forte'
      } ${className}`}
      {...resto}
    >
      <Icone size={20} aria-hidden="true" />
    </button>
  )
}
