import { AlertCircle, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

interface PartesDoCampo {
  rotulo: string
  ajuda?: ReactNode
  erro?: string
  opcional?: boolean
}

function idsDescritos(ajudaId: string | undefined, erroId: string | undefined, extra?: string) {
  return [extra, ajudaId, erroId].filter(Boolean).join(' ') || undefined
}

function Rotulo({ para, rotulo, opcional }: { para: string; rotulo: string; opcional?: boolean }) {
  return (
    <label htmlFor={para} className="block text-corpo font-medium text-corpo-alerta">
      {rotulo}
      {opcional && <span className="font-normal text-texto-suave"> (opcional)</span>}
    </label>
  )
}

function MensagemDeErro({ id, erro }: { id: string; erro: string }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-corpo text-erro">
      <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      {erro}
    </p>
  )
}

type PropriedadesCampo = PartesDoCampo & InputHTMLAttributes<HTMLInputElement>

/**
 * Campo com rótulo visível, ajuda e erro junto do campo, ligados por aria-describedby. O placeholder nunca
 * substitui o rótulo.
 */
export const CampoTexto = forwardRef<HTMLInputElement, PropriedadesCampo>(function CampoTexto(
  { rotulo, ajuda, erro, opcional, id, className = '', 'aria-describedby': descritoPor, ...resto },
  ref,
) {
  const gerado = useId()
  const campoId = id ?? gerado
  const ajudaId = ajuda ? `${campoId}-ajuda` : undefined
  const erroId = erro ? `${campoId}-erro` : undefined
  return (
    <div>
      <Rotulo para={campoId} rotulo={rotulo} opcional={opcional} />
      {ajuda && (
        <p id={ajudaId} className="mt-1 text-corpo text-texto-suave">
          {ajuda}
        </p>
      )}
      <input
        ref={ref}
        id={campoId}
        aria-invalid={erro ? true : undefined}
        aria-describedby={idsDescritos(ajudaId, erroId, descritoPor)}
        className={`campo mt-1.5 ${className}`}
        {...resto}
      />
      {erro && erroId && <MensagemDeErro id={erroId} erro={erro} />}
    </div>
  )
})

type PropriedadesSenha = PartesDoCampo & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const CampoSenha = forwardRef<HTMLInputElement, PropriedadesSenha>(function CampoSenha(
  { rotulo, ajuda, erro, opcional, id, ...resto },
  ref,
) {
  const gerado = useId()
  const campoId = id ?? gerado
  const ajudaId = ajuda ? `${campoId}-ajuda` : undefined
  const erroId = erro ? `${campoId}-erro` : undefined
  const [visivel, setVisivel] = useState(false)
  return (
    <div>
      <Rotulo para={campoId} rotulo={rotulo} opcional={opcional} />
      {ajuda && (
        <p id={ajudaId} className="mt-1 text-corpo text-texto-suave">
          {ajuda}
        </p>
      )}
      <div className="relative mt-1.5">
        <input
          ref={ref}
          id={campoId}
          type={visivel ? 'text' : 'password'}
          aria-invalid={erro ? true : undefined}
          aria-describedby={idsDescritos(ajudaId, erroId)}
          className="campo pr-12"
          {...resto}
        />
        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-controls={campoId}
          className="absolute inset-y-0 right-0 inline-flex w-alvo items-center justify-center rounded-controle text-texto-medio hover:text-texto-forte lg:w-controle"
        >
          {visivel ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
      {erro && erroId && <MensagemDeErro id={erroId} erro={erro} />}
    </div>
  )
})

type PropriedadesSelecao = PartesDoCampo & SelectHTMLAttributes<HTMLSelectElement>

/** Select nativo: teclado, leitor de tela e toque funcionam sem código extra. */
export function Selecao({ rotulo, ajuda, erro, opcional, id, className = '', children, ...resto }: PropriedadesSelecao) {
  const gerado = useId()
  const campoId = id ?? gerado
  const ajudaId = ajuda ? `${campoId}-ajuda` : undefined
  const erroId = erro ? `${campoId}-erro` : undefined
  return (
    <div>
      <Rotulo para={campoId} rotulo={rotulo} opcional={opcional} />
      {ajuda && (
        <p id={ajudaId} className="mt-1 text-corpo text-texto-suave">
          {ajuda}
        </p>
      )}
      <div className="relative mt-1.5">
        <select
          id={campoId}
          aria-invalid={erro ? true : undefined}
          aria-describedby={idsDescritos(ajudaId, erroId)}
          className={`campo appearance-none pr-9 ${className}`}
          {...resto}
        >
          {children}
        </select>
        <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-texto-medio" />
      </div>
      {erro && erroId && <MensagemDeErro id={erroId} erro={erro} />}
    </div>
  )
}
