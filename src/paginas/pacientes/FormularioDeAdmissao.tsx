import { DoorOpen, UserPlus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { admitirPaciente } from '@/api/pacientes'
import { ErroApi } from '@/api/cliente'
import type { AdmissaoResposta, ManifestacaoInicial } from '@/api/tipos'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { AreaDeTexto, CampoTexto, GrupoDeOpcoes, type OpcaoDoGrupo } from '@/componentes/Campo'
import { hojeIso } from '@/util/datas'
import { mensagemDoErro } from '@/paginas/pacientes/mensagens'

const LIMITE_NOME = 150
const LIMITE_MOTIVO = 2000

type Consentimento = ManifestacaoInicial | 'SEM_MANIFESTACAO'

/** Textos conferidos com ConsentimentoService.podeCompartilharCom (RN-007) e a exceção de emergência (RN-003). */
const OPCOES_DE_CONSENTIMENTO: readonly OpcaoDoGrupo<Consentimento>[] = [
  {
    valor: 'AUTORIZADO',
    rotulo: 'Autoriza o compartilhamento na rede',
    descricao: 'Profissionais das outras instituições da rede podem consultar o histórico dele nos atendimentos.',
  },
  {
    valor: 'NEGADO',
    rotulo: 'Não autoriza',
    descricao: 'O histórico não é compartilhado com as outras instituições, a não ser em emergência.',
  },
  {
    valor: 'SEM_MANIFESTACAO',
    rotulo: 'Não se manifestou agora',
    descricao: 'Vale como não autorizado. O atendimento segue normalmente.',
  },
]

type Campo = 'nome' | 'dataNascimento' | 'motivo'
type Erros = Partial<Record<Campo, string>>

interface PropriedadesFormulario {
  /** existente: só o motivo; novo: cadastro completo com o consentimento inicial (RF-002). */
  modo: 'existente' | 'novo'
  cpf: string
  instituicaoId: string
  aoConcluir: (resposta: AdmissaoResposta, nome: string | null) => void
  /** Avisa a tela enquanto a admissão é enviada, para travar a troca de CPF. */
  aoMudarEnvio?: (enviando: boolean) => void
}

function validar(modo: PropriedadesFormulario['modo'], nome: string, dataNascimento: string, motivo: string): Erros {
  const erros: Erros = {}
  if (modo === 'novo') {
    if (!nome.trim()) erros.nome = 'Informe o nome completo.'
    if (!dataNascimento) erros.dataNascimento = 'Informe a data de nascimento.'
    else if (dataNascimento > hojeIso()) erros.dataNascimento = 'A data de nascimento não pode estar no futuro.'
  }
  if (!motivo.trim()) erros.motivo = 'Informe o motivo do atendimento.'
  return erros
}

export function FormularioDeAdmissao({ modo, cpf, instituicaoId, aoConcluir, aoMudarEnvio }: PropriedadesFormulario) {
  const [nome, setNome] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [consentimento, setConsentimento] = useState<Consentimento>('SEM_MANIFESTACAO')
  const [motivo, setMotivo] = useState('')
  const [erros, setErros] = useState<Erros>({})
  const [erroGeral, setErroGeral] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const campoNome = useRef<HTMLInputElement>(null)
  const campoData = useRef<HTMLInputElement>(null)
  const campoMotivo = useRef<HTMLTextAreaElement>(null)

  /** Leva o foco ao primeiro campo com erro, na ordem da tela. */
  function focarPrimeiroErro(novos: Erros) {
    if (novos.nome) campoNome.current?.focus()
    else if (novos.dataNascimento) campoData.current?.focus()
    else if (novos.motivo) campoMotivo.current?.focus()
  }

  function limpar(campo: Campo) {
    setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setErroGeral(undefined)
    const novos = validar(modo, nome, dataNascimento, motivo)
    setErros(novos)
    if (Object.keys(novos).length > 0) {
      focarPrimeiroErro(novos)
      return
    }
    setEnviando(true)
    aoMudarEnvio?.(true)
    try {
      const resposta = await admitirPaciente({
        cpf,
        instituicaoId,
        motivo: motivo.trim(),
        ...(modo === 'novo' && {
          nome: nome.trim(),
          dataNascimento,
          ...(consentimento !== 'SEM_MANIFESTACAO' && { consentimentoInicial: consentimento }),
        }),
      })
      aoMudarEnvio?.(false)
      aoConcluir(resposta, modo === 'novo' ? nome.trim() : null)
    } catch (falha) {
      aoMudarEnvio?.(false)
      const daApi: Erros = {}
      if (falha instanceof ErroApi) {
        for (const campo of ['nome', 'dataNascimento', 'motivo'] as const) {
          const mensagem = falha.campos[campo]
          if (mensagem) daApi[campo] = mensagem
        }
      }
      if (Object.keys(daApi).length > 0) {
        setErros(daApi)
        focarPrimeiroErro(daApi)
      } else {
        setErroGeral(falha instanceof ErroApi && falha.campos.cpf ? `CPF: ${falha.campos.cpf}. Busque de novo.` : mensagemDoErro(falha))
      }
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      {modo === 'novo' && (
        <>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
            <CampoTexto
              ref={campoNome}
              rotulo="Nome completo"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value)
                limpar('nome')
              }}
              maxLength={LIMITE_NOME}
              autoComplete="off"
              erro={erros.nome}
              required
            />
            <CampoTexto
              ref={campoData}
              rotulo="Data de nascimento"
              type="date"
              value={dataNascimento}
              onChange={(e) => {
                setDataNascimento(e.target.value)
                limpar('dataNascimento')
              }}
              max={hojeIso()}
              erro={erros.dataNascimento}
              required
            />
          </div>
          <GrupoDeOpcoes
            legenda="Consentimento para compartilhar o histórico na rede"
            ajuda="Pergunte ao paciente ou ao responsável."
            nome="consentimento-inicial"
            opcoes={OPCOES_DE_CONSENTIMENTO}
            valor={consentimento}
            aoMudar={setConsentimento}
          />
        </>
      )}
      <AreaDeTexto
        ref={campoMotivo}
        rotulo="Motivo do atendimento"
        ajuda="O que trouxe o paciente, nas palavras dele. A classificação de risco é feita na triagem."
        value={motivo}
        onChange={(e) => {
          setMotivo(e.target.value)
          limpar('motivo')
        }}
        maxLength={LIMITE_MOTIVO}
        erro={erros.motivo}
        required
      />
      <RegiaoDeAlerta>{erroGeral && <Alerta tom="erro" anunciar={false} titulo="O atendimento não foi aberto">{erroGeral}</Alerta>}</RegiaoDeAlerta>
      <div>
        <Botao
          type="submit"
          icone={modo === 'novo' ? UserPlus : DoorOpen}
          carregando={enviando}
          textoCarregando={modo === 'novo' ? 'Cadastrando…' : 'Abrindo…'}
          className="w-full sm:w-auto"
        >
          {modo === 'novo' ? 'Cadastrar e abrir atendimento' : 'Abrir atendimento'}
        </Botao>
      </div>
    </form>
  )
}
