import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ErroApi, ErroDeConexao } from '@/api/cliente'
import { aguardandoTriagem, confirmarRisco, registrarSinaisVitais, registrarTriagem, sugerirRisco } from '@/api/triagem'
import type { CorRisco, SituacaoSugestao, TriagemPendente } from '@/api/tipos'
import { useEnvio } from '@/api/useEnvio'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { AvisoIA } from '@/componentes/AvisoIA'
import { Botao } from '@/componentes/Botao'
import { AreaDeTexto, CampoTexto, GrupoDeOpcoes } from '@/componentes/Campo'
import { Dialogo } from '@/componentes/Dialogo'
import { CORES_DE_RISCO, RISCO, nomeDoRisco } from '@/componentes/risco'
import { SeloRisco } from '@/componentes/SeloRisco'
import { SINAIS_VAZIOS, validarSinais, type CamposDosSinais, type ErrosDosSinais } from '@/paginas/enfermeiro/sinaisVitais'

export interface PacienteATriar {
  atendimentoId: string
  paciente: string
  pendente?: TriagemPendente | null
  reclassificacao?: boolean
}

export function DialogoDeTriagem({ alvo, aoFechar, aoConfirmar }: {
  alvo: PacienteATriar | null
  aoFechar: () => void
  aoConfirmar: (mensagem: string) => void
}) {
  const [ocupado, setOcupado] = useState(false)
  const titulo = alvo ? `${alvo.reclassificacao ? 'Reclassificar' : 'Triagem de'} ${alvo.paciente}` : 'Triagem'
  return (
    <Dialogo aberto={alvo !== null} titulo={titulo} aoFechar={aoFechar} bloqueado={ocupado}>
      {alvo && <Triagem key={alvo.atendimentoId + (alvo.pendente?.id ?? '')} alvo={alvo} aoConfirmar={aoConfirmar} aoFechar={aoFechar} aoMudarOcupado={setOcupado} />}
    </Dialogo>
  )
}

const MENSAGEM_IA_INDISPONIVEL = 'A sugestão por IA não está disponível agora. Classifique pelo protocolo e confirme: a triagem segue normalmente.'
const INTERVALO_DA_SUGESTAO_MS = 3000
const TENTATIVAS_DA_SUGESTAO = 40

interface Sugestao {
  id: string
  corSugerida: CorRisco | null
  preliminar: boolean
  situacao: SituacaoSugestao | null
}

const deUmaPendente = (pendente: TriagemPendente): Sugestao => ({
  id: pendente.id,
  corSugerida: pendente.corSugerida,
  preliminar: pendente.sugestaoPreliminar,
  situacao: pendente.situacaoSugestao,
})

