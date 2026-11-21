import { AlertCircle, ChevronDown, Eye, EyeOff } from 'lucide-react'
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

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

type PropriedadesAreaDeTexto = PartesDoCampo & TextareaHTMLAttributes<HTMLTextAreaElement>

/** Texto longo. Com maxLength, mostra quantos caracteres faltam (anunciado só ao chegar perto do limite). */
export const AreaDeTexto = forwardRef<HTMLTextAreaElement, PropriedadesAreaDeTexto>(function AreaDeTexto(
  { rotulo, ajuda, erro, opcional, id, className = '', rows = 3, maxLength, value, ...resto },
  ref,
) {
  const gerado = useId()
  const campoId = id ?? gerado
  const ajudaId = ajuda ? `${campoId}-ajuda` : undefined
  const erroId = erro ? `${campoId}-erro` : undefined
  const restantes = maxLength !== undefined && typeof value === 'string' ? maxLength - value.length : undefined
  return (
    <div>
      <Rotulo para={campoId} rotulo={rotulo} opcional={opcional} />
      {ajuda && (
        <p id={ajudaId} className="mt-1 text-corpo text-texto-suave">
          {ajuda}
        </p>
      )}
      <textarea
        ref={ref}
        id={campoId}
        rows={rows}
        maxLength={maxLength}
        value={value}
        aria-invalid={erro ? true : undefined}
        aria-describedby={idsDescritos(ajudaId, erroId)}
        className={`campo mt-1.5 py-2.5 leading-6 ${className}`}
        {...resto}
      />
      <div className="flex items-start justify-between gap-3">
        {erro && erroId ? <MensagemDeErro id={erroId} erro={erro} /> : <span />}
        {restantes !== undefined && (
          <p className="mt-1.5 shrink-0 text-rotulo text-texto-suave" aria-live={restantes <= 100 ? 'polite' : 'off'}>
            {restantes === 1 ? 'Resta 1 caractere' : `Restam ${restantes} caracteres`}
          </p>
        )}
      </div>
    </div>
  )
})

export interface OpcaoDoGrupo<T extends string> {
  valor: T
  rotulo: string
  descricao?: string
}

interface PropriedadesGrupoDeOpcoes<T extends string> {
  legenda: string
  ajuda?: ReactNode
  nome: string
  opcoes: readonly OpcaoDoGrupo<T>[]
  /** Vazio: nenhuma opção marcada ainda. */
  valor: T | ''
  aoMudar: (valor: T) => void
  erro?: string
}

/** Rádios nativos num fieldset com legenda: setas do teclado e leitor de tela funcionam sem código extra. */
export function GrupoDeOpcoes<T extends string>({ legenda, ajuda, nome, opcoes, valor, aoMudar, erro }: PropriedadesGrupoDeOpcoes<T>) {
  const gerado = useId()
  const ajudaId = ajuda ? `${gerado}-ajuda` : undefined
  const erroId = erro ? `${gerado}-erro` : undefined
  return (
    <fieldset aria-describedby={idsDescritos(ajudaId, erroId)}>
      <legend className="text-corpo font-medium text-corpo-alerta">{legenda}</legend>
      {ajuda && (
        <p id={ajudaId} className="mt-1 text-corpo text-texto-suave">
          {ajuda}
        </p>
      )}
      <div className="mt-2 grid gap-2">
        {opcoes.map((opcao) => {
          const opcaoId = `${gerado}-${opcao.valor}`
          const rotuloId = `${opcaoId}-rotulo`
          const descricaoId = opcao.descricao ? `${opcaoId}-descricao` : undefined
          const marcada = opcao.valor === valor
          return (
            <label
              key={opcao.valor}
              htmlFor={opcaoId}
              className={`flex min-h-alvo cursor-pointer items-start gap-3 rounded-controle border px-3 py-2.5 ${
                marcada ? 'border-link bg-info-fundo' : 'border-borda bg-superficie hover:bg-superficie-suave'
              }`}
            >
              <input
                id={opcaoId}
                type="radio"
                name={nome}
                value={opcao.valor}
                checked={marcada}
                onChange={() => aoMudar(opcao.valor)}
                aria-labelledby={rotuloId}
                aria-describedby={descricaoId}
                className="mt-0.5 size-5 shrink-0 accent-link"
              />
              <span>
                <span id={rotuloId} className="block text-corpo font-medium text-texto">
                  {opcao.rotulo}
                </span>
                {opcao.descricao && (
                  <span id={descricaoId} className="mt-0.5 block text-corpo text-texto-suave">
                    {opcao.descricao}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      {erro && erroId && <MensagemDeErro id={erroId} erro={erro} />}
    </fieldset>
  )
}
