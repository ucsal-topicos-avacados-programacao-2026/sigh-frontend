import { ChevronLeft, ChevronRight, Siren } from 'lucide-react'
import { useState } from 'react'
import { acessos as buscarAcessos } from '@/api/paciente'
import { NOME_DO_PERFIL, type AcessoDoPaciente, type PacienteGerenciado } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { Botao } from '@/componentes/Botao'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { Tabela, type Coluna } from '@/componentes/Tabela'
import { formatarDataHora } from '@/util/datas'

const POR_PAGINA = 10

const COLUNAS: Coluna<AcessoDoPaciente>[] = [
  { titulo: 'Data e hora', celula: (a) => <span className="whitespace-nowrap">{formatarDataHora(a.ocorridoEm)}</span> },
  {
    titulo: 'Profissional',
    celula: (a) => (
      <>
        <span className="block font-medium">{a.profissional}</span>
        <span className="block text-texto-suave">{NOME_DO_PERFIL[a.perfil]}</span>
      </>
    ),
  },
  { titulo: 'Instituição', celula: (a) => a.instituicao ?? '—' },
  {
    titulo: 'Finalidade',
    celula: (a) => (
      <div className="flex flex-col items-start gap-1">
        <span>{a.finalidade}</span>
        {a.emergencia && <Etiqueta tom="atencao" icone={Siren} texto="Emergência" />}
      </div>
    ),
  },
]

/** Quem consultou o prontuário (RF-008): profissional, instituição, data e finalidade, do mais recente ao mais antigo. */
export function QuemAcessou({ paciente }: { paciente: PacienteGerenciado }) {
  const [pagina, setPagina] = useState(0)
  const consulta = useConsulta((sinal) => buscarAcessos(paciente.pacienteId, pagina, POR_PAGINA, sinal), [paciente.pacienteId, pagina])
  const info = consulta.dados?.page
  const total = info?.totalElements ?? 0
  const paginas = Math.max(1, info?.totalPages ?? 1)
  return (
    <Painel
      titulo="Quem acessou seu prontuário"
      subtitulo="Cada consulta ao seu histórico fica registrada e não pode ser apagada."
      carregando={consulta.carregando}
      semRespiro
    >
      <Tabela
        legenda="Acessos ao seu prontuário"
        legendaOculta
        colunas={COLUNAS}
        linhas={consulta.dados?.content}
        chave={(a) => `${a.ocorridoEm}-${a.profissional}-${a.finalidade}`}
        carregando={consulta.carregando}
        erro={consulta.erro}
        aoTentarDeNovo={consulta.recarregar}
        textoVazio="Ninguém acessou seu prontuário até agora."
      />
      {total > POR_PAGINA && (
        <nav aria-label="Páginas dos acessos" className="flex flex-wrap items-center justify-between gap-3 border-t border-borda-divisoria px-4 py-3 sm:px-5">
          <p className="text-corpo text-texto-suave" aria-live="polite">
            Página {pagina + 1} de {paginas} · {total} acessos
          </p>
          <div className="flex gap-2">
            <Botao variante="secundario" icone={ChevronLeft} disabled={pagina === 0 || consulta.carregando} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Botao>
            <Botao variante="secundario" iconeFinal={ChevronRight} disabled={pagina + 1 >= paginas || consulta.carregando} onClick={() => setPagina((p) => p + 1)}>
              Próxima
            </Botao>
          </div>
        </nav>
      )}
    </Painel>
  )
}
