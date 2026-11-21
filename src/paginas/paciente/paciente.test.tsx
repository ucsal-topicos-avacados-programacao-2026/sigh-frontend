import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AcessoDoPaciente, ConsentimentosDoPaciente, RegistroDoHistorico, Restricao } from '@/api/tipos'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { renderizar, usuario, type Rotas } from '@/testes/renderizar'

const PACIENTE = usuario(['PACIENTE'])
const TITULAR = { pacienteId: 'p1', nome: 'Ana Souza', relacao: 'TITULAR' }
const REPRESENTADO = { pacienteId: 'p2', nome: 'Bia Souza', relacao: 'REPRESENTANTE_LEGAL' }

const REGISTROS: RegistroDoHistorico[] = [
  {
    id: 'r1',
    tipo: 'DIAGNOSTICO',
    criadoEm: '2026-11-10T14:05:00.123456',
    conteudo: 'Ansiedade generalizada.\nAcompanhamento semanal.',
    categoriaInformacao: 'Saúde mental',
    codigoCID10: 'F41.1',
    instituicaoOrigemId: 'h1',
    instituicaoOrigem: 'Hospital A',
    restrito: false,
  },
  {
    id: 'r2',
    tipo: 'EXAME',
    criadoEm: '2026-10-02T09:30:00',
    conteudo: 'Hemograma normal.',
    categoriaInformacao: 'Clínica geral',
    codigoCID10: null,
    instituicaoOrigemId: 'h2',
    instituicaoOrigem: 'Hospital B',
    restrito: true,
  },
  {
    id: 'r3',
    tipo: 'EVOLUCAO',
    criadoEm: '2026-09-01T16:00:00',
    conteudo: 'Paciente estável.',
    categoriaInformacao: null,
    codigoCID10: null,
    instituicaoOrigemId: 'h1',
    instituicaoOrigem: 'Hospital A',
    restrito: false,
  },
]

const acesso = (n: number, emergencia = false): AcessoDoPaciente => ({
  ocorridoEm: `2026-11-1${n % 10}T08:0${n % 10}:00`,
  profissional: `Profissional ${n}`,
  perfil: 'MEDICO',
  instituicao: 'Hospital A',
  finalidade: emergencia ? 'Acesso de emergência' : 'Atendimento',
  emergencia,
})

const pagina = (itens: AcessoDoPaciente[], total = itens.length, numero = 0) => ({
  content: itens,
  page: { size: 10, number: numero, totalElements: total, totalPages: Math.ceil(total / 10) },
})

const CONSENTIMENTO = (decisao: 'AUTORIZADO' | 'REVOGADO' | 'NEGADO' | null): ConsentimentosDoPaciente => {
  const vigente = decisao && { id: 'c2', versao: 2, tipo: 'AMPLO' as const, decisao, vigenteDesde: '2026-11-10T12:00:00' }
  return {
    vigente,
    historico: vigente ? [{ id: 'c1', versao: 1, tipo: 'AMPLO', decisao: 'NEGADO', vigenteDesde: '2026-01-05T10:00:00' }, vigente] : [],
  }
}

const RESTRICOES: Restricao[] = [
  { id: 'x1', categoria: 'Saúde mental', registroId: null, inicioEm: '2026-11-11T10:00:00', fimEm: null, vigente: true, definidaPor: 'Ana Souza', encerradaPor: null },
  { id: 'x2', categoria: null, registroId: 'r2', inicioEm: '2026-11-12T10:00:00', fimEm: null, vigente: true, definidaPor: 'Ana Souza', encerradaPor: null },
  { id: 'x3', categoria: 'Dermatologia', registroId: null, inicioEm: '2026-01-01T10:00:00', fimEm: '2026-02-01T10:00:00', vigente: false, definidaPor: 'Ana Souza', encerradaPor: 'Ana Souza' },
]

