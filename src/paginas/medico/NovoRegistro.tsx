import { Save } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ErroApi } from '@/api/cliente'
import { registrarNoAtendimento } from '@/api/atendimento'
import { NOME_DO_TIPO_DE_REGISTRO, type TipoRegistro } from '@/api/tipos'
import { useEnvio } from '@/api/useEnvio'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { AreaDeTexto, CampoTexto, Selecao } from '@/componentes/Campo'
import { Painel } from '@/componentes/Painel'

const TIPOS: { valor: TipoRegistro; rotulo: string }[] = [
  { valor: 'EVOLUCAO', rotulo: 'Evolução e conduta' },
  { valor: 'DIAGNOSTICO', rotulo: NOME_DO_TIPO_DE_REGISTRO.DIAGNOSTICO },
  { valor: 'PRESCRICAO', rotulo: NOME_DO_TIPO_DE_REGISTRO.PRESCRICAO },
  { valor: 'EXAME', rotulo: NOME_DO_TIPO_DE_REGISTRO.EXAME },
  { valor: 'ALERGIA', rotulo: NOME_DO_TIPO_DE_REGISTRO.ALERGIA },
  { valor: 'RESUMO_ALTA', rotulo: 'Resumo de internação ou alta' },
]

const LIMITE_CATEGORIA = 50
const CID10 = /^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/

type Campo = 'conteudo' | 'categoriaInformacao' | 'codigoCID10'
type Erros = Partial<Record<Campo, string>>

export function NovoRegistro({ atendimentoId, categorias, aoRegistrar }: { atendimentoId: string; categorias: string[]; aoRegistrar: () => void }) {
  const listaId = useId()
  const [tipo, setTipo] = useState<TipoRegistro>('EVOLUCAO')
  const [categoria, setCategoria] = useState('')
  const [cid, setCid] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [erros, setErros] = useState<Erros>({})
  const envio = useEnvio()

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const codigo = cid.trim()
    const novos: Erros = {
      conteudo: conteudo.trim() ? undefined : 'Escreva o registro.',
      categoriaInformacao: categoria.trim() ? undefined : 'Informe a categoria da informação, por exemplo Clínica geral.',
      codigoCID10: !codigo || CID10.test(codigo) ? undefined : 'Use o formato do CID-10, por exemplo J45.9.',
    }
    setErros(novos)
    if (Object.values(novos).some(Boolean)) return
    let daApi: Erros = {}
    const ok = await envio.enviar(async () => {
      try {
        await registrarNoAtendimento(atendimentoId, {
          tipo,
          conteudo: conteudo.trim(),
          categoriaInformacao: categoria.trim(),
          ...(codigo && { codigoCID10: codigo }),
        })
      } catch (falha) {
        if (falha instanceof ErroApi) daApi = falha.campos as Erros
        throw falha
      }
    })
    if (ok) {
      setConteudo('')
      setCid('')
      aoRegistrar()
    } else if (Object.keys(daApi).length) {
      setErros(daApi)
    }
  }

  return (
    <Painel titulo="Novo registro" subtitulo="Entra no prontuário único do paciente, com esta instituição como origem.">
      <form onSubmit={enviar} noValidate className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Selecao rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRegistro)}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </Selecao>
          <div>
            <CampoTexto
              rotulo="Categoria da informação"
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value)
                setErros((a) => ({ ...a, categoriaInformacao: undefined }))
              }}
              list={listaId}
              maxLength={LIMITE_CATEGORIA}
              autoComplete="off"
              erro={erros.categoriaInformacao}
            />
            <datalist id={listaId}>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </datalist>
          </div>
          <CampoTexto
            rotulo="CID-10"
            ajuda="Por exemplo J45.9."
            value={cid}
            onChange={(e) => {
              setCid(e.target.value.toUpperCase())
              setErros((a) => ({ ...a, codigoCID10: undefined }))
            }}
            maxLength={6}
            autoComplete="off"
            erro={erros.codigoCID10}
            opcional
          />
        </div>
        {tipo === 'RESUMO_ALTA' && (
          <Alerta tom="info" anunciar={false}>
            O resumo de alta fica disponível para o administrativo anexar à alta da internação.
          </Alerta>
        )}
        <AreaDeTexto
          rotulo="Registro"
          value={conteudo}
          onChange={(e) => {
            setConteudo(e.target.value)
            setErros((a) => ({ ...a, conteudo: undefined }))
          }}
          rows={5}
          erro={erros.conteudo}
        />
        <RegiaoDeAlerta>
          {envio.erro && (
            <Alerta tom="erro" anunciar={false} titulo="O registro não foi salvo">
              {envio.erro}
            </Alerta>
          )}
        </RegiaoDeAlerta>
        <div>
          <Botao type="submit" icone={Save} carregando={envio.enviando} textoCarregando="Salvando…" className="w-full sm:w-auto">
            Salvar registro
          </Botao>
        </div>
      </form>
    </Painel>
  )
}
