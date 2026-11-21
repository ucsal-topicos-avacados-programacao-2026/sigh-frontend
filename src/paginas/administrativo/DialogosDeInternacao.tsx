import { useState, type FormEvent, type ReactNode } from 'react'
import { darAlta, internar, leitosLivres as buscarLivres, solicitarTransferencia, transferirNaInstituicao } from '@/api/leitos'
import { instituicoesDaRede } from '@/api/paciente'
import { NOME_DA_CATEGORIA, type AtendimentoSemLeito, type CategoriaLeito, type InternacaoAtiva, type Leito } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { GrupoDeOpcoes, Selecao } from '@/componentes/Campo'
import { Dialogo } from '@/componentes/Dialogo'
import { EscolhaDeLeito } from '@/paginas/administrativo/escolhaDeLeito'
import { leitosLivres } from '@/paginas/administrativo/leitosLivres'
import { formatarDataHora } from '@/util/datas'

const CATEGORIAS = Object.keys(NOME_DA_CATEGORIA) as CategoriaLeito[]

function Rodape({ erro, tituloDoErro, enviando, rotulo, textoCarregando, aoCancelar, semAcao = false }: {
  erro?: string
  tituloDoErro: string
  enviando: boolean
  rotulo: string
  textoCarregando: string
  aoCancelar: () => void
  semAcao?: boolean
}) {
  return (
    <>
      <RegiaoDeAlerta>
        {erro && (
          <Alerta tom="erro" anunciar={false} titulo={tituloDoErro}>
            {erro}
          </Alerta>
        )}
      </RegiaoDeAlerta>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="secundario" onClick={aoCancelar} disabled={enviando}>
          {semAcao ? 'Fechar' : 'Cancelar'}
        </Botao>
        {!semAcao && (
          <Botao type="submit" carregando={enviando} textoCarregando={textoCarregando}>
            {rotulo}
          </Botao>
        )}
      </div>
    </>
  )
}

function Resumo({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-1 rounded-controle bg-superficie-suave p-4 text-corpo sm:grid-cols-[auto_minmax(0,1fr)]">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo} className="contents">
          <dt className="text-texto-suave">{rotulo}</dt>
          <dd className="text-texto">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DialogoDeInternacao({ atendimento, leitos, aoFechar, aoConcluir }: {
  atendimento: AtendimentoSemLeito | null
  leitos: Leito[] | undefined
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
}) {
  const [enviando, setEnviando] = useState(false)
  return (
    <Dialogo aberto={atendimento !== null} titulo="Internar paciente" aoFechar={aoFechar} bloqueado={enviando}>
      {atendimento && (
        <FormularioDeInternacao key={atendimento.atendimentoId} atendimento={atendimento} leitos={leitos} aoFechar={aoFechar} aoConcluir={aoConcluir} aoMudarEnvio={setEnviando} />
      )}
    </Dialogo>
  )
}

function FormularioDeInternacao({ atendimento, leitos, aoFechar, aoConcluir, aoMudarEnvio }: {
  atendimento: AtendimentoSemLeito
  leitos: Leito[] | undefined
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
  aoMudarEnvio: (enviando: boolean) => void
}) {
  const [leitoId, setLeitoId] = useState('')
  const [erro, setErro] = useState<string>()
  const envio = useEnvio()
  const livres = leitosLivres(leitos)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!leitoId) {
      setErro('Escolha o leito.')
      return
    }
    aoMudarEnvio(true)
    const ok = await envio.enviar(() => internar(atendimento.atendimentoId, leitoId))
    aoMudarEnvio(false)
    if (ok) aoConcluir(`${atendimento.paciente} internado no leito ${livres.find((l) => l.id === leitoId)?.codigo ?? ''}.`)
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <Resumo itens={[['Paciente', atendimento.paciente], ['Chegada', formatarDataHora(atendimento.chegadaEm)], ['Motivo', atendimento.motivo]]} />
      {livres.length === 0 ? (
        <Alerta tom="atencao" anunciar={false} titulo="Nenhum leito livre agora">
          O paciente continua na fila de espera. Quando um leito for liberado, ele aparece aqui.
        </Alerta>
      ) : (
        <EscolhaDeLeito rotulo="Leito" livres={livres} valor={leitoId} aoMudar={(v) => { setLeitoId(v); setErro(undefined) }} erro={erro} />
      )}
      <Rodape erro={envio.erro} tituloDoErro="O paciente não foi internado" enviando={envio.enviando} rotulo="Internar" textoCarregando="Internando…" aoCancelar={aoFechar} semAcao={livres.length === 0} />
    </form>
  )
}

