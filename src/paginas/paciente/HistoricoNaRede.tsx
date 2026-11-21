import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { historico as buscarHistorico, restringir } from '@/api/paciente'
import { NOME_DO_TIPO_DE_REGISTRO, type PacienteGerenciado, type RegistroDoHistorico } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { DialogoConfirmacao } from '@/componentes/DialogoConfirmacao'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { useToast } from '@/componentes/Toast'
import { EFEITO_DA_RESTRICAO, descreverRegistro } from '@/paginas/paciente/textos'
import { formatarDataHora } from '@/util/datas'

export function HistoricoNaRede({ paciente }: { paciente: PacienteGerenciado }) {
  const consulta = useConsulta((sinal) => buscarHistorico(paciente.pacienteId, sinal), [paciente.pacienteId])
  const [aRestringir, setARestringir] = useState<RegistroDoHistorico | null>(null)
  const envio = useEnvio()
  const { avisar } = useToast()

  async function confirmarRestricao() {
    if (!aRestringir) return
    const ok = await envio.enviar(() => restringir(paciente.pacienteId, { registroId: aRestringir.id }))
    if (ok) {
      setARestringir(null)
      avisar('Registro restrito.')
      consulta.recarregar()
    }
  }

  const registros = consulta.dados
  return (
    <Painel
      titulo="Histórico na rede"
      subtitulo="O que as instituições da rede registraram sobre você, do mais recente para o mais antigo."
      carregando={consulta.carregando}
    >
      {consulta.erro ? (
        <Alerta tom="erro" titulo="Não foi possível carregar o histórico" acao={<Botao variante="secundario" onClick={consulta.recarregar}>Tentar de novo</Botao>}>
          {consulta.erro}
        </Alerta>
      ) : !registros ? (
        <p role="status" className="text-corpo text-texto-suave">
          Carregando o histórico…
        </p>
      ) : registros.length === 0 ? (
        <p className="text-corpo text-texto-suave">Ainda não há registros no seu histórico.</p>
      ) : (
        <ol className="grid gap-3">
          {registros.map((registro) => (
            <li key={registro.id}>
              <article aria-labelledby={`registro-${registro.id}`} className="rounded-controle border border-borda p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 id={`registro-${registro.id}`} className="text-destaque font-semibold text-texto-forte">
                      {NOME_DO_TIPO_DE_REGISTRO[registro.tipo]}
                      {registro.codigoCID10 && <span className="font-normal text-texto-suave"> · CID {registro.codigoCID10}</span>}
                    </h3>
                    <p className="mt-0.5 text-corpo text-texto-suave">
                      {formatarDataHora(registro.criadoEm)} · {registro.instituicaoOrigem}
                      {registro.categoriaInformacao && ` · ${registro.categoriaInformacao}`}
                    </p>
                  </div>
                  {registro.restrito && <Etiqueta tom="atencao" icone={Lock} texto="Restrito" />}
                </div>
                <p className="mt-3 text-corpo whitespace-pre-line text-texto">{registro.conteudo}</p>
                <div className="mt-3">
                  {registro.restrito ? (
                    <Link to="/consentimentos" className="text-corpo font-semibold text-link hover:text-link-hover hover:underline">
                      Gerenciar restrições
                    </Link>
                  ) : (
                    <Botao variante="texto" icone={Lock} onClick={() => setARestringir(registro)} aria-describedby={`registro-${registro.id}`}>
                      Restringir este registro
                    </Botao>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
      <DialogoConfirmacao
        aberto={aRestringir !== null}
        titulo="Restringir este registro?"
        mensagem={
          <>
            <p className="font-semibold">{descreverRegistro(aRestringir ?? undefined)}</p>
            <p className="mt-2">{EFEITO_DA_RESTRICAO}</p>
            <p className="mt-2">Você pode desfazer depois, em Consentimentos.</p>
          </>
        }
        rotuloConfirmar="Restringir"
        enviando={envio.enviando}
        erro={envio.erro}
        aoConfirmar={confirmarRestricao}
        aoCancelar={() => {
          setARestringir(null)
          envio.limparErro()
        }}
      />
    </Painel>
  )
}
