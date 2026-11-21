import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { painelDaInstituicao } from '@/api/painel'
import { instituicoesDaRede } from '@/api/paciente'
import { useConsulta } from '@/api/useConsulta'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { TituloPagina } from '@/componentes/TituloPagina'
import { ATUALIZAR_A_CADA_MS } from '@/paginas/administrativo/textos'
import {
  AgoraNoHospital,
  AguardandoTriagem,
  FilaPorRisco,
  LeitosLivresPorCategoria,
  OcupacaoDeLeitos,
  TransferenciasPendentes,
} from '@/paginas/painel/BlocosDoPainel'
import { PilhaDeHospitais, type HospitalDaPilha } from '@/paginas/painel/PilhaDeHospitais'
import { useAtualizacaoPeriodica } from '@/util/useAtualizacaoPeriodica'

const TIPO = { PUBLICA: 'Hospital público', PRIVADA: 'Hospital privado' } as const

/**
 * Painel (FE-09): os números de agora de um hospital, escolhido numa pilha de cartões. O médico, o enfermeiro e o
 * administrativo veem os hospitais do vínculo, e escolher um cartão troca a instituição ativa. O auditor/gestor vê
 * toda a rede (RF-011). Só contagens e tempos: nenhum dado de paciente sai da API nesta tela.
 */
export function PainelDosHospitais() {
  const { usuario, vinculos, instituicaoAtiva, escolherInstituicao } = useSessao()
  const gestor = usuario?.perfis.includes('AUDITOR_GESTOR') ?? false
  const rede = useConsulta(gestor ? (sinal) => instituicoesDaRede(sinal) : null, [gestor])
  const [escolhidoPeloGestor, setEscolhidoPeloGestor] = useState<string | null>(null)

  const hospitais = useMemo<HospitalDaPilha[]>(() => {
    const perfisEm = (id: string) => vinculos.find((v) => v.instituicaoId === id)?.perfis ?? []
    if (gestor) return (rede.dados ?? []).map((i) => ({ id: i.id, nome: i.nome, perfis: perfisEm(i.id) }))
    return vinculos.map((v) => ({ id: v.instituicaoId, nome: v.instituicaoNome, perfis: v.perfis }))
  }, [gestor, rede.dados, vinculos])

  const naLista = (id: string | null | undefined) => (id && hospitais.some((h) => h.id === id) ? id : null)
  const selecionado = gestor
    ? (naLista(escolhidoPeloGestor) ?? naLista(instituicaoAtiva?.instituicaoId) ?? hospitais[0]?.id ?? null)
    : naLista(instituicaoAtiva?.instituicaoId)

  function escolher(id: string) {
    if (gestor) setEscolhidoPeloGestor(id)
    // Onde a pessoa tem vínculo, o cartão também troca a instituição do topo (e o menu que vem com ela).
    if (vinculos.some((v) => v.instituicaoId === id)) escolherInstituicao(id)
  }

  const painel = useConsulta(selecionado ? (sinal) => painelDaInstituicao(selecionado, sinal) : null, [selecionado])
  useAtualizacaoPeriodica(painel.recarregar, ATUALIZAR_A_CADA_MS)
  // Na troca de hospital, os números do anterior não aparecem como se fossem do novo.
  const dados = painel.dados?.instituicaoId === selecionado ? painel.dados : undefined

  const subtitulo = dados
    ? `${dados.instituicaoNome} · ${TIPO[dados.tipo]} · números de ${dados.geradoEm.slice(11, 16)}, atualizados a cada 30 segundos`
    : 'Números de agora do hospital escolhido, atualizados a cada 30 segundos. Sem dados de pacientes.'

  return (
    <>
      <TituloPagina
        titulo="Painel"
        trilha="Visão geral"
        subtitulo={subtitulo}
        acoes={
          // Sem "carregando": a atualização automática não desabilita o botão nem tira o foco de quem está nele.
          <Botao variante="secundario" icone={RefreshCw} onClick={painel.recarregar} disabled={!selecionado}>
            Atualizar
          </Botao>
        }
      />
      {/* A terceira coluna é um pouco mais larga: é a da pilha, onde o nome do hospital precisa caber. */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
        {gestor && rede.erro ? (
          <div className="sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">
            <Alerta tom="erro" titulo="Não foi possível carregar os hospitais da rede" acao={<Botao variante="secundario" onClick={rede.recarregar}>Tentar de novo</Botao>}>
              {rede.erro}
            </Alerta>
          </div>
        ) : gestor && !rede.dados ? (
          <p role="status" className="text-corpo text-texto-suave sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">
            Carregando hospitais…
          </p>
        ) : (
          <PilhaDeHospitais
            hospitais={hospitais}
            selecionado={selecionado}
            aoEscolher={escolher}
            gestor={gestor}
            className="sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1"
          />
        )}
        {painel.erro && !dados ? (
          <div className="sm:col-span-2 lg:col-start-1 lg:row-start-1">
            <Alerta tom="erro" titulo="Não foi possível carregar os números" acao={<Botao variante="secundario" onClick={painel.recarregar}>Tentar de novo</Botao>}>
              {painel.erro}
            </Alerta>
          </div>
        ) : gestor && rede.dados && hospitais.length === 0 ? (
          <div className="sm:col-span-2 lg:col-start-1 lg:row-start-1">
            <Alerta tom="info" anunciar={false} titulo="Nenhum hospital credenciado na rede">
              Quando houver hospitais credenciados, os números deles aparecem aqui.
            </Alerta>
          </div>
        ) : (
          <>
            <OcupacaoDeLeitos dados={dados} className="sm:col-span-2 lg:col-start-1 lg:row-start-1" />
            <AguardandoTriagem dados={dados} className="lg:col-start-4 lg:row-start-1" />
            <FilaPorRisco dados={dados} className="sm:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-2" />
            <AgoraNoHospital dados={dados} className="lg:col-start-3 lg:row-start-2" />
            <LeitosLivresPorCategoria dados={dados} className="sm:col-span-2 lg:col-start-3 lg:row-start-3" />
            <TransferenciasPendentes dados={dados} className="lg:col-start-4 lg:row-start-2" />
          </>
        )}
      </div>
    </>
  )
}
