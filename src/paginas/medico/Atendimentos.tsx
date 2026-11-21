import { FileText, RefreshCw, Stethoscope, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { atendimentosEmAndamento } from '@/api/atendimento'
import { filaDeAtendimento } from '@/api/triagem'
import type { AtendimentoEmAndamento, PacienteNaFila, VinculoAtivo } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { perfilLiberado } from '@/auth/permissoes'
import { useSessao } from '@/auth/SessaoProvider'
import { Botao } from '@/componentes/Botao'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { SeloRisco } from '@/componentes/SeloRisco'
import { Tabela, type Coluna } from '@/componentes/Tabela'
import { TituloPagina } from '@/componentes/TituloPagina'
import { DialogoDoHistorico, type PacienteDoHistorico } from '@/paginas/enfermeiro/DialogoDoHistorico'
import { formatarDataHora } from '@/util/datas'
import { formatarEspera } from '@/util/espera'
import { useAtualizacaoPeriodica } from '@/util/useAtualizacaoPeriodica'

const ATUALIZAR_A_CADA_MS = 30_000
const LINK_DE_ACAO =
  'inline-flex min-h-alvo items-center justify-center gap-2 rounded-controle px-4 text-corpo font-semibold lg:min-h-controle'

/**
 * FE-07: por onde o médico chega ao paciente. A fila de triagem (por prioridade) e os atendimentos em andamento, que
 * saem da fila no primeiro registro do médico. O enfermeiro vê as mesmas listas e consulta o histórico.
 */
export function Atendimentos() {
  const { instituicaoAtiva } = useSessao()
  if (!instituicaoAtiva) return null
  return <ListasDeAtendimento key={instituicaoAtiva.instituicaoId} instituicao={instituicaoAtiva} />
}

function ListasDeAtendimento({ instituicao }: { instituicao: VinculoAtivo }) {
  const id = instituicao.instituicaoId
  const { usuario } = useSessao()
  // O enfermeiro também chega aqui: só o médico abre o atendimento; o enfermeiro consulta o histórico.
  const medico = perfilLiberado('MEDICO', { perfis: usuario?.perfis ?? [], instituicaoAtiva: instituicao })
  const emAndamento = useConsulta((sinal) => atendimentosEmAndamento(id, sinal), [id])
  const fila = useConsulta((sinal) => filaDeAtendimento(id, sinal), [id])
  const [historico, setHistorico] = useState<PacienteDoHistorico | null>(null)

  function atualizar() {
    emAndamento.recarregar()
    fila.recarregar()
  }
  useAtualizacaoPeriodica(atualizar, ATUALIZAR_A_CADA_MS)

  const acaoDoPaciente = (atendimentoId: string, paciente: string, rotulo: string) =>
    medico ? (
      <Link to={`/atendimentos/${atendimentoId}`} className={`${LINK_DE_ACAO} bg-primaria text-white shadow-botao hover:bg-primaria-hover`} aria-label={`${rotulo} ${paciente}`}>
        <Stethoscope size={16} aria-hidden="true" />
        {rotulo}
      </Link>
    ) : (
      <Botao variante="secundario" icone={FileText} onClick={() => setHistorico({ atendimentoId, paciente })} aria-label={`Histórico de ${paciente}`}>
        Histórico
      </Botao>
    )

  const colunasEmAndamento: Coluna<AtendimentoEmAndamento>[] = [
    { titulo: 'Prioridade', celula: (a) => (a.corConfirmada ? <SeloRisco cor={a.corConfirmada} /> : <span className="text-texto-suave">Sem classificação</span>) },
    { titulo: 'Paciente', celula: (a) => <span className="font-medium">{a.paciente}</span> },
    { titulo: 'Motivo', celula: (a) => <span className="block max-w-xs">{a.motivo}</span> },
    { titulo: 'Em atendimento desde', celula: (a) => <span className="whitespace-nowrap">{formatarDataHora(a.inicioClinicoEm)}</span> },
    {
      titulo: 'Médico',
      celula: (a) => (a.doUsuarioLogado ? <Etiqueta tom="info" texto="Você" /> : (a.medicoResponsavel ?? '—')),
    },
    { titulo: 'Ação', celula: (a) => acaoDoPaciente(a.atendimentoId, a.paciente, 'Abrir') },
  ]

  const colunasFila: Coluna<PacienteNaFila>[] = [
    { titulo: 'Prioridade', celula: (p) => <SeloRisco cor={p.corConfirmada} /> },
    { titulo: 'Paciente', celula: (p) => <span className="font-medium">{p.pacienteNome}</span> },
    {
      titulo: 'Espera',
      celula: (p) => (
        <div className="flex flex-col items-start gap-1">
          <span className="tabular-nums">{formatarEspera(p.minutosDeEspera)}</span>
          {p.tempoMaximoExcedido && <Etiqueta tom="erro" icone={TriangleAlert} texto="Tempo máximo excedido" />}
        </div>
      ),
    },
    { titulo: 'Ação', celula: (p) => acaoDoPaciente(p.atendimentoId, p.pacienteNome, 'Atender') },
  ]

  const meus = emAndamento.dados?.filter((a) => a.doUsuarioLogado).length ?? 0

  return (
    <>
      <TituloPagina
        titulo="Atendimentos"
        trilha="Atendimento"
        subtitulo={`Fila e atendimentos em andamento em ${instituicao.instituicaoNome}. As listas se atualizam sozinhas a cada 30 segundos.`}
        acoes={
          <Botao variante="secundario" icone={RefreshCw} onClick={atualizar}>
            Atualizar
          </Botao>
        }
      />
      <Painel
        titulo="Em atendimento"
        subtitulo={medico && meus > 0 ? `${meus === 1 ? '1 paciente' : `${meus} pacientes`} com você. Os demais estão com outros médicos.` : 'Pacientes que já começaram o atendimento com o médico.'}
        carregando={emAndamento.carregando}
        semRespiro
      >
        <Tabela
          legenda="Em atendimento"
          legendaOculta
          colunas={colunasEmAndamento}
          linhas={emAndamento.dados}
          chave={(a) => a.atendimentoId}
          carregando={emAndamento.carregando && !emAndamento.dados}
          erro={emAndamento.erro}
          aoTentarDeNovo={emAndamento.recarregar}
          textoVazio="Nenhum atendimento em andamento."
        />
      </Painel>
      <Painel titulo="Fila de atendimento" subtitulo="Pacientes triados, por prioridade da cor e, na mesma cor, por chegada." carregando={fila.carregando} semRespiro>
        <Tabela
          legenda="Fila de atendimento"
          legendaOculta
          colunas={colunasFila}
          linhas={fila.dados?.content}
          chave={(p) => p.triagemId}
          carregando={fila.carregando && !fila.dados}
          erro={fila.erro}
          aoTentarDeNovo={fila.recarregar}
          textoVazio="Ninguém na fila."
        />
      </Painel>
      <DialogoDoHistorico alvo={historico} aoFechar={() => setHistorico(null)} />
    </>
  )
}
