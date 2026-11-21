import { ArrowRight, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { NOME_DA_CATEGORIA, type CategoriaLeito, type CorRisco, type PainelDaInstituicao, type StatusLeito } from '@/api/tipos'
import { podeAcessar } from '@/auth/permissoes'
import { useSessao } from '@/auth/SessaoProvider'
import { Etiqueta } from '@/componentes/Etiqueta'
import { SeloRisco } from '@/componentes/SeloRisco'
import { ESTADO_DO_LEITO } from '@/paginas/administrativo/textos'
import { Bloco } from '@/paginas/painel/Bloco'
import { formatarEspera } from '@/util/espera'
import { ITENS_DE_MENU } from '@/rotas'

type Dados = PainelDaInstituicao | undefined

const ORDEM_DAS_SITUACOES: StatusLeito[] = ['OCUPADO', 'LIVRE', 'EM_HIGIENIZACAO', 'BLOQUEADO']
const COR_DA_SITUACAO: Record<StatusLeito, string> = {
  OCUPADO: 'bg-info',
  LIVRE: 'bg-sucesso',
  EM_HIGIENIZACAO: 'bg-atencao',
  BLOQUEADO: 'bg-neutro',
}
const COR_DO_RISCO: Record<CorRisco, string> = {
  VERMELHO: 'bg-risco-vermelho',
  LARANJA: 'bg-risco-laranja',
  AMARELO: 'bg-risco-amarelo',
  VERDE: 'bg-risco-verde',
  AZUL: 'bg-risco-azul',
}
const PARTE_MINIMA_PARA_ROTULO = 0.12

const SEM_DADO = '—'

function LinkDaTela({ caminho, texto }: { caminho: string; texto: string }) {
  const { usuario, instituicaoAtiva } = useSessao()
  const item = ITENS_DE_MENU.find((i) => i.caminho === caminho)
  if (!usuario || !item || !podeAcessar(item, { perfis: usuario.perfis, instituicaoAtiva })) return null
  return (
    <Link to={caminho} className="mt-auto inline-flex min-h-alvo items-center gap-1 self-start pt-3 text-corpo font-semibold text-link hover:text-link-hover hover:underline lg:min-h-0">
      {texto}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  )
}

function porcentagem(parte: number, total: number) {
  return total === 0 ? 0 : Math.round((parte / total) * 100)
}

function contarPorSituacao(dados: PainelDaInstituicao) {
  const contagem: Record<StatusLeito, number> = { LIVRE: 0, OCUPADO: 0, EM_HIGIENIZACAO: 0, BLOQUEADO: 0 }
  for (const linha of dados.leitos) contagem[linha.status] += linha.quantidade
  return contagem
}

export function OcupacaoDeLeitos({ dados, className }: { dados: Dados; className?: string }) {
  const contagem = dados ? contarPorSituacao(dados) : undefined
  const total = contagem ? Object.values(contagem).reduce((soma, n) => soma + n, 0) : 0
  const ocupados = contagem?.OCUPADO ?? 0
  const partes = contagem ? ORDEM_DAS_SITUACOES.filter((s) => contagem[s] > 0) : []
  const descricao = partes.map((s) => `${ESTADO_DO_LEITO[s].texto}: ${contagem?.[s]} (${porcentagem(contagem?.[s] ?? 0, total)}%)`).join(', ')
  return (
    <Bloco titulo="Ocupação de leitos" className={className}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <p className="text-numero-principal font-semibold text-texto-forte tabular-nums">
          {dados ? (total === 0 ? SEM_DADO : `${porcentagem(ocupados, total)}%`) : SEM_DADO}
        </p>
        <p className="pb-1 text-corpo text-texto-suave">
          {!dados ? 'Carregando…' : total === 0 ? 'Nenhum leito cadastrado.' : `${ocupados} de ${total} ${total === 1 ? 'leito ocupado' : 'leitos ocupados'}`}
        </p>
      </div>
      {total > 0 && contagem && (
        <>
          <div role="img" aria-label={`Leitos por situação. ${descricao}.`} className="mt-4 flex h-7 gap-0.5">
            {partes.map((s) => {
              const parte = contagem[s] / total
              return (
                <span
                  key={s}
                  className={`flex min-w-1 items-center rounded-[4px] px-2 text-rotulo font-semibold text-white tabular-nums ${COR_DA_SITUACAO[s]}`}
                  style={{ flexGrow: contagem[s], flexBasis: 0 }}
                >
                  {parte >= PARTE_MINIMA_PARA_ROTULO && `${porcentagem(contagem[s], total)}%`}
                </span>
              )
            })}
          </div>
          <ul aria-label="Legenda" className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {ORDEM_DAS_SITUACOES.map((s) => (
              <li key={s} className="flex items-center gap-2 text-corpo text-texto">
                <span aria-hidden="true" className={`size-2.5 rounded-full ${COR_DA_SITUACAO[s]}`} />
                {ESTADO_DO_LEITO[s].texto}
                <span className="font-semibold text-texto-forte tabular-nums">{contagem[s]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <LinkDaTela caminho="/leitos" texto="Abrir leitos" />
    </Bloco>
  )
}

export function AguardandoTriagem({ dados, className }: { dados: Dados; className?: string }) {
  const espera = dados?.aguardandoTriagem
  return (
    <Bloco titulo="Aguardando triagem" className={className}>
      <p className="text-numero-principal font-semibold text-texto-forte tabular-nums">{espera ? espera.quantidade : SEM_DADO}</p>
      <p className="mt-1 text-corpo text-texto-suave">
        {!espera
          ? 'Carregando…'
          : espera.maiorEsperaMinutos === null
            ? 'Ninguém aguardando.'
            : `Há mais tempo: ${formatarEspera(espera.maiorEsperaMinutos)}`}
      </p>
      <LinkDaTela caminho="/triagem" texto="Abrir triagem" />
    </Bloco>
  )
}

export function FilaPorRisco({ dados, className }: { dados: Dados; className?: string }) {
  const fila = dados?.fila ?? []
  const total = fila.reduce((soma, linha) => soma + linha.quantidade, 0)
  const acima = fila.reduce((soma, linha) => soma + linha.acimaDoTempoMaximo, 0)
  const maior = Math.max(1, ...fila.map((linha) => linha.quantidade))
  return (
    <Bloco
      titulo="Fila do médico por classificação de risco"
      className={className}
      acao={
        dados && acima > 0 ? (
          <Etiqueta tom="erro" icone={TriangleAlert} texto={acima === 1 ? '1 acima do tempo máximo' : `${acima} acima do tempo máximo`} />
        ) : undefined
      }
    >
      <p className="text-corpo text-texto-suave">
        {!dados ? 'Carregando…' : total === 0 ? 'Ninguém classificado aguardando o médico.' : total === 1 ? '1 paciente na fila.' : `${total} pacientes na fila.`}
      </p>
      {dados && (
        <ul className="mt-3 flex flex-col divide-y divide-borda-divisoria">
          {fila.map((linha) => (
            <li key={linha.cor} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[11rem_minmax(0,1fr)_2.5rem]">
              <span className="justify-self-start">
                <SeloRisco cor={linha.cor} />
              </span>
              <span aria-hidden="true" className="order-3 col-span-2 h-2 rounded-full bg-superficie-desabilitada sm:order-none sm:col-span-1">
                {linha.quantidade > 0 && (
                  <span className={`block h-2 rounded-full ${COR_DO_RISCO[linha.cor]}`} style={{ width: `${(linha.quantidade / maior) * 100}%` }} />
                )}
              </span>
              <span className="text-right text-destaque font-semibold text-texto-forte tabular-nums">{linha.quantidade}</span>
              <span className="order-4 col-span-2 flex flex-wrap items-center gap-2 text-rotulo text-texto-suave sm:col-span-3">
                {linha.maiorEsperaMinutos !== null && <span>Maior espera {formatarEspera(linha.maiorEsperaMinutos)}</span>}
                <span>{linha.tempoMaximoMinutos === 0 ? 'Atendimento imediato' : `Tempo máximo ${formatarEspera(linha.tempoMaximoMinutos)}`}</span>
                {linha.acimaDoTempoMaximo > 0 && (
                  <Etiqueta tom="erro" icone={TriangleAlert} texto={`${linha.acimaDoTempoMaximo} acima do máximo`} />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <LinkDaTela caminho="/atendimentos" texto="Abrir atendimentos" />
    </Bloco>
  )
}

function Numero({ rotulo, valor, nota }: { rotulo: string; valor: number | undefined; nota?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-corpo text-texto">
        {rotulo}
        {nota && <span className="block text-rotulo text-texto-suave">{nota}</span>}
      </dt>
      <dd className="text-titulo-secao font-semibold text-texto-forte tabular-nums">{valor ?? SEM_DADO}</dd>
    </div>
  )
}

export function AgoraNoHospital({ dados, className }: { dados: Dados; className?: string }) {
  return (
    <Bloco titulo="Agora no hospital" className={className}>
      <dl className="divide-y divide-borda-divisoria">
        <Numero rotulo="Chegadas hoje" valor={dados?.chegadasHoje} nota="Desde a meia-noite" />
        <Numero rotulo="Em atendimento" valor={dados?.emAtendimento} />
        <Numero rotulo="Internados" valor={dados?.internados} />
      </dl>
    </Bloco>
  )
}

export function LeitosLivresPorCategoria({ dados, className }: { dados: Dados; className?: string }) {
  const categorias = (Object.keys(NOME_DA_CATEGORIA) as CategoriaLeito[])
    .map((categoria) => {
      const linhas = dados?.leitos.filter((l) => l.categoria === categoria) ?? []
      const total = linhas.reduce((soma, l) => soma + l.quantidade, 0)
      const livres = linhas.filter((l) => l.status === 'LIVRE').reduce((soma, l) => soma + l.quantidade, 0)
      return { categoria, total, livres }
    })
    .filter((linha) => linha.total > 0)
  return (
    <Bloco titulo="Leitos livres por categoria" className={className}>
      {!dados ? (
        <p className="text-corpo text-texto-suave">Carregando…</p>
      ) : categorias.length === 0 ? (
        <p className="text-corpo text-texto-suave">Nenhum leito cadastrado.</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {categorias.map(({ categoria, total, livres }) => (
            <li key={categoria}>
              <div className="flex items-baseline justify-between gap-3 text-corpo">
                <span className="text-texto">{NOME_DA_CATEGORIA[categoria]}</span>
                <span className="text-texto-suave tabular-nums">
                  <span className="font-semibold text-texto-forte">{livres}</span> de {total}
                </span>
              </div>
              <span aria-hidden="true" className="mt-1.5 block h-2 rounded-full bg-sucesso-fundo">
                {livres > 0 && <span className="block h-2 rounded-full bg-sucesso" style={{ width: `${(livres / total) * 100}%` }} />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  )
}

export function TransferenciasPendentes({ dados, className }: { dados: Dados; className?: string }) {
  const t = dados?.transferencias
  return (
    <Bloco titulo="Transferências pendentes" className={className}>
      <dl className="divide-y divide-borda-divisoria">
        <Numero rotulo="Recebidas" valor={t?.recebidas} nota="Aguardando a resposta deste hospital" />
        <Numero rotulo="Enviadas" valor={t?.enviadas} nota="Aguardando o outro hospital" />
      </dl>
      <LinkDaTela caminho="/internacoes" texto="Abrir internações" />
    </Bloco>
  )
}

