import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AcaoAdministrativa, UsuarioDetalhe } from '@/api/tipos'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { renderizar, usuario, type Rotas } from '@/testes/renderizar'

const AUDITOR = { ...usuario(['AUDITOR_GESTOR']), login: 'auditor.teste' }
const HOSPITAIS = [
  { id: 'h1', nome: 'Hospital A' },
  { id: 'h2', nome: 'Hospital B' },
]
const MEDICA: UsuarioDetalhe = {
  id: 'u1',
  login: 'dra.silva',
  nome: 'Dra. Silva',
  perfis: ['MEDICO'],
  ativo: true,
  mfaHabilitado: true,
  senhaTemporaria: false,
  vinculos: [{ id: 'v1', instituicaoId: 'h1', instituicaoNome: 'Hospital A', perfis: ['MEDICO'], registroProfissional: 'CRM 1', inicioEm: '2026-01-01T00:00:00', fimEm: null, ativo: true }],
}
const RECEPCIONISTA: UsuarioDetalhe = {
  id: 'u2',
  login: 'rita.recepcao',
  nome: 'Rita Recepção',
  perfis: ['RECEPCAO'],
  ativo: false,
  mfaHabilitado: false,
  senhaTemporaria: true,
  vinculos: [],
}
const EU: UsuarioDetalhe = { ...MEDICA, id: 'u0', login: 'auditor.teste', nome: 'Auditor Teste', perfis: ['AUDITOR_GESTOR'], vinculos: [] }
const ACAO: AcaoAdministrativa = { id: 'a1', ator: 'auditor.teste', alvo: 'dra.silva', acao: 'USUARIO_CRIADO', detalhe: 'Perfis: MEDICO', ocorridoEm: '2026-11-20T09:00:00' }
const pagina = <T,>(itens: T[]) => ({ content: itens, page: { size: 10, number: 0, totalElements: itens.length, totalPages: 1 } })

function rotas(extra: Rotas = {}): Rotas {
  return {
    'GET /usuarios': { status: 200, corpo: pagina([EU, MEDICA, RECEPCIONISTA]) },
    'GET /usuarios/acoes': { status: 200, corpo: pagina([ACAO]) },
    'GET /api/instituicoes': { status: 200, corpo: HOSPITAIS },
    ...extra,
  }
}

async function abrir(extra: Rotas = {}) {
  const resultado = renderizar('/usuarios', AUDITOR, rotas(extra))
  await screen.findByRole('heading', { level: 1, name: 'Usuários' })
  await screen.findByText('Dra. Silva')
  return resultado
}

