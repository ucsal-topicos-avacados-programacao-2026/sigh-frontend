import { BedDouble, Plus, RefreshCw } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { alterarStatusDoLeito, cadastrarLeito, internacoesAtivas, leitosDaInstituicao } from '@/api/leitos'
import { NOME_DA_CATEGORIA, type CategoriaLeito, type Leito, type StatusLeito, type VinculoAtivo } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { CampoTexto, Selecao } from '@/componentes/Campo'
import { GradeDeIndicadores } from '@/componentes/CartaoIndicador'
import { Dialogo } from '@/componentes/Dialogo'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { useToast } from '@/componentes/Toast'
import { TituloPagina } from '@/componentes/TituloPagina'
import { ATUALIZAR_A_CADA_MS, ESTADO_DO_LEITO } from '@/paginas/administrativo/textos'
import { useAtualizacaoPeriodica } from '@/util/useAtualizacaoPeriodica'

const CATEGORIAS = Object.keys(NOME_DA_CATEGORIA) as CategoriaLeito[]
const ESTADOS = Object.keys(ESTADO_DO_LEITO) as StatusLeito[]

/** Ações de estado que o administrativo faz direto: o ocupado só muda por internação, transferência ou alta. */
const ACOES: Partial<Record<StatusLeito, { rotulo: string; para: Exclude<StatusLeito, 'OCUPADO'>; aviso: string }[]>> = {
  LIVRE: [{ rotulo: 'Bloquear', para: 'BLOQUEADO', aviso: 'bloqueado' }],
  EM_HIGIENIZACAO: [
    { rotulo: 'Concluir higienização', para: 'LIVRE', aviso: 'liberado' },
    { rotulo: 'Bloquear', para: 'BLOQUEADO', aviso: 'bloqueado' },
  ],
  BLOQUEADO: [{ rotulo: 'Desbloquear', para: 'LIVRE', aviso: 'liberado' }],
}

/** FE-04: mapa dos leitos da instituição por categoria e estado, atualizado sozinho (RF-005). */
export function Leitos() {
  const { instituicaoAtiva } = useSessao()
  if (!instituicaoAtiva) return null
  return <MapaDeLeitos key={instituicaoAtiva.instituicaoId} instituicao={instituicaoAtiva} />
}

