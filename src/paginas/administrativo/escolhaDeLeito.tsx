import { NOME_DA_CATEGORIA, type CategoriaLeito, type Leito } from '@/api/tipos'
import { Selecao } from '@/componentes/Campo'

const CATEGORIAS = Object.keys(NOME_DA_CATEGORIA) as CategoriaLeito[]

interface PropriedadesEscolha {
  rotulo: string
  livres: Leito[]
  valor: string
  aoMudar: (leitoId: string) => void
  erro?: string
}

export function EscolhaDeLeito({ rotulo, livres, valor, aoMudar, erro }: PropriedadesEscolha) {
  return (
    <Selecao rotulo={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)} erro={erro}>
      <option value="">Escolha um leito livre</option>
      {CATEGORIAS.filter((c) => livres.some((l) => l.categoria === c)).map((c) => (
        <optgroup key={c} label={NOME_DA_CATEGORIA[c]}>
          {livres
            .filter((l) => l.categoria === c)
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo} · {l.setor}
              </option>
            ))}
        </optgroup>
      ))}
    </Selecao>
  )
}
