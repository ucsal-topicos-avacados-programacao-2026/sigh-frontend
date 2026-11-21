import { Siren } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { acessoDeEmergencia, historicoDoAtendimento } from '@/api/atendimento'
import type { HistoricoDoAtendimento, RegistroDoHistorico } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { AreaDeTexto } from '@/componentes/Campo'
import { RegistrosClinicos } from '@/componentes/RegistrosClinicos'

/** Limites da justificativa na API (AcessoEmergenciaRequestDTO). */
const JUSTIFICATIVA_MINIMA = 20
const JUSTIFICATIVA_MAXIMA = 2000

interface Propriedades {
  atendimentoId: string
  /** Texto para quem não tem histórico: o fluxo segue igual (triagem ou atendimento). */
  semHistorico: string
  /** Muda quando há registro novo: busca o histórico de novo. */
  versao?: number
  destacados?: ReadonlySet<string>
  aoMudarEnvio?: (enviando: boolean) => void
  /** Os registros carregados, para quem precisa deles sem consultar de novo (cada consulta vira um acesso auditado). */
  aoCarregar?: (registros: RegistroDoHistorico[]) => void
}

/** Junta os registros da emergência com os de uma recarga posterior (o registro novo), sem repetir, do mais recente. */
function juntar(daEmergencia: RegistroDoHistorico[], novos: RegistroDoHistorico[] | undefined) {
  const porId = new Map(daEmergencia.map((r) => [r.id, r]))
  for (const r of novos ?? []) if (!porId.has(r.id)) porId.set(r.id, r)
  return [...porId.values()].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : a.criadoEm > b.criadoEm ? -1 : 0))
}

/**
 * Histórico do paciente no atendimento (RF-009), com o acesso de emergência com justificativa antes de mostrar o que o
 * paciente restringiu (RF-010, RN-003). Médico e enfermeiro usam o mesmo.
 */
export function HistoricoNoAtendimento({ atendimentoId, semHistorico, versao = 0, destacados, aoMudarEnvio = () => {}, aoCarregar }: Propriedades) {
  const consulta = useConsulta((sinal) => historicoDoAtendimento(atendimentoId, sinal), [atendimentoId, versao])
  const [emergencia, setEmergencia] = useState<HistoricoDoAtendimento | null>(null)
  const [pedindo, setPedindo] = useState(false)
  // Depois da emergência, uma recarga (registro novo) soma os registros dela aos que a emergência mostrou.
  // Memorizado: uma lista nova a cada render avisaria quem usa aoCarregar a cada render, sem fim.
  const historico = useMemo(
    () => (emergencia ? { ...emergencia, registros: juntar(emergencia.registros, consulta.dados?.registros) } : consulta.dados),
    [emergencia, consulta.dados],
  )
  const registros = historico?.registros
  useEffect(() => {
    if (registros) aoCarregar?.(registros)
  }, [registros, aoCarregar])

  if (consulta.erro && !emergencia) {
    return (
      <Alerta tom="erro" titulo="Não foi possível carregar o histórico" acao={<Botao variante="secundario" onClick={consulta.recarregar}>Tentar de novo</Botao>}>
        {consulta.erro}
      </Alerta>
    )
  }
  if (!historico) {
    return (
      <p role="status" className="text-corpo text-texto-suave">
        Carregando o histórico…
      </p>
    )
  }
  return (
    <div className="grid gap-4">
      {historico.acessoDeEmergencia ? (
        <Alerta tom="atencao" anunciar={false} titulo="Acesso de emergência">
          Os registros restritos pelo paciente aparecem marcados. O acesso e a justificativa estão na auditoria.
        </Alerta>
      ) : (
        <p className="text-corpo text-texto-suave">Esta consulta fica registrada na auditoria, e o paciente pode vê-la.</p>
      )}
      {historico.possuiInformacoesRestritas && !pedindo && (
        <Alerta
          tom="info"
          anunciar={false}
          titulo="Há informações restritas pelo paciente"
          acao={
            <Botao variante="secundario" icone={Siren} onClick={() => setPedindo(true)}>
              Acesso de emergência
            </Botao>
          }
        >
          Só um acesso de emergência as mostra, com justificativa, numa classificação de risco vermelha ou laranja confirmada por
          outro profissional.
        </Alerta>
      )}
      {pedindo && (
        <FormularioDeEmergencia
          atendimentoId={atendimentoId}
          aoCancelar={() => setPedindo(false)}
          aoConcluir={(resultado) => {
            setEmergencia(resultado)
            setPedindo(false)
          }}
          aoMudarEnvio={aoMudarEnvio}
        />
      )}
      {historico.registros.length === 0 ? (
        <p className="text-corpo text-texto">{semHistorico}</p>
      ) : (
        <RegistrosClinicos registros={historico.registros} destacados={destacados} />
      )}
    </div>
  )
}

function FormularioDeEmergencia({ atendimentoId, aoCancelar, aoConcluir, aoMudarEnvio }: {
  atendimentoId: string
  aoCancelar: () => void
  aoConcluir: (resultado: HistoricoDoAtendimento) => void
  aoMudarEnvio: (enviando: boolean) => void
}) {
  const [justificativa, setJustificativa] = useState('')
  const [erro, setErro] = useState<string>()
  const envio = useEnvio()

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const texto = justificativa.trim()
    if (texto.length < JUSTIFICATIVA_MINIMA) {
      setErro(`Descreva a emergência com pelo menos ${JUSTIFICATIVA_MINIMA} caracteres.`)
      return
    }
    let resultado: HistoricoDoAtendimento | undefined
    aoMudarEnvio(true)
    const ok = await envio.enviar(async () => {
      resultado = await acessoDeEmergencia(atendimentoId, texto)
    })
    aoMudarEnvio(false)
    if (ok && resultado) aoConcluir(resultado)
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-4 rounded-controle border border-atencao-borda bg-atencao-fundo p-4">
      <AreaDeTexto
        rotulo="Justificativa da emergência"
        ajuda="O que torna o acesso necessário agora. Vai para a auditoria, e o paciente vê o acesso."
        value={justificativa}
        onChange={(e) => {
          setJustificativa(e.target.value)
          setErro(undefined)
          envio.limparErro()
        }}
        maxLength={JUSTIFICATIVA_MAXIMA}
        rows={4}
        erro={erro}
      />
      <RegiaoDeAlerta>
        {envio.erro && (
          <Alerta tom="erro" anunciar={false} titulo="O acesso de emergência foi recusado">
            {envio.erro}
          </Alerta>
        )}
      </RegiaoDeAlerta>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="secundario" onClick={aoCancelar} disabled={envio.enviando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="perigo" icone={Siren} carregando={envio.enviando} textoCarregando="Registrando…">
          Acessar em emergência
        </Botao>
      </div>
    </form>
  )
}
