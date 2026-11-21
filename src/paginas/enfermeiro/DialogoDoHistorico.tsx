import { useState } from 'react'
import { Dialogo } from '@/componentes/Dialogo'
import { HistoricoNoAtendimento } from '@/paginas/atendimento/HistoricoNoAtendimento'

export interface PacienteDoHistorico {
  atendimentoId: string
  paciente: string
}

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
