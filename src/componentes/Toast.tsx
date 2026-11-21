import { Check, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

interface Mensagem {
  id: number
  texto: string
}

const ContextoDoToast = createContext<(texto: string) => void>(() => {})

const DURACAO = 5000

export function ProvedorDeToast({ children }: { children: ReactNode }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const proximo = useRef(1)
  const avisar = useCallback((texto: string) => {
    const id = proximo.current++
    setMensagens((atuais) => [...atuais.slice(-2), { id, texto }])
  }, [])
  const fechar = useCallback((id: number) => setMensagens((atuais) => atuais.filter((m) => m.id !== id)), [])
  return (
    <ContextoDoToast.Provider value={avisar}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="fixed right-4 bottom-4 left-4 z-50 flex flex-col gap-2 sm:right-6 sm:bottom-6 sm:left-auto sm:w-[400px]"
      >
        {mensagens.map((mensagem) => (
          <ItemDoToast key={mensagem.id} mensagem={mensagem} aoFechar={fechar} />
        ))}
      </div>
    </ContextoDoToast.Provider>
  )
}

function ItemDoToast({ mensagem, aoFechar }: { mensagem: Mensagem; aoFechar: (id: number) => void }) {
  const [pausado, setPausado] = useState(false)
  useEffect(() => {
    if (pausado) return
    const temporizador = window.setTimeout(() => aoFechar(mensagem.id), DURACAO)
    return () => window.clearTimeout(temporizador)
  }, [pausado, aoFechar, mensagem.id])
  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      className="superficie-escura flex items-center gap-3 rounded-painel bg-primaria px-4 py-3 text-corpo font-medium text-white shadow-sobreposto"
    >
      <Check size={16} aria-hidden="true" className="shrink-0 text-foco-escuro" />
      <span className="flex-1">{mensagem.texto}</span>
      <button
        type="button"
        onClick={() => aoFechar(mensagem.id)}
        aria-label="Fechar mensagem"
        className="inline-flex size-alvo items-center justify-center rounded-controle lg:size-8"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useToast() {
  const avisar = useContext(ContextoDoToast)
  return useMemo(() => ({ avisar }), [avisar])
}
