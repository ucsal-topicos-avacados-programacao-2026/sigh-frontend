import { useMemo, useState } from 'react'
import { analises as buscarAnalises, emergenciasPendentes, indicadores as buscarIndicadores, registros as buscarRegistros } from '@/api/auditoria'
import type { AnaliseAuditoria, RegistroAuditoria, TipoAnalise } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Paginacao } from '@/componentes/Paginacao'
import { Painel } from '@/componentes/Painel'
import { Tabela, type Coluna } from '@/componentes/Tabela'
import { useToast } from '@/componentes/Toast'
import { TituloPagina } from '@/componentes/TituloPagina'
import { colunasDoLog } from '@/paginas/auditor/colunas'
import { DialogoDeAnalise } from '@/paginas/auditor/DialogoDeAnalise'
import { FiltrosDoPeriodo, type Filtros } from '@/paginas/auditor/FiltrosDoPeriodo'
import { CONCLUSAO, NOME_DO_TIPO_DE_ANALISE, codigoDoRegistro, periodoPadrao } from '@/paginas/auditor/textos'
import { formatarDataHora } from '@/util/datas'

const POR_PAGINA = 20

export function Auditoria() {
  const [filtros, setFiltros] = useState<Filtros>(() => ({ ...periodoPadrao(), instituicaoId: '', soEmergencias: false }))
  const [aAnalisar, setAAnalisar] = useState<RegistroAuditoria | null>(null)
  const [versao, setVersao] = useState(0)
  const { avisar } = useToast()

  const periodo = { inicio: filtros.inicio, fim: filtros.fim }
  const instituicoes = useConsulta((sinal) => buscarIndicadores(periodo, sinal), [filtros.inicio, filtros.fim])

  function analisado() {
    setAAnalisar(null)
    avisar('Análise registrada.')
    setVersao((v) => v + 1)
    window.setTimeout(() => document.querySelector<HTMLElement>('main h1')?.focus(), 0)
  }

  return (
    <>
      <TituloPagina
        titulo="Auditoria"
        trilha="Gestão da rede"
        subtitulo="O registro de acessos é imutável: aqui você consulta e registra análises, sem alterar nem excluir nada."
      />
      <EmergenciasPendentes key={versao} aoAnalisar={setAAnalisar} />
      <FiltrosDoPeriodo aplicados={filtros} instituicoes={instituicoes.dados} comEmergencias aoAplicar={setFiltros} />
      <LogDeAcessos key={JSON.stringify(filtros)} filtros={filtros} versao={versao} aoAnalisar={setAAnalisar} />
      <AnalisesRegistradas versao={versao} />
      <DialogoDeAnalise registro={aAnalisar} aoFechar={() => setAAnalisar(null)} aoRegistrar={analisado} />
    </>
  )
}

function EmergenciasPendentes({ aoAnalisar }: { aoAnalisar: (r: RegistroAuditoria) => void }) {
  const [pagina, setPagina] = useState(0)
  const consulta = useConsulta((sinal) => emergenciasPendentes(pagina, POR_PAGINA, sinal), [pagina])
  const colunas = useMemo(() => colunasDoLog(aoAnalisar), [aoAnalisar])
  const total = consulta.dados?.page.totalElements
  return (
    <Painel
      titulo="Emergências aguardando análise"
      subtitulo={
        total === undefined
          ? 'Acessos de emergência que ainda não receberam uma análise conclusiva, do mais antigo para o mais recente.'
          : `${total === 1 ? '1 acesso de emergência' : `${total} acessos de emergência`} sem análise conclusiva, do mais antigo para o mais recente.`
      }
      carregando={consulta.carregando}
      semRespiro
    >
      <Tabela
        legenda="Emergências aguardando análise"
        legendaOculta
        colunas={colunas}
        linhas={consulta.dados?.content}
        chave={(r) => r.id}
        carregando={consulta.carregando}
        erro={consulta.erro}
        aoTentarDeNovo={consulta.recarregar}
        textoVazio="Nenhuma emergência aguardando análise."
      />
      <Paginacao
        rotulo="Páginas das emergências"
        pagina={pagina}
        totalPaginas={consulta.dados?.page.totalPages ?? 1}
        totalItens={total ?? 0}
        nomeDosItens="emergências"
        carregando={consulta.carregando}
        aoMudar={setPagina}
      />
    </Painel>
  )
}