function rotasDoPaciente(extra: Rotas = {}): Rotas {
  return {
    'GET /api/pacientes/gerenciados': { status: 200, corpo: [TITULAR] },
    'GET /api/pacientes/p1/historico': { status: 200, corpo: REGISTROS },
    'GET /api/pacientes/p1/acessos': { status: 200, corpo: pagina([acesso(1), acesso(2, true)]) },
    'GET /api/pacientes/p1/consentimentos': { status: 200, corpo: CONSENTIMENTO('AUTORIZADO') },
    'GET /api/pacientes/p1/restricoes': { status: 200, corpo: RESTRICOES },
    'GET /api/pacientes/p1/autorizacoes': { status: 200, corpo: [] },
    'GET /api/instituicoes': { status: 200, corpo: [{ id: 'h1', nome: 'Hospital A' }, { id: 'h3', nome: 'Hospital C' }] },
    ...extra,
  }
}

async function abrir(rota: '/meu-prontuario' | '/consentimentos', extra: Rotas = {}) {
  const resultado = renderizar(rota, PACIENTE, rotasDoPaciente(extra))
  await screen.findByRole('heading', { level: 1, name: rota === '/meu-prontuario' ? 'Meu prontuário' : 'Consentimentos' })
  return resultado
}

const regiao = (nome: string) => screen.findByRole('region', { name: nome })