export function DialogoDeTransferencia({ internacao, leitos, instituicaoId, aoFechar, aoConcluir }: {
  internacao: InternacaoAtiva | null
  leitos: Leito[] | undefined
  instituicaoId: string
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
}) {
  const [enviando, setEnviando] = useState(false)
  return (
    <Dialogo aberto={internacao !== null} titulo="Transferir paciente" aoFechar={aoFechar} bloqueado={enviando}>
      {internacao && (
        <FormularioDeTransferencia key={internacao.id} internacao={internacao} leitos={leitos} instituicaoId={instituicaoId} aoFechar={aoFechar} aoConcluir={aoConcluir} aoMudarEnvio={setEnviando} />
      )}
    </Dialogo>
  )
}

function FormularioDeTransferencia({ internacao, leitos, instituicaoId, aoFechar, aoConcluir, aoMudarEnvio }: {
  internacao: InternacaoAtiva
  leitos: Leito[] | undefined
  instituicaoId: string
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
  aoMudarEnvio: (enviando: boolean) => void
}) {
  const pedidoPendente = internacao.solicitacaoPendenteId !== null
  const [destino, setDestino] = useState<'MESMA' | 'OUTRA'>('MESMA')
  const [leitoId, setLeitoId] = useState('')
  const [instituicaoDestino, setInstituicaoDestino] = useState('')
  const [categoria, setCategoria] = useState<CategoriaLeito>(internacao.categoria)
  const [erros, setErros] = useState<{ leito?: string; instituicao?: string }>({})
  const envio = useEnvio()
  const livres = leitosLivres(leitos)
  const instituicoes = useConsulta(destino === 'OUTRA' ? (sinal) => instituicoesDaRede(sinal) : null, [destino])
  const vagas = useConsulta(
    destino === 'OUTRA' && instituicaoDestino ? (sinal) => buscarLivres(instituicaoDestino, categoria, sinal) : null,
    [destino, instituicaoDestino, categoria],
  )

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (destino === 'MESMA') {
      if (!leitoId) return setErros({ leito: 'Escolha o leito de destino.' })
      aoMudarEnvio(true)
      const ok = await envio.enviar(() => transferirNaInstituicao(internacao.id, leitoId))
      aoMudarEnvio(false)
      if (ok) aoConcluir(`${internacao.paciente} transferido para o leito ${livres.find((l) => l.id === leitoId)?.codigo ?? ''}.`)
      return
    }
    if (!instituicaoDestino) return setErros({ instituicao: 'Escolha a instituição de destino.' })
    aoMudarEnvio(true)
    const ok = await envio.enviar(() => solicitarTransferencia(internacao.id, instituicaoDestino, categoria))
    aoMudarEnvio(false)
    const nome = instituicoes.dados?.find((i) => i.id === instituicaoDestino)?.nome ?? 'o destino'
    if (ok) aoConcluir(`Pedido de transferência enviado para ${nome}.`)
  }

  const outras = (instituicoes.dados ?? []).filter((i) => i.id !== instituicaoId)
  const totalVagas = vagas.dados?.page.totalElements

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <Resumo itens={[['Paciente', internacao.paciente], ['Leito atual', `${internacao.leitoCodigo} · ${internacao.setor} · ${NOME_DA_CATEGORIA[internacao.categoria]}`]]} />
      <GrupoDeOpcoes
        legenda="Para onde"
        nome="destino-da-transferencia"
        valor={destino}
        aoMudar={(v) => { setDestino(v); setErros({}); envio.limparErro() }}
        opcoes={[
          { valor: 'MESMA', rotulo: 'Outro leito desta instituição', descricao: 'A transferência é feita agora.' },
          {
            valor: 'OUTRA',
            rotulo: 'Outra instituição da rede',
            descricao: pedidoPendente
              ? 'Já há um pedido aguardando o destino. Cancele-o antes de pedir outro.'
              : 'Vai como pedido: o paciente continua neste leito até o destino aceitar.',
          },
        ]}
      />
      {destino === 'MESMA' ? (
        livres.length === 0 ? (
          <Alerta tom="atencao" anunciar={false}>Nenhum outro leito livre nesta instituição agora.</Alerta>
        ) : (
          <EscolhaDeLeito rotulo="Leito de destino" livres={livres} valor={leitoId} aoMudar={(v) => { setLeitoId(v); setErros({}) }} erro={erros.leito} />
        )
      ) : pedidoPendente ? (
        <Alerta tom="atencao" anunciar={false}>Já há um pedido de transferência aguardando o destino para esta internação.</Alerta>
      ) : (
        <>
          <Selecao
            rotulo="Instituição de destino"
            value={instituicaoDestino}
            onChange={(e) => { setInstituicaoDestino(e.target.value); setErros({}) }}
            erro={erros.instituicao ?? instituicoes.erro}
            disabled={!instituicoes.dados}
          >
            <option value="">{instituicoes.dados ? 'Escolha' : 'Carregando…'}</option>
            {outras.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </Selecao>
          <Selecao
            rotulo="Categoria do leito"
            ajuda={instituicaoDestino && totalVagas !== undefined ? (totalVagas === 1 ? 'O destino tem 1 leito livre nessa categoria agora.' : `O destino tem ${totalVagas} leitos livres nessa categoria agora.`) : undefined}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaLeito)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {NOME_DA_CATEGORIA[c]}
              </option>
            ))}
          </Selecao>
        </>
      )}
      <Rodape
        erro={envio.erro}
        tituloDoErro="A transferência não foi feita"
        enviando={envio.enviando}
        rotulo={destino === 'MESMA' ? 'Transferir' : 'Pedir transferência'}
        textoCarregando={destino === 'MESMA' ? 'Transferindo…' : 'Enviando o pedido…'}
        aoCancelar={aoFechar}
        semAcao={(destino === 'MESMA' && livres.length === 0) || (destino === 'OUTRA' && pedidoPendente)}
      />
    </form>
  )
}

