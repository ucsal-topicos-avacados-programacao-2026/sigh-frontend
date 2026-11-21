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

export function Consentimentos() {
  return (
    <PaginaDoPaciente titulo="Consentimentos" subtitulo="Decida quem na rede pode ver o seu histórico.">
      {(paciente) => <ConteudoDosConsentimentos paciente={paciente} />}
    </PaginaDoPaciente>
  )
}

function ConteudoDosConsentimentos({ paciente }: { paciente: PacienteGerenciado }) {
  const id = paciente.pacienteId
  const historico = useConsulta((sinal) => buscarHistorico(id, sinal), [id])
  const restricoes = useConsulta((sinal) => buscarRestricoes(id, sinal), [id])
  const autorizacoes = useConsulta((sinal) => buscarAutorizacoes(id, sinal), [id])
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
