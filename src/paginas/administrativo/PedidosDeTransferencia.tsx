import { Check, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { aceitarTransferencia, cancelarTransferencia, recusarTransferencia } from '@/api/leitos'
import { instituicoesDaRede } from '@/api/paciente'
import { NOME_DA_CATEGORIA, type InternacaoAtiva, type Leito, type Pagina, type SolicitacaoTransferencia } from '@/api/tipos'
import { useConsulta, type Consulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { AreaDeTexto } from '@/componentes/Campo'
import { Dialogo } from '@/componentes/Dialogo'
import { DialogoConfirmacao } from '@/componentes/DialogoConfirmacao'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { Tabela, type Coluna } from '@/componentes/Tabela'
import { EscolhaDeLeito } from '@/paginas/administrativo/escolhaDeLeito'
import { leitosLivres } from '@/paginas/administrativo/leitosLivres'
import { SITUACAO_DO_PEDIDO } from '@/paginas/administrativo/textos'
import { formatarDataHora } from '@/util/datas'

const LIMITE_MOTIVO = 500

interface Propriedades {
  leitos: Leito[] | undefined
  recebidas: Consulta<Pagina<SolicitacaoTransferencia>>
  enviadas: Consulta<Pagina<SolicitacaoTransferencia>>
  internadas: InternacaoAtiva[] | undefined
  aoConcluir: (mensagem: string) => void
}

/** Transferência entre instituições (BE-21): o destino aceita escolhendo um leito livre dele, ou recusa com motivo. */
export function PedidosDeTransferencia({ leitos, recebidas, enviadas, internadas, aoConcluir }: Propriedades) {
  const instituicoes = useConsulta((sinal) => instituicoesDaRede(sinal), [])
  const nomes = useMemo(() => new Map((instituicoes.dados ?? []).map((i) => [i.id, i.nome])), [instituicoes.dados])
  const [aAceitar, setAAceitar] = useState<SolicitacaoTransferencia | null>(null)
  const [aRecusar, setARecusar] = useState<SolicitacaoTransferencia | null>(null)
  const [aCancelar, setACancelar] = useState<SolicitacaoTransferencia | null>(null)
  const cancelamento = useEnvio()
  const leitoAtual = useMemo(() => new Map((internadas ?? []).map((i) => [i.id, i.leitoCodigo])), [internadas])

  const colunasRecebidas: Coluna<SolicitacaoTransferencia>[] = [
    { titulo: 'Pedido em', celula: (s) => <span className="whitespace-nowrap">{formatarDataHora(s.solicitadaEm)}</span> },
    { titulo: 'Paciente', celula: (s) => <span className="font-medium">{s.paciente}</span> },
    { titulo: 'De', celula: (s) => s.instituicaoOrigem },
    { titulo: 'Categoria', celula: (s) => NOME_DA_CATEGORIA[s.categoria] },
    {
      titulo: 'Ações',
      celula: (s) => (
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" icone={Check} onClick={() => setAAceitar(s)} aria-label={`Aceitar a transferência de ${s.paciente}`}>
            Aceitar
          </Botao>
          <Botao variante="secundario" icone={X} onClick={() => setARecusar(s)} aria-label={`Recusar a transferência de ${s.paciente}`}>
            Recusar
          </Botao>
        </div>
      ),
    },
  ]

  const colunasEnviadas: Coluna<SolicitacaoTransferencia>[] = [
    { titulo: 'Pedido em', celula: (s) => <span className="whitespace-nowrap">{formatarDataHora(s.solicitadaEm)}</span> },
    {
      titulo: 'Paciente',
      celula: (s) => (
        <>
          <span className="block font-medium">{s.paciente}</span>
          {leitoAtual.get(s.internacaoId) && <span className="block text-texto-suave">Leito {leitoAtual.get(s.internacaoId)}</span>}
        </>
      ),
    },
    { titulo: 'Para', celula: (s) => nomes.get(s.instituicaoDestinoId) ?? 'Outra instituição da rede' },
    { titulo: 'Categoria', celula: (s) => NOME_DA_CATEGORIA[s.categoria] },
    {
      titulo: 'Situação',
      celula: (s) => (
        <div className="flex flex-col items-start gap-1">
          <Etiqueta tom={SITUACAO_DO_PEDIDO[s.status].tom} texto={SITUACAO_DO_PEDIDO[s.status].texto} />
          {s.motivoRecusa && <span className="text-texto-suave">Motivo: {s.motivoRecusa}</span>}
        </div>
      ),
    },
    {
      titulo: 'Ação',
      celula: (s) =>
        s.status === 'PENDENTE' ? (
          <Botao variante="secundario" onClick={() => setACancelar(s)} aria-label={`Cancelar pedido de ${s.paciente}`}>
            Cancelar pedido
          </Botao>
        ) : null,
    },
  ]

  async function confirmarCancelamento() {
    if (!aCancelar) return
    const ok = await cancelamento.enviar(() => cancelarTransferencia(aCancelar.id))
    if (ok) {
      setACancelar(null)
      aoConcluir(`Pedido de transferência de ${aCancelar.paciente} cancelado.`)
    }
  }

  return (
    <>
      <Painel titulo="Pedidos recebidos" subtitulo="Outras instituições pedem para transferir pacientes para cá." carregando={recebidas.carregando} semRespiro>
        <Tabela
          legenda="Pedidos de transferência recebidos"
          legendaOculta
          colunas={colunasRecebidas}
          linhas={recebidas.dados?.content}
          chave={(s) => s.id}
          carregando={recebidas.carregando && !recebidas.dados}
          erro={recebidas.erro}
          aoTentarDeNovo={recebidas.recarregar}
          textoVazio="Nenhum pedido aguardando resposta."
        />
      </Painel>
      <Painel titulo="Pedidos enviados" subtitulo="Transferências pedidas por esta instituição, do mais recente para o mais antigo." carregando={enviadas.carregando} semRespiro>
        <Tabela
          legenda="Pedidos de transferência enviados"
          legendaOculta
          colunas={colunasEnviadas}
          linhas={enviadas.dados?.content}
          chave={(s) => s.id}
          carregando={enviadas.carregando && !enviadas.dados}
          erro={enviadas.erro}
          aoTentarDeNovo={enviadas.recarregar}
          textoVazio="Nenhum pedido enviado."
        />
      </Painel>
      <DialogoDeAceite
        pedido={aAceitar}
        leitos={leitos}
        aoFechar={() => setAAceitar(null)}
        aoConcluir={(mensagem) => {
          setAAceitar(null)
          aoConcluir(mensagem)
        }}
      />
      <DialogoDeRecusa
        pedido={aRecusar}
        aoFechar={() => setARecusar(null)}
        aoConcluir={(mensagem) => {
          setARecusar(null)
          aoConcluir(mensagem)
        }}
      />
      <DialogoConfirmacao
        aberto={aCancelar !== null}
        titulo="Cancelar o pedido de transferência?"
        mensagem={aCancelar && <p>{aCancelar.paciente} continua no leito atual, e o destino deixa de ver o pedido.</p>}
        rotuloConfirmar="Cancelar pedido"
        perigo
        enviando={cancelamento.enviando}
        erro={cancelamento.erro}
        aoConfirmar={confirmarCancelamento}
        aoCancelar={() => {
          setACancelar(null)
          cancelamento.limparErro()
        }}
      />
    </>
  )
}

function DialogoDeAceite({ pedido, leitos, aoFechar, aoConcluir }: {
  pedido: SolicitacaoTransferencia | null
  leitos: Leito[] | undefined
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
}) {
  const [enviando, setEnviando] = useState(false)
  return (
    <Dialogo aberto={pedido !== null} titulo="Aceitar a transferência" aoFechar={aoFechar} bloqueado={enviando}>
      {pedido && <FormularioDeAceite key={pedido.id} pedido={pedido} leitos={leitos} aoFechar={aoFechar} aoConcluir={aoConcluir} aoMudarEnvio={setEnviando} />}
    </Dialogo>
  )
}

function FormularioDeAceite({ pedido, leitos, aoFechar, aoConcluir, aoMudarEnvio }: {
  pedido: SolicitacaoTransferencia
  leitos: Leito[] | undefined
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
  aoMudarEnvio: (enviando: boolean) => void
}) {
  const [leitoId, setLeitoId] = useState('')
  const [erro, setErro] = useState<string>()
  const envio = useEnvio()
  // Só leitos livres da categoria pedida: é o que o aceite exige.
  const livres = leitosLivres(leitos, pedido.categoria)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!leitoId) return setErro('Escolha o leito que vai receber o paciente.')
    aoMudarEnvio(true)
    const ok = await envio.enviar(() => aceitarTransferencia(pedido.id, leitoId))
    aoMudarEnvio(false)
    if (ok) aoConcluir(`${pedido.paciente} transferido para o leito ${livres.find((l) => l.id === leitoId)?.codigo ?? ''}.`)
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <p className="text-corpo text-texto">
        {pedido.paciente}, vindo de {pedido.instituicaoOrigem}, precisa de um leito de {NOME_DA_CATEGORIA[pedido.categoria].toLowerCase()}.
        Ao aceitar, o paciente passa para o leito escolhido e o leito da origem vai para higienização.
      </p>
      {livres.length === 0 ? (
        <Alerta tom="atencao" anunciar={false} titulo={`Nenhum leito livre de ${NOME_DA_CATEGORIA[pedido.categoria].toLowerCase()} agora`}>
          Recuse o pedido ou espere um leito ser liberado.
        </Alerta>
      ) : (
        <EscolhaDeLeito rotulo="Leito" livres={livres} valor={leitoId} aoMudar={(v) => { setLeitoId(v); setErro(undefined) }} erro={erro} />
      )}
      <RegiaoDeAlerta>
        {envio.erro && (
          <Alerta tom="erro" anunciar={false} titulo="A transferência não foi aceita">
            {envio.erro}
          </Alerta>
        )}
      </RegiaoDeAlerta>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="secundario" onClick={aoFechar} disabled={envio.enviando}>
          {livres.length === 0 ? 'Fechar' : 'Cancelar'}
        </Botao>
        {livres.length > 0 && (
          <Botao type="submit" carregando={envio.enviando} textoCarregando="Aceitando…">
            Aceitar
          </Botao>
        )}
      </div>
    </form>
  )
}

