import { Siren } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { acessoDeEmergencia, historicoDoAtendimento } from '@/api/atendimento'
import type { HistoricoDoAtendimento } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { AreaDeTexto } from '@/componentes/Campo'
import { Dialogo } from '@/componentes/Dialogo'
import { RegistrosClinicos } from '@/componentes/RegistrosClinicos'

/** Limites da justificativa na API (AcessoEmergenciaRequestDTO). */
const JUSTIFICATIVA_MINIMA = 20
const JUSTIFICATIVA_MAXIMA = 2000

export interface PacienteDoHistorico {
  atendimentoId: string
  paciente: string
}

/**
 * Histórico do paciente no atendimento (RF-009) e o acesso de emergência com justificativa (RF-010, RN-003). Paciente
 * sem histórico segue o mesmo fluxo: a tela só avisa que não há registros.
 */
export function DialogoDoHistorico({ alvo, aoFechar }: { alvo: PacienteDoHistorico | null; aoFechar: () => void }) {
  const [enviando, setEnviando] = useState(false)
  return (
    <Dialogo aberto={alvo !== null} titulo={alvo ? `Histórico de ${alvo.paciente}` : 'Histórico'} aoFechar={aoFechar} bloqueado={enviando}>
      {alvo && <ConteudoDoHistorico key={alvo.atendimentoId} alvo={alvo} aoMudarEnvio={setEnviando} />}
    </Dialogo>
  )
}

function ConteudoDoHistorico({ alvo, aoMudarEnvio }: { alvo: PacienteDoHistorico; aoMudarEnvio: (enviando: boolean) => void }) {
  const consulta = useConsulta((sinal) => historicoDoAtendimento(alvo.atendimentoId, sinal), [alvo.atendimentoId])
  const [emergencia, setEmergencia] = useState<HistoricoDoAtendimento | null>(null)
  const [pedindo, setPedindo] = useState(false)
  const historico = emergencia ?? consulta.dados

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
          atendimentoId={alvo.atendimentoId}
          aoCancelar={() => setPedindo(false)}
          aoConcluir={(resultado) => {
            setEmergencia(resultado)
            setPedindo(false)
          }}
          aoMudarEnvio={aoMudarEnvio}
        />
      )}
      {historico.registros.length === 0 ? (
        <p className="text-corpo text-texto">
          Nenhum registro na rede para este paciente, ou nenhum compartilhado com esta instituição. Siga a triagem normalmente.
        </p>
      ) : (
        <RegistrosClinicos registros={historico.registros} />
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
