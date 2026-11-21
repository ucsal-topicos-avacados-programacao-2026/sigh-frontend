import type { ReactNode } from 'react'
import type { PacienteGerenciado } from '@/api/tipos'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { Selecao } from '@/componentes/Campo'
import { TituloPagina } from '@/componentes/TituloPagina'
import { usePacienteAtivo } from '@/paciente/PacienteAtivo'

interface PropriedadesPagina {
  titulo: string
  subtitulo: string
  children: (paciente: PacienteGerenciado) => ReactNode
}

export function PaginaDoPaciente({ titulo, subtitulo, children }: PropriedadesPagina) {
  const { carregando, erro, gerenciados, ativo, escolher, recarregar } = usePacienteAtivo()
  const varios = gerenciados.length > 1
  return (
    <>
      <TituloPagina
        titulo={titulo}
        subtitulo={ativo && ativo.relacao === 'REPRESENTANTE_LEGAL' ? `Dados de ${ativo.nome}, que você representa.` : subtitulo}
        acoes={
          varios && ativo ? (
            <div className="w-full sm:w-72">
              <Selecao rotulo="Dados de" value={ativo.pacienteId} onChange={(e) => escolher(e.target.value)}>
                {gerenciados.map((p) => (
                  <option key={p.pacienteId} value={p.pacienteId} className="bg-white">
                    {p.relacao === 'TITULAR' ? `${p.nome} (você)` : `${p.nome} (representado)`}
                  </option>
                ))}
              </Selecao>
            </div>
          ) : undefined
        }
      />
      {carregando && !ativo ? (
        <p role="status" className="text-corpo text-texto-suave">
          Carregando seus dados…
        </p>
      ) : erro ? (
        <Alerta tom="erro" titulo="Não foi possível carregar seus dados" acao={<Botao variante="secundario" onClick={recarregar}>Tentar de novo</Botao>}>
          {erro}
        </Alerta>
      ) : !ativo ? (
        <Alerta tom="atencao" anunciar={false} titulo="Seu acesso ainda não está ligado a um cadastro de paciente">
          Peça à recepção de uma instituição da rede para ligar o seu acesso ao seu cadastro.
        </Alerta>
      ) : (
        <div key={ativo.pacienteId} className="grid grid-cols-1 gap-6">
          {children(ativo)}
        </div>
      )}
    </>
  )
}