function MapaDeLeitos({ instituicao }: { instituicao: VinculoAtivo }) {
  const id = instituicao.instituicaoId
  const leitos = useConsulta((sinal) => leitosDaInstituicao(id, sinal), [id])
  const internacoes = useConsulta((sinal) => internacoesAtivas(id, sinal), [id])
  const [categoria, setCategoria] = useState<CategoriaLeito | ''>('')
  const [estado, setEstado] = useState<StatusLeito | ''>('')
  const [cadastrando, setCadastrando] = useState(false)
  const [atualizadoEm, setAtualizadoEm] = useState(() => new Date())
  const acao = useEnvio()
  const { avisar } = useToast()

  function atualizar() {
    leitos.recarregar()
    internacoes.recarregar()
    setAtualizadoEm(new Date())
  }
  useAtualizacaoPeriodica(atualizar, ATUALIZAR_A_CADA_MS)

  const todos = leitos.dados?.content
  const pacientePorLeito = useMemo(() => new Map((internacoes.dados ?? []).map((i) => [i.leitoId, i.paciente])), [internacoes.dados])
  const contagem = (s: StatusLeito) => String(todos?.filter((l) => l.status === s).length ?? 0)
  const filtrados = todos?.filter((l) => (!categoria || l.categoria === categoria) && (!estado || l.status === estado))

  async function mudarEstado(leito: Leito, para: Exclude<StatusLeito, 'OCUPADO'>, aviso: string) {
    const ok = await acao.enviar(() => alterarStatusDoLeito(leito.id, para))
    if (ok) {
      avisar(`Leito ${leito.codigo} ${aviso}.`)
      atualizar()
    }
  }

  return (
    <>
      <TituloPagina
        titulo="Leitos"
        trilha="Atendimento"
        subtitulo={`Leitos de ${instituicao.instituicaoNome}. O mapa se atualiza sozinho a cada 30 segundos.`}
        acoes={
          <>
            {/* Sem "carregando": a atualização automática não desabilita o botão nem tira o foco de quem está nele. */}
            <Botao variante="secundario" icone={RefreshCw} onClick={atualizar}>
              Atualizar
            </Botao>
            <Botao icone={Plus} onClick={() => setCadastrando(true)}>
              Cadastrar leito
            </Botao>
          </>
        }
      />
      <GradeDeIndicadores
        carregando={!todos}
        indicadores={ESTADOS.map((s) => ({ rotulo: pluralDoEstado(s), valor: contagem(s), icone: BedDouble }))}
      />
      {/* Filtros e o aviso de erro no mesmo quadro: a região de aviso vazia não abre espaço entre os painéis. */}
      <div className="rounded-painel border border-borda bg-superficie p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-56">
            <Selecao rotulo="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaLeito | '')}>
              <option value="">Todas</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {NOME_DA_CATEGORIA[c]}
                </option>
              ))}
            </Selecao>
          </div>
          <div className="sm:w-56">
            <Selecao rotulo="Estado" value={estado} onChange={(e) => setEstado(e.target.value as StatusLeito | '')}>
              <option value="">Todos</option>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {ESTADO_DO_LEITO[s].texto}
                </option>
              ))}
            </Selecao>
          </div>
          <p className="text-rotulo text-texto-suave sm:ml-auto sm:pb-3">
            Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <RegiaoDeAlerta>
          {acao.erro && (
            <div className="mt-4">
              <Alerta tom="erro" anunciar={false} titulo="O estado do leito não mudou">
                {acao.erro}
              </Alerta>
            </div>
          )}
        </RegiaoDeAlerta>
      </div>

      {leitos.erro ? (
        <Alerta tom="erro" titulo="Não foi possível carregar os leitos" acao={<Botao variante="secundario" onClick={leitos.recarregar}>Tentar de novo</Botao>}>
          {leitos.erro}
        </Alerta>
      ) : !filtrados ? (
        <p role="status" className="text-corpo text-texto-suave">
          Carregando os leitos…
        </p>
      ) : filtrados.length === 0 ? (
        <Alerta tom="info" anunciar={false}>
          {todos?.length ? 'Nenhum leito com esses filtros.' : 'Nenhum leito cadastrado nesta instituição.'}
        </Alerta>
      ) : (
        CATEGORIAS.filter((c) => filtrados.some((l) => l.categoria === c)).map((c) => {
          const daCategoria = filtrados.filter((l) => l.categoria === c)
          return (
            <Painel key={c} titulo={`${NOME_DA_CATEGORIA[c]} (${daCategoria.length})`}>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {daCategoria.map((leito) => (
                  <li key={leito.id} className="flex flex-col gap-3 rounded-controle border border-borda p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-destaque font-semibold text-texto-forte">{leito.codigo}</p>
                        <p className="text-corpo text-texto-suave">{leito.setor}</p>
                      </div>
                      <Etiqueta tom={ESTADO_DO_LEITO[leito.status].tom} texto={ESTADO_DO_LEITO[leito.status].texto} />
                    </div>
                    {leito.status === 'OCUPADO' && (
                      <p className="text-corpo text-texto">
                        {pacientePorLeito.get(leito.id) ?? 'Paciente internado'} ·{' '}
                        <Link to="/internacoes" className="font-semibold text-link hover:text-link-hover hover:underline">
                          Ver internação
                        </Link>
                      </p>
                    )}
                    {ACOES[leito.status] && (
                      <div className="flex flex-wrap gap-2">
                        {ACOES[leito.status]?.map((a) => (
                          <Botao
                            key={a.para}
                            variante="secundario"
                            disabled={acao.enviando}
                            onClick={() => mudarEstado(leito, a.para, a.aviso)}
                            aria-label={`${a.rotulo}: leito ${leito.codigo}`}
                          >
                            {a.rotulo}
                          </Botao>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Painel>
          )
        })
      )}
      <DialogoDeCadastro
        aberto={cadastrando}
        instituicaoId={id}
        aoFechar={() => setCadastrando(false)}
        aoCadastrar={(leito) => {
          setCadastrando(false)
          avisar(`Leito ${leito.codigo} cadastrado.`)
          atualizar()
        }}
      />
    </>
  )
}

function pluralDoEstado(s: StatusLeito) {
  return { LIVRE: 'Livres', OCUPADO: 'Ocupados', EM_HIGIENIZACAO: 'Em higienização', BLOQUEADO: 'Bloqueados' }[s]
}

function DialogoDeCadastro({
  aberto,
  instituicaoId,
  aoFechar,
  aoCadastrar,
}: {
  aberto: boolean
  instituicaoId: string
  aoFechar: () => void
  aoCadastrar: (leito: Leito) => void
}) {
  const [codigo, setCodigo] = useState('')
  const [setor, setSetor] = useState('')
  const [categoria, setCategoria] = useState<CategoriaLeito>('ENFERMARIA')
  const [erros, setErros] = useState<{ codigo?: string; setor?: string }>({})
  const envio = useEnvio()

  function fechar() {
    setCodigo('')
    setSetor('')
    setErros({})
    envio.limparErro()
    aoFechar()
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const novos = { codigo: codigo.trim() ? undefined : 'Informe o código do leito.', setor: setor.trim() ? undefined : 'Informe o setor.' }
    setErros(novos)
    if (novos.codigo || novos.setor) return
    let criado: Leito | undefined
    const ok = await envio.enviar(async () => {
      criado = await cadastrarLeito({ instituicaoId, codigo: codigo.trim(), setor: setor.trim(), categoria })
    })
    if (ok && criado) {
      setCodigo('')
      setSetor('')
      aoCadastrar(criado)
    }
  }

  return (
    <Dialogo aberto={aberto} titulo="Cadastrar leito" descricao="O leito novo entra como livre." aoFechar={fechar} bloqueado={envio.enviando}>
      <form onSubmit={enviar} noValidate className="grid gap-4">
        <CampoTexto rotulo="Código" ajuda="Por exemplo, ENF-102." value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={20} erro={erros.codigo} />
        <CampoTexto rotulo="Setor" value={setor} onChange={(e) => setSetor(e.target.value)} maxLength={50} erro={erros.setor} />
        <Selecao rotulo="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaLeito)}>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {NOME_DA_CATEGORIA[c]}
            </option>
          ))}
        </Selecao>
        <RegiaoDeAlerta>
          {envio.erro && (
            <Alerta tom="erro" anunciar={false} titulo="O leito não foi cadastrado">
              {envio.erro}
            </Alerta>
          )}
        </RegiaoDeAlerta>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao variante="secundario" onClick={fechar} disabled={envio.enviando}>
            Cancelar
          </Botao>
          <Botao type="submit" carregando={envio.enviando} textoCarregando="Cadastrando…">
            Cadastrar
          </Botao>
        </div>
      </form>
    </Dialogo>
  )
}
