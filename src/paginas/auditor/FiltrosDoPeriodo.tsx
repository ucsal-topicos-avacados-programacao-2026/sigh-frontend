import { Filter } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { IndicadorInstituicao, Periodo } from '@/api/tipos'
import { Botao } from '@/componentes/Botao'
import { CampoTexto, Selecao } from '@/componentes/Campo'
import { errosDoPeriodo } from '@/paginas/auditor/textos'

export interface Filtros extends Periodo {
  /** Vazio: todas. */
  instituicaoId: string
  soEmergencias: boolean
}

interface Propriedades {
  aplicados: Filtros
  /** Instituições com acesso no período aplicado (dos indicadores): as únicas em que o filtro pode achar algo. */
  instituicoes: IndicadorInstituicao[] | undefined
  comEmergencias?: boolean
  aoAplicar: (filtros: Filtros) => void
}

/** Filtros por período e instituição. Só valem ao clicar em "Aplicar", para não buscar a cada tecla. */
export function FiltrosDoPeriodo({ aplicados, instituicoes, comEmergencias = false, aoAplicar }: Propriedades) {
  const [rascunho, setRascunho] = useState<Filtros>(aplicados)
  const [erros, setErros] = useState<{ inicio?: string; fim?: string }>({})

  function aplicar(evento: FormEvent) {
    evento.preventDefault()
    const novos = errosDoPeriodo(rascunho)
    setErros(novos)
    if (novos.inicio || novos.fim) return
    aoAplicar(rascunho)
  }

  const mudar = (parcial: Partial<Filtros>) => setRascunho((atual) => ({ ...atual, ...parcial }))
  // A instituição escolhida pode não ter acesso no novo período: continua na lista, para não sumir da tela.
  const opcoes = instituicoes ?? []
  const escolhidaForaDaLista = rascunho.instituicaoId && !opcoes.some((i) => i.instituicaoId === rascunho.instituicaoId)

  return (
    <form onSubmit={aplicar} noValidate aria-label="Filtros" className="grid gap-4 rounded-painel border border-borda bg-superficie p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[180px_180px_minmax(0,1fr)_auto] lg:items-start">
      <CampoTexto
        rotulo="De"
        type="date"
        value={rascunho.inicio}
        onChange={(e) => {
          mudar({ inicio: e.target.value })
          setErros((atuais) => ({ ...atuais, inicio: undefined }))
        }}
        erro={erros.inicio}
      />
      <CampoTexto
        rotulo="Até"
        type="date"
        value={rascunho.fim}
        min={rascunho.inicio || undefined}
        onChange={(e) => {
          mudar({ fim: e.target.value })
          setErros((atuais) => ({ ...atuais, fim: undefined }))
        }}
        erro={erros.fim}
      />
      <Selecao
        rotulo="Instituição"
        ajuda='As que tiveram acesso no período aplicado. Tentativas de emergência recusadas e registros sem instituição aparecem em "Todas".'
        value={rascunho.instituicaoId}
        onChange={(e) => mudar({ instituicaoId: e.target.value })}
      >
        <option value="">Todas</option>
        {escolhidaForaDaLista && <option value={rascunho.instituicaoId}>A escolhida antes</option>}
        {opcoes.map((i) => (
          <option key={i.instituicaoId} value={i.instituicaoId}>
            {i.instituicao}
          </option>
        ))}
      </Selecao>
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1 lg:pt-[26px]">
        {comEmergencias && (
          <label className="flex min-h-alvo items-center gap-2 text-corpo text-texto lg:min-h-controle">
            <input
              type="checkbox"
              checked={rascunho.soEmergencias}
              onChange={(e) => mudar({ soEmergencias: e.target.checked })}
              className="size-5 accent-link"
            />
            Só emergências
          </label>
        )}
        <Botao type="submit" icone={Filter} className="w-full sm:w-auto">
          Aplicar
        </Botao>
      </div>
    </form>
  )
}