function Triagem({ alvo, aoConfirmar, aoFechar, aoMudarOcupado }: {
  alvo: PacienteATriar
  aoConfirmar: (mensagem: string) => void
  aoFechar: () => void
  aoMudarOcupado: (ocupado: boolean) => void
}) {
  const { instituicaoAtiva } = useSessao()
  const [triagem, setTriagem] = useState<Sugestao | null>(alvo.pendente ? deUmaPendente(alvo.pendente) : null)
  const [cor, setCor] = useState<CorRisco | ''>(alvo.pendente?.corSugerida ?? '')
  const [escolhaFeita, setEscolhaFeita] = useState(false)
  const [iaFalhou, setIaFalhou] = useState<string | undefined>(alvo.pendente?.situacaoSugestao === 'INDISPONIVEL' ? MENSAGEM_IA_INDISPONIVEL : undefined)
  const [sugerindo, setSugerindo] = useState(false)
  const [semSinais, setSemSinais] = useState(alvo.pendente ? alvo.pendente.sinaisVitais === null : false)
  const ativo = useRef(true)

  useEffect(() => {
    ativo.current = true
    return () => {
      ativo.current = false
    }
  }, [])

  function receber(sugestao: Sugestao) {
    setTriagem(sugestao)
    if (sugestao.situacao === 'INDISPONIVEL') setIaFalhou(MENSAGEM_IA_INDISPONIVEL)
    else setIaFalhou(undefined)
    const sugerida = sugestao.corSugerida
    if (sugerida && !escolhaFeita) setCor(sugerida)
  }

  async function aguardarSugestao(atendimentoId: string) {
    if (!instituicaoAtiva) return
    setSugerindo(true)
    try {
      for (let tentativa = 0; tentativa < TENTATIVAS_DA_SUGESTAO && ativo.current; tentativa++) {
        const lista = await aguardandoTriagem(instituicaoAtiva.instituicaoId)
        const pendente = lista.find((a) => a.atendimentoId === atendimentoId)?.triagemPendente
        if (!ativo.current) return
        if (pendente && pendente.situacaoSugestao !== 'EM_ANDAMENTO') {
          receber(deUmaPendente(pendente))
          return
        }
        await new Promise((resolver) => window.setTimeout(resolver, INTERVALO_DA_SUGESTAO_MS))
      }
      if (ativo.current) setIaFalhou(MENSAGEM_IA_INDISPONIVEL)
    } catch (falha) {
      if (ativo.current && !(falha instanceof ErroApi && falha.status === 401)) setIaFalhou(MENSAGEM_IA_INDISPONIVEL)
    } finally {
      if (ativo.current) setSugerindo(false)
    }
  }

  useEffect(() => {
    if (alvo.pendente?.situacaoSugestao === 'EM_ANDAMENTO') void aguardarSugestao(alvo.atendimentoId)
    // Só ao abrir: a espera por uma sugestão que a recepção já pediu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function pedirSugestao(id: string) {
    setSugerindo(true)
    setIaFalhou(undefined)
    aoMudarOcupado(true)
    try {
      const resposta = await sugerirRisco(id)
      receber({ id, corSugerida: resposta.corSugerida, preliminar: resposta.sugestaoPreliminar, situacao: resposta.situacaoSugestao })
    } catch (falha) {
      if (falha instanceof ErroDeConexao || (falha instanceof ErroApi && falha.status === 503)) setIaFalhou(MENSAGEM_IA_INDISPONIVEL)
      else if (falha instanceof ErroApi && falha.status !== 401) setIaFalhou(`${falha.message} Classifique pelo protocolo e confirme.`)
    } finally {
      setSugerindo(false)
      aoMudarOcupado(false)
    }
  }

  if (!triagem) {
    return (
      <DadosDaTriagem
        alvo={alvo}
        aoCancelar={aoFechar}
        aoMudarOcupado={aoMudarOcupado}
        aoRegistrar={(id) => {
          setTriagem({ id, corSugerida: null, preliminar: false, situacao: null })
          void pedirSugestao(id)
        }}
      />
    )
  }
  if (semSinais && alvo.pendente) {
    return (
      <SinaisDaRecepcao
        pendente={alvo.pendente}
        aoCancelar={aoFechar}
        aoPular={() => setSemSinais(false)}
        aoMudarOcupado={aoMudarOcupado}
        aoRegistrar={() => {
          setSemSinais(false)
          setIaFalhou(undefined)
          setTriagem((atual) => (atual ? { ...atual, situacao: 'EM_ANDAMENTO' } : atual))
          void aguardarSugestao(alvo.atendimentoId)
        }}
      />
    )
  }
  return (
    <Classificacao
      alvo={alvo}
      triagemId={triagem.id}
      corSugerida={triagem.corSugerida}
      preliminar={triagem.preliminar}
      cor={cor}
      aoMudarCor={(nova) => {
        setCor(nova)
        setEscolhaFeita(true)
      }}
      sugerindo={sugerindo}
      iaFalhou={iaFalhou}
      aoPedirSugestao={() => void pedirSugestao(triagem.id)}
      aoFechar={aoFechar}
      aoConfirmar={aoConfirmar}
      aoMudarOcupado={aoMudarOcupado}
    />
  )
}

const ROTULOS: Record<keyof CamposDosSinais, { rotulo: string; ajuda?: string; modo: 'numeric' | 'decimal' | 'text' }> = {
  pressaoArterial: { rotulo: 'Pressão arterial (mmHg)', ajuda: 'Por exemplo 120/80.', modo: 'text' },
  frequenciaCardiaca: { rotulo: 'Frequência cardíaca (bpm)', modo: 'numeric' },
  frequenciaRespiratoria: { rotulo: 'Frequência respiratória (irpm)', modo: 'numeric' },
  temperatura: { rotulo: 'Temperatura (°C)', modo: 'decimal' },
  saturacaoOxigenio: { rotulo: 'Saturação de oxigênio (%)', modo: 'decimal' },
}

function CamposDosSinaisVitais({ campos, erros, aoMudar }: {
  campos: CamposDosSinais
  erros: ErrosDosSinais
  aoMudar: (campo: keyof CamposDosSinais, valor: string) => void
}) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="mb-1 text-corpo font-medium text-corpo-alerta">Sinais vitais (o que foi medido)</legend>
      {(Object.keys(ROTULOS) as (keyof CamposDosSinais)[]).map((campo) => (
        <CampoTexto
          key={campo}
          rotulo={ROTULOS[campo].rotulo}
          ajuda={ROTULOS[campo].ajuda}
          inputMode={ROTULOS[campo].modo}
          autoComplete="off"
          value={campos[campo]}
          onChange={(e) => aoMudar(campo, e.target.value)}
          erro={erros[campo]}
          opcional
        />
      ))}
    </fieldset>
  )
}

