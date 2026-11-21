import { CheckCircle2, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ErroApi, ErroDeConexao } from '@/api/cliente'
import { consultarResumo, pedirResumo, validarResumo } from '@/api/atendimento'
import type { ResumoIA } from '@/api/tipos'
import { useEnvio } from '@/api/useEnvio'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { AvisoIA } from '@/componentes/AvisoIA'
import { Botao } from '@/componentes/Botao'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { TextoDaIA } from '@/componentes/TextoDaIA'
import { consultaDoResumo } from '@/paginas/medico/consultaDoResumo'
import { formatarDataHora } from '@/util/datas'


/**
 * Resumo do histórico por IA (RF-004): sempre identificado como gerado por IA, com os registros de origem marcados no
 * prontuário. A falha da IA não impede ler o prontuário original, que fica em outro painel (critério do FE-07).
 */
/** Consultas seguidas que podem falhar antes de a tela desistir de acompanhar o resumo. */
const MAXIMO_DE_FALHAS = 3

export function ResumoPorIA({ atendimentoId, aoMudarOrigem }: { atendimentoId: string; aoMudarOrigem: (ids: ReadonlySet<string>) => void }) {
  const [resumo, setResumo] = useState<ResumoIA | null>(null)
  const [erroDoPedido, setErroDoPedido] = useState<{ texto: string; tom: 'info' | 'atencao' }>()
  const [pedindo, setPedindo] = useState(false)
  const validacao = useEnvio()
  const montado = useRef(true)
  /** Falhas seguidas ao consultar: depois de algumas, para e mostra o erro, em vez de "gerando" para sempre. */
  const falhasSeguidas = useRef(0)
  // Liga ao montar e desliga ao desmontar: o StrictMode monta, desmonta e monta de novo.
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  // Enquanto SOLICITADO, consulta de novo até a IA terminar (GERADO) ou falhar (FALHOU).
  useEffect(() => {
    if (resumo?.status !== 'SOLICITADO') return
    const controle = new AbortController()
    const id = window.setTimeout(async () => {
      try {
        const atual = await consultarResumo(resumo.id, controle.signal)
        falhasSeguidas.current = 0
        if (!controle.signal.aborted) setResumo(atual)
      } catch (falha) {
        if (controle.signal.aborted || (falha instanceof DOMException && falha.name === 'AbortError')) return
        falhasSeguidas.current += 1
        if (falhasSeguidas.current >= MAXIMO_DE_FALHAS) {
          falhasSeguidas.current = 0
          setResumo(null)
          const detalhe = falha instanceof Error ? ` (${falha.message})` : ''
          setErroDoPedido({ texto: `Não foi possível acompanhar o resumo${detalhe}. O prontuário abaixo continua disponível.`, tom: 'atencao' })
          return
        }
        // Tenta de novo no próximo intervalo, com uma cópia nova do mesmo estado.
        setResumo((r) => (r ? { ...r } : r))
      }
    }, consultaDoResumo.intervaloMs)
    return () => {
      window.clearTimeout(id)
      controle.abort()
    }
  }, [resumo])

  useEffect(() => {
    aoMudarOrigem(new Set(resumo?.texto ? resumo.registrosDeOrigem : []))
  }, [resumo, aoMudarOrigem])

  async function pedir() {
    setPedindo(true)
    setErroDoPedido(undefined)
    validacao.limparErro()
    try {
      const novo = await pedirResumo(atendimentoId)
      if (montado.current) setResumo(novo)
    } catch (falha) {
      if (!montado.current) return
      if (falha instanceof ErroDeConexao || (falha instanceof ErroApi && falha.status === 503)) {
        setErroDoPedido({ texto: 'A IA está indisponível ou ocupada agora. O prontuário abaixo continua disponível; tente o resumo depois.', tom: 'atencao' })
      } else if (falha instanceof ErroApi && falha.status === 422) {
        setErroDoPedido({ texto: falha.message, tom: 'info' })
      } else if (falha instanceof ErroApi && falha.status !== 401) {
        setErroDoPedido({ texto: falha.message, tom: 'atencao' })
      }
    } finally {
      if (montado.current) setPedindo(false)
    }
  }

  async function validar() {
    if (!resumo) return
    let validado: ResumoIA | undefined
    const ok = await validacao.enviar(async () => {
      validado = await validarResumo(resumo.id)
    })
    if (ok && validado) setResumo(validado)
  }

  const botaoPedir = (rotulo: string) => (
    <Botao variante={resumo ? 'secundario' : 'primario'} icone={Sparkles} onClick={pedir} carregando={pedindo} textoCarregando="Pedindo…">
      {rotulo}
    </Botao>
  )

  return (
    <Painel titulo="Resumo do histórico por IA" subtitulo="Um apoio para a leitura. O prontuário original está logo abaixo, sempre.">
      {/* Um estado por vez (sem grade com espaço entre filhos): as regiões de aviso vazias não abrem espaço. */}
      <div>
        {!resumo && !erroDoPedido && <div>{botaoPedir('Gerar resumo do histórico')}</div>}
        <RegiaoDeAlerta>
          {erroDoPedido && (
            <Alerta tom={erroDoPedido.tom} anunciar={false} titulo={erroDoPedido.tom === 'info' ? 'Sem resumo' : 'O resumo não foi pedido'} acao={botaoPedir('Tentar de novo')}>
              {erroDoPedido.texto}
            </Alerta>
          )}
        </RegiaoDeAlerta>
        {resumo?.status === 'SOLICITADO' && (
          <p role="status" className="text-corpo text-texto-suave">
            A IA está gerando o resumo. Enquanto isso, o prontuário abaixo já está disponível.
          </p>
        )}
        {resumo?.status === 'FALHOU' && (
          <Alerta tom="atencao" titulo="A IA não gerou o resumo" acao={botaoPedir('Pedir novo resumo')}>
            {resumo.aviso}
          </Alerta>
        )}
        {(resumo?.status === 'GERADO' || resumo?.status === 'VALIDADO') && !resumo.texto && (
          <Alerta tom="atencao" titulo="Resumo oculto" acao={botaoPedir('Gerar novo resumo')}>
            {resumo.aviso}
          </Alerta>
        )}
        {(resumo?.status === 'GERADO' || resumo?.status === 'VALIDADO') && resumo.texto && (
          <AvisoIA
            aviso={resumo.aviso}
            metadado={[resumo.geradoEm && `Gerado em ${formatarDataHora(resumo.geradoEm)}`, resumo.modeloVersao && `modelo ${resumo.modeloVersao}`].filter(Boolean).join(' · ')}
          >
            <TextoDaIA texto={resumo.texto} />
            <p className="mt-3 text-texto-suave">
              {resumo.registrosDeOrigem.length === 1
                ? 'Usou 1 registro do prontuário, marcado abaixo como "Usado no resumo".'
                : `Usou ${resumo.registrosDeOrigem.length} registros do prontuário, marcados abaixo como "Usado no resumo".`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {resumo.status === 'VALIDADO' ? (
                <Etiqueta tom="sucesso" icone={CheckCircle2} texto="Validado pelo médico" />
              ) : (
                <Botao icone={CheckCircle2} onClick={validar} carregando={validacao.enviando} textoCarregando="Validando…">
                  Validar resumo
                </Botao>
              )}
              {botaoPedir('Gerar novo resumo')}
            </div>
          </AvisoIA>
        )}
        <RegiaoDeAlerta>
          {validacao.erro && (
            <div className="mt-4">
              <Alerta tom="erro" anunciar={false} titulo="O resumo não foi validado">
                {validacao.erro}
              </Alerta>
            </div>
          )}
        </RegiaoDeAlerta>
      </div>
    </Painel>
  )
}
