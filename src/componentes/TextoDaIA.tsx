import { blocos, type Trecho } from '@/componentes/markdownSimples'

function Trechos({ trechos }: { trechos: Trecho[] }) {
  return trechos.map((t, i) =>
    t.negrito ? <strong key={i} className="font-semibold text-texto-forte">{t.texto}</strong> : t.italico ? <em key={i}>{t.texto}</em> : <span key={i}>{t.texto}</span>,
  )
}

/** Texto gerado pela IA, com títulos, listas, negrito e itálico do Markdown, e nada de HTML. */
export function TextoDaIA({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-2">
      {blocos(texto).map((bloco, i) => {
        if (bloco.tipo === 'titulo') {
          return (
            <p key={i} className="mt-2 font-semibold text-texto-forte first:mt-0">
              <Trechos trechos={bloco.trechos} />
            </p>
          )
        }
        if (bloco.tipo === 'lista') {
          const Lista = bloco.ordenada ? 'ol' : 'ul'
          return (
            <Lista key={i} className={`${bloco.ordenada ? 'list-decimal' : 'list-disc'} flex flex-col gap-1 pl-5`}>
              {bloco.itens.map((item, j) => (
                <li key={j}>
                  <Trechos trechos={item} />
                </li>
              ))}
            </Lista>
          )
        }
        return (
          <p key={i}>
            <Trechos trechos={bloco.trechos} />
          </p>
        )
      })}
    </div>
  )
}
