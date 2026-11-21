import { Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ErroApi, ErroDeConexao } from '@/api/cliente'
import { confirmarRisco, registrarTriagem, sugerirRisco } from '@/api/triagem'
import type { CorRisco } from '@/api/tipos'
import { useEnvio } from '@/api/useEnvio'
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
  /** Triagem registrada e não confirmada: retoma direto na classificação. */
  pendente?: { id: string; corSugerida: CorRisco | null } | null
  /** Paciente já na fila: uma nova classificação (o paciente piorou ou melhorou). */
  reclassificacao?: boolean
}

/** Triagem com sugestão de IA e confirmação do enfermeiro (RF-003, RN-005, RN-008). */
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

function Triagem({ alvo, aoConfirmar, aoFechar, aoMudarOcupado }: {
  alvo: PacienteATriar
  aoConfirmar: (mensagem: string) => void
  aoFechar: () => void
  aoMudarOcupado: (ocupado: boolean) => void
}) {
  const [triagem, setTriagem] = useState<{ id: string; corSugerida: CorRisco | null } | null>(alvo.pendente ?? null)
  const [cor, setCor] = useState<CorRisco | ''>(alvo.pendente?.corSugerida ?? '')
  const [iaFalhou, setIaFalhou] = useState<string>()
  const [sugerindo, setSugerindo] = useState(false)

  async function pedirSugestao(id: string) {
    setSugerindo(true)
    setIaFalhou(undefined)
    aoMudarOcupado(true)
    try {
      const resposta = await sugerirRisco(id)
      setTriagem({ id, corSugerida: resposta.corSugerida })
      // A sugestão só vem marcada se a enfermeira ainda não escolheu: a decisão é dela, e a IA nunca a troca.
      const sugerida = resposta.corSugerida
      if (sugerida) setCor((escolhida) => escolhida || sugerida)
    } catch (falha) {
      // 503 (IA fora) ou rede: o enfermeiro classifica sozinho (RN-008). Outro erro: a mensagem da API.
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
          setTriagem({ id, corSugerida: null })
          void pedirSugestao(id)
        }}
      />
    )
  }
  return (
    <Classificacao
      alvo={alvo}
      triagemId={triagem.id}
      corSugerida={triagem.corSugerida}
      cor={cor}
      aoMudarCor={setCor}
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
            onChange={(e) => {
              setCampos((atuais) => ({ ...atuais, [campo]: e.target.value }))
              setErros((atuais) => ({ ...atuais, [campo]: undefined }))
            }}
            erro={erros[campo]}
            opcional
          />
        ))}
      </fieldset>
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

function Classificacao({ alvo, triagemId, corSugerida, cor, aoMudarCor, sugerindo, iaFalhou, aoPedirSugestao, aoFechar, aoConfirmar, aoMudarOcupado }: {
  alvo: PacienteATriar
  triagemId: string
  corSugerida: CorRisco | null
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
          Pedindo a sugestão à IA. Pode levar alguns segundos…
        </p>
      ) : corSugerida ? (
        <AvisoIA aviso="Confira com os sinais e sintomas. A classificação só vale depois da sua confirmação.">
          <p className="flex flex-wrap items-center gap-2">
            Sugestão: <SeloRisco cor={corSugerida} />
          </p>
        </AvisoIA>
      ) : iaFalhou ? (
        <Alerta tom="atencao" titulo="Triagem sem sugestão da IA" acao={<Botao variante="secundario" onClick={aoPedirSugestao}>Tentar a sugestão de novo</Botao>}>
          {iaFalhou}
        </Alerta>
      ) : (
        <div>
          <Botao variante="secundario" icone={Sparkles} onClick={aoPedirSugestao}>
            Pedir sugestão da IA
          </Botao>
        </div>
      )}
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
