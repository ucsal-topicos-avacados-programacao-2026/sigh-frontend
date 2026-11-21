import { ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { autorizar, instituicoesDaRede, revogarAutorizacao } from '@/api/paciente'
import type { AutorizacaoAdicional, DecisaoConsentimento, PacienteGerenciado, RegistroDoHistorico, Restricao } from '@/api/tipos'
import { useConsulta, type Consulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { Selecao } from '@/componentes/Campo'
import { DialogoConfirmacao } from '@/componentes/DialogoConfirmacao'
import { Painel } from '@/componentes/Painel'
import { useToast } from '@/componentes/Toast'
import { descreverAlvo } from '@/paginas/paciente/textos'
import { formatarDataHora } from '@/util/datas'

interface Propriedades {
  paciente: PacienteGerenciado
  historico: RegistroDoHistorico[] | undefined
  restricoes: Restricao[] | undefined
  autorizacoes: Consulta<AutorizacaoAdicional[]>
  /** Decisão vigente do compartilhamento amplo; null: nunca se manifestou; undefined: ainda carregando. */
  compartilhamento: DecisaoConsentimento | null | undefined
}

/**
 * Onde a autorização adicional faz efeito (RegistroClinicoRepository.historicoVisivel): só onde o compartilhamento
 * vale (autorizado; ou, revogado, nas instituições que já tinham atendido) ou na instituição que fez o registro.
 */
function avisoDeDependencia(compartilhamento: DecisaoConsentimento | null | undefined) {
  if (compartilhamento === undefined || compartilhamento === 'AUTORIZADO') return null
  const agora = compartilhamento === 'REVOGADO' ? 'Você revogou o compartilhamento na rede.' : 'O compartilhamento na rede não está autorizado.'
  const quem =
    compartilhamento === 'REVOGADO'
      ? 'para a instituição que fez o registro e para as que já tinham atendido você antes da revogação'
      : 'para a instituição que fez o registro'
  return `${agora} Por isso, uma autorização adicional só faz efeito ${quem}. Para liberar a outras instituições, autorize também o compartilhamento, acima.`
}

/** Autorização adicional explícita (RF-009): libera uma informação restrita para uma instituição. */
export function AutorizacoesAdicionais({ paciente, historico, restricoes, autorizacoes, compartilhamento }: Propriedades) {
  const instituicoes = useConsulta((sinal) => instituicoesDaRede(sinal), [])
  const [instituicaoId, setInstituicaoId] = useState('')
  const [alvoId, setAlvoId] = useState('')
  const [erros, setErros] = useState<{ instituicao?: string; alvo?: string }>({})
  const [aRevogar, setARevogar] = useState<AutorizacaoAdicional | null>(null)
  const concessao = useEnvio()
  const revogacao = useEnvio()
  const { avisar } = useToast()

  const restritas = restricoes?.filter((r) => r.vigente) ?? []
  const vigentes = autorizacoes.dados?.filter((a) => a.decisao === 'AUTORIZADO') ?? []
  const dependencia = avisoDeDependencia(compartilhamento)

  async function conceder(evento: FormEvent) {
    evento.preventDefault()
    const alvo = restritas.find((r) => r.id === alvoId)
    const novos = { instituicao: instituicaoId ? undefined : 'Escolha a instituição.', alvo: alvo ? undefined : 'Escolha o que liberar.' }
    setErros(novos)
    if (!alvo || !instituicaoId) return
    const ok = await concessao.enviar(() =>
      autorizar(paciente.pacienteId, instituicaoId, alvo.categoria ? { categoria: alvo.categoria } : { registroId: alvo.registroId ?? '' }),
    )
    if (ok) {
      setInstituicaoId('')
      setAlvoId('')
      avisar('Autorização concedida.')
      autorizacoes.recarregar()
    }
  }

  async function confirmarRevogacao() {
    if (!aRevogar) return
    const ok = await revogacao.enviar(() => revogarAutorizacao(paciente.pacienteId, aRevogar.id))
    if (ok) {
      setARevogar(null)
      avisar('Autorização revogada.')
      autorizacoes.recarregar()
    }
  }

  return (
    <Painel
      titulo="Autorizações adicionais"
      subtitulo="Libere uma informação restrita para uma instituição específica. As outras continuam sem ver."
      carregando={autorizacoes.carregando}
    >
      {restricoes && restritas.length === 0 ? (
        <Alerta tom="info" anunciar={false}>
          Você não tem informações restritas. A autorização adicional serve para liberar uma informação restrita para uma
          instituição.
        </Alerta>
      ) : (
        <>
          {dependencia && (
            <div className="mb-4">
              <Alerta tom="atencao" anunciar={false} titulo="Depende do compartilhamento na rede">
                {dependencia}
              </Alerta>
            </div>
          )}
          <form onSubmit={conceder} noValidate className="grid gap-4 sm:grid-cols-2">
            <Selecao
              rotulo="Instituição"
              value={instituicaoId}
              onChange={(e) => {
                setInstituicaoId(e.target.value)
                setErros((atuais) => ({ ...atuais, instituicao: undefined }))
                concessao.limparErro()
              }}
              erro={erros.instituicao ?? (instituicoes.erro ? `Não foi possível carregar as instituições: ${instituicoes.erro}` : undefined)}
              disabled={!instituicoes.dados}
            >
              <option value="">{instituicoes.dados ? 'Escolha' : 'Carregando…'}</option>
              {instituicoes.dados?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </Selecao>
            <Selecao
              rotulo="O que liberar"
              value={alvoId}
              onChange={(e) => {
                setAlvoId(e.target.value)
                setErros((atuais) => ({ ...atuais, alvo: undefined }))
                concessao.limparErro()
              }}
              erro={erros.alvo}
            >
              <option value="">Escolha</option>
              {restritas.map((r) => (
                <option key={r.id} value={r.id}>
                  {descreverAlvo(r, historico)}
                </option>
              ))}
            </Selecao>
            <div className="sm:col-span-2">
              <Botao type="submit" icone={ShieldCheck} carregando={concessao.enviando} textoCarregando="Autorizando…" className="w-full sm:w-auto">
                Autorizar
              </Botao>
            </div>
          </form>
          <RegiaoDeAlerta>
            {concessao.erro && (
              <div className="mt-3">
                <Alerta tom="erro" anunciar={false} titulo="A autorização não foi concedida">
                  {concessao.erro}
                </Alerta>
              </div>
            )}
          </RegiaoDeAlerta>
        </>
      )}

      <h3 className="mt-6 text-corpo font-semibold text-texto-forte">Em vigor</h3>
      {autorizacoes.erro ? (
        <div className="mt-2">
          <Alerta tom="erro" titulo="Não foi possível carregar as autorizações" acao={<Botao variante="secundario" onClick={autorizacoes.recarregar}>Tentar de novo</Botao>}>
            {autorizacoes.erro}
          </Alerta>
        </div>
      ) : !autorizacoes.dados ? (
        <p role="status" className="mt-2 text-corpo text-texto-suave">
          Carregando as autorizações…
        </p>
      ) : vigentes.length === 0 ? (
        <p className="mt-2 text-corpo text-texto-suave">Nenhuma autorização adicional em vigor.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {vigentes.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 rounded-controle border border-borda px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-corpo font-medium text-texto">{a.instituicao}</p>
                <p className="text-corpo text-texto-suave">
                  {descreverAlvo(a, historico)} · desde {formatarDataHora(a.vigenteDesde)}
                </p>
              </div>
              <Botao variante="secundario" onClick={() => setARevogar(a)} aria-label={`Revogar autorização de ${a.instituicao}: ${descreverAlvo(a, historico)}`}>
                Revogar
              </Botao>
            </li>
          ))}
        </ul>
      )}

      <DialogoConfirmacao
        aberto={aRevogar !== null}
        titulo="Revogar esta autorização?"
        mensagem={
          aRevogar && (
            <p>
              {aRevogar.instituicao} deixa de ver essa informação restrita ({descreverAlvo(aRevogar, historico).toLowerCase()}), a não ser
              numa emergência.
            </p>
          )
        }
        rotuloConfirmar="Revogar"
        perigo
        enviando={revogacao.enviando}
        erro={revogacao.erro}
        aoConfirmar={confirmarRevogacao}
        aoCancelar={() => {
          setARevogar(null)
          revogacao.limparErro()
        }}
      />
    </Painel>
  )
}
