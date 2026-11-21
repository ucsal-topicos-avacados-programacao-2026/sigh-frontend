import {
  autorizacoes as buscarAutorizacoes,
  consentimentos as buscarConsentimentos,
  historico as buscarHistorico,
  restricoes as buscarRestricoes,
} from '@/api/paciente'
import type { PacienteGerenciado } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { PaginaDoPaciente } from '@/paciente/PaginaDoPaciente'
import { AutorizacoesAdicionais } from '@/paginas/paciente/AutorizacoesAdicionais'
import { CompartilhamentoNaRede } from '@/paginas/paciente/CompartilhamentoNaRede'
import { InformacoesRestritas } from '@/paginas/paciente/InformacoesRestritas'

/** FE-05: consentimento amplo (RF-002, RN-007), restrições e autorizações adicionais (RF-009). */
export function Consentimentos() {
  return (
    <PaginaDoPaciente titulo="Consentimentos" subtitulo="Decida quem na rede pode ver o seu histórico.">
      {(paciente) => <ConteudoDosConsentimentos paciente={paciente} />}
    </PaginaDoPaciente>
  )
}

function ConteudoDosConsentimentos({ paciente }: { paciente: PacienteGerenciado }) {
  const id = paciente.pacienteId
  // O histórico dá nome aos registros restritos e sugere as categorias; as restrições são os alvos das autorizações.
  const historico = useConsulta((sinal) => buscarHistorico(id, sinal), [id])
  const restricoes = useConsulta((sinal) => buscarRestricoes(id, sinal), [id])
  const autorizacoes = useConsulta((sinal) => buscarAutorizacoes(id, sinal), [id])
  // O consentimento amplo decide onde a autorização adicional faz efeito: as duas partes leem o mesmo.
  const consentimento = useConsulta((sinal) => buscarConsentimentos(id, sinal), [id])
  return (
    <>
      <CompartilhamentoNaRede paciente={paciente} consulta={consentimento} />
      <InformacoesRestritas
        paciente={paciente}
        historico={historico.dados}
        restricoes={restricoes}
        aoMudar={() => {
          restricoes.recarregar()
          historico.recarregar()
        }}
      />
      <AutorizacoesAdicionais
        paciente={paciente}
        historico={historico.dados}
        restricoes={restricoes.dados}
        autorizacoes={autorizacoes}
        compartilhamento={consentimento.dados?.vigente?.decisao ?? (consentimento.dados ? null : undefined)}
      />
    </>
  )
}
