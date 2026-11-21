import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { HOSPITAL_A, renderizar, usuario } from '@/testes/renderizar'
import { tokenFicticio } from '@/testes/tokens'

const PENDENTE = tokenFicticio('medico.teste', [])
const ACESSO = tokenFicticio('medico.teste', ['MEDICO'])
const MEDICO = { ...usuario(['MEDICO'], [{ ...HOSPITAL_A, perfis: ['MEDICO'] }]), login: 'medico.teste' }
const URI = 'otpauth://totp/SIGH:medico.teste?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=SIGH'

async function entrarCom(login: string, senha: string) {
  await userEvent.type(await screen.findByLabelText('Login'), login)
  await userEvent.type(screen.getByLabelText('Senha'), senha)
  await userEvent.click(screen.getByRole('button', { name: 'Acessar plataforma' }))
}

describe('login', () => {
  it('sem segundo fator, entra direto e abre a primeira tela do perfil', async () => {
    const { chamadas } = renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: tokenFicticio('adm', ['ADMINISTRATIVO']), etapa: 'ACESSO_LIBERADO' } },
      'GET /usuarios/eu': { status: 200, corpo: usuario(['ADMINISTRATIVO'], [{ ...HOSPITAL_A, perfis: ['ADMINISTRATIVO'] }]) },
    })
    await entrarCom('adm', 'senha-ficticia')
    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(chamadas[0]).toMatchObject({ chave: 'POST /auth/login', corpo: { login: 'adm', senha: 'senha-ficticia' } })
    expect(window.sessionStorage.getItem('sigh.token')).not.toBeNull()
  })

  it('senha errada: alerta com a mensagem da API, senha limpa e nenhum token guardado', async () => {
    renderizar('/entrar', undefined, { 'POST /auth/login': { status: 401, corpo: { detail: 'Login ou senha inválidos.' } } })
    await entrarCom('adm', 'errada')
    expect(await screen.findByText('Login ou senha inválidos.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveValue('')
    expect(window.sessionStorage.getItem('sigh.token')).toBeNull()
  })

  it('campos vazios: erro junto de cada campo, ligado por aria-describedby, sem chamar a API', async () => {
    const { chamadas } = renderizar('/entrar')
    await userEvent.click(await screen.findByRole('button', { name: 'Acessar plataforma' }))
    const login = screen.getByLabelText('Login')
    expect(login).toHaveAttribute('aria-invalid', 'true')
    expect(login).toHaveAccessibleDescription('Digite o seu login.')
    expect(login).toHaveFocus()
    expect(chamadas).toHaveLength(0)
  })

  it('ordem do teclado: login, senha, mostrar senha, entrar', async () => {
    renderizar('/entrar')
    expect(await screen.findByLabelText('Login')).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByLabelText('Senha')).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Acessar plataforma' })).toHaveFocus()
  })

  it('a tela de login não tem violações de acessibilidade', async () => {
    const { container } = renderizar('/entrar')
    await screen.findByLabelText('Login')
    expect(await violacoesDeAcessibilidade(container)).toEqual([])
  })
})

