import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { HOSPITAL_A, renderizar, usuario } from '@/testes/renderizar'
import { tokenFicticio } from '@/testes/tokens'
import { erroDaNovaSenha } from '@/paginas/senha/regrasDeSenha'

const PENDENTE = tokenFicticio('adm.novo', [])
const ACESSO = tokenFicticio('adm.novo', ['ADMINISTRATIVO'])
const ADM = { ...usuario(['ADMINISTRATIVO'], [{ ...HOSPITAL_A, perfis: ['ADMINISTRATIVO'] }]), login: 'adm.novo' }

async function entrarComTemporaria() {
  await userEvent.type(await screen.findByLabelText('Login'), 'adm.novo')
  await userEvent.type(screen.getByLabelText('Senha'), 'Temporaria2026Ab')
  await userEvent.click(screen.getByRole('button', { name: 'Acessar plataforma' }))
}

describe('regras da nova senha', () => {
  it('exige 10 caracteres, letras e números, e a confirmação igual', () => {
    expect(erroDaNovaSenha('curta1A', 'curta1A')).toMatch(/10 caracteres/)
    expect(erroDaNovaSenha('somente-letras-aqui', 'somente-letras-aqui')).toMatch(/letras e números/)
    expect(erroDaNovaSenha('1234567890123', '1234567890123')).toMatch(/letras e números/)
    expect(erroDaNovaSenha('SenhaNova2026', 'SenhaNova2027')).toMatch(/não são iguais/)
    expect(erroDaNovaSenha('SenhaNova2026', 'SenhaNova2026')).toBeUndefined()
    expect(erroDaNovaSenha('a1'.repeat(40), 'a1'.repeat(40))).toMatch(/72/)
  })
})

describe('primeiro acesso com senha temporária', () => {
  it('o login leva à troca de senha e, sem segundo fator, abre o sistema', async () => {
    const { chamadas } = renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'TROCAR_SENHA' } },
      'POST /auth/senha/troca-inicial': { status: 200, corpo: { token: ACESSO, etapa: 'ACESSO_LIBERADO' } },
      'GET /usuarios/eu': { status: 200, corpo: ADM },
    })
    await entrarComTemporaria()
    expect(await screen.findByRole('heading', { level: 1, name: 'Troque a sua senha' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nova senha'), 'SenhaNova2026')
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), 'SenhaNova2026')
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha e continuar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    const troca = chamadas.find((c) => c.chave === 'POST /auth/senha/troca-inicial')
    expect(troca?.corpo).toEqual({ novaSenha: 'SenhaNova2026' })
    expect(troca?.autorizacao).toBe(`Bearer ${PENDENTE}`)
  })

  it('profissional segue para o cadastro do segundo fator depois da troca', async () => {
    renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'TROCAR_SENHA' } },
      'POST /auth/senha/troca-inicial': { status: 200, corpo: { token: PENDENTE, etapa: 'CADASTRAR_SEGUNDO_FATOR' } },
      'POST /auth/segundo-fator/cadastro': { status: 200, corpo: { uriAutenticador: 'otpauth://totp/SIGH:x?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=SIGH' } },
    })
    await entrarComTemporaria()
    await userEvent.type(await screen.findByLabelText('Nova senha'), 'SenhaNova2026')
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), 'SenhaNova2026')
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha e continuar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Cadastre o segundo fator' })).toBeInTheDocument()
  })

  it('senha fraca ou diferente da confirmação não chama a API', async () => {
    const { chamadas } = renderizar('/entrar', undefined, { 'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'TROCAR_SENHA' } } })
    await entrarComTemporaria()
    await userEvent.type(await screen.findByLabelText('Nova senha'), 'curta1A')
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), 'curta1A')
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha e continuar' }))
    expect(await screen.findByText('Use ao menos 10 caracteres.')).toBeInTheDocument()
    expect(chamadas.some((c) => c.chave === 'POST /auth/senha/troca-inicial')).toBe(false)
  })

  it('mostra a recusa da API e não segue', async () => {
    renderizar('/entrar', undefined, {
      'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'TROCAR_SENHA' } },
      'POST /auth/senha/troca-inicial': { status: 422, corpo: { detail: 'A nova senha deve ser diferente da atual.' } },
    })
    await entrarComTemporaria()
    await userEvent.type(await screen.findByLabelText('Nova senha'), 'Temporaria2026Ab')
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), 'Temporaria2026Ab')
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha e continuar' }))
    expect(await screen.findByText('A nova senha deve ser diferente da atual.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Troque a sua senha' })).toBeInTheDocument()
  })

  it('a tela de troca não tem violações de acessibilidade', async () => {
    const { container } = renderizar('/entrar', undefined, { 'POST /auth/login': { status: 200, corpo: { token: PENDENTE, etapa: 'TROCAR_SENHA' } } })
    await entrarComTemporaria()
    await screen.findByRole('heading', { level: 1, name: 'Troque a sua senha' })
    expect(await violacoesDeAcessibilidade(container)).toEqual([])
  })
})

describe('alterar a própria senha', () => {
  it('pelo botão do topo, informando a senha atual', async () => {
    const { chamadas } = renderizar('/', ADM, { 'POST /auth/senha/alteracao': { status: 204 } })
    await userEvent.click(await screen.findByRole('button', { name: 'Trocar a minha senha' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Alterar senha' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Senha atual'), 'SenhaAtual2026')
    await userEvent.type(screen.getByLabelText('Nova senha'), 'OutraSenha2026')
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), 'OutraSenha2026')
    await userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /auth/senha/alteracao')?.corpo).toEqual({ senhaAtual: 'SenhaAtual2026', novaSenha: 'OutraSenha2026' }))
    expect(await screen.findByText('Senha alterada.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha atual')).toHaveValue('')
  })

  it('a recusa da senha atual aparece sem derrubar a sessão', async () => {
    renderizar('/alterar-senha', ADM, { 'POST /auth/senha/alteracao': { status: 422, corpo: { detail: 'A senha atual está incorreta.' } } })
    await userEvent.type(await screen.findByLabelText('Senha atual'), 'errada-errada1')
    await userEvent.type(screen.getByLabelText('Nova senha'), 'OutraSenha2026')
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), 'OutraSenha2026')
    await userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }))
    expect(await screen.findByText('A senha atual está incorreta.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Alterar senha' })).toBeInTheDocument()
  })
})
