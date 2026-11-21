import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { HOSPITAL_A, HOSPITAL_B, renderizar, usuario, type Rotas } from '@/testes/renderizar'

const CPF = '529.982.247-25'
const RECEPCIONISTA = usuario(['RECEPCAO'], [{ ...HOSPITAL_A, perfis: ['RECEPCAO'] }])
const ENCONTRADO: Rotas = {
  'POST /api/pacientes/busca': { status: 200, corpo: { id: 'p1', nome: 'Maria das Dores', dataNascimento: '1958-03-12' } },
}
const NAO_ENCONTRADO: Rotas = {
  'POST /api/pacientes/busca': { status: 404, corpo: { detail: 'Paciente não encontrado na rede.' } },
}
const ADMISSAO = (novoCadastro: boolean): Rotas => ({
  'POST /api/pacientes/admissoes': { status: 201, corpo: { pacienteId: 'p1', prontuarioId: 'pr1', atendimentoId: 'a1', novoCadastro } },
})

async function abrir(rotas: Rotas = {}, logado = RECEPCIONISTA) {
  const resultado = renderizar('/pacientes', logado, rotas)
  await screen.findByRole('heading', { level: 1, name: 'Pacientes' })
  return resultado
}

async function buscar(cpf = CPF) {
  const campo = screen.getByLabelText('CPF do paciente')
  await userEvent.clear(campo)
  await userEvent.type(campo, cpf)
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
}

