import { PaginaDoPaciente } from '@/paciente/PaginaDoPaciente'
import { HistoricoNaRede } from '@/paginas/paciente/HistoricoNaRede'
import { QuemAcessou } from '@/paginas/paciente/QuemAcessou'

/** FE-05: o histórico do paciente na rede e quem acessou o prontuário (RF-008, RF-009). */
export function MeuProntuario() {
  return (
    <PaginaDoPaciente titulo="Meu prontuário" subtitulo="Seu histórico na rede e quem consultou o seu prontuário.">
      {(paciente) => (
        <>
          <HistoricoNaRede paciente={paciente} />
          <QuemAcessou paciente={paciente} />
        </>
      )}
    </PaginaDoPaciente>
  )
}
