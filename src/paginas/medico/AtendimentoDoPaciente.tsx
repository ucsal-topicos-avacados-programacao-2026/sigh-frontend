import { ArrowLeft, DoorClosed } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { atendimentosEmAndamento, encerrarAtendimento } from '@/api/atendimento'
import { filaDeAtendimento } from '@/api/triagem'
import type { CorRisco, RegistroDoHistorico, VinculoAtivo } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { DialogoConfirmacao } from '@/componentes/DialogoConfirmacao'
import { Painel } from '@/componentes/Painel'
import { SeloRisco } from '@/componentes/SeloRisco'
import { useToast } from '@/componentes/Toast'
import { TituloPagina } from '@/componentes/TituloPagina'
import { HistoricoNoAtendimento } from '@/paginas/atendimento/HistoricoNoAtendimento'
import { NovoRegistro } from '@/paginas/medico/NovoRegistro'
import { ResumoPorIA } from '@/paginas/medico/ResumoPorIA'
import { formatarDataHora } from '@/util/datas'

const VOLTAR = 'inline-flex min-h-alvo items-center gap-2 text-corpo font-semibold text-link hover:text-link-hover hover:underline lg:min-h-0'
const CATEGORIA_PADRAO = 'Clínica geral'

interface Cabecalho {
  paciente: string
  cor: CorRisco | null
  motivo?: string
  chegadaEm: string
  inicioClinicoEm?: string
}

export function AtendimentoDoPaciente() {
  const { instituicaoAtiva } = useSessao()
  const { atendimentoId = '' } = useParams()
  if (!instituicaoAtiva) return null
  return <Atendimento key={`${instituicaoAtiva.instituicaoId}-${atendimentoId}`} instituicao={instituicaoAtiva} atendimentoId={atendimentoId} />
}

