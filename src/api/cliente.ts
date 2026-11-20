/**
 * Cliente HTTP da API. O token vai no cabeçalho Authorization (sem cookies), direto para a API por HTTPS, sem
 * intermediário (RNF-004). Erros viram ErroApi, com a mensagem do ProblemDetail do Spring ("detail") e, num 400
 * de validação, os erros por campo ("campos").
 */

const URL_DA_API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** Mensagens para quando a API responde sem corpo (401 e 403 do filtro de segurança, por exemplo). */
const MENSAGEM_PADRAO: Record<number, string> = {
  400: 'Os dados enviados são inválidos.',
  401: 'Sua sessão expirou. Entre de novo.',
  403: 'Você não tem permissão para esta ação nesta instituição.',
  404: 'Não encontrado.',
  409: 'Os dados mudaram enquanto você trabalhava. Consulte de novo.',
  422: 'A operação não é permitida agora.',
  503: 'Serviço temporariamente indisponível.',
}

export class ErroApi extends Error {
  readonly status: number
  readonly campos: Record<string, string>

  constructor(status: number, mensagem: string, campos: Record<string, string> = {}) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.campos = campos
  }
}

/** Quem chama a API sem conseguir falar com ela (rede, certificado, CORS). */
export class ErroDeConexao extends Error {
  constructor() {
    super('Não foi possível falar com o servidor. Confira a conexão e tente de novo.')
    this.name = 'ErroDeConexao'
  }
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface OpcoesRequisicao {
  corpo?: unknown
  consulta?: Record<string, string | number | boolean | undefined>
  /** Token a usar nesta requisição (o do segundo fator pendente, por exemplo). Sem ele, vale o da sessão. */
  token?: string
  sinal?: AbortSignal
}

interface Configuracao {
  tokenAtual: () => string | null
  /** Chamada quando uma rota autenticada responde 401: a sessão acabou. */
  aoExpirar: () => void
}

let configuracao: Configuracao = { tokenAtual: () => null, aoExpirar: () => {} }

export function configurarCliente(nova: Configuracao) {
  configuracao = nova
}

function montarUrl(caminho: string, consulta?: OpcoesRequisicao['consulta']) {
  const parametros = new URLSearchParams()
  for (const [nome, valor] of Object.entries(consulta ?? {})) {
    if (valor !== undefined) parametros.set(nome, String(valor))
  }
  const sufixo = parametros.size > 0 ? `?${parametros}` : ''
  return `${URL_DA_API}${caminho}${sufixo}`
}

async function lerErro(resposta: Response): Promise<ErroApi> {
  let detalhe: string | undefined
  let campos: Record<string, string> = {}
  try {
    const corpo: unknown = await resposta.json()
    if (corpo && typeof corpo === 'object') {
      const problema = corpo as { detail?: unknown; campos?: unknown }
      if (typeof problema.detail === 'string') detalhe = problema.detail
      if (problema.campos && typeof problema.campos === 'object') campos = problema.campos as Record<string, string>
    }
  } catch {
    // Sem corpo JSON: fica a mensagem padrão do status.
  }
  return new ErroApi(resposta.status, detalhe ?? MENSAGEM_PADRAO[resposta.status] ?? 'Erro inesperado.', campos)
}

export async function requisicao<T>(metodo: Metodo, caminho: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
  const token = opcoes.token ?? configuracao.tokenAtual()
  const cabecalhos: Record<string, string> = { Accept: 'application/json' }
  if (token) cabecalhos.Authorization = `Bearer ${token}`
  if (opcoes.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'

  let resposta: Response
  try {
    resposta = await fetch(montarUrl(caminho, opcoes.consulta), {
      method: metodo,
      headers: cabecalhos,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      signal: opcoes.sinal,
    })
  } catch (falha) {
    if (falha instanceof DOMException && falha.name === 'AbortError') throw falha
    throw new ErroDeConexao()
  }

  if (!resposta.ok) {
    const erro = await lerErro(resposta)
    // Em /auth, 401 é senha ou código errado (erro do formulário), não fim de sessão.
    if (erro.status === 401 && !caminho.startsWith('/auth/') && opcoes.token === undefined) configuracao.aoExpirar()
    throw erro
  }
  if (resposta.status === 204) return undefined as T
  const texto = await resposta.text()
  return (texto ? JSON.parse(texto) : undefined) as T
}