describe('segundo fator', () => {
  it('valida o código com o token pendente, que nunca vai para o armazenamento', async () => {
    const { chamadas } = renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'VALIDAR_SEGUNDO_FATOR' } },
      'POST /auth/segundo-fator/validacao': (corpo) =>
        (corpo as { codigo: string }).codigo === '123456'
          ? { status: 200, corpo: { token: ACESSO, etapa: 'ACESSO_LIBERADO' } }
          : { status: 401, corpo: { detail: 'Código do segundo fator inválido.' } },
      'GET /usuarios/eu': { status: 200, corpo: MEDICO },
    })
    await entrarCom('medico.teste', 'senha')
    const codigo = await screen.findByLabelText('Código de 6 dígitos')
    expect(codigo).toHaveFocus()
    expect(window.sessionStorage.getItem('sigh.token')).toBeNull()

    await userEvent.type(codigo, '999999')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    expect(await screen.findByText('Código do segundo fator inválido.')).toBeInTheDocument()
    expect(codigo).toHaveValue('')

    await userEvent.type(codigo, '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(chamadas.find((c) => c.chave === 'POST /auth/segundo-fator/validacao')?.autorizacao).toBe(`Bearer ${PENDENTE}`)
    expect(window.sessionStorage.getItem('sigh.token')).toBe(ACESSO)
  })

  it('código com letras ou menos de 6 dígitos é recusado sem chamar a API', async () => {
    const { chamadas } = renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'VALIDAR_SEGUNDO_FATOR' } },
    })
    await entrarCom('medico.teste', 'senha')
    await userEvent.type(await screen.findByLabelText('Código de 6 dígitos'), '12a4')
    expect(screen.getByLabelText('Código de 6 dígitos')).toHaveValue('124')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    expect(screen.getByText('Digite os 6 números que aparecem no aplicativo.')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.chave === 'POST /auth/segundo-fator/validacao')).toHaveLength(0)
  })

  it('token pendente vencido volta ao login com o aviso', async () => {
    renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'VALIDAR_SEGUNDO_FATOR' } },
      'POST /auth/segundo-fator/validacao': { status: 401 },
    })
    await entrarCom('medico.teste', 'senha')
    await userEvent.type(await screen.findByLabelText('Código de 6 dígitos'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    expect(await screen.findByText(/tempo para confirmar o segundo fator acabou/)).toBeInTheDocument()
  })

  it('cadastro com o prazo vencido volta ao login com o aviso de atenção', async () => {
    renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'CADASTRAR_SEGUNDO_FATOR' } },
      'POST /auth/segundo-fator/cadastro': { status: 401 },
    })
    await entrarCom('medico.teste', 'senha')
    // O teste começa no login: esperar o título não prova a volta. Espera o aviso, que só aparece depois dela.
    const aviso = await screen.findByText(/tempo para confirmar o segundo fator acabou/)
    expect(aviso.closest('[role="alert"]')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Entre na sua conta' })).toBeInTheDocument()
  })

  it('falha de rede ao confirmar o código: alerta acima do botão, e o campo fica sem erro', async () => {
    renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'VALIDAR_SEGUNDO_FATOR' } },
      'POST /auth/segundo-fator/validacao': { status: 503, corpo: { detail: 'Serviço temporariamente indisponível.' } },
    })
    await entrarCom('medico.teste', 'senha')
    const codigo = await screen.findByLabelText('Código de 6 dígitos')
    await userEvent.type(codigo, '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    expect(await screen.findByText('Serviço temporariamente indisponível.')).toBeInTheDocument()
    expect(codigo).not.toHaveAttribute('aria-invalid')
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
  })

  it('sem login antes, a tela do segundo fator volta ao login', async () => {
    renderizar('/entrar/segundo-fator')
    expect(await screen.findByRole('heading', { level: 1, name: 'Entre na sua conta' })).toBeInTheDocument()
  })

  it('cadastro: QR e segredo gerados uma vez só (mesmo no StrictMode), e o código ativa o fator', async () => {
    const { chamadas, container } = renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'CADASTRAR_SEGUNDO_FATOR' } },
      'POST /auth/segundo-fator/cadastro': { status: 200, corpo: { uriAutenticador: URI } },
      'POST /auth/segundo-fator/validacao': { status: 200, corpo: { token: ACESSO, etapa: 'ACESSO_LIBERADO' } },
      'GET /usuarios/eu': { status: 200, corpo: MEDICO },
    })
    await entrarCom('medico.teste', 'senha')
    expect(await screen.findByRole('img', { name: /QR code para cadastrar o SIGH/ })).toBeInTheDocument()
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.chave === 'POST /auth/segundo-fator/cadastro')).toHaveLength(1)
    expect(await violacoesDeAcessibilidade(container)).toEqual([])

    await userEvent.type(screen.getByLabelText('Código de 6 dígitos'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Ativar segundo fator' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('cadastro já feito: oferece ir para a confirmação do código', async () => {
    renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'CADASTRAR_SEGUNDO_FATOR' } },
      'POST /auth/segundo-fator/cadastro': { status: 422, corpo: { detail: 'O segundo fator já foi cadastrado.' } },
    })
    await entrarCom('medico.teste', 'senha')
    expect(await screen.findByText('O segundo fator já foi cadastrado.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ir para a confirmação do código' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Confirme o segundo fator' })).toBeInTheDocument()
  })
})

describe('sessão', () => {
  it('401 ao carregar o usuário encerra a sessão com o aviso de sessão expirada', async () => {
    renderizar('/', usuario(['PACIENTE']), { 'GET /usuarios/eu': { status: 401 } })
    expect(await screen.findByText('Sua sessão expirou. Entre de novo.')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('sigh.token')).toBeNull()
  })

  it('servidor fora ao recarregar a página: a sessão continua e dá para tentar de novo', async () => {
    let tentativas = 0
    renderizar('/', usuario(['PACIENTE']), {
      'GET /usuarios/eu': () => (++tentativas <= 2 ? { status: 503 } : { status: 200, corpo: usuario(['PACIENTE']) }),
    })
    const tentar = await screen.findByRole('button', { name: 'Tentar de novo' })
    expect(window.sessionStorage.getItem('sigh.token')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    await userEvent.click(tentar)
    expect(await screen.findByRole('heading', { level: 1, name: 'Meu prontuário' })).toBeInTheDocument()
  })

  it('páginas de erro sem violações: sem permissão, não encontrada (com e sem sessão)', async () => {
    const semPermissao = renderizar('/leitos', usuario(['PACIENTE']))
    await screen.findByRole('heading', { level: 1, name: /não tem permissão/ })
    await waitFor(() => expect(document.title).toBe('Sem permissão · SIGH'))
    expect(await violacoesDeAcessibilidade(semPermissao.container)).toEqual([])
    semPermissao.unmount()
    window.sessionStorage.clear()

    const publica = renderizar('/endereco-que-nao-existe')
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toBeInTheDocument()
    expect(await violacoesDeAcessibilidade(publica.container)).toEqual([])
  })

  it('token vencido no armazenamento é descartado e leva ao login', async () => {
    window.sessionStorage.setItem('sigh.token', tokenFicticio('x', ['PACIENTE'], -60))
    renderizar('/meu-prontuario')
    expect(await screen.findByRole('heading', { level: 1, name: 'Entre na sua conta' })).toBeInTheDocument()
  })
})
