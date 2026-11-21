import { PaginaDoPaciente } from '@/paciente/PaginaDoPaciente'
import { HistoricoNaRede } from '@/paginas/paciente/HistoricoNaRede'
import { QuemAcessou } from '@/paginas/paciente/QuemAcessou'

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
