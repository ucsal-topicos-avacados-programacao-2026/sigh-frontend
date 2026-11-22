import { ClipboardPlus, FileText, RefreshCw, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { aguardandoTriagem, filaDeAtendimento } from '@/api/triagem'
import type { AguardandoTriagem, PacienteNaFila, VinculoAtivo } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { SeloRisco } from '@/componentes/SeloRisco'
import { Tabela, type Coluna } from '@/componentes/Tabela'
import { useToast } from '@/componentes/Toast'
import { TituloPagina } from '@/componentes/TituloPagina'
import { DialogoDeTriagem, type PacienteATriar } from '@/paginas/enfermeiro/DialogoDeTriagem'
import { DialogoDoHistorico, type PacienteDoHistorico } from '@/paginas/enfermeiro/DialogoDoHistorico'
import { formatarDataHora } from '@/util/datas'
import { formatarEspera } from '@/util/espera'
import { useAtualizacaoPeriodica } from '@/util/useAtualizacaoPeriodica'

const ATUALIZAR_A_CADA_MS = 30_000

export function Triagem() {
  const { instituicaoAtiva } = useSessao()
  if (!instituicaoAtiva) return null
  return <PainelDaTriagem key={instituicaoAtiva.instituicaoId} instituicao={instituicaoAtiva} />
}

function PainelDaTriagem({ instituicao }: { instituicao: VinculoAtivo }) {
  const id = instituicao.instituicaoId
  const aguardando = useConsulta((sinal) => aguardandoTriagem(id, sinal), [id])
  const fila = useConsulta((sinal) => filaDeAtendimento(id, sinal), [id])
  const [aTriar, setATriar] = useState<PacienteATriar | null>(null)
  const [historico, setHistorico] = useState<PacienteDoHistorico | null>(null)
  const [confirmadas, setConfirmadas] = useState(0)
  const { avisar } = useToast()

  function atualizar() {
    aguardando.recarregar()
    fila.recarregar()
  }
  useAtualizacaoPeriodica(atualizar, ATUALIZAR_A_CADA_MS)

  function confirmada(mensagem: string) {
    setATriar(null)
    avisar(mensagem)
    atualizar()
    setConfirmadas((n) => n + 1)
  }

  useEffect(() => {
    if (confirmadas > 0) document.querySelector<HTMLElement>('main h1')?.focus()
  }, [confirmadas])

  const fechar = () => {
    setATriar(null)
    aguardando.recarregar()
  }

  const colunasAguardando = useMemo<Coluna<AguardandoTriagem>[]>(
    () => [
      { titulo: 'Chegada', celula: (a) => <span className="whitespace-nowrap">{formatarDataHora(a.chegadaEm)}</span> },
      { titulo: 'Paciente', celula: (a) => <span className="font-medium">{a.paciente}</span> },
      { titulo: 'Motivo', celula: (a) => <span className="block max-w-sm">{a.motivo}</span> },
      {
        titulo: 'Situação',
        celula: (a) =>
          a.triagemPendente?.corSugerida ? (
            <span className="text-texto-suave">
              Sugestão da IA: <SeloRisco cor={a.triagemPendente.corSugerida} />
            </span>
          ) : a.triagemPendente ? (
            <span className="text-texto-suave">
              {a.triagemPendente.situacaoSugestao === 'EM_ANDAMENTO' ? 'IA preparando a sugestão…' : 'Sem sugestão da IA'}
            </span>
          ) : (
            'Sem triagem'
          ),
      },
      {
        titulo: 'Ações',
        celula: (a) => (
          <div className="flex flex-wrap gap-2">
            <Botao
              icone={ClipboardPlus}
              onClick={() => setATriar({ atendimentoId: a.atendimentoId, paciente: a.paciente, pendente: a.triagemPendente })}
              aria-label={`${a.triagemPendente ? 'Continuar triagem de' : 'Triar'} ${a.paciente}`}
            >
              {a.triagemPendente ? 'Continuar triagem' : 'Triar'}
            </Botao>
            <Botao variante="secundario" icone={FileText} onClick={() => setHistorico({ atendimentoId: a.atendimentoId, paciente: a.paciente })} aria-label={`Histórico de ${a.paciente}`}>
              Histórico
            </Botao>
          </div>
        ),
      },
    ],
    [],
  )

  const colunasFila = useMemo<Coluna<PacienteNaFila>[]>(
    () => [
      { titulo: 'Prioridade', celula: (p) => <SeloRisco cor={p.corConfirmada} /> },
      { titulo: 'Paciente', celula: (p) => <span className="font-medium">{p.pacienteNome}</span> },
      { titulo: 'Chegada', celula: (p) => <span className="whitespace-nowrap">{formatarDataHora(p.chegadaEm)}</span> },
      {
        titulo: 'Espera',
        celula: (p) => (
          <div className="flex flex-col items-start gap-1">
            <span className="tabular-nums">{formatarEspera(p.minutosDeEspera)}</span>
            {p.tempoMaximoExcedido && <Etiqueta tom="erro" icone={TriangleAlert} texto="Tempo máximo excedido" />}
          </div>
        ),
      },
      {
        titulo: 'Ações',
        celula: (p) => (
          <div className="flex flex-wrap gap-2">
            <Botao
              variante="secundario"
              icone={ClipboardPlus}
              onClick={() => setATriar({ atendimentoId: p.atendimentoId, paciente: p.pacienteNome, reclassificacao: true })}
              aria-label={`Reclassificar ${p.pacienteNome}`}
            >
              Reclassificar
            </Botao>
            <Botao variante="secundario" icone={FileText} onClick={() => setHistorico({ atendimentoId: p.atendimentoId, paciente: p.pacienteNome })} aria-label={`Histórico de ${p.pacienteNome}`}>
              Histórico
            </Botao>
          </div>
        ),
      },
    ],
    [],
  )

  const naFila = fila.dados?.content
  const excedidos = naFila?.filter((p) => p.tempoMaximoExcedido).length ?? 0

  return (
    <>
      <TituloPagina
        titulo="Triagem"
        trilha="Atendimento"
        subtitulo={`Classificação de risco em ${instituicao.instituicaoNome}. As listas se atualizam sozinhas a cada 30 segundos.`}
        acoes={
          <Botao variante="secundario" icone={RefreshCw} onClick={atualizar}>
            Atualizar
          </Botao>
        }
      />
      <Painel titulo="Aguardando triagem" subtitulo="Por ordem de chegada. Quem tem triagem começada aparece com o que falta." carregando={aguardando.carregando} semRespiro>
        <Tabela
          legenda="Aguardando triagem"
          legendaOculta
          colunas={colunasAguardando}
          linhas={aguardando.dados}
          chave={(a) => a.atendimentoId}
          carregando={aguardando.carregando && !aguardando.dados}
          erro={aguardando.erro}
          aoTentarDeNovo={aguardando.recarregar}
          textoVazio="Ninguém aguardando triagem."
        />
      </Painel>
      <Painel titulo="Fila de atendimento" subtitulo="Por prioridade da classificação confirmada e, na mesma cor, por ordem de chegada." carregando={fila.carregando} semRespiro>
        {excedidos > 0 && (
          <div className="px-4 py-4 sm:px-5">
            <Alerta tom="erro" anunciar={false} titulo={excedidos === 1 ? '1 paciente passou do tempo máximo de espera' : `${excedidos} pacientes passaram do tempo máximo de espera`}>
              O tempo máximo depende da cor da classificação.
            </Alerta>
          </div>
        )}
        <Tabela
          legenda="Fila de atendimento"
          legendaOculta
          colunas={colunasFila}
          linhas={naFila}
          chave={(p) => p.triagemId}
          carregando={fila.carregando && !fila.dados}
          erro={fila.erro}
          aoTentarDeNovo={fila.recarregar}
          textoVazio="Ninguém na fila."
        />
      </Painel>
      <DialogoDeTriagem alvo={aTriar} aoFechar={fechar} aoConfirmar={confirmada} />
      <DialogoDoHistorico alvo={historico} aoFechar={() => setHistorico(null)} />
    </>
  )
}