function Atendimento({ instituicao, atendimentoId }: { instituicao: VinculoAtivo; atendimentoId: string }) {
  const id = instituicao.instituicaoId
  const emAndamento = useConsulta((sinal) => atendimentosEmAndamento(id, sinal), [id])
  const fila = useConsulta((sinal) => filaDeAtendimento(id, sinal), [id])
  const [versao, setVersao] = useState(0)
  const [categoriasDoProntuario, setCategoriasDoProntuario] = useState<string[]>([])
  const aoCarregarProntuario = useCallback(
    (registros: RegistroDoHistorico[]) => setCategoriasDoProntuario(registros.map((r) => r.categoriaInformacao).filter((c): c is string => Boolean(c))),
    [],
  )
  const [usados, setUsados] = useState<ReadonlySet<string>>(new Set())
  const [encerrando, setEncerrando] = useState(false)
  const encerramento = useEnvio()
  const { avisar } = useToast()
  const navegar = useNavigate()
  const aoMudarOrigem = useCallback((ids: ReadonlySet<string>) => setUsados(ids), [])

  const andamento = emAndamento.dados?.find((a) => a.atendimentoId === atendimentoId)
  const naFila = fila.dados?.content.find((p) => p.atendimentoId === atendimentoId)
  const cabecalho: Cabecalho | undefined = andamento
    ? { paciente: andamento.paciente, cor: andamento.corConfirmada, motivo: andamento.motivo, chegadaEm: andamento.chegadaEm, inicioClinicoEm: andamento.inicioClinicoEm }
    : naFila
      ? { paciente: naFila.pacienteNome, cor: naFila.corConfirmada, chegadaEm: naFila.chegadaEm }
      : undefined
  const carregando = !emAndamento.dados || !fila.dados
  const categorias = [...new Set([CATEGORIA_PADRAO, ...categoriasDoProntuario])]

  async function encerrar() {
    const ok = await encerramento.enviar(() => encerrarAtendimento(atendimentoId))
    if (ok) {
      setEncerrando(false)
      avisar(`Atendimento de ${cabecalho?.paciente ?? 'paciente'} encerrado.`)
      navegar('/atendimentos')
    }
  }

  if (carregando) {
    return (
      <>
        <TituloPagina titulo="Atendimento" trilha="Atendimento" />
        <p role="status" className="text-corpo text-texto-suave">
          Carregando o atendimento…
        </p>
      </>
    )
  }
  if (!cabecalho) {
    return (
      <>
        <TituloPagina titulo="Atendimento" trilha="Atendimento" />
        <Alerta tom="atencao" anunciar={false} titulo="Atendimento não encontrado nesta instituição">
          Ele não está em andamento nem na fila de {instituicao.instituicaoNome}. Pode ter sido encerrado, ou ser de outra
          instituição.
        </Alerta>
        <Link to="/atendimentos" className={VOLTAR}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para os atendimentos
        </Link>
      </>
    )
  }

  return (
    <>
      <Link to="/atendimentos" className={VOLTAR}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar para os atendimentos
      </Link>
      <TituloPagina
        titulo={cabecalho.paciente}
        tituloDaAba={`Atendimento de ${cabecalho.paciente}`}
        trilha="Atendimento"
        acoes={
          <Botao variante="secundario" icone={DoorClosed} onClick={() => setEncerrando(true)}>
            Encerrar atendimento
          </Botao>
        }
      />
      <Painel titulo="Atendimento">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-rotulo font-semibold text-texto-suave uppercase">Classificação de risco</dt>
            <dd className="mt-1">{cabecalho.cor ? <SeloRisco cor={cabecalho.cor} /> : 'Sem classificação confirmada'}</dd>
          </div>
          <div>
            <dt className="text-rotulo font-semibold text-texto-suave uppercase">Chegada</dt>
            <dd className="mt-1 text-corpo text-texto">{formatarDataHora(cabecalho.chegadaEm)}</dd>
          </div>
          <div>
            <dt className="text-rotulo font-semibold text-texto-suave uppercase">Em atendimento desde</dt>
            <dd className="mt-1 text-corpo text-texto">{cabecalho.inicioClinicoEm ? formatarDataHora(cabecalho.inicioClinicoEm) : 'Começa no primeiro registro'}</dd>
          </div>
          {cabecalho.motivo && (
            <div>
              <dt className="text-rotulo font-semibold text-texto-suave uppercase">Motivo</dt>
              <dd className="mt-1 text-corpo text-texto">{cabecalho.motivo}</dd>
            </div>
          )}
        </dl>
      </Painel>
      <ResumoPorIA atendimentoId={atendimentoId} aoMudarOrigem={aoMudarOrigem} />
      <Painel titulo="Prontuário" subtitulo="O que esta instituição pode ver do histórico do paciente na rede, do mais recente para o mais antigo.">
        <HistoricoNoAtendimento
          atendimentoId={atendimentoId}
          versao={versao}
          destacados={usados}
          aoCarregar={aoCarregarProntuario}
          semHistorico="Nenhum registro na rede para este paciente, ou nenhum compartilhado com esta instituição. O atendimento segue normalmente."
        />
      </Painel>
      <NovoRegistro
        atendimentoId={atendimentoId}
        categorias={categorias}
        aoRegistrar={() => {
          avisar('Registro salvo no prontuário.')
          setVersao((v) => v + 1)
          emAndamento.recarregar()
        }}
      />
      <DialogoConfirmacao
        aberto={encerrando}
        titulo="Encerrar o atendimento?"
        mensagem={
          <p>
            Depois de encerrado, não dá para registrar nem pedir acesso de emergência neste atendimento. O prontuário continua com
            tudo o que foi registrado.
          </p>
        }
        rotuloConfirmar="Encerrar atendimento"
        enviando={encerramento.enviando}
        erro={encerramento.erro}
        aoConfirmar={encerrar}
        aoCancelar={() => {
          setEncerrando(false)
          encerramento.limparErro()
        }}
      />
    </>
  )
}