function LogDeAcessos({ filtros, versao, aoAnalisar }: { filtros: Filtros; versao: number; aoAnalisar: (r: RegistroAuditoria) => void }) {
  const [pagina, setPagina] = useState(0)
  const consulta = useConsulta(
    (sinal) =>
      buscarRegistros(
        {
          inicio: filtros.inicio,
          fim: filtros.fim,
          instituicaoId: filtros.instituicaoId || undefined,
          emergencia: filtros.soEmergencias ? true : undefined,
        },
        pagina,
        POR_PAGINA,
        sinal,
      ),
    [pagina, versao],
  )
  const colunas = useMemo(() => colunasDoLog(aoAnalisar), [aoAnalisar])
  return (
    <Painel titulo="Registro de acessos" subtitulo="Do mais recente para o mais antigo, no período e na instituição filtrados." carregando={consulta.carregando} semRespiro>
      <Tabela
        legenda="Registro de acessos"
        legendaOculta
        colunas={colunas}
        linhas={consulta.dados?.content}
        chave={(r) => r.id}
        carregando={consulta.carregando}
        erro={consulta.erro}
        aoTentarDeNovo={consulta.recarregar}
        textoVazio="Nenhum acesso com esses filtros."
      />
      <Paginacao
        rotulo="Páginas do registro de acessos"
        pagina={pagina}
        totalPaginas={consulta.dados?.page.totalPages ?? 1}
        totalItens={consulta.dados?.page.totalElements ?? 0}
        nomeDosItens="acessos"
        carregando={consulta.carregando}
        aoMudar={setPagina}
      />
    </Painel>
  )
}

const COLUNAS_DA_ANALISE: Coluna<AnaliseAuditoria>[] = [
  { titulo: 'Registrada em', celula: (a) => <span className="whitespace-nowrap">{formatarDataHora(a.registradaEm)}</span> },
  { titulo: 'Acesso', celula: (a) => <span className="tabular-nums">{codigoDoRegistro(a.registroAuditoriaId)}</span> },
  { titulo: 'Conclusão', celula: (a) => <Etiqueta tom={CONCLUSAO[a.conclusao].tom} texto={CONCLUSAO[a.conclusao].texto} /> },
  { titulo: 'Descrição', celula: (a) => <span className="block max-w-xl whitespace-pre-line">{a.descricao}</span> },
]

function AnalisesRegistradas({ versao }: { versao: number }) {
  const [tipo, setTipo] = useState<TipoAnalise>('ALERTA')
  const [pagina, setPagina] = useState(0)
  const consulta = useConsulta((sinal) => buscarAnalises(tipo, pagina, POR_PAGINA, sinal), [tipo, pagina, versao])
  const tipos: TipoAnalise[] = ['ALERTA', 'PARECER']
  return (
    <Painel
      titulo="Análises registradas"
      subtitulo="Alertas de possíveis acessos indevidos e pareceres de conformidade, do mais recente para o mais antigo."
      carregando={consulta.carregando}
      semRespiro
      acoes={
        <div role="group" aria-label="Tipo de análise" className="inline-flex rounded-controle border border-borda p-0.5">
          {tipos.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tipo === t}
              onClick={() => {
                setTipo(t)
                setPagina(0)
              }}
              className={`min-h-alvo rounded-[6px] px-3 text-corpo font-semibold lg:min-h-9 ${
                tipo === t ? 'bg-primaria text-white' : 'text-texto-medio hover:bg-superficie-suave'
              }`}
            >
              {t === 'ALERTA' ? 'Alertas' : 'Pareceres'}
            </button>
          ))}
        </div>
      }
    >
      <Tabela
        legenda={tipo === 'ALERTA' ? 'Alertas' : 'Pareceres'}
        legendaOculta
        colunas={COLUNAS_DA_ANALISE}
        linhas={consulta.dados?.content}
        chave={(a) => a.id}
        carregando={consulta.carregando}
        erro={consulta.erro}
        aoTentarDeNovo={consulta.recarregar}
        textoVazio={tipo === 'ALERTA' ? 'Nenhum alerta registrado.' : 'Nenhum parecer registrado.'}
      />
      <Paginacao
        rotulo={`Páginas de ${NOME_DO_TIPO_DE_ANALISE[tipo].toLowerCase()}`}
        pagina={pagina}
        totalPaginas={consulta.dados?.page.totalPages ?? 1}
        totalItens={consulta.dados?.page.totalElements ?? 0}
        nomeDosItens="análises"
        carregando={consulta.carregando}
        aoMudar={setPagina}
      />
    </Painel>
  )
}
