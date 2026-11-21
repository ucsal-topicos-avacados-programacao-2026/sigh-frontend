import { useEffect, useState, type FormEvent } from 'react'
import { registrarAnalise } from '@/api/auditoria'
import { NOME_DO_PERFIL, type ConclusaoAnalise, type RegistroAuditoria, type TipoAnalise } from '@/api/tipos'
import { useEnvio } from '@/api/useEnvio'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { AreaDeTexto, GrupoDeOpcoes, Selecao } from '@/componentes/Campo'
import { Dialogo } from '@/componentes/Dialogo'
import { CONCLUSAO, NOME_DO_TIPO_DE_ANALISE, codigoDoRegistro } from '@/paginas/auditor/textos'
import { formatarDataHora } from '@/util/datas'

const TIPOS = [
  { valor: 'PARECER', rotulo: NOME_DO_TIPO_DE_ANALISE.PARECER, descricao: 'A sua avaliação sobre a conformidade deste acesso.' },
  { valor: 'ALERTA', rotulo: NOME_DO_TIPO_DE_ANALISE.ALERTA, descricao: 'Marca o acesso para investigação.' },
] as const

interface Propriedades {
  registro: RegistroAuditoria | null
  aoFechar: () => void
  aoRegistrar: () => void
}

export function DialogoDeAnalise({ registro, aoFechar, aoRegistrar }: Propriedades) {
  const [enviando, setEnviando] = useState(false)
  return (
    <Dialogo
      aberto={registro !== null}
      titulo="Registrar análise"
      descricao="A análise fica registrada junto do acesso. O registro do acesso não é alterado."
      aoFechar={aoFechar}
      bloqueado={enviando}
    >
      {registro && (
        <Formulario key={registro.id} registro={registro} aoCancelar={aoFechar} aoRegistrar={aoRegistrar} aoMudarEnvio={setEnviando} />
      )}
    </Dialogo>
  )
}

interface PropriedadesFormulario {
  registro: RegistroAuditoria
  aoCancelar: () => void
  aoRegistrar: () => void
  aoMudarEnvio: (enviando: boolean) => void
}

function Formulario({ registro, aoCancelar, aoRegistrar, aoMudarEnvio }: PropriedadesFormulario) {
  const [tipo, setTipo] = useState<TipoAnalise>(registro.emergencia ? 'PARECER' : 'ALERTA')
  const [conclusao, setConclusao] = useState<ConclusaoAnalise>('PENDENTE')
  const [descricao, setDescricao] = useState('')
  const [erroDescricao, setErroDescricao] = useState<string>()
  const envio = useEnvio()
  useEffect(() => {
    aoMudarEnvio(envio.enviando)
  }, [envio.enviando, aoMudarEnvio])
  useEffect(() => () => aoMudarEnvio(false), [aoMudarEnvio])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!descricao.trim()) {
      setErroDescricao('Descreva a análise.')
      return
    }
    const ok = await envio.enviar(() => registrarAnalise(registro.id, { tipo, conclusao, descricao: descricao.trim() }))
    if (ok) aoRegistrar()
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <dl className="grid gap-x-4 gap-y-2 rounded-controle bg-superficie-suave p-4 text-corpo sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-texto-suave">Acesso</dt>
        <dd className="text-texto tabular-nums">
          {codigoDoRegistro(registro.id)} · {formatarDataHora(registro.ocorridoEm)}
        </dd>
        <dt className="text-texto-suave">Profissional</dt>
        <dd className="text-texto">
          {registro.profissional} ({NOME_DO_PERFIL[registro.perfil]})
        </dd>
        <dt className="text-texto-suave">Instituição</dt>
        <dd className="text-texto">{registro.instituicao ?? '—'}</dd>
        <dt className="text-texto-suave">Finalidade</dt>
        <dd className="text-texto">{registro.finalidade}</dd>
        {registro.justificativa && (
          <>
            <dt className="text-texto-suave">Justificativa</dt>
            <dd className="text-texto whitespace-pre-line">{registro.justificativa}</dd>
          </>
        )}
      </dl>
      <GrupoDeOpcoes legenda="Tipo" nome="tipo-de-analise" opcoes={TIPOS} valor={tipo} aoMudar={setTipo} />
      <Selecao
        rotulo="Conclusão"
        ajuda={registro.emergencia ? 'A emergência sai da fila de pendentes com uma conclusão diferente de "Pendente".' : undefined}
        value={conclusao}
        onChange={(e) => setConclusao(e.target.value as ConclusaoAnalise)}
      >
        {(Object.keys(CONCLUSAO) as ConclusaoAnalise[]).map((c) => (
          <option key={c} value={c}>
            {CONCLUSAO[c].texto}
          </option>
        ))}
      </Selecao>
      <AreaDeTexto
        rotulo="Descrição"
        value={descricao}
        onChange={(e) => {
          setDescricao(e.target.value)
          setErroDescricao(undefined)
        }}
        rows={4}
        erro={erroDescricao}
        required
      />
      <RegiaoDeAlerta>
        {envio.erro && (
          <Alerta tom="erro" anunciar={false} titulo="A análise não foi registrada">
            {envio.erro}
          </Alerta>
        )}
      </RegiaoDeAlerta>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="secundario" onClick={aoCancelar} disabled={envio.enviando}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={envio.enviando} textoCarregando="Registrando…">
          Registrar análise
        </Botao>
      </div>
    </form>
  )
}