function SinaisDaRecepcao({ pendente, aoCancelar, aoPular, aoRegistrar, aoMudarOcupado }: {
  pendente: TriagemPendente
  aoCancelar: () => void
  aoPular: () => void
  aoRegistrar: () => void
  aoMudarOcupado: (ocupado: boolean) => void
}) {
  const [campos, setCampos] = useState<CamposDosSinais>(SINAIS_VAZIOS)
  const [erros, setErros] = useState<ErrosDosSinais>({})
  const envio = useEnvio()

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const { erros: daValidacao, sinais } = validarSinais(campos)
    setErros(daValidacao)
    if (Object.values(daValidacao).some(Boolean)) return
    aoMudarOcupado(true)
    const ok = await envio.enviar(async () => {
      await registrarSinaisVitais(pendente.id, sinais)
    })
    aoMudarOcupado(false)
    if (ok) aoRegistrar()
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <div>
        <p className="text-rotulo font-semibold text-texto-suave uppercase">Relato na recepção</p>
        <p className="mt-1 text-corpo text-texto">{pendente.sintomas}</p>
      </div>
      <CamposDosSinaisVitais
        campos={campos}
        erros={erros}
        aoMudar={(campo, valor) => {
          setCampos((atuais) => ({ ...atuais, [campo]: valor }))
          setErros((atuais) => ({ ...atuais, [campo]: undefined }))
        }}
      />
      <RegiaoDeAlerta>
        {envio.erro && (
          <Alerta tom="erro" anunciar={false} titulo="Os sinais vitais não foram registrados">
            {envio.erro}
          </Alerta>
        )}
      </RegiaoDeAlerta>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="secundario" onClick={aoCancelar} disabled={envio.enviando}>
          Cancelar
        </Botao>
        <Botao variante="secundario" onClick={aoPular} disabled={envio.enviando}>
          Classificar sem registrar agora
        </Botao>
        <Botao type="submit" icone={Sparkles} carregando={envio.enviando} textoCarregando="Registrando…">
          Registrar e atualizar a sugestão
        </Botao>
      </div>
    </form>
  )
}

function DadosDaTriagem({ alvo, aoCancelar, aoRegistrar, aoMudarOcupado }: {
  alvo: PacienteATriar
  aoCancelar: () => void
  aoRegistrar: (triagemId: string) => void
  aoMudarOcupado: (ocupado: boolean) => void
}) {
  const [sintomas, setSintomas] = useState('')
  const [campos, setCampos] = useState<CamposDosSinais>(SINAIS_VAZIOS)
  const [erros, setErros] = useState<ErrosDosSinais & { sintomas?: string }>({})
  const envio = useEnvio()

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const { erros: daValidacao, sinais } = validarSinais(campos)
    const novos = { ...daValidacao, sintomas: sintomas.trim() ? undefined : 'Descreva os sintomas.' }
    setErros(novos)
    if (Object.values(novos).some(Boolean)) return
    let id: string | undefined
    aoMudarOcupado(true)
    const ok = await envio.enviar(async () => {
      id = (await registrarTriagem(alvo.atendimentoId, sintomas.trim(), sinais)).id
    })
    aoMudarOcupado(false)
    if (ok && id) aoRegistrar(id)
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <AreaDeTexto
        rotulo="Sintomas"
        ajuda="O que o paciente relata e o que você observa."
        value={sintomas}
        onChange={(e) => {
          setSintomas(e.target.value)
          setErros((atuais) => ({ ...atuais, sintomas: undefined }))
        }}
        rows={3}
        erro={erros.sintomas}
      />
      <CamposDosSinaisVitais
        campos={campos}
        erros={erros}
        aoMudar={(campo, valor) => {
          setCampos((atuais) => ({ ...atuais, [campo]: valor }))
          setErros((atuais) => ({ ...atuais, [campo]: undefined }))
        }}
      />
      <RegiaoDeAlerta>
        {envio.erro && (
          <Alerta tom="erro" anunciar={false} titulo="A triagem não foi registrada">
            {envio.erro}
          </Alerta>
        )}
      </RegiaoDeAlerta>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="secundario" onClick={aoCancelar} disabled={envio.enviando}>
          Cancelar
        </Botao>
        <Botao type="submit" icone={Sparkles} carregando={envio.enviando} textoCarregando="Registrando…">
          Registrar e pedir sugestão
        </Botao>
      </div>
    </form>
  )
}

