import { ArrowRightLeft, BedDouble, LogOut, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { atendimentosSemLeito, internacoesAtivas, leitosDaInstituicao, solicitacoesEnviadas, solicitacoesRecebidas } from '@/api/leitos'
import { NOME_DA_CATEGORIA, type AtendimentoSemLeito, type InternacaoAtiva, type VinculoAtivo } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { Tabela, type Coluna } from '@/componentes/Tabela'
import { useToast } from '@/componentes/Toast'
import { TituloPagina } from '@/componentes/TituloPagina'
import { DialogoDeAlta, DialogoDeInternacao, DialogoDeTransferencia } from '@/paginas/administrativo/DialogosDeInternacao'
import { leitosLivres } from '@/paginas/administrativo/leitosLivres'
import { PedidosDeTransferencia } from '@/paginas/administrativo/PedidosDeTransferencia'
import { ATUALIZAR_A_CADA_MS, SITUACAO_DO_ATENDIMENTO } from '@/paginas/administrativo/textos'
import { formatarDataHora } from '@/util/datas'
import { useAtualizacaoPeriodica } from '@/util/useAtualizacaoPeriodica'

/** FE-04: internar, transferir e dar alta, com a fila de espera quando não há leito livre (RF-005, RF-006). */
export function Internacoes() {
  const { instituicaoAtiva } = useSessao()
  if (!instituicaoAtiva) return null
  return <GestaoDeInternacoes key={instituicaoAtiva.instituicaoId} instituicao={instituicaoAtiva} />
}

function GestaoDeInternacoes({ instituicao }: { instituicao: VinculoAtivo }) {
  const id = instituicao.instituicaoId
  const leitos = useConsulta((sinal) => leitosDaInstituicao(id, sinal), [id])
  const fila = useConsulta((sinal) => atendimentosSemLeito(id, sinal), [id])
  const internadas = useConsulta((sinal) => internacoesAtivas(id, sinal), [id])
  const recebidas = useConsulta((sinal) => solicitacoesRecebidas(id, sinal), [id])
  const enviadas = useConsulta((sinal) => solicitacoesEnviadas(id, sinal), [id])
  const [aInternar, setAInternar] = useState<AtendimentoSemLeito | null>(null)
  const [aTransferir, setATransferir] = useState<InternacaoAtiva | null>(null)
  const [aDarAlta, setADarAlta] = useState<InternacaoAtiva | null>(null)
  const { avisar } = useToast()

  /** Toda operação muda leitos, fila, internações e pedidos: tudo é buscado de novo (critério do FE-04). */
  function atualizar() {
    leitos.recarregar()
    fila.recarregar()
    internadas.recarregar()
    recebidas.recarregar()
    enviadas.recarregar()
  }
  useAtualizacaoPeriodica(atualizar, ATUALIZAR_A_CADA_MS)

  function concluido(mensagem: string) {
    setAInternar(null)
    setATransferir(null)
    setADarAlta(null)
    avisar(mensagem)
    atualizar()
    setConcluidas((n) => n + 1)
  }

  // Depois de cada operação, o foco vai para o título. A linha do botão que abriu o diálogo pode sumir na recarga, e
  // o foco se perderia no <body>. Como efeito, roda depois de o diálogo fechar (e devolver o foco ao botão).
  const [concluidas, setConcluidas] = useState(0)
  useEffect(() => {
    if (concluidas > 0) document.querySelector<HTMLElement>('main h1')?.focus()
  }, [concluidas])

  const semLeitoLivre = leitos.dados !== undefined && leitosLivres(leitos.dados.content).length === 0

  const colunasDaFila = useMemo<Coluna<AtendimentoSemLeito>[]>(
    () => [
      { titulo: 'Chegada', celula: (a) => <span className="whitespace-nowrap">{formatarDataHora(a.chegadaEm)}</span> },
      { titulo: 'Paciente', celula: (a) => <span className="font-medium">{a.paciente}</span> },
      { titulo: 'Situação', celula: (a) => SITUACAO_DO_ATENDIMENTO[a.status] },
      { titulo: 'Motivo', celula: (a) => <span className="block max-w-sm">{a.motivo}</span> },
      {
        titulo: 'Ação',
        celula: (a) => (
          <Botao variante="secundario" icone={BedDouble} onClick={() => setAInternar(a)} aria-label={`Internar ${a.paciente}`}>
            Internar
          </Botao>
        ),
      },
    ],
    [],
  )

  const colunasDasInternacoes = useMemo<Coluna<InternacaoAtiva>[]>(
    () => [
      {
        titulo: 'Leito',
        celula: (i) => (
          <>
            <span className="block font-semibold">{i.leitoCodigo}</span>
            <span className="block text-texto-suave">
              {i.setor} · {NOME_DA_CATEGORIA[i.categoria]}
            </span>
          </>
        ),
      },
      { titulo: 'Paciente', celula: (i) => <span className="font-medium">{i.paciente}</span> },
      { titulo: 'Internado desde', celula: (i) => <span className="whitespace-nowrap">{formatarDataHora(i.admitidaEm)}</span> },
      {
        titulo: 'Situação',
        celula: (i) =>
          i.solicitacaoPendenteId ? <Etiqueta tom="atencao" texto="Transferência pedida" /> : <Etiqueta tom="info" texto="Internado" />,
      },
      {
        titulo: 'Ações',
        celula: (i) => (
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundario" icone={ArrowRightLeft} onClick={() => setATransferir(i)} aria-label={`Transferir ${i.paciente}`}>
              Transferir
            </Botao>
            <Botao variante="secundario" icone={LogOut} onClick={() => setADarAlta(i)} aria-label={`Dar alta a ${i.paciente}`}>
              Dar alta
            </Botao>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <TituloPagina
        titulo="Internações"
        trilha="Atendimento"
        subtitulo={`Internar, transferir e dar alta em ${instituicao.instituicaoNome}. A tela se atualiza sozinha a cada 30 segundos.`}
        acoes={
          <Botao variante="secundario" icone={RefreshCw} onClick={atualizar}>
            Atualizar
          </Botao>
        }
      />
      <Painel
        titulo={semLeitoLivre ? 'Fila de espera por leito' : 'Atendimentos sem internação'}
        subtitulo="Atendimentos em aberto cujo paciente não está internado, do mais antigo para o mais recente."
        carregando={fila.carregando}
        semRespiro
      >
        {semLeitoLivre && (
          <div className="px-4 py-4 sm:px-5">
            <Alerta tom="atencao" anunciar={false} titulo="Nenhum leito livre agora">
              Quem precisar de internação fica nesta fila, na ordem de chegada, até um leito ser liberado.
            </Alerta>
          </div>
        )}
        <Tabela
          legenda="Atendimentos sem internação"
          legendaOculta
          colunas={colunasDaFila}
          linhas={fila.dados}
          chave={(a) => a.atendimentoId}
          carregando={fila.carregando && !fila.dados}
          erro={fila.erro}
          aoTentarDeNovo={fila.recarregar}
          textoVazio="Nenhum atendimento em aberto sem internação."
        />
      </Painel>
      <Painel titulo="Internados" subtitulo="Internações em andamento nos leitos desta instituição, pela ordem do leito." carregando={internadas.carregando} semRespiro>
        <Tabela
          legenda="Internados"
          legendaOculta
          colunas={colunasDasInternacoes}
          linhas={internadas.dados}
          chave={(i) => i.id}
          carregando={internadas.carregando && !internadas.dados}
          erro={internadas.erro}
          aoTentarDeNovo={internadas.recarregar}
          textoVazio="Nenhum paciente internado agora."
        />
      </Painel>
      <PedidosDeTransferencia
        leitos={leitos.dados?.content}
        recebidas={recebidas}
        enviadas={enviadas}
        internadas={internadas.dados}
        aoConcluir={concluido}
      />
      <DialogoDeInternacao atendimento={aInternar} leitos={leitos.dados?.content} aoFechar={() => setAInternar(null)} aoConcluir={concluido} />
      <DialogoDeTransferencia
        internacao={aTransferir}
        leitos={leitos.dados?.content}
        instituicaoId={id}
        aoFechar={() => setATransferir(null)}
        aoConcluir={concluido}
      />
      <DialogoDeAlta internacao={aDarAlta} aoFechar={() => setADarAlta(null)} aoConcluir={concluido} />
    </>
  )
}
