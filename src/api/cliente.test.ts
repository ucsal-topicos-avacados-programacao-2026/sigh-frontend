import { configurarCliente, ErroApi, ErroDeConexao, requisicao } from '@/api/cliente'

function responder(status: number, corpo?: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(corpo === undefined ? null : JSON.stringify(corpo), {
      status,
      headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' },
    }),
  )
}

describe('cliente HTTP', () => {
  const aoExpirar = vi.fn()

  beforeEach(() => {
    aoExpirar.mockReset()
    configurarCliente({ tokenAtual: () => 'token-da-sessao', aoExpirar })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('manda o token no cabeçalho, o corpo em JSON e os parâmetros na URL', async () => {
    const chamada = responder(200, { ok: true })
    vi.stubGlobal('fetch', chamada)

    await requisicao('POST', '/triagens', { corpo: { a: 1 }, consulta: { instituicaoId: 'x', vazio: undefined } })

    const [url, init] = chamada.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/triagens\?instituicaoId=x$/)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-da-sessao')
    expect(init.body).toBe('{"a":1}')
    expect(init.credentials).toBeUndefined()
  })

  it('401 em rota autenticada encerra a sessão', async () => {
    vi.stubGlobal('fetch', responder(401))
    await expect(requisicao('GET', '/usuarios/eu')).rejects.toMatchObject({ status: 401 })
    expect(aoExpirar).toHaveBeenCalledOnce()
  })

  it('401 no login é erro do formulário, com a mensagem da API, e não encerra a sessão', async () => {
    vi.stubGlobal('fetch', responder(401, { detail: 'Login ou senha inválidos.' }))
    await expect(requisicao('POST', '/auth/login', { corpo: {} })).rejects.toThrow('Login ou senha inválidos.')
    expect(aoExpirar).not.toHaveBeenCalled()
  })

  it('403 sem corpo vira a mensagem padrão de falta de permissão, sem encerrar a sessão', async () => {
    vi.stubGlobal('fetch', responder(403))
    await expect(requisicao('GET', '/leitos')).rejects.toThrow(/permissão/)
    expect(aoExpirar).not.toHaveBeenCalled()
  })

  it('400 de validação traz os erros por campo', async () => {
    vi.stubGlobal('fetch', responder(400, { detail: 'Dados inválidos.', campos: { cpf: 'CPF inválido' } }))
    const erro = await requisicao('POST', '/api/pacientes/busca').catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroApi)
    expect((erro as ErroApi).campos).toEqual({ cpf: 'CPF inválido' })
  })

  it('sem conexão com o servidor, um erro com mensagem clara', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(requisicao('GET', '/usuarios/eu')).rejects.toBeInstanceOf(ErroDeConexao)
  })

  it('202 e 204 sem corpo não quebram', async () => {
    vi.stubGlobal('fetch', responder(204))
    await expect(requisicao('POST', '/atendimentos/1/encerramento')).resolves.toBeUndefined()
  })
})
