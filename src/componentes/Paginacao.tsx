import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Botao } from '@/componentes/Botao'

interface PropriedadesPaginacao {
  /** Nome da lista, para o leitor de tela: "Páginas dos acessos". */
  rotulo: string
  /** Página atual, a partir de 0, como o Spring. */
  pagina: number
  totalPaginas: number
  totalItens: number
  /** "acessos", "registros"… */
  nomeDosItens: string
  carregando?: boolean
  aoMudar: (pagina: number) => void
}

/** Anterior e Próxima, com "Página X de Y". Some quando cabe tudo numa página. */
export function Paginacao({ rotulo, pagina, totalPaginas, totalItens, nomeDosItens, carregando = false, aoMudar }: PropriedadesPaginacao) {
  const paginas = Math.max(1, totalPaginas)
  if (paginas <= 1) return null
  return (
    <nav aria-label={rotulo} className="flex flex-wrap items-center justify-between gap-3 border-t border-borda-divisoria px-4 py-3 sm:px-5">
      <p className="text-corpo text-texto-suave" aria-live="polite">
        Página {pagina + 1} de {paginas} · {totalItens} {nomeDosItens}
      </p>
      <div className="flex gap-2">
        <Botao variante="secundario" icone={ChevronLeft} disabled={pagina === 0 || carregando} onClick={() => aoMudar(pagina - 1)}>
          Anterior
        </Botao>
        <Botao variante="secundario" iconeFinal={ChevronRight} disabled={pagina + 1 >= paginas || carregando} onClick={() => aoMudar(pagina + 1)}>
          Próxima
        </Botao>
      </div>
    </nav>
  )
}