describe('Usuários (Auditor/Gestor)', () => {
  it('lista os usuários com perfil, hospitais e situação, e as ações administrativas', async () => {
    await abrir()
    const dra = screen.getByText('Dra. Silva').closest('tr') as HTMLElement
    expect(dra).toHaveTextContent('dra.silva')
    expect(dra).toHaveTextContent('Médico')
    expect(dra).toHaveTextContent('Hospital A')
    expect(dra).toHaveTextContent('Ativo')
    const rita = screen.getByText('Rita Recepção').closest('tr') as HTMLElement
    expect(rita).toHaveTextContent('Desativado')
    expect(rita).toHaveTextContent('Senha temporária')
    expect(await screen.findByText('Usuário criado')).toBeInTheDocument()
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = await abrir()
    expect(await violacoesDeAcessibilidade(container)).toEqual([])
  })

  it('a busca e os filtros vão para a API', async () => {
    const { chamadas } = await abrir()
    await userEvent.type(screen.getByLabelText('Buscar por nome ou login'), 'silva')
    await userEvent.selectOptions(screen.getByLabelText('Perfil'), 'MEDICO')
    await userEvent.selectOptions(screen.getByLabelText('Situação'), 'desativados')
    await waitFor(() => {
      const ultima = chamadas.filter((c) => c.chave === 'GET /usuarios').at(-1)
      expect(ultima?.url).toContain('busca=silva')
      expect(ultima?.url).toContain('perfil=MEDICO')
      expect(ultima?.url).toContain('ativo=false')
    })
  })

  it('cria um médico com hospital e registro, e mostra a senha temporária uma única vez', async () => {
    const criado = { usuario: { ...MEDICA, id: 'u9', login: 'novo.medico', nome: 'Novo Médico', senhaTemporaria: true }, senhaTemporaria: 'Ab3dEf7hJk9mNp2q' }
    const { chamadas } = await abrir({ 'POST /usuarios': { status: 201, corpo: criado } })
    await userEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Novo usuário' })
    await userEvent.type(within(dialogo).getByLabelText('Login'), 'novo.medico')
    await userEvent.type(within(dialogo).getByLabelText('Nome completo'), 'Novo Médico')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Perfil'), 'MEDICO')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Hospital'), 'h1')
    await userEvent.type(within(dialogo).getByLabelText(/Registro profissional/), 'CRM 777')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar usuário' }))

    expect(await screen.findByRole('dialog', { name: 'Senha temporária' })).toHaveTextContent('Ab3dEf7hJk9mNp2q')
    expect(chamadas.find((c) => c.chave === 'POST /usuarios')?.corpo).toEqual({
      login: 'novo.medico',
      nome: 'Novo Médico',
      perfis: ['MEDICO'],
      vinculos: [{ instituicaoId: 'h1', perfis: ['MEDICO'], registroProfissional: 'CRM 777' }],
    })
    await userEvent.click(screen.getByRole('button', { name: 'Já anotei, fechar' }))
    expect(screen.queryByText('Ab3dEf7hJk9mNp2q')).not.toBeInTheDocument()
  })

  it('valida o cadastro antes de enviar: login, nome, perfil, hospital e registro', async () => {
    const { chamadas } = await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Novo usuário' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar usuário' }))
    expect(within(dialogo).getByLabelText('Login')).toHaveAccessibleDescription(/3 a 40 caracteres/)
    expect(within(dialogo).getByText('Digite o nome.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Escolha o perfil.')).toBeInTheDocument()

    await userEvent.type(within(dialogo).getByLabelText('Login'), 'medico.x')
    await userEvent.type(within(dialogo).getByLabelText('Nome completo'), 'Médico X')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Perfil'), 'MEDICO')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar usuário' }))
    expect(within(dialogo).getByText('Escolha o hospital.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Informe o registro profissional.')).toBeInTheDocument()
    expect(chamadas.some((c) => c.chave === 'POST /usuarios')).toBe(false)
  })

  it('perfil sem vínculo (Auditor/Gestor) não pede hospital', async () => {
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Novo usuário' })
    await userEvent.selectOptions(within(dialogo).getByLabelText('Perfil'), 'AUDITOR_GESTOR')
    expect(within(dialogo).queryByLabelText('Hospital')).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole('option', { name: 'Paciente' })).not.toBeInTheDocument()
  })

  it('desativa pedindo confirmação, e o próprio auditor não pode se desativar', async () => {
    const { chamadas } = await abrir({ 'PATCH /usuarios/u1/ativo': { status: 200, corpo: { ...MEDICA, ativo: false } } })
    expect(screen.getByRole('button', { name: 'Desativar Auditor Teste' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redefinir a senha de Auditor Teste' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Desativar Dra. Silva' }))
    const confirmacao = await screen.findByRole('alertdialog', { name: 'Desativar usuário' })
    expect(confirmacao).toHaveTextContent('a sessão que já estiver aberta cai')
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Desativar' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'PATCH /usuarios/u1/ativo')?.corpo).toEqual({ ativo: false }))
  })

  it('reativa um usuário desativado', async () => {
    const { chamadas } = await abrir({ 'PATCH /usuarios/u2/ativo': { status: 200, corpo: { ...RECEPCIONISTA, ativo: true } } })
    await userEvent.click(screen.getByRole('button', { name: 'Reativar Rita Recepção' }))
    const confirmacao = await screen.findByRole('alertdialog', { name: 'Reativar usuário' })
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Reativar' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'PATCH /usuarios/u2/ativo')?.corpo).toEqual({ ativo: true }))
  })

  it('redefine a senha e mostra a nova senha temporária', async () => {
    await abrir({ 'POST /usuarios/u1/senha-temporaria': { status: 200, corpo: { login: 'dra.silva', senhaTemporaria: 'Zx8Wv5Ut3Sr2Qp7N' } } })
    await userEvent.click(screen.getByRole('button', { name: 'Redefinir a senha de Dra. Silva' }))
    const confirmacao = await screen.findByRole('alertdialog', { name: 'Redefinir senha' })
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Gerar nova senha' }))
    expect(await screen.findByRole('dialog', { name: 'Senha temporária' })).toHaveTextContent('Zx8Wv5Ut3Sr2Qp7N')
  })

  it('zera o segundo fator depois de confirmar', async () => {
    const { chamadas } = await abrir({ 'POST /usuarios/u1/segundo-fator/reinicio': { status: 200, corpo: { ...MEDICA, mfaHabilitado: false } } })
    await userEvent.click(screen.getByRole('button', { name: 'Zerar o segundo fator de Dra. Silva' }))
    const confirmacao = await screen.findByRole('alertdialog', { name: 'Zerar segundo fator' })
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Zerar segundo fator' }))
    await waitFor(() => expect(chamadas.some((c) => c.chave === 'POST /usuarios/u1/segundo-fator/reinicio')).toBe(true))
  })

  it('mostra a recusa da API na confirmação, sem fechar', async () => {
    await abrir({ 'PATCH /usuarios/u1/ativo': { status: 422, corpo: { detail: 'A rede precisa de ao menos um auditor/gestor ativo.' } } })
    await userEvent.click(screen.getByRole('button', { name: 'Desativar Dra. Silva' }))
    const confirmacao = await screen.findByRole('alertdialog', { name: 'Desativar usuário' })
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Desativar' }))
    expect(await within(confirmacao).findByText('A rede precisa de ao menos um auditor/gestor ativo.')).toBeInTheDocument()
  })

  it('adiciona e encerra vínculos', async () => {
    const comDois: UsuarioDetalhe = {
      ...MEDICA,
      vinculos: [...MEDICA.vinculos, { id: 'v2', instituicaoId: 'h2', instituicaoNome: 'Hospital B', perfis: ['MEDICO'], registroProfissional: 'CRM 1', inicioEm: '2026-11-20T00:00:00', fimEm: null, ativo: true }],
    }
    const { chamadas } = await abrir({
      'POST /usuarios/u1/vinculos': { status: 201, corpo: comDois },
      'POST /usuarios/u1/vinculos/v1/encerramento': { status: 200, corpo: MEDICA },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Vínculos de Dra. Silva' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Vínculos de Dra. Silva' })
    expect(dialogo).toHaveTextContent('Hospital A')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Hospital'), 'h2')
    await userEvent.type(within(dialogo).getByLabelText(/Registro profissional/), 'CRM 1')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Adicionar vínculo' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /usuarios/u1/vinculos')?.corpo).toEqual({ instituicaoId: 'h2', perfis: ['MEDICO'], registroProfissional: 'CRM 1' }))
    expect(await within(within(dialogo).getByRole('table')).findByText('Hospital B')).toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Encerrar vínculo com Hospital A' }))
    await waitFor(() => expect(chamadas.some((c) => c.chave === 'POST /usuarios/u1/vinculos/v1/encerramento')).toBe(true))
  })

  it('só o Auditor/Gestor vê o item Usuários', async () => {
    renderizar('/usuarios', usuario(['MEDICO'], [{ instituicaoId: 'h1', instituicaoNome: 'Hospital A', perfis: ['MEDICO'] }]), {})
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Usuários' })).not.toBeInTheDocument())
  })
})