export function DialogoDeAlta({ internacao, aoFechar, aoConcluir }: {
  internacao: InternacaoAtiva | null
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
}) {
  const [enviando, setEnviando] = useState(false)
  return (
    <Dialogo aberto={internacao !== null} titulo="Dar alta" aoFechar={aoFechar} bloqueado={enviando}>
      {internacao && <FormularioDeAlta key={internacao.id} internacao={internacao} aoFechar={aoFechar} aoConcluir={aoConcluir} aoMudarEnvio={setEnviando} />}
    </Dialogo>
  )
}

function FormularioDeAlta({ internacao, aoFechar, aoConcluir, aoMudarEnvio }: {
  internacao: InternacaoAtiva
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
  aoMudarEnvio: (enviando: boolean) => void
}) {
  const [resumoId, setResumoId] = useState(internacao.resumosDeAlta[0]?.id ?? '')
  const envio = useEnvio()
  const semResumo = internacao.resumosDeAlta.length === 0

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!resumoId) return
    aoMudarEnvio(true)
    const ok = await envio.enviar(() => darAlta(internacao.id, resumoId))
    aoMudarEnvio(false)
    if (ok) aoConcluir(`Alta registrada para ${internacao.paciente}. O leito ${internacao.leitoCodigo} foi para higienização.`)
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <Resumo itens={[['Paciente', internacao.paciente], ['Leito', `${internacao.leitoCodigo} · ${internacao.setor}`], ['Internado desde', formatarDataHora(internacao.admitidaEm)]]} />
      {semResumo ? (
        <Alerta tom="atencao" anunciar={false} titulo="Falta o resumo de alta">
          A alta leva anexo o resumo da internação, que o médico registra. Ainda não há um desde a admissão.
        </Alerta>
      ) : (
        <>
          <GrupoDeOpcoes
            legenda="Resumo de alta anexado"
            nome="resumo-de-alta"
            valor={resumoId}
            aoMudar={setResumoId}
            opcoes={internacao.resumosDeAlta.map((r) => ({ valor: r.id, rotulo: `Resumo de ${formatarDataHora(r.criadoEm)}`, descricao: `Por ${r.autor}` }))}
          />
          <ul className="grid list-disc gap-1 pl-5 text-corpo text-texto">
            <li>O leito {internacao.leitoCodigo} vai para higienização.</li>
            {internacao.solicitacaoPendenteId && <li>O pedido de transferência pendente é cancelado.</li>}
          </ul>
        </>
      )}
      <Rodape erro={envio.erro} tituloDoErro="A alta não foi registrada" enviando={envio.enviando} rotulo="Dar alta" textoCarregando="Registrando…" aoCancelar={aoFechar} semAcao={semResumo} />
    </form>
  )
}