function DialogoDeRecusa({ pedido, aoFechar, aoConcluir }: {
  pedido: SolicitacaoTransferencia | null
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
}) {
  const [enviando, setEnviando] = useState(false)
  return (
    <Dialogo aberto={pedido !== null} titulo="Recusar a transferência" aoFechar={aoFechar} bloqueado={enviando}>
      {pedido && <FormularioDeRecusa key={pedido.id} pedido={pedido} aoFechar={aoFechar} aoConcluir={aoConcluir} aoMudarEnvio={setEnviando} />}
    </Dialogo>
  )
}

function FormularioDeRecusa({ pedido, aoFechar, aoConcluir, aoMudarEnvio }: {
  pedido: SolicitacaoTransferencia
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
  aoMudarEnvio: (enviando: boolean) => void
}) {
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string>()
  const envio = useEnvio()

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!motivo.trim()) return setErro('Informe o motivo da recusa. A origem vê esse texto.')
    aoMudarEnvio(true)
    const ok = await envio.enviar(() => recusarTransferencia(pedido.id, motivo.trim()))
    aoMudarEnvio(false)
    if (ok) aoConcluir(`Transferência de ${pedido.paciente} recusada.`)
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <p className="text-corpo text-texto">
        {pedido.paciente} continua em {pedido.instituicaoOrigem}, que vê o motivo da recusa.
      </p>
      <AreaDeTexto rotulo="Motivo" value={motivo} onChange={(e) => { setMotivo(e.target.value); setErro(undefined) }} maxLength={LIMITE_MOTIVO} erro={erro} />
      <RegiaoDeAlerta>
        {envio.erro && (
          <Alerta tom="erro" anunciar={false} titulo="A recusa não foi registrada">
            {envio.erro}
          </Alerta>
        )}
      </RegiaoDeAlerta>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="secundario" onClick={aoFechar} disabled={envio.enviando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="perigo" carregando={envio.enviando} textoCarregando="Recusando…">
          Recusar
        </Botao>
      </div>
    </form>
  )
}
