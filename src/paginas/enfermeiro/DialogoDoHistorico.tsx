import { useState } from 'react'
import { Dialogo } from '@/componentes/Dialogo'
import { HistoricoNoAtendimento } from '@/paginas/atendimento/HistoricoNoAtendimento'

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
      {alvo && (
        <HistoricoNoAtendimento
          key={alvo.atendimentoId}
          atendimentoId={alvo.atendimentoId}
          semHistorico="Nenhum registro na rede para este paciente, ou nenhum compartilhado com esta instituição. Siga a triagem normalmente."
          aoMudarEnvio={setEnviando}
        />
      )}
    </Dialogo>
  )
}