function Classificacao({ alvo, triagemId, corSugerida, preliminar, cor, aoMudarCor, sugerindo, iaFalhou, aoPedirSugestao, aoFechar, aoConfirmar, aoMudarOcupado }: {
  alvo: PacienteATriar
  triagemId: string
  corSugerida: CorRisco | null
  preliminar: boolean
  cor: CorRisco | ''
  aoMudarCor: (cor: CorRisco) => void
  sugerindo: boolean
  iaFalhou?: string
  aoPedirSugestao: () => void
  aoFechar: () => void
  aoConfirmar: (mensagem: string) => void
  aoMudarOcupado: (ocupado: boolean) => void
}) {
  const [erro, setErro] = useState<string>()
  const envio = useEnvio()

  async function confirmar(evento: FormEvent) {
    evento.preventDefault()
    if (!cor) {
      setErro('Escolha a classificação de risco.')
      return
    }
    aoMudarOcupado(true)
    const ok = await envio.enviar(() => confirmarRisco(triagemId, cor))
    aoMudarOcupado(false)
    if (ok) aoConfirmar(`Classificação de ${alvo.paciente} confirmada: ${nomeDoRisco(cor)}.`)
  }

  return (
    <form onSubmit={confirmar} noValidate className="grid gap-5">
      {sugerindo ? (
        <p role="status" className="text-corpo text-texto-suave">
          A IA está preparando a sugestão. Pode levar alguns segundos…
        </p>
      ) : corSugerida ? (
        <AvisoIA aviso="Confira com os sinais e sintomas. A classificação só vale depois da sua confirmação, com um clique em Confirmar.">
          <p className="flex flex-wrap items-center gap-2">
            {preliminar ? 'Sugestão preliminar (sem sinais vitais):' : 'Sugestão:'} <SeloRisco cor={corSugerida} />
          </p>
        </AvisoIA>
      ) : null}
      {!sugerindo && iaFalhou && (
        <Alerta tom="atencao" titulo="Triagem sem sugestão da IA" acao={<Botao variante="secundario" onClick={aoPedirSugestao}>Tentar a sugestão de novo</Botao>}>
          {iaFalhou}
        </Alerta>
      )}
      {!sugerindo && !iaFalhou && !corSugerida && (
        <div>
          <Botao variante="secundario" icone={Sparkles} onClick={aoPedirSugestao}>
            Pedir sugestão da IA
          </Botao>
        </div>
      )}
      <div
        role="presentation"
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') evento.preventDefault()
        }}
      >
      <GrupoDeOpcoes
        legenda="Classificação de risco"
        nome="classificacao-de-risco"
        valor={cor}
        aoMudar={(nova) => {
          aoMudarCor(nova)
          setErro(undefined)
        }}
        opcoes={CORES_DE_RISCO.map((c) => ({ valor: c, rotulo: `${RISCO[c].cor} · ${RISCO[c].significado}`, descricao: c === corSugerida ? 'Sugestão da IA' : undefined }))}
        erro={erro}
      />
      </div>
      {corSugerida && cor && cor !== corSugerida && (
        <p className="text-corpo text-texto">
          Você alterou a sugestão da IA: de {nomeDoRisco(corSugerida)} para {nomeDoRisco(cor)}.
        </p>
      )}
      <p className="text-corpo text-texto-suave">
        {alvo.reclassificacao
          ? 'A nova classificação só vale com a sua confirmação. Se fechar agora, ela é descartada, e continua valendo a cor anterior.'
          : 'A triagem só termina com a sua confirmação. Se fechar agora, o paciente continua em "Aguardando triagem", e dá para retomar.'}
      </p>
      <RegiaoDeAlerta>
        {envio.erro && (
          <Alerta tom="erro" anunciar={false} titulo="A classificação não foi confirmada">
            {envio.erro}
          </Alerta>
        )}
      </RegiaoDeAlerta>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="secundario" onClick={aoFechar} disabled={envio.enviando || sugerindo}>
          Fechar sem confirmar
        </Botao>
        <Botao type="submit" carregando={envio.enviando} textoCarregando="Confirmando…" disabled={sugerindo}>
          Confirmar classificação
        </Botao>
      </div>
    </form>
  )
}
