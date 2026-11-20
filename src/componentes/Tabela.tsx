import { useId, type ReactNode } from 'react'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'

export interface Coluna<T> {
  titulo: string
  celula: (linha: T) => ReactNode
  /** Números alinhados à direita. */
  numerica?: boolean
}

interface PropriedadesTabela<T> {
  /** Título da tabela (caption), lido pelo leitor de tela. */
  legenda: string
  colunas: Coluna<T>[]
  linhas: T[] | undefined
  chave: (linha: T) => string
  carregando?: boolean
  erro?: string
  aoTentarDeNovo?: () => void
  textoVazio?: string
  /** O título já está visível num h2 do painel: a legenda fica só para o leitor de tela. */
  legendaOculta?: boolean
}

/**
 * Tabela com legenda, cabeçalhos de coluna e os estados de carregando, vazio e erro. Em telas pequenas, só a
 * tabela rola na horizontal, numa região que o teclado também rola (WCAG 1.4.10).
 */
export function Tabela<T>({
  legenda,
  colunas,
  linhas,
  chave,
  carregando = false,
  erro,
  aoTentarDeNovo,
  textoVazio = 'Nenhum registro encontrado.',
  legendaOculta = false,
}: PropriedadesTabela<T>) {
  const legendaId = useId()
  if (erro) {
    return (
      <div className="p-4">
        <Alerta
          tom="erro"
          titulo="Não foi possível carregar"
          acao={aoTentarDeNovo && <Botao variante="secundario" onClick={aoTentarDeNovo}>Tentar de novo</Botao>}
        >
          {erro}
        </Alerta>
      </div>
    )
  }
  return (
    // Rola na horizontal em tela pequena: com tabIndex, o teclado também rola (WCAG 2.1.1). É um grupo, e não um
    // marco (region), para não repetir o marco do painel que já tem o mesmo nome.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div role="group" aria-labelledby={legendaId} tabIndex={0} className="overflow-x-auto">
      <table aria-busy={carregando || undefined} className="w-full border-collapse text-left text-corpo text-texto">
        <caption id={legendaId} className={legendaOculta ? 'sr-only' : 'px-4 py-3 text-left font-semibold text-texto-forte'}>
          {legenda}
        </caption>
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th
                key={coluna.titulo}
                scope="col"
                className={`bg-superficie-suave px-3 py-3 text-rotulo font-semibold text-texto-medio sm:px-4 ${coluna.numerica ? 'text-right' : ''}`}
              >
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {carregando && (
            <tr>
              <td colSpan={colunas.length} className="px-4 py-8 text-center text-texto-suave">
                <span role="status">Carregando registros…</span>
              </td>
            </tr>
          )}
          {!carregando && linhas?.length === 0 && (
            <tr>
              <td colSpan={colunas.length} className="px-4 py-8 text-center text-texto-suave">
                {textoVazio}
              </td>
            </tr>
          )}
          {!carregando &&
            linhas?.map((linha) => (
              <tr key={chave(linha)} className="border-t border-borda-divisoria hover:bg-superficie-suave">
                {colunas.map((coluna) => (
                  <td key={coluna.titulo} className={`h-12 px-3 py-3 sm:px-4 ${coluna.numerica ? 'text-right tabular-nums' : ''}`}>
                    {coluna.celula(linha)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
