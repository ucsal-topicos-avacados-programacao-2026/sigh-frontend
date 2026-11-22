import { Building2, KeyRound, ShieldOff, UserCheck, UserPlus, UserX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { instituicoesDaRede } from '@/api/paciente'
import { NOME_DO_PERFIL, PERFIS_CRIAVEIS, type AcaoAdministrativa, type Perfil, type UsuarioCriado, type UsuarioDetalhe } from '@/api/tipos'
import { acoesAdministrativas, alterarAtivo, redefinirSenha, usuarios, zerarSegundoFator, type FiltroDeUsuarios } from '@/api/usuarios'
import { useConsulta } from '@/api/useConsulta'
import { useEnvio } from '@/api/useEnvio'
import { useSessao } from '@/auth/SessaoProvider'
import { Botao } from '@/componentes/Botao'
import { CampoTexto, Selecao } from '@/componentes/Campo'
import { DialogoConfirmacao } from '@/componentes/DialogoConfirmacao'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { Paginacao } from '@/componentes/Paginacao'
import { Tabela, type Coluna } from '@/componentes/Tabela'
import { useToast } from '@/componentes/Toast'
import { TituloPagina } from '@/componentes/TituloPagina'
import { DialogoDeNovoUsuario } from '@/paginas/auditor/DialogoDeNovoUsuario'
import { DialogoDeSenhaTemporaria, type SenhaParaMostrar } from '@/paginas/auditor/DialogoDeSenhaTemporaria'
import { DialogoDeVinculos } from '@/paginas/auditor/DialogoDeVinculos'
import { NOME_DA_ACAO, PERFIS_DE_INSTITUICAO } from '@/paginas/auditor/textosDeUsuarios'
import { formatarDataHora } from '@/util/datas'

const TAMANHO = 10

type Pedido = { tipo: 'desativar' | 'reativar' | 'senha' | 'segundoFator'; usuario: UsuarioDetalhe }

const TEXTOS: Record<Pedido['tipo'], { titulo: string; rotulo: string; perigo: boolean; mensagem: (u: UsuarioDetalhe) => string }> = {
  desativar: {
    titulo: 'Desativar usuário',
    rotulo: 'Desativar',
    perigo: true,
    mensagem: (u) => `${u.nome} deixa de entrar no SIGH agora, e a sessão que já estiver aberta cai. O histórico dele é mantido.`,
  },
  reativar: {
    titulo: 'Reativar usuário',
    rotulo: 'Reativar',
    perigo: false,
    mensagem: (u) => `${u.nome} volta a poder entrar no SIGH com a senha que já tem.`,
  },
  senha: {
    titulo: 'Redefinir senha',
    rotulo: 'Gerar nova senha',
    perigo: true,
    mensagem: (u) => `O sistema gera uma nova senha temporária para ${u.nome}. A senha atual deixa de valer, e no próximo login ele escolhe outra.`,
  },
  segundoFator: {
    titulo: 'Zerar segundo fator',
    rotulo: 'Zerar segundo fator',
    perigo: true,
    mensagem: (u) => `${u.nome} cadastra o aplicativo autenticador de novo no próximo login. O aplicativo antigo deixa de servir.`,
  },
}

export function Usuarios() {
  const { usuario: logado } = useSessao()
  const { avisar } = useToast()
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [perfil, setPerfil] = useState<Perfil | ''>('')
  const [situacao, setSituacao] = useState<FiltroDeUsuarios['situacao']>('todos')
  const [pagina, setPagina] = useState(0)
  const [paginaDasAcoes, setPaginaDasAcoes] = useState(0)
  const [novo, setNovo] = useState(false)
  const [senha, setSenha] = useState<SenhaParaMostrar | null>(null)
  const [vinculos, setVinculos] = useState<UsuarioDetalhe | null>(null)
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const envio = useEnvio()

  useEffect(() => {
    const espera = window.setTimeout(() => {
      setBuscaAplicada(busca)
      setPagina(0)
    }, 300)
    return () => window.clearTimeout(espera)
  }, [busca])

  const filtro = useMemo<FiltroDeUsuarios>(() => ({ busca: buscaAplicada, perfil, situacao }), [buscaAplicada, perfil, situacao])
  const lista = useConsulta((sinal) => usuarios(filtro, pagina, TAMANHO, sinal), [filtro, pagina])
  const acoes = useConsulta((sinal) => acoesAdministrativas(paginaDasAcoes, TAMANHO, sinal), [paginaDasAcoes])
  const hospitais = useConsulta((sinal) => instituicoesDaRede(sinal), [])

  function atualizar() {
    lista.recarregar()
    acoes.recarregar()
  }

  async function confirmar() {
    if (!pedido) return
    const alvo = pedido.usuario
    let mostrar: SenhaParaMostrar | undefined
    const ok = await envio.enviar(async () => {
      if (pedido.tipo === 'desativar') await alterarAtivo(alvo.id, false)
      else if (pedido.tipo === 'reativar') await alterarAtivo(alvo.id, true)
      else if (pedido.tipo === 'segundoFator') await zerarSegundoFator(alvo.id)
      else {
        const resposta = await redefinirSenha(alvo.id)
        mostrar = { login: resposta.login, senha: resposta.senhaTemporaria }
      }
    })
    if (!ok) return
    setPedido(null)
    atualizar()
    if (mostrar) setSenha(mostrar)
    else avisar(`${TEXTOS[pedido.tipo].titulo}: feito para ${alvo.nome}.`)
  }

  function criado(resposta: UsuarioCriado) {
    setNovo(false)
    setSenha({ login: resposta.usuario.login, senha: resposta.senhaTemporaria })
    setPagina(0)
    atualizar()
  }

  const colunas = useMemo<Coluna<UsuarioDetalhe>[]>(
    () => [
      {
        titulo: 'Usuário',
        celula: (u) => (
          <div className="flex flex-col">
            <span className="font-medium">{u.nome}</span>
            <span className="text-texto-suave">{u.login}</span>
          </div>
        ),
      },
      { titulo: 'Perfil', celula: (u) => u.perfis.map((p) => NOME_DO_PERFIL[p]).join(', ') },
      {
        titulo: 'Hospitais',
        celula: (u) => {
          const ativos = u.vinculos.filter((v) => v.ativo).map((v) => v.instituicaoNome)
          return ativos.length > 0 ? <span className="block max-w-xs">{ativos.join(', ')}</span> : '—'
        },
      },
      {
        titulo: 'Situação',
        celula: (u) => (
          <div className="flex flex-col items-start gap-1">
            <Etiqueta tom={u.ativo ? 'sucesso' : 'neutro'} texto={u.ativo ? 'Ativo' : 'Desativado'} />
            {u.senhaTemporaria && <Etiqueta tom="atencao" texto="Senha temporária" />}
          </div>
        ),
      },
      {
        titulo: 'Ações',
        celula: (u) => {
          const eu = u.login === logado?.login
          const daInstituicao = u.perfis.some((p) => PERFIS_DE_INSTITUICAO.includes(p))
          return (
            <div className="flex flex-wrap gap-2">
              {daInstituicao && (
                <Botao variante="secundario" icone={Building2} onClick={() => setVinculos(u)} aria-label={`Vínculos de ${u.nome}`}>
                  Vínculos
                </Botao>
              )}
              <Botao variante="secundario" icone={KeyRound} disabled={eu} onClick={() => setPedido({ tipo: 'senha', usuario: u })} aria-label={`Redefinir a senha de ${u.nome}`}>
                Senha
              </Botao>
              <Botao variante="secundario" icone={ShieldOff} onClick={() => setPedido({ tipo: 'segundoFator', usuario: u })} aria-label={`Zerar o segundo fator de ${u.nome}`}>
                2FA
              </Botao>
              {u.ativo ? (
                <Botao variante="secundario" icone={UserX} disabled={eu} onClick={() => setPedido({ tipo: 'desativar', usuario: u })} aria-label={`Desativar ${u.nome}`}>
                  Desativar
                </Botao>
              ) : (
                <Botao variante="secundario" icone={UserCheck} onClick={() => setPedido({ tipo: 'reativar', usuario: u })} aria-label={`Reativar ${u.nome}`}>
                  Reativar
                </Botao>
              )}
            </div>
          )
        },
      },
    ],
    [logado?.login],
  )

  const colunasDasAcoes = useMemo<Coluna<AcaoAdministrativa>[]>(
    () => [
      { titulo: 'Quando', celula: (a) => <span className="whitespace-nowrap">{formatarDataHora(a.ocorridoEm)}</span> },
      { titulo: 'Ação', celula: (a) => NOME_DA_ACAO[a.acao] },
      { titulo: 'Em quem', celula: (a) => <span className="font-medium">{a.alvo}</span> },
      { titulo: 'Detalhe', celula: (a) => a.detalhe ?? '—' },
      { titulo: 'Por', celula: (a) => a.ator },
    ],
    [],
  )

  const texto = pedido ? TEXTOS[pedido.tipo] : null
  return (
    <>
      <TituloPagina
        titulo="Usuários"
        trilha="Gestão da rede"
        subtitulo="Crie e administre os usuários da rede. Paciente não tem conta: ele é cadastrado pela recepção, no atendimento."
        acoes={
          <Botao icone={UserPlus} onClick={() => setNovo(true)}>
            Novo usuário
          </Botao>
        }
      />
      <Painel titulo="Usuários da rede" carregando={lista.carregando} semRespiro>
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-3 sm:px-5">
          <CampoTexto rotulo="Buscar por nome ou login" autoComplete="off" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Selecao
            rotulo="Perfil"
            value={perfil}
            onChange={(e) => {
              setPerfil(e.target.value as Perfil | '')
              setPagina(0)
            }}
          >
            <option value="">Todos</option>
            {PERFIS_CRIAVEIS.map((opcao) => (
              <option key={opcao} value={opcao}>
                {NOME_DO_PERFIL[opcao]}
              </option>
            ))}
          </Selecao>
          <Selecao
            rotulo="Situação"
            value={situacao}
            onChange={(e) => {
              setSituacao(e.target.value as FiltroDeUsuarios['situacao'])
              setPagina(0)
            }}
          >
            <option value="todos">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="desativados">Desativados</option>
          </Selecao>
        </div>
        <Tabela
          legenda="Usuários da rede"
          legendaOculta
          colunas={colunas}
          linhas={lista.dados?.content}
          chave={(u) => u.id}
          carregando={lista.carregando && !lista.dados}
          erro={lista.erro}
          aoTentarDeNovo={lista.recarregar}
          textoVazio="Nenhum usuário encontrado."
        />
        <Paginacao
          rotulo="Páginas dos usuários"
          pagina={pagina}
          totalPaginas={lista.dados?.page.totalPages ?? 1}
          totalItens={lista.dados?.page.totalElements ?? 0}
          nomeDosItens="usuários"
          carregando={lista.carregando}
          aoMudar={setPagina}
        />
      </Painel>
      <Painel titulo="Ações administrativas" subtitulo="Registro imutável de quem criou, desativou ou alterou usuários." carregando={acoes.carregando} semRespiro>
        <Tabela
          legenda="Ações administrativas"
          legendaOculta
          colunas={colunasDasAcoes}
          linhas={acoes.dados?.content}
          chave={(a) => a.id}
          carregando={acoes.carregando && !acoes.dados}
          erro={acoes.erro}
          aoTentarDeNovo={acoes.recarregar}
          textoVazio="Nenhuma ação registrada."
        />
        <Paginacao
          rotulo="Páginas das ações"
          pagina={paginaDasAcoes}
          totalPaginas={acoes.dados?.page.totalPages ?? 1}
          totalItens={acoes.dados?.page.totalElements ?? 0}
          nomeDosItens="ações"
          carregando={acoes.carregando}
          aoMudar={setPaginaDasAcoes}
        />
      </Painel>
      <DialogoDeNovoUsuario aberto={novo} instituicoes={hospitais.dados ?? []} aoFechar={() => setNovo(false)} aoCriar={criado} />
      <DialogoDeVinculos
        usuario={vinculos}
        instituicoes={hospitais.dados ?? []}
        aoFechar={() => setVinculos(null)}
        aoAtualizar={(atualizado) => {
          setVinculos(atualizado)
          atualizar()
        }}
      />
      <DialogoDeSenhaTemporaria senha={senha} aoFechar={() => setSenha(null)} />
      <DialogoConfirmacao
        aberto={pedido !== null}
        titulo={texto?.titulo ?? ''}
        mensagem={pedido && texto ? texto.mensagem(pedido.usuario) : ''}
        rotuloConfirmar={texto?.rotulo ?? ''}
        perigo={texto?.perigo}
        enviando={envio.enviando}
        erro={envio.erro}
        aoConfirmar={() => void confirmar()}
        aoCancelar={() => {
          setPedido(null)
          envio.limparErro()
        }}
      />
    </>
  )
}

