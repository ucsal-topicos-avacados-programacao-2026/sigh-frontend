import { Lock } from 'lucide-react'
import { NOME_DO_TIPO_DE_REGISTRO, type RegistroDoHistorico } from '@/api/tipos'
import { Etiqueta } from '@/componentes/Etiqueta'
import { formatarDataHora } from '@/util/datas'

/** Registros do histórico, do mais recente para o mais antigo, com a instituição de origem e se são restritos. */
export function RegistrosClinicos({ registros, nivelDoTitulo = 3 }: { registros: RegistroDoHistorico[]; nivelDoTitulo?: 3 | 4 }) {
  const Titulo = nivelDoTitulo === 3 ? 'h3' : 'h4'
  return (
    <ol className="grid gap-3">
      {registros.map((r) => (
        <li key={r.id}>
          <article aria-labelledby={`registro-clinico-${r.id}`} className="rounded-controle border border-borda p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Titulo id={`registro-clinico-${r.id}`} className="text-destaque font-semibold text-texto-forte">
                  {NOME_DO_TIPO_DE_REGISTRO[r.tipo]}
                  {r.codigoCID10 && <span className="font-normal text-texto-suave"> · CID {r.codigoCID10}</span>}
                </Titulo>
                <p className="mt-0.5 text-corpo text-texto-suave">
                  {formatarDataHora(r.criadoEm)} · {r.instituicaoOrigem}
                  {r.categoriaInformacao && ` · ${r.categoriaInformacao}`}
                </p>
              </div>
              {r.restrito && <Etiqueta tom="atencao" icone={Lock} texto="Restrito pelo paciente" />}
            </div>
            <p className="mt-3 text-corpo whitespace-pre-line text-texto">{r.conteudo}</p>
          </article>
        </li>
      ))}
    </ol>
  )
}
