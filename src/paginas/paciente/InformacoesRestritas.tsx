import { Lock } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { encerrarRestricao, restringir } from '@/api/paciente'
import type { PacienteGerenciado, RegistroDoHistorico, Restricao } from '@/api/tipos'
import type { Consulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { CampoTexto } from '@/componentes/Campo'
import { DialogoConfirmacao } from '@/componentes/DialogoConfirmacao'
import { Painel } from '@/componentes/Painel'
import { useToast } from '@/componentes/Toast'
import { EFEITO_DA_RESTRICAO, EFEITO_DO_ENCERRAMENTO, descreverAlvo } from '@/paginas/paciente/textos'
import { formatarDataHora } from '@/util/datas'

const LIMITE_CATEGORIA = 50

interface Propriedades {
  paciente: PacienteGerenciado
  historico: RegistroDoHistorico[] | undefined
  restricoes: Consulta<Restricao[]>
  aoMudar: () => void
}

export function InformacoesRestritas({ paciente, historico, restricoes, aoMudar }: Propriedades) {
  const listaId = useId()
  const [categoria, setCategoria] = useState('')
  const [erroCategoria, setErroCategoria] = useState<string>()
  const [aEncerrar, setAEncerrar] = useState<Restricao | null>(null)
  const restricao = useEnvio()
  const encerramento = useEnvio()
  const { avisar } = useToast()

  const sugestoes = useMemo(
    () => [...new Set((historico ?? []).map((r) => r.categoriaInformacao).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [historico],
  )
  const vigentes = restricoes.dados?.filter((r) => r.vigente) ?? []
  const encerradas = restricoes.dados?.filter((r) => !r.vigente) ?? []

  async function restringirCategoria(evento: FormEvent) {
    evento.preventDefault()
    const texto = categoria.trim()
    if (!texto) {
      setErroCategoria('Informe a categoria que quer restringir.')
      return
    }
    const ok = await restricao.enviar(() => restringir(paciente.pacienteId, { categoria: texto }))
    if (ok) {
      setCategoria('')
      avisar(`Categoria "${texto}" restrita.`)
      aoMudar()
    }
  }

  async function confirmarEncerramento() {
    if (!aEncerrar) return
    const ok = await encerramento.enviar(() => encerrarRestricao(paciente.pacienteId, aEncerrar.id))
    if (ok) {
      setAEncerrar(null)
      avisar('Restrição encerrada.')
      aoMudar()
    }
  }

  return (
    <Painel titulo="Informações restritas" subtitulo={EFEITO_DA_RESTRICAO} carregando={restricoes.carregando}>
      <form onSubmit={restringirCategoria} noValidate className="flex flex-col items-start gap-3">
        <div className="w-full sm:w-96">
          <CampoTexto
            rotulo="Restringir uma categoria"
            ajuda="Por exemplo, Saúde mental. Para restringir um registro só, use o Meu prontuário."
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value)
              setErroCategoria(undefined)
              restricao.limparErro()
            }}
            list={sugestoes.length ? listaId : undefined}
            maxLength={LIMITE_CATEGORIA}
            autoComplete="off"
            erro={erroCategoria}
          />
          {sugestoes.length > 0 && (
            <datalist id={listaId}>
              {sugestoes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </datalist>
          )}
        </div>
        <Botao type="submit" icone={Lock} carregando={restricao.enviando} textoCarregando="Restringindo…" className="w-full sm:w-auto">
          Restringir
        </Botao>
      </form>
      <RegiaoDeAlerta>
        {restricao.erro && (
          <div className="mt-3">
            <Alerta tom="erro" anunciar={false} titulo="A restrição não foi feita">
              {restricao.erro}
            </Alerta>
          </div>
        )}
      </RegiaoDeAlerta>

      <h3 className="mt-6 text-corpo font-semibold text-texto-forte">Em vigor</h3>
      {restricoes.erro ? (
        <div className="mt-2">
          <Alerta tom="erro" titulo="Não foi possível carregar as restrições" acao={<Botao variante="secundario" onClick={restricoes.recarregar}>Tentar de novo</Botao>}>
            {restricoes.erro}
          </Alerta>
        </div>
      ) : !restricoes.dados ? (
        <p role="status" className="mt-2 text-corpo text-texto-suave">
          Carregando as restrições…
        </p>
      ) : vigentes.length === 0 ? (
        <p className="mt-2 text-corpo text-texto-suave">Nenhuma informação restrita.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {vigentes.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-controle border border-borda px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-corpo font-medium text-texto">{descreverAlvo(r, historico)}</p>
                <p className="text-corpo text-texto-suave">
                  Desde {formatarDataHora(r.inicioEm)}, por {r.definidaPor}
                </p>
              </div>
              <Botao variante="secundario" onClick={() => setAEncerrar(r)} aria-label={`Encerrar restrição: ${descreverAlvo(r, historico)}`}>
                Encerrar restrição
              </Botao>
            </li>
          ))}
        </ul>
      )}

      {encerradas.length > 0 && (
        <details className="mt-4 rounded-controle border border-borda-divisoria px-4 py-3">
          <summary className="cursor-pointer text-corpo font-semibold text-texto-forte">Restrições encerradas ({encerradas.length})</summary>
          <ul className="mt-3 grid gap-2">
            {encerradas.map((r) => (
              <li key={r.id} className="text-corpo text-texto">
                {descreverAlvo(r, historico)}{' '}
                <span className="text-texto-suave">
                  — de {formatarDataHora(r.inicioEm)} até {r.fimEm ? formatarDataHora(r.fimEm) : '—'}
                  {r.encerradaPor && `, encerrada por ${r.encerradaPor}`}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <DialogoConfirmacao
        aberto={aEncerrar !== null}
        titulo="Encerrar esta restrição?"
        mensagem={
          <>
            <p className="font-semibold">{aEncerrar ? descreverAlvo(aEncerrar, historico) : ''}</p>
            <p className="mt-2">{EFEITO_DO_ENCERRAMENTO}</p>
          </>
        }
        rotuloConfirmar="Encerrar restrição"
        enviando={encerramento.enviando}
        erro={encerramento.erro}
        aoConfirmar={confirmarEncerramento}
        aoCancelar={() => {
          setAEncerrar(null)
          encerramento.limparErro()
        }}
      />
    </Painel>
  )
}