describe('FE-03: busca por CPF na rede', () => {
  it('CPF inválido mostra erro claro no campo e não chama a API', async () => {
    const { chamadas } = await abrir()
    await buscar('529.982.247-24')
    const campo = screen.getByLabelText('CPF do paciente')
    expect(campo).toHaveAccessibleDescription('CPF inválido. Confira os dígitos.')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveFocus()
    expect(chamadas.filter((c) => c.chave.includes('/api/pacientes'))).toHaveLength(0)
  })

  it('aplica a máscara enquanto digita', async () => {
    await abrir()
    await userEvent.type(screen.getByLabelText('CPF do paciente'), '52998224725')
    expect(screen.getByLabelText('CPF do paciente')).toHaveValue(CPF)
  })

  it('o CPF vai no corpo, com a instituição ativa, e nunca na URL nem no navegador', async () => {
    const { chamadas } = await abrir(ENCONTRADO)
    await buscar()
    await screen.findByRole('heading', { name: 'Paciente já cadastrado na rede' })
    const busca = chamadas.find((c) => c.chave === 'POST /api/pacientes/busca')
    expect(busca?.corpo).toEqual({ cpf: CPF, instituicaoId: 'hospital-a' })
    expect(chamadas.every((c) => !/\d{3}\.?\d{3}/.test(c.chave))).toBe(true)
    const guardado = JSON.stringify({ ...window.sessionStorage }) + JSON.stringify({ ...window.localStorage })
    expect(guardado).not.toContain('52998224725')
    expect(guardado).not.toContain(CPF)
  })

  it('falha de permissão vira alerta, sem abrir cadastro', async () => {
    await abrir({ 'POST /api/pacientes/busca': { status: 403 } })
    await buscar()
    const aviso = await screen.findByText(/não tem vínculo administrativo ativo/)
    expect(aviso.closest('[aria-live="polite"]')).not.toBeNull()
    expect(aviso.closest('[role="alert"]')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Cadastrar paciente' })).not.toBeInTheDocument()
  })
})

describe('FE-03: CPF já cadastrado em outra instituição reaproveita o prontuário (RN-004)', () => {
  it('mostra o paciente e abre o atendimento só com o motivo', async () => {
    const { chamadas } = await abrir({ ...ENCONTRADO, ...ADMISSAO(false) })
    await buscar()
    const resultado = await screen.findByRole('region', { name: 'Paciente já cadastrado na rede' })
    expect(within(resultado).getByRole('heading', { name: 'Paciente já cadastrado na rede' })).toHaveFocus()
    expect(within(resultado).getByText('Maria das Dores')).toBeInTheDocument()
    expect(within(resultado).getByText(/12\/03\/1958/)).toBeInTheDocument()
    expect(within(resultado).queryByLabelText('Nome completo')).not.toBeInTheDocument()
    expect(within(resultado).queryByRole('group', { name: /Consentimento/ })).not.toBeInTheDocument()
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])

    await userEvent.type(screen.getByLabelText('O que o paciente está sentindo'), '  Dor no peito há duas horas  ')
    await userEvent.click(screen.getByRole('button', { name: 'Abrir atendimento' }))

    expect(await screen.findByRole('heading', { name: 'Atendimento aberto' })).toHaveFocus()
    expect(screen.getByText(/Maria das Dores já pode seguir para a triagem/)).toBeInTheDocument()
    const admissao = chamadas.find((c) => c.chave === 'POST /api/pacientes/admissoes')
    expect(admissao?.corpo).toEqual({ cpf: CPF, instituicaoId: 'hospital-a', motivo: 'Dor no peito há duas horas' })
  })

  it('motivo é obrigatório', async () => {
    const { chamadas } = await abrir(ENCONTRADO)
    await buscar()
    await screen.findByRole('heading', { name: 'Paciente já cadastrado na rede' })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir atendimento' }))
    expect(screen.getByLabelText('O que o paciente está sentindo')).toHaveFocus()
    expect(screen.getByText('Informe o que o paciente está sentindo.')).toBeInTheDocument()
    expect(chamadas.some((c) => c.chave === 'POST /api/pacientes/admissoes')).toBe(false)
  })

  it('trocar o CPF depois de buscar descarta o paciente encontrado', async () => {
    await abrir(ENCONTRADO)
    await buscar()
    await screen.findByRole('heading', { name: 'Paciente já cadastrado na rede' })
    await userEvent.type(screen.getByLabelText('CPF do paciente'), '{backspace}')
    expect(screen.queryByText('Maria das Dores')).not.toBeInTheDocument()
  })

  it('"Atender outro paciente" limpa a tela e volta o foco ao CPF', async () => {
    await abrir({ ...ENCONTRADO, ...ADMISSAO(false) })
    await buscar()
    await userEvent.type(await screen.findByLabelText('O que o paciente está sentindo'), 'Febre')
    await userEvent.click(screen.getByRole('button', { name: 'Abrir atendimento' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Atender outro paciente' }))
    const campo = screen.getByLabelText('CPF do paciente')
    expect(campo).toHaveValue('')
    await waitFor(() => expect(campo).toHaveFocus())
    expect(screen.queryByRole('heading', { name: 'Atendimento aberto' })).not.toBeInTheDocument()
  })
})

describe('FE-03: cadastro de quem não está na rede, com consentimento inicial (RF-002)', () => {
  async function abrirCadastro(rotas: Rotas = ADMISSAO(true)) {
    const resultado = await abrir({ ...NAO_ENCONTRADO, ...rotas })
    await buscar()
    expect(await screen.findByRole('heading', { name: 'Cadastrar paciente' })).toHaveFocus()
    return resultado
  }

  async function preencher({ nome = 'João Nascimento', data = '1990-05-20', motivo = 'Corte na mão' } = {}) {
    if (nome) await userEvent.type(screen.getByLabelText('Nome completo'), nome)
    if (data) await userEvent.type(screen.getByLabelText('Data de nascimento'), data)
    if (motivo) await userEvent.type(screen.getByLabelText('O que o paciente está sentindo'), motivo)
  }

  it('cadastra com a autorização e abre o atendimento', async () => {
    const { chamadas } = await abrirCadastro()
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
    await preencher()
    await userEvent.click(screen.getByRole('radio', { name: /Autoriza o compartilhamento na rede/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e abrir atendimento' }))

    expect(await screen.findByRole('heading', { name: 'Atendimento aberto' })).toBeInTheDocument()
    expect(screen.getByText(/O cadastro e o prontuário dele foram criados na rede/)).toBeInTheDocument()
    const admissao = chamadas.find((c) => c.chave === 'POST /api/pacientes/admissoes')
    expect(admissao?.corpo).toEqual({
      cpf: CPF,
      instituicaoId: 'hospital-a',
      motivo: 'Corte na mão',
      nome: 'João Nascimento',
      dataNascimento: '1990-05-20',
      consentimentoInicial: 'AUTORIZADO',
    })
  })

  it('sem manifestação, o consentimento não vai na admissão', async () => {
    const { chamadas } = await abrirCadastro()
    expect(screen.getByRole('radio', { name: /Não se manifestou agora/ })).toBeChecked()
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e abrir atendimento' }))
    await screen.findByRole('heading', { name: 'Atendimento aberto' })
    const corpo = chamadas.find((c) => c.chave === 'POST /api/pacientes/admissoes')?.corpo as Record<string, unknown>
    expect(corpo).not.toHaveProperty('consentimentoInicial')
  })

  it('NEGADO é enviado quando o paciente não autoriza', async () => {
    const { chamadas } = await abrirCadastro()
    await preencher()
    await userEvent.click(screen.getByRole('radio', { name: /^Não autoriza/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e abrir atendimento' }))
    await screen.findByRole('heading', { name: 'Atendimento aberto' })
    expect(chamadas.find((c) => c.chave === 'POST /api/pacientes/admissoes')?.corpo).toMatchObject({ consentimentoInicial: 'NEGADO' })
  })

  it('campos obrigatórios e data no futuro', async () => {
    const { chamadas } = await abrirCadastro()
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e abrir atendimento' }))
    expect(screen.getByLabelText('Nome completo')).toHaveFocus()
    expect(screen.getByText('Informe o nome completo.')).toBeInTheDocument()
    expect(screen.getByText('Informe a data de nascimento.')).toBeInTheDocument()
    expect(screen.getByText('Informe o que o paciente está sentindo.')).toBeInTheDocument()

    await preencher({ data: '2999-01-01', motivo: 'Tontura' })
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e abrir atendimento' }))
    expect(screen.getByLabelText('Data de nascimento')).toHaveAccessibleDescription('A data de nascimento não pode estar no futuro.')
    expect(chamadas.some((c) => c.chave === 'POST /api/pacientes/admissoes')).toBe(false)
  })

  it('erro de campo da API aparece no campo', async () => {
    await abrirCadastro({
      'POST /api/pacientes/admissoes': { status: 400, corpo: { detail: 'Dados inválidos.', campos: { nome: 'Nome deve ter no máximo 150 caracteres' } } },
    })
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e abrir atendimento' }))
    await waitFor(() => expect(screen.getByLabelText('Nome completo')).toHaveFocus())
    expect(screen.getByLabelText('Nome completo')).toHaveAccessibleDescription('Nome deve ter no máximo 150 caracteres')
  })

  it('CPF duplicado por outra recepção ao mesmo tempo: aviso claro e prontuário existente', async () => {
    await abrirCadastro(ADMISSAO(false))
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e abrir atendimento' }))
    await screen.findByRole('heading', { name: 'Atendimento aberto' })
    expect(screen.getByRole('alert')).toHaveTextContent('Este CPF já tinha cadastro na rede')
    expect(screen.getByText(/O paciente já pode seguir para a triagem/)).toBeInTheDocument()
    expect(screen.queryByText(/João Nascimento já pode/)).not.toBeInTheDocument()
  })

  it('conflito (409) pede para buscar de novo', async () => {
    await abrirCadastro({ 'POST /api/pacientes/admissoes': { status: 409, corpo: { detail: 'conflito' } } })
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e abrir atendimento' }))
    expect((await screen.findByText(/Busque o CPF de novo/)).closest('[aria-live="polite"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Cadastrar e abrir atendimento' })).toBeEnabled()
  })
})

describe('FE-03: instituição ativa', () => {
  it('trocar a instituição recomeça a tela e busca na nova', async () => {
    const logado = usuario(['RECEPCAO'], [
      { ...HOSPITAL_A, perfis: ['RECEPCAO'] },
      { ...HOSPITAL_B, perfis: ['RECEPCAO'] },
    ])
    const { chamadas } = renderizar('/', logado, ENCONTRADO)
    await userEvent.selectOptions(await screen.findByLabelText('Instituição ativa'), 'hospital-a')
    await userEvent.click(await screen.findByRole('link', { name: 'Pacientes' }))
    await buscar()
    await screen.findByText('Maria das Dores')

    await userEvent.selectOptions(screen.getByLabelText('Instituição ativa'), 'hospital-b')
    await waitFor(() => expect(screen.queryByText('Maria das Dores')).not.toBeInTheDocument())
    expect(screen.getByLabelText('CPF do paciente')).toHaveValue('')
    expect(screen.getByText('Atendimento em Hospital B')).toBeInTheDocument()
    await buscar()
    await screen.findByText('Maria das Dores')
    const buscas = chamadas.filter((c) => c.chave === 'POST /api/pacientes/busca')
    expect(buscas.map((c) => (c.corpo as { instituicaoId: string }).instituicaoId)).toEqual(['hospital-a', 'hospital-b'])
  })
})

function segurar(chave: string, resposta: { status: number; corpo?: unknown }) {
  let soltar: () => void = () => {}
  const original = globalThis.fetch
  const segurado = vi.fn(async (url: string, init: RequestInit = {}) => {
    const caminho = new URL(url, 'http://localhost').pathname
    if (`${init.method ?? 'GET'} ${caminho}` !== chave) return original(url, init)
    await new Promise<void>((resolve) => (soltar = resolve))
    if (init.signal?.aborted) throw new DOMException('cancelada', 'AbortError')
    return new Response(resposta.corpo === undefined ? null : JSON.stringify(resposta.corpo), {
      status: resposta.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', segurado)
  return () => soltar()
}

describe('FE-03: corridas com a rede lenta', () => {
  it('corrigir o CPF durante a busca descarta a resposta antiga (não cadastra no CPF errado)', async () => {
    await abrir()
    const soltar = segurar('POST /api/pacientes/busca', { status: 404, corpo: { detail: 'Paciente não encontrado na rede.' } })
    await buscar('529.982.247-25')
    expect(screen.getByRole('button', { name: 'Buscando…' })).toBeDisabled()

    const campo = screen.getByLabelText('CPF do paciente')
    await userEvent.clear(campo)
    await userEvent.type(campo, '111.444.777-35')
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeEnabled()
    soltar()
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('heading', { name: 'Cadastrar paciente' })).not.toBeInTheDocument()
    expect(campo).toHaveValue('111.444.777-35')
  })

  it('o resultado mostra o CPF consultado', async () => {
    await abrir({ ...ENCONTRADO })
    await buscar()
    const resultado = await screen.findByRole('region', { name: 'Paciente já cadastrado na rede' })
    expect(within(resultado).getByText(CPF)).toBeInTheDocument()
  })

  it('enquanto a admissão é enviada, o CPF e a busca ficam travados', async () => {
    await abrir(ENCONTRADO)
    await buscar()
    await userEvent.type(await screen.findByLabelText('O que o paciente está sentindo'), 'Febre')
    const soltar = segurar('POST /api/pacientes/admissoes', { status: 201, corpo: { pacienteId: 'p1', prontuarioId: 'pr1', atendimentoId: 'a1', novoCadastro: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir atendimento' }))
    expect(screen.getByLabelText('CPF do paciente')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled()
    soltar()
    expect(await screen.findByRole('heading', { name: 'Atendimento aberto' })).toBeInTheDocument()
    expect(screen.getByLabelText('CPF do paciente')).toHaveValue(CPF)
  })

  it('se a admissão falha, o CPF volta a ficar editável', async () => {
    await abrir({ ...ENCONTRADO, 'POST /api/pacientes/admissoes': { status: 409, corpo: { detail: 'conflito' } } })
    await buscar()
    await userEvent.type(await screen.findByLabelText('O que o paciente está sentindo'), 'Febre')
    await userEvent.click(screen.getByRole('button', { name: 'Abrir atendimento' }))
    await screen.findByText(/Busque o CPF de novo/)
    expect(screen.getByLabelText('CPF do paciente')).toBeEnabled()
  })
})

describe('FE-03: opções de consentimento', () => {
  it('o nome do rádio é só o rótulo, e a explicação vem como descrição', async () => {
    await abrir(NAO_ENCONTRADO)
    await buscar()
    const opcao = await screen.findByRole('radio', { name: 'Não autoriza' })
    expect(opcao).toHaveAccessibleDescription('O histórico não é compartilhado com as outras instituições, a não ser em emergência.')
  })
})