describe('FE-05: Meu prontuário — histórico na rede', () => {
  it('mostra cada registro com tipo, data, instituição, categoria, CID e se está restrito', async () => {
    await abrir('/meu-prontuario')
    const historico = await regiao('Histórico na rede')
    const diagnostico = await within(historico).findByRole('article', { name: /Diagnóstico/ })
    expect(diagnostico).toHaveTextContent('10/11/2026 às 14:05 · Hospital A · Saúde mental')
    expect(diagnostico).toHaveTextContent('CID F41.1')
    expect(diagnostico).toHaveTextContent('Ansiedade generalizada.')
    expect(within(diagnostico).queryByText('Restrito')).not.toBeInTheDocument()
    const exame = within(historico).getByRole('article', { name: /Exame/ })
    expect(within(exame).getByText('Restrito')).toBeInTheDocument()
    expect(within(exame).getByRole('link', { name: 'Gerenciar restrições' })).toHaveAttribute('href', '/consentimentos')
    expect(within(exame).queryByRole('button', { name: 'Restringir este registro' })).not.toBeInTheDocument()
    await screen.findByRole('cell', { name: /Profissional 1/ })
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
  })

  it('restringir um registro explica o efeito, envia o registro e recarrega o histórico', async () => {
    const { chamadas } = await abrir('/meu-prontuario', {
      'POST /api/pacientes/p1/restricoes': { status: 201, corpo: RESTRICOES[1] },
    })
    // O terceiro registro: a restrição vai para o registro escolhido, e não para o primeiro da lista.
    const evolucao = await screen.findByRole('article', { name: /Evolução/ })
    await userEvent.click(within(evolucao).getByRole('button', { name: 'Restringir este registro' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Restringir este registro?' })
    expect(dialogo).toHaveTextContent('Evolução de 01/09/2026, Hospital A')
    // A restrição vale para todas as instituições, inclusive a que fez o registro (historicoVisivel).
    expect(dialogo).toHaveTextContent('Nenhuma instituição da rede vê essa informação, nem a que fez o registro')
    const buscasAntes = chamadas.filter((c) => c.chave === 'GET /api/pacientes/p1/historico').length
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Restringir' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(chamadas.find((c) => c.chave === 'POST /api/pacientes/p1/restricoes')?.corpo).toEqual({ registroId: 'r3' })
    await waitFor(() => expect(chamadas.filter((c) => c.chave === 'GET /api/pacientes/p1/historico').length).toBeGreaterThan(buscasAntes))
    expect(await screen.findByText('Registro restrito.')).toBeInTheDocument()
  })

  it('a recusa da API aparece no diálogo, que continua aberto', async () => {
    await abrir('/meu-prontuario', {
      'POST /api/pacientes/p1/restricoes': { status: 422, corpo: { detail: 'Essa informação já está restrita.' } },
    })
    const diagnostico = await screen.findByRole('article', { name: /Diagnóstico/ })
    await userEvent.click(within(diagnostico).getByRole('button', { name: 'Restringir este registro' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Restringir' }))
    expect(await within(screen.getByRole('alertdialog')).findByText('Essa informação já está restrita.')).toBeInTheDocument()
  })

  it('sem registros, diz isso', async () => {
    await abrir('/meu-prontuario', { 'GET /api/pacientes/p1/historico': { status: 200, corpo: [] } })
    expect(await screen.findByText('Ainda não há registros no seu histórico.')).toBeInTheDocument()
  })
})

describe('FE-05: Meu prontuário — quem acessou (RF-008)', () => {
  it('mostra profissional, perfil, instituição, data e finalidade, e marca a emergência', async () => {
    await abrir('/meu-prontuario')
    const painel = await regiao('Quem acessou seu prontuário')
    await within(painel).findByText('Profissional 1')
    const linhas = within(painel).getAllByRole('row')
    expect(linhas).toHaveLength(3)
    expect(linhas[1]).toHaveTextContent('11/11/2026 às 08:01')
    expect(linhas[1]).toHaveTextContent('Profissional 1')
    expect(linhas[1]).toHaveTextContent('Médico')
    expect(linhas[1]).toHaveTextContent('Hospital A')
    expect(linhas[1]).toHaveTextContent('Atendimento')
    expect(within(linhas[1] as HTMLElement).queryByText('Emergência')).not.toBeInTheDocument()
    expect(within(linhas[2] as HTMLElement).getByText('Emergência')).toBeInTheDocument()
  })

  it('a coluna da página não passa da largura da tela: a tabela rola dentro do painel (FE-11, WCAG 1.4.10)', async () => {
    await abrir('/meu-prontuario')
    const painel = await regiao('Quem acessou seu prontuário')
    // grid-cols-1 é repeat(1, minmax(0, 1fr)): sem ele, a coluna implícita do grid cresce até a largura mínima da tabela.
    expect(painel.parentElement).toHaveClass('grid-cols-1')
  })

  it('pagina de 10 em 10', async () => {
    const dez = Array.from({ length: 10 }, (_, i) => acesso(i))
    const { chamadas } = await abrir('/meu-prontuario', {
      'GET /api/pacientes/p1/acessos': { status: 200, corpo: pagina(dez, 25) },
    })
    expect(await screen.findByText('Página 1 de 3 · 25 acessos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(chamadas.some((c) => c.chave.endsWith('/acessos') && /page=1&size=10/.test(c.url))).toBe(true))
    expect(chamadas.find((c) => c.chave.endsWith('/acessos'))?.url).toMatch(/page=0&size=10/)
  })

  it('sem acessos, diz isso', async () => {
    await abrir('/meu-prontuario', { 'GET /api/pacientes/p1/acessos': { status: 200, corpo: pagina([]) } })
    expect(await screen.findByText('Ninguém acessou seu prontuário até agora.')).toBeInTheDocument()
  })
})

describe('FE-05: de quem são os dados', () => {
  it('acesso sem cadastro de paciente ligado: aviso claro', async () => {
    await abrir('/meu-prontuario', { 'GET /api/pacientes/gerenciados': { status: 200, corpo: [] } })
    expect(await screen.findByText('Seu acesso ainda não está ligado a um cadastro de paciente')).toBeInTheDocument()
  })

  it('representante legal escolhe de quem ver os dados', async () => {
    const { chamadas } = await abrir('/meu-prontuario', {
      'GET /api/pacientes/gerenciados': { status: 200, corpo: [TITULAR, REPRESENTADO] },
      'GET /api/pacientes/p2/historico': { status: 200, corpo: [{ ...REGISTROS[0], id: 'r9', tipo: 'ALERGIA', instituicaoOrigem: 'Hospital Z' }] },
      'GET /api/pacientes/p2/acessos': { status: 200, corpo: pagina([]) },
    })
    const seletor = await screen.findByLabelText('Dados de')
    expect(within(seletor).getAllByRole('option').map((o) => o.textContent)).toEqual(['Ana Souza (você)', 'Bia Souza (representado)'])
    await userEvent.selectOptions(seletor, 'p2')
    expect(await screen.findByRole('article', { name: /Alergia/ })).toBeInTheDocument()
    expect(screen.getByText('Dados de Bia Souza, que você representa.')).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: /Diagnóstico/ })).not.toBeInTheDocument()
    expect(chamadas.some((c) => c.chave === 'GET /api/pacientes/p2/historico')).toBe(true)
  })

  it('o titular vem primeiro, mesmo que a API o devolva depois do representado', async () => {
    await abrir('/meu-prontuario', { 'GET /api/pacientes/gerenciados': { status: 200, corpo: [REPRESENTADO, TITULAR] } })
    expect(await screen.findByLabelText('Dados de')).toHaveValue('p1')
    expect(await screen.findByRole('article', { name: /Diagnóstico/ })).toBeInTheDocument()
  })

  it('trocar de paciente descarta o que foi começado para o outro', async () => {
    await abrir('/consentimentos', {
      'GET /api/pacientes/gerenciados': { status: 200, corpo: [TITULAR, REPRESENTADO] },
      'GET /api/pacientes/p2/historico': { status: 200, corpo: [] },
      'GET /api/pacientes/p2/consentimentos': { status: 200, corpo: CONSENTIMENTO(null) },
      'GET /api/pacientes/p2/restricoes': { status: 200, corpo: [] },
      'GET /api/pacientes/p2/autorizacoes': { status: 200, corpo: [] },
    })
    const campo = await screen.findByLabelText('Restringir uma categoria')
    await userEvent.type(campo, 'Saúde mental')
    await userEvent.selectOptions(screen.getByLabelText('Dados de'), 'p2')
    await screen.findByText('Sem decisão')
    expect(screen.getByLabelText('Restringir uma categoria')).toHaveValue('')
  })

  it('com um cadastro só, não há seletor', async () => {
    await abrir('/meu-prontuario')
    await screen.findByRole('article', { name: /Diagnóstico/ })
    expect(screen.queryByLabelText('Dados de')).not.toBeInTheDocument()
  })
})

describe('FE-05: Consentimentos — compartilhamento na rede (RF-002, RN-007)', () => {
  it('autorizado: mostra a situação e, ao revogar, explica o efeito antes de confirmar', async () => {
    const { chamadas } = await abrir('/consentimentos', {
      'POST /api/pacientes/p1/consentimentos': { status: 201, corpo: CONSENTIMENTO('REVOGADO').vigente },
    })
    const painel = await regiao('Compartilhamento do histórico na rede')
    expect(await within(painel).findByText('Autorizado')).toBeInTheDocument()
    expect(painel).toHaveTextContent('As instituições credenciadas da rede podem consultar o seu histórico')
    await userEvent.click(within(painel).getByRole('button', { name: 'Revogar o compartilhamento' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Revogar o compartilhamento?' })
    expect(dialogo).toHaveTextContent('As instituições que já atenderam você até agora continuam vendo o seu histórico.')
    expect(dialogo).toHaveTextContent('As que ainda não atenderam você deixam de ver, a não ser numa emergência.')
    expect(dialogo).toHaveTextContent('Você pode autorizar de novo quando quiser.')
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Revogar' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /api/pacientes/p1/consentimentos')?.corpo).toEqual({ decisao: 'REVOGADO' }))
    expect(await screen.findByText('Compartilhamento revogado.')).toBeInTheDocument()
  })

  it('revogado: diz até quando as instituições que já atenderam continuam vendo, e permite autorizar de novo', async () => {
    const { chamadas } = await abrir('/consentimentos', {
      'GET /api/pacientes/p1/consentimentos': { status: 200, corpo: CONSENTIMENTO('REVOGADO') },
      'POST /api/pacientes/p1/consentimentos': { status: 201, corpo: CONSENTIMENTO('AUTORIZADO').vigente },
    })
    const painel = await regiao('Compartilhamento do histórico na rede')
    expect(await within(painel).findByText('Revogado')).toBeInTheDocument()
    expect(painel).toHaveTextContent('As instituições que já tinham atendido você até 10/11/2026 às 12:00 continuam vendo o seu histórico.')
    await userEvent.click(within(painel).getByRole('button', { name: 'Autorizar o compartilhamento' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('O que você restringiu continua restrito.')
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Autorizar' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /api/pacientes/p1/consentimentos')?.corpo).toEqual({ decisao: 'AUTORIZADO' }))
  })

  it.each([
    [null, 'Sem decisão'],
    ['NEGADO', 'Não autorizado'],
  ] as const)('%s: não compartilha e oferece autorizar', async (decisao, situacao) => {
    await abrir('/consentimentos', { 'GET /api/pacientes/p1/consentimentos': { status: 200, corpo: CONSENTIMENTO(decisao) } })
    const painel = await regiao('Compartilhamento do histórico na rede')
    expect(await within(painel).findByText(situacao)).toBeInTheDocument()
    expect(painel).toHaveTextContent('Cada instituição vê só o que ela mesma registrou.')
    expect(within(painel).getByRole('button', { name: 'Autorizar o compartilhamento' })).toBeInTheDocument()
  })

  it('o histórico das decisões vem da mais recente para a mais antiga', async () => {
    await abrir('/consentimentos')
    const painel = await regiao('Compartilhamento do histórico na rede')
    await userEvent.click(await within(painel).findByText(/Histórico das suas decisões \(2\)/))
    const itens = within(painel).getAllByRole('listitem').map((li) => li.textContent)
    expect(itens).toEqual(['Autorizou o compartilhamento em 10/11/2026 às 12:00', 'Não autorizou o compartilhamento em 05/01/2026 às 10:00'])
  })
})

describe('FE-05: Consentimentos — informações restritas (RF-009)', () => {
  it('lista as restrições em vigor com o registro descrito, e as encerradas à parte', async () => {
    await abrir('/consentimentos')
    const painel = await regiao('Informações restritas')
    expect(await within(painel).findByText('Categoria: Saúde mental')).toBeInTheDocument()
    expect(within(painel).getByText('Registro: Exame de 02/10/2026, Hospital B')).toBeInTheDocument()
    expect(within(painel).getByText('Restrições encerradas (1)')).toBeInTheDocument()
    // A encerrada não está em vigor: sem botão de encerrar.
    expect(within(painel).getAllByRole('button', { name: /^Encerrar restrição/ })).toHaveLength(2)
    expect(within(painel).queryByRole('button', { name: 'Encerrar restrição: Categoria: Dermatologia' })).not.toBeInTheDocument()
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
  })

  it('restringe uma categoria, com as do histórico como sugestão', async () => {
    const { chamadas } = await abrir('/consentimentos', {
      'POST /api/pacientes/p1/restricoes': { status: 201, corpo: RESTRICOES[0] },
    })
    const painel = await regiao('Informações restritas')
    await within(painel).findByText('Categoria: Saúde mental')
    const campo = within(painel).getByLabelText('Restringir uma categoria')
    const sugestoes = document.getElementById(campo.getAttribute('list') ?? '')
    expect([...(sugestoes?.querySelectorAll('option') ?? [])].map((o) => o.value)).toEqual(['Clínica geral', 'Saúde mental'])

    await userEvent.click(within(painel).getByRole('button', { name: 'Restringir' }))
    expect(campo).toHaveAccessibleDescription(/Informe a categoria que quer restringir./)
    expect(chamadas.some((c) => c.chave === 'POST /api/pacientes/p1/restricoes')).toBe(false)

    await userEvent.type(campo, '  Uso de substâncias ')
    await userEvent.click(within(painel).getByRole('button', { name: 'Restringir' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /api/pacientes/p1/restricoes')?.corpo).toEqual({ categoria: 'Uso de substâncias' }))
    expect(await screen.findByText('Categoria "Uso de substâncias" restrita.')).toBeInTheDocument()
    expect(campo).toHaveValue('')
  })

  it('encerrar uma restrição pede confirmação e explica o efeito', async () => {
    const { chamadas } = await abrir('/consentimentos', {
      'POST /api/pacientes/p1/restricoes/x1/encerramento': { status: 200, corpo: { ...RESTRICOES[0], vigente: false } },
    })
    const painel = await regiao('Informações restritas')
    await userEvent.click(await within(painel).findByRole('button', { name: 'Encerrar restrição: Categoria: Saúde mental' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Encerrar esta restrição?' })
    expect(dialogo).toHaveTextContent('a instituição que fez o registro volta a ver, e as outras veem se o compartilhamento valer para elas')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Encerrar restrição' }))
    await waitFor(() => expect(chamadas.some((c) => c.chave === 'POST /api/pacientes/p1/restricoes/x1/encerramento')).toBe(true))
  })
})

describe('FE-05: Consentimentos — autorizações adicionais (RF-009)', () => {
  it('sem nada restrito, explica que não há o que liberar', async () => {
    await abrir('/consentimentos', { 'GET /api/pacientes/p1/restricoes': { status: 200, corpo: [] } })
    const painel = await regiao('Autorizações adicionais')
    expect(await within(painel).findByText(/Você não tem informações restritas/)).toBeInTheDocument()
    expect(within(painel).queryByRole('button', { name: 'Autorizar' })).not.toBeInTheDocument()
  })

  it('libera uma categoria restrita para uma instituição credenciada', async () => {
    const { chamadas } = await abrir('/consentimentos', {
      'POST /api/pacientes/p1/autorizacoes': { status: 201, corpo: {} },
    })
    const painel = await regiao('Autorizações adicionais')
    await userEvent.click(await within(painel).findByRole('button', { name: 'Autorizar' }))
    expect(within(painel).getByLabelText('Instituição')).toHaveAccessibleDescription('Escolha a instituição.')
    expect(within(painel).getByLabelText('O que liberar')).toHaveAccessibleDescription('Escolha o que liberar.')

    // Só o que está restrito em vigor pode ser liberado (a encerrada fica de fora).
    expect(within(within(painel).getByLabelText('O que liberar')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Escolha',
      'Categoria: Saúde mental',
      'Registro: Exame de 02/10/2026, Hospital B',
    ])
    // Sem instituição, não envia.
    await userEvent.selectOptions(within(painel).getByLabelText('O que liberar'), 'x1')
    await userEvent.click(within(painel).getByRole('button', { name: 'Autorizar' }))
    expect(within(painel).getByLabelText('Instituição')).toHaveAccessibleDescription('Escolha a instituição.')
    expect(chamadas.some((c) => c.chave === 'POST /api/pacientes/p1/autorizacoes')).toBe(false)

    await waitFor(() => expect(within(painel).getByLabelText('Instituição')).toBeEnabled())
    await userEvent.selectOptions(within(painel).getByLabelText('Instituição'), 'h3')
    await userEvent.click(within(painel).getByRole('button', { name: 'Autorizar' }))
    await waitFor(() =>
      expect(chamadas.find((c) => c.chave === 'POST /api/pacientes/p1/autorizacoes')?.corpo).toEqual({ instituicaoId: 'h3', categoria: 'Saúde mental' }),
    )
  })

  it('libera um registro restrito pelo id do registro', async () => {
    const { chamadas } = await abrir('/consentimentos', { 'POST /api/pacientes/p1/autorizacoes': { status: 201, corpo: {} } })
    const painel = await regiao('Autorizações adicionais')
    await waitFor(() => expect(within(painel).getByLabelText('Instituição')).toBeEnabled())
    await userEvent.selectOptions(within(painel).getByLabelText('Instituição'), 'h1')
    await userEvent.selectOptions(within(painel).getByLabelText('O que liberar'), 'x2')
    await userEvent.click(within(painel).getByRole('button', { name: 'Autorizar' }))
    await waitFor(() =>
      expect(chamadas.find((c) => c.chave === 'POST /api/pacientes/p1/autorizacoes')?.corpo).toEqual({ instituicaoId: 'h1', registroId: 'r2' }),
    )
  })

  it('revogar uma autorização diz quem deixa de ver', async () => {
    const { chamadas } = await abrir('/consentimentos', {
      'GET /api/pacientes/p1/autorizacoes': {
        status: 200,
        corpo: [{ id: 'a1', versao: 1, instituicaoId: 'h3', instituicao: 'Hospital C', categoria: 'Saúde mental', registroId: null, decisao: 'AUTORIZADO', vigenteDesde: '2026-11-15T09:00:00' }],
      },
      'POST /api/pacientes/p1/autorizacoes/a1/revogacao': { status: 201, corpo: {} },
    })
    const painel = await regiao('Autorizações adicionais')
    expect(await within(painel).findByText('Hospital C', { selector: 'p' })).toBeInTheDocument()
    await userEvent.click(within(painel).getByRole('button', { name: 'Revogar autorização de Hospital C: Categoria: Saúde mental' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Revogar esta autorização?' })
    expect(dialogo).toHaveTextContent('Hospital C deixa de ver essa informação restrita (categoria: saúde mental), a não ser numa emergência.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Revogar' }))
    await waitFor(() => expect(chamadas.some((c) => c.chave === 'POST /api/pacientes/p1/autorizacoes/a1/revogacao')).toBe(true))
  })
})

describe('FE-05: autorização adicional depende do compartilhamento na rede', () => {
  it('com o compartilhamento autorizado, não há aviso', async () => {
    await abrir('/consentimentos')
    const painel = await regiao('Autorizações adicionais')
    await within(painel).findByLabelText('O que liberar')
    await within(await regiao('Compartilhamento do histórico na rede')).findByText('Autorizado')
    expect(within(painel).queryByText('Depende do compartilhamento na rede')).not.toBeInTheDocument()
  })

  it.each([
    [null, 'O compartilhamento na rede não está autorizado.', 'só faz efeito para a instituição que fez o registro.'],
    ['NEGADO', 'O compartilhamento na rede não está autorizado.', 'só faz efeito para a instituição que fez o registro.'],
    ['REVOGADO', 'Você revogou o compartilhamento na rede.', 'só faz efeito para a instituição que fez o registro e para as que já tinham atendido você antes da revogação.'],
  ] as const)('%s: avisa onde a autorização faz efeito', async (decisao, situacao, efeito) => {
    await abrir('/consentimentos', { 'GET /api/pacientes/p1/consentimentos': { status: 200, corpo: CONSENTIMENTO(decisao) } })
    const painel = await regiao('Autorizações adicionais')
    expect(await within(painel).findByText('Depende do compartilhamento na rede')).toBeInTheDocument()
    expect(painel).toHaveTextContent(situacao)
    expect(painel).toHaveTextContent(efeito)
  })

  it('revogar o compartilhamento faz o aviso aparecer na hora, sem recarregar a página', async () => {
    let decisao: 'AUTORIZADO' | 'REVOGADO' = 'AUTORIZADO'
    await abrir('/consentimentos', {
      'GET /api/pacientes/p1/consentimentos': () => ({ status: 200, corpo: CONSENTIMENTO(decisao) }),
      'POST /api/pacientes/p1/consentimentos': () => {
        decisao = 'REVOGADO'
        return { status: 201, corpo: CONSENTIMENTO('REVOGADO').vigente }
      },
    })
    const compartilhamento = await regiao('Compartilhamento do histórico na rede')
    await userEvent.click(await within(compartilhamento).findByRole('button', { name: 'Revogar o compartilhamento' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Revogar' }))
    const painel = await regiao('Autorizações adicionais')
    expect(await within(painel).findByText('Depende do compartilhamento na rede')).toBeInTheDocument()
  })
})

describe('FE-05: teclado', () => {
  /** Tab até o elemento que satisfaz a condição, como quem navega só pelo teclado. */
  async function tabAte(condicao: (el: Element | null) => boolean, limite = 60) {
    for (let i = 0; i < limite && !condicao(document.activeElement); i++) await userEvent.tab()
    expect(condicao(document.activeElement)).toBe(true)
  }

  it('revoga o compartilhamento só com Tab e Enter', async () => {
    const { chamadas } = await abrir('/consentimentos', {
      'POST /api/pacientes/p1/consentimentos': { status: 201, corpo: CONSENTIMENTO('REVOGADO').vigente },
    })
    await within(await regiao('Compartilhamento do histórico na rede')).findByText('Autorizado')
    await tabAte((el) => el?.textContent === 'Revogar o compartilhamento')
    await userEvent.keyboard('{Enter}')
    const dialogo = screen.getByRole('alertdialog', { name: 'Revogar o compartilhamento?' })
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await userEvent.tab()
    expect(within(dialogo).getByRole('button', { name: 'Revogar' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /api/pacientes/p1/consentimentos')?.corpo).toEqual({ decisao: 'REVOGADO' }))
  })

  it('restringe um registro só com Tab e Enter', async () => {
    const { chamadas } = await abrir('/meu-prontuario', { 'POST /api/pacientes/p1/restricoes': { status: 201, corpo: RESTRICOES[1] } })
    await screen.findByRole('article', { name: /Diagnóstico/ })
    await tabAte((el) => el?.textContent === 'Restringir este registro')
    await userEvent.keyboard('{Enter}')
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /api/pacientes/p1/restricoes')?.corpo).toEqual({ registroId: 'r1' }))
  })
})
