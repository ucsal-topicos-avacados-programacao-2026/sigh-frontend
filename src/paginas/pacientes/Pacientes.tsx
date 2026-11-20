import { CircleCheck, Search, UserPlus, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { buscarPacientePorCpf } from '@/api/pacientes'
import { ErroApi } from '@/api/cliente'
import type { AdmissaoResposta, PacienteResumo, VinculoAtivo } from '@/api/tipos'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { CampoTexto } from '@/componentes/Campo'
import { Painel } from '@/componentes/Painel'
import { TituloPagina } from '@/componentes/TituloPagina'
import { erroDoCpf, mascararCpf } from '@/paginas/pacientes/cpf'
import { formatarData, idade } from '@/paginas/pacientes/datas'
import { FormularioDeAdmissao } from '@/paginas/pacientes/FormularioDeAdmissao'
import { mensagemDoErro } from '@/paginas/pacientes/mensagens'

/** Onde a recepção está: buscar, abrir atendimento de quem já está na rede, cadastrar ou atendimento aberto. */
type Etapa =
  | { tipo: 'busca' }
  | { tipo: 'encontrado'; cpf: string; paciente: PacienteResumo }
  | { tipo: 'novo'; cpf: string }
  | { tipo: 'concluido'; nome: string | null; resposta: AdmissaoResposta; cadastroTentado: boolean }

/**
 * Tela Pacientes do Administrativo (FE-03): busca o CPF na rede (RF-001), cadastra quem ainda não existe com o
 * consentimento inicial (RF-002) e abre o atendimento, sempre no prontuário único do paciente (RN-004).
 * O CPF fica só no estado da tela: não vai para a URL nem para o armazenamento do navegador.
 */
export function Pacientes() {
  const { instituicaoAtiva } = useSessao()
  if (!instituicaoAtiva) return null
  // Trocar a instituição recomeça a tela: o atendimento sempre é aberto na instituição que está no topo.
  return <RecepcaoDePacientes key={instituicaoAtiva.instituicaoId} instituicao={instituicaoAtiva} />
}

function RecepcaoDePacientes({ instituicao }: { instituicao: VinculoAtivo }) {
  const [cpf, setCpf] = useState('')
  const [erroCpf, setErroCpf] = useState<string>()
  const [erroGeral, setErroGeral] = useState<string>()
  const [buscando, setBuscando] = useState(false)
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'busca' })
  /** Admissão em envio: o CPF fica travado, para a resposta não chegar com outro CPF na tela. */
  const [admitindo, setAdmitindo] = useState(false)
  const campoCpf = useRef<HTMLInputElement>(null)
  const controle = useRef<AbortController | null>(null)

  useEffect(() => () => controle.current?.abort(), [])

  function mudarCpf(texto: string) {
    setCpf(mascararCpf(texto))
    setErroCpf(undefined)
    setErroGeral(undefined)
    // Outro CPF: a busca em andamento e o que foi encontrado ou começado a cadastrar não valem para ele.
    controle.current?.abort()
    controle.current = null
    setBuscando(false)
    if (etapa.tipo === 'encontrado' || etapa.tipo === 'novo') setEtapa({ tipo: 'busca' })
  }

  async function buscar(evento: FormEvent) {
    evento.preventDefault()
    setErroGeral(undefined)
    const erro = erroDoCpf(cpf)
    if (erro) {
      setErroCpf(erro)
      campoCpf.current?.focus()
      return
    }
    controle.current?.abort()
    const atual = new AbortController()
    controle.current = atual
    setBuscando(true)
    try {
      const paciente = await buscarPacientePorCpf(cpf, instituicao.instituicaoId, atual.signal)
      if (atual.signal.aborted) return
      setEtapa({ tipo: 'encontrado', cpf, paciente })
    } catch (falha) {
      if (atual.signal.aborted || (falha instanceof DOMException && falha.name === 'AbortError')) return
      if (falha instanceof ErroApi && falha.status === 404) {
        setEtapa({ tipo: 'novo', cpf })
      } else if (falha instanceof ErroApi && falha.campos.cpf) {
        setErroCpf(falha.campos.cpf)
        campoCpf.current?.focus()
      } else {
        setErroGeral(mensagemDoErro(falha))
      }
    } finally {
      if (controle.current === atual) setBuscando(false)
    }
  }

  function concluir(resposta: AdmissaoResposta, nome: string | null) {
    setEtapa({ tipo: 'concluido', nome, resposta, cadastroTentado: etapa.tipo === 'novo' })
  }

  function recomecar() {
    setCpf('')
    setErroCpf(undefined)
    setErroGeral(undefined)
    setEtapa({ tipo: 'busca' })
    // Depois de pintar: o campo volta a ficar habilitado.
    window.setTimeout(() => campoCpf.current?.focus(), 0)
  }

  const concluido = etapa.tipo === 'concluido'
  const cpfTravado = concluido || admitindo

  return (
    <>
      <TituloPagina
        titulo="Pacientes"
        trilha="Visão geral"
        subtitulo="Busque o paciente pelo CPF antes de cadastrar. Quem já tem prontuário na rede é atendido nele."
      />
      <div className="grid max-w-3xl gap-6">
        <Painel titulo="Buscar paciente na rede" subtitulo={`Atendimento em ${instituicao.instituicaoNome}`}>
          <form onSubmit={buscar} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="sm:w-72">
              <CampoTexto
                ref={campoCpf}
                rotulo="CPF do paciente"
                value={cpf}
                onChange={(e) => mudarCpf(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                maxLength={14}
                erro={erroCpf}
                disabled={cpfTravado}
                required
              />
            </div>
            <Botao type="submit" icone={Search} carregando={buscando} textoCarregando="Buscando…" disabled={cpfTravado} className="sm:mt-[26px]">
              Buscar
            </Botao>
          </form>
          <RegiaoDeAlerta>{erroGeral && <div className="mt-4"><Alerta tom="erro" anunciar={false} titulo="A busca não foi feita">{erroGeral}</Alerta></div>}</RegiaoDeAlerta>
        </Painel>

        {etapa.tipo === 'encontrado' && (
          <PainelDoPaciente paciente={etapa.paciente} cpf={etapa.cpf}>
            <FormularioDeAdmissao
              modo="existente"
              cpf={etapa.cpf}
              instituicaoId={instituicao.instituicaoId}
              aoMudarEnvio={setAdmitindo}
              aoConcluir={(resposta) => concluir(resposta, etapa.paciente.nome)}
            />
          </PainelDoPaciente>
        )}

        {etapa.tipo === 'novo' && (
          <PainelComFoco
            titulo="Cadastrar paciente"
            subtitulo={`O CPF ${etapa.cpf} ainda não tem cadastro na rede. O prontuário criado agora vale para todas as instituições.`}
            icone={UserPlus}
          >
            <FormularioDeAdmissao
              modo="novo"
              cpf={etapa.cpf}
              instituicaoId={instituicao.instituicaoId}
              aoMudarEnvio={setAdmitindo}
              aoConcluir={(resposta, nome) => concluir(resposta, nome)}
            />
          </PainelComFoco>
        )}

        {etapa.tipo === 'concluido' && <AtendimentoAberto etapa={etapa} aoRecomecar={recomecar} />}
      </div>
    </>
  )
}

/** Painel que recebe o foco ao aparecer, para o leitor de tela ler o resultado da busca. */
function PainelComFoco({
  titulo,
  subtitulo,
  icone: Icone,
  children,
}: {
  titulo: string
  subtitulo: string
  icone: typeof UserRound
  children: React.ReactNode
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => tituloRef.current?.focus(), [])
  return (
    <section aria-labelledby="resultado-da-busca" className="rounded-painel border border-borda bg-superficie">
      <div className="flex items-start gap-3 border-b border-borda-divisoria px-4 py-4 sm:px-5">
        <Icone size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-info" />
        <div>
          <h2 id="resultado-da-busca" ref={tituloRef} tabIndex={-1} data-foco-programatico className="text-destaque font-semibold text-texto-forte">
            {titulo}
          </h2>
          <p className="mt-1 text-corpo text-texto-suave">{subtitulo}</p>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function PainelDoPaciente({ paciente, cpf, children }: { paciente: PacienteResumo; cpf: string; children: React.ReactNode }) {
  const anos = idade(paciente.dataNascimento)
  return (
    <PainelComFoco
      titulo="Paciente já cadastrado na rede"
      subtitulo="O atendimento será aberto no prontuário que ele já tem. Cadastro e consentimento não mudam aqui."
      icone={UserRound}
    >
      <dl className="grid gap-4 rounded-controle bg-superficie-suave p-4 sm:grid-cols-3">
        <div>
          <dt className="text-rotulo font-semibold text-texto-suave uppercase">CPF</dt>
          <dd className="mt-1 text-destaque text-texto tabular-nums">{cpf}</dd>
        </div>
        <div>
          <dt className="text-rotulo font-semibold text-texto-suave uppercase">Nome</dt>
          <dd className="mt-1 text-destaque font-semibold text-texto-forte">{paciente.nome}</dd>
        </div>
        <div>
          <dt className="text-rotulo font-semibold text-texto-suave uppercase">Nascimento</dt>
          <dd className="mt-1 text-destaque text-texto">
            {formatarData(paciente.dataNascimento)}
            <span className="text-texto-suave"> · {anos === 1 ? '1 ano' : `${anos} anos`}</span>
          </dd>
        </div>
      </dl>
      <div className="mt-5">{children}</div>
    </PainelComFoco>
  )
}

function AtendimentoAberto({ etapa, aoRecomecar }: { etapa: Extract<Etapa, { tipo: 'concluido' }>; aoRecomecar: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => titulo.current?.focus(), [])
  const { resposta, nome, cadastroTentado } = etapa
  // Outra recepção cadastrou o mesmo CPF enquanto este cadastro era preenchido: a API usou o prontuário existente.
  const cadastroJaExistia = cadastroTentado && !resposta.novoCadastro
  return (
    <section aria-labelledby="atendimento-aberto" className="rounded-painel border border-sucesso-borda bg-superficie">
      <div className="flex items-start gap-3 px-4 py-5 sm:px-5">
        <CircleCheck size={24} aria-hidden="true" className="mt-0.5 shrink-0 text-sucesso" />
        <div className="min-w-0 flex-1">
          <h2 id="atendimento-aberto" ref={titulo} tabIndex={-1} data-foco-programatico className="text-titulo-secao font-semibold text-texto-forte">
            Atendimento aberto
          </h2>
          <p className="mt-1 text-corpo text-texto">
            {cadastroJaExistia || !nome ? 'O paciente' : nome} já pode seguir para a triagem.
            {resposta.novoCadastro && ' O cadastro e o prontuário dele foram criados na rede.'}
          </p>
          {cadastroJaExistia && (
            <div className="mt-4">
              <Alerta tom="atencao" titulo="Este CPF já tinha cadastro na rede">
                Outra recepção cadastrou este CPF enquanto você preenchia. O atendimento foi aberto no prontuário que já
                existia, e o nome, a data de nascimento e o consentimento que você informou não foram usados.
              </Alerta>
            </div>
          )}
          <div className="mt-5">
            <Botao variante="secundario" icone={Search} onClick={aoRecomecar}>
              Atender outro paciente
            </Botao>
          </div>
        </div>
      </div>
    </section>
  )
}
