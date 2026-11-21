import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usuarioLogado } from '@/api/auth'
import { configurarCliente, ErroApi } from '@/api/cliente'
import type { EtapaAutenticacao, UsuarioLogado, VinculoAtivo } from '@/api/tipos'
import { vinculosOperaveis } from '@/auth/permissoes'
import { SESSAO_EXPIRADA, type AvisoDaSessao } from '@/auth/avisos'
import { apagarToken, guardarToken, lerToken, tokenGuardado } from '@/auth/token'

const CHAVE_INSTITUICAO = 'sigh.instituicao'

export type EstadoDaSessao = 'carregando' | 'anonimo' | 'autenticado' | 'indisponivel'

export interface EntradaPendente {
  token: string
  etapa: Exclude<EtapaAutenticacao, 'ACESSO_LIBERADO'>
}

interface Sessao {
  estado: EstadoDaSessao
  usuario: UsuarioLogado | null
  instituicaoAtiva: VinculoAtivo | null
  vinculos: VinculoAtivo[]
  entradaPendente: EntradaPendente | null
  aviso: AvisoDaSessao | null
  recarregar: () => void
  iniciarEntrada: (pendente: EntradaPendente) => void
  concluirEntrada: (tokenDeAcesso: string) => Promise<void>
  escolherInstituicao: (instituicaoId: string) => void
  sair: (aviso?: AvisoDaSessao) => void
}

const ContextoDaSessao = createContext<Sessao | null>(null)

function lerInstituicaoGuardada() {
  try {
    return window.sessionStorage.getItem(CHAVE_INSTITUICAO)
  } catch {
    return null
  }
}

function guardarInstituicao(id: string | null) {
  try {
    if (id) window.sessionStorage.setItem(CHAVE_INSTITUICAO, id)
    else window.sessionStorage.removeItem(CHAVE_INSTITUICAO)
  } catch {
  }
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [tokenInicial] = useState(tokenGuardado)
  const tokenRef = useRef<string | null>(tokenInicial)
  const [estado, setEstado] = useState<EstadoDaSessao>(tokenInicial ? 'carregando' : 'anonimo')
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null)
  const [instituicaoId, setInstituicaoId] = useState<string | null>(lerInstituicaoGuardada())
  const [entradaPendente, setEntradaPendente] = useState<EntradaPendente | null>(null)
  const [aviso, setAviso] = useState<AvisoDaSessao | null>(null)
  const expiracaoRef = useRef<number | undefined>(undefined)

  const sair = useCallback((novoAviso?: AvisoDaSessao) => {
    window.clearTimeout(expiracaoRef.current)
    tokenRef.current = null
    apagarToken()
    guardarInstituicao(null)
    setUsuario(null)
    setInstituicaoId(null)
    setEntradaPendente(null)
    setAviso(novoAviso ?? null)
    setEstado('anonimo')
  }, [])

  useEffect(() => {
    configurarCliente({
      tokenAtual: () => tokenRef.current,
      aoExpirar: () => sair(SESSAO_EXPIRADA),
    })
  }, [sair])

  const agendarExpiracao = useCallback(
    (token: string) => {
      window.clearTimeout(expiracaoRef.current)
      const dados = lerToken(token)
      if (!dados) return
      expiracaoRef.current = window.setTimeout(
        () => sair(SESSAO_EXPIRADA),
        Math.max(0, dados.expiraEm - Date.now()),
      )
    },
    [sair],
  )

  const carregarUsuario = useCallback(
    async (sinal?: AbortSignal) => {
      try {
        const eu = await usuarioLogado(sinal)
        setUsuario(eu)
        setEstado('autenticado')
      } catch (falha) {
        if (falha instanceof DOMException && falha.name === 'AbortError') return
        if (falha instanceof ErroApi && falha.status === 401) return
        if (!(falha instanceof ErroApi) || falha.status >= 500) {
          setEstado('indisponivel')
          return
        }
        sair({ texto: 'Não foi possível carregar seus dados. Entre de novo.', tom: 'atencao' })
      }
    },
    [sair],
  )

  useEffect(() => {
    const token = tokenRef.current
    if (!token) return
    agendarExpiracao(token)
    const controle = new AbortController()
    void carregarUsuario(controle.signal)
    return () => controle.abort()
  }, [agendarExpiracao, carregarUsuario])

  useEffect(() => () => window.clearTimeout(expiracaoRef.current), [])

  const iniciarEntrada = useCallback((pendente: EntradaPendente) => {
    setAviso(null)
    setEntradaPendente(pendente)
  }, [])

  const concluirEntrada = useCallback(
    async (tokenDeAcesso: string) => {
      tokenRef.current = tokenDeAcesso
      guardarToken(tokenDeAcesso)
      setEntradaPendente(null)
      setAviso(null)
      agendarExpiracao(tokenDeAcesso)
      setEstado('carregando')
      await carregarUsuario()
    },
    [agendarExpiracao, carregarUsuario],
  )

  const vinculos = useMemo(
    () => (usuario ? vinculosOperaveis(usuario.vinculos, usuario.perfis) : []),
    [usuario],
  )

  const instituicaoAtiva = useMemo(() => {
    const escolhida = vinculos.find((vinculo) => vinculo.instituicaoId === instituicaoId)
    if (escolhida) return escolhida
    return vinculos.length === 1 ? (vinculos[0] ?? null) : null
  }, [vinculos, instituicaoId])

  useEffect(() => {
    if (estado === 'autenticado') guardarInstituicao(instituicaoAtiva?.instituicaoId ?? null)
  }, [estado, instituicaoAtiva])

  const escolherInstituicao = useCallback((id: string) => setInstituicaoId(id), [])

  const recarregar = useCallback(() => {
    setEstado('carregando')
    void carregarUsuario()
  }, [carregarUsuario])

  const valor = useMemo<Sessao>(
    () => ({
      estado,
      usuario,
      instituicaoAtiva,
      vinculos,
      entradaPendente,
      aviso,
      recarregar,
      iniciarEntrada,
      concluirEntrada,
      escolherInstituicao,
      sair,
    }),
    [estado, usuario, instituicaoAtiva, vinculos, entradaPendente, aviso, recarregar, iniciarEntrada, concluirEntrada, escolherInstituicao, sair],
  )

  return <ContextoDaSessao.Provider value={valor}>{children}</ContextoDaSessao.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useSessao() {
  const sessao = useContext(ContextoDaSessao)
  if (!sessao) throw new Error('useSessao precisa estar dentro de SessaoProvider')
  return sessao
}
