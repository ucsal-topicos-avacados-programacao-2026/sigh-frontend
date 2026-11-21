import { useState } from 'react'
import { decidirConsentimento } from '@/api/paciente'
import type { Consentimento, ConsentimentosDoPaciente, DecisaoConsentimento, PacienteGerenciado } from '@/api/tipos'
import type { Consulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { DialogoConfirmacao } from '@/componentes/DialogoConfirmacao'
import { Etiqueta, type TomDaEtiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { useToast } from '@/componentes/Toast'
import { formatarDataHora } from '@/util/datas'

const SITUACAO: Record<DecisaoConsentimento | 'SEM', { texto: string; tom: TomDaEtiqueta }> = {
  AUTORIZADO: { texto: 'Autorizado', tom: 'sucesso' },
  NEGADO: { texto: 'Não autorizado', tom: 'neutro' },
  REVOGADO: { texto: 'Revogado', tom: 'atencao' },
  SEM: { texto: 'Sem decisão', tom: 'neutro' },
}

function efeitoAtual(vigente: Consentimento | null) {
  switch (vigente?.decisao) {
    case 'AUTORIZADO':
      return 'As instituições credenciadas da rede podem consultar o seu histórico quando atendem você. O que você restringiu continua restrito.'
    case 'REVOGADO':
      return `As instituições que já tinham atendido você até ${formatarDataHora(vigente.vigenteDesde)} continuam vendo o seu histórico. As outras não veem, a não ser numa emergência.`
    default:
      return 'Cada instituição vê só o que ela mesma registrou. As outras não veem o seu histórico, a não ser numa emergência.'
  }
}

const NOME_DA_DECISAO: Record<DecisaoConsentimento, string> = {
  AUTORIZADO: 'Autorizou o compartilhamento',
  NEGADO: 'Não autorizou o compartilhamento',
  REVOGADO: 'Revogou o compartilhamento',
}

export function CompartilhamentoNaRede({ paciente, consulta }: { paciente: PacienteGerenciado; consulta: Consulta<ConsentimentosDoPaciente> }) {
  const [confirmando, setConfirmando] = useState(false)
  const envio = useEnvio()
  const { avisar } = useToast()

  const vigente = consulta.dados?.vigente ?? null
  const autorizado = vigente?.decisao === 'AUTORIZADO'
  const situacao = SITUACAO[vigente?.decisao ?? 'SEM']

  async function confirmar() {
    const ok = await envio.enviar(() => decidirConsentimento(paciente.pacienteId, autorizado ? 'REVOGADO' : 'AUTORIZADO'))
    if (ok) {
      setConfirmando(false)
      avisar(autorizado ? 'Compartilhamento revogado.' : 'Compartilhamento autorizado.')
      consulta.recarregar()
    }
  }

  return (
    <Painel titulo="Compartilhamento do histórico na rede" carregando={consulta.carregando}>
      {consulta.erro ? (
        <Alerta tom="erro" titulo="Não foi possível carregar o consentimento" acao={<Botao variante="secundario" onClick={consulta.recarregar}>Tentar de novo</Botao>}>
          {consulta.erro}
        </Alerta>
      ) : !consulta.dados ? (
        <p role="status" className="text-corpo text-texto-suave">
          Carregando o consentimento…
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-corpo font-medium text-corpo-alerta">Situação:</span>
            <Etiqueta tom={situacao.tom} texto={situacao.texto} />
            {vigente && <span className="text-corpo text-texto-suave">desde {formatarDataHora(vigente.vigenteDesde)}</span>}
          </div>
          <p className="mt-3 max-w-2xl text-corpo text-texto">{efeitoAtual(vigente)}</p>
          <div className="mt-4">
            <Botao variante={autorizado ? 'perigo' : 'primario'} onClick={() => setConfirmando(true)}>
              {autorizado ? 'Revogar o compartilhamento' : 'Autorizar o compartilhamento'}
            </Botao>
          </div>
          {consulta.dados.historico.length > 0 && (
            <details className="mt-5 rounded-controle border border-borda-divisoria px-4 py-3">
              <summary className="cursor-pointer text-corpo font-semibold text-texto-forte">
                Histórico das suas decisões ({consulta.dados.historico.length})
              </summary>
              <ol className="mt-3 grid gap-2">
                {[...consulta.dados.historico].reverse().map((c) => (
                  <li key={c.id} className="text-corpo text-texto">
                    {NOME_DA_DECISAO[c.decisao]} <span className="text-texto-suave">em {formatarDataHora(c.vigenteDesde)}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </>
      )}
      <DialogoConfirmacao
        aberto={confirmando}
        titulo={autorizado ? 'Revogar o compartilhamento?' : 'Autorizar o compartilhamento?'}
        mensagem={
          autorizado ? (
            <ul className="grid list-disc gap-2 pl-5">
              <li>As instituições que já atenderam você até agora continuam vendo o seu histórico.</li>
              <li>As que ainda não atenderam você deixam de ver, a não ser numa emergência.</li>
              <li>Você pode autorizar de novo quando quiser.</li>
            </ul>
          ) : (
            <ul className="grid list-disc gap-2 pl-5">
              <li>As instituições credenciadas da rede passam a poder consultar o seu histórico quando atenderem você.</li>
              <li>O que você restringiu continua restrito.</li>
              <li>Você pode revogar quando quiser.</li>
            </ul>
          )
        }
        rotuloConfirmar={autorizado ? 'Revogar' : 'Autorizar'}
        perigo={autorizado}
        enviando={envio.enviando}
        erro={envio.erro}
        aoConfirmar={confirmar}
        aoCancelar={() => {
          setConfirmando(false)
          envio.limparErro()
        }}
      />
    </Painel>
  )
}
