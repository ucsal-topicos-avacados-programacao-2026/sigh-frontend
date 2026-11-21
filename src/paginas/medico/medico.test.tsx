import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AtendimentoEmAndamento, PacienteNaFila, RegistroDoHistorico, ResumoIA } from '@/api/tipos'
import { consultaDoResumo } from '@/paginas/medico/consultaDoResumo'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { HOSPITAL_A, renderizar, usuario, type Rotas } from '@/testes/renderizar'

const MEDICO = usuario(['MEDICO'], [{ ...HOSPITAL_A, perfis: ['MEDICO'] }])
const ENFERMEIRO = usuario(['ENFERMEIRO'], [{ ...HOSPITAL_A, perfis: ['ENFERMEIRO'] }])
const EM_ANDAMENTO: AtendimentoEmAndamento[] = [
  { atendimentoId: 'a1', paciente: 'Ana Lima', motivo: 'Febre alta', chegadaEm: '2026-11-20T08:00:00', inicioClinicoEm: '2026-11-20T08:30:00', corConfirmada: 'LARANJA', medicoResponsavel: 'Dra. Carla', doUsuarioLogado: true },
  { atendimentoId: 'a2', paciente: 'Beto Reis', motivo: 'Retorno', chegadaEm: '2026-11-20T07:00:00', inicioClinicoEm: '2026-11-20T07:40:00', corConfirmada: null, medicoResponsavel: 'Dr. Outro', doUsuarioLogado: false },
]
const FILA: PacienteNaFila[] = [
  { triagemId: 't9', atendimentoId: 'a9', pacienteNome: 'Caio Dias', corConfirmada: 'VERMELHO', chegadaEm: '2026-11-20T09:00:00', minutosDeEspera: 12, tempoMaximoExcedido: true },
]
const registro = (id: string, extra: Partial<RegistroDoHistorico> = {}): RegistroDoHistorico => ({
  id,
  tipo: 'DIAGNOSTICO',
  criadoEm: '2026-10-01T10:00:00',
  conteudo: `Conteúdo ${id}`,
  categoriaInformacao: 'Clínica geral',
  codigoCID10: null,
  instituicaoOrigemId: 'h2',
  instituicaoOrigem: 'Hospital B',
  restrito: false,
  ...extra,
})
const HISTORICO = { registros: [registro('r1', { conteudo: 'Asma brônquica.', codigoCID10: 'J45.9' }), registro('r2', { tipo: 'ALERGIA', conteudo: 'Alergia a dipirona.', categoriaInformacao: 'Alergias' })], possuiInformacoesRestritas: true, acessoDeEmergencia: false }
const resumo = (extra: Partial<ResumoIA>): ResumoIA => ({
  id: 's1',
  atendimentoId: 'a1',
  status: 'SOLICITADO',
  texto: null,
  geradoEm: null,
  modeloVersao: null,
  registrosDeOrigem: ['r1'],
  aviso: 'Resumo em geração pela IA.',
  ...extra,
})
const GERADO = resumo({ status: 'GERADO', texto: 'Paciente com asma brônquica e alergia a dipirona.', geradoEm: '2026-11-20T09:10:00', modeloVersao: 'qwen3:8b', aviso: 'Resumo gerado por IA, sujeito à validação profissional. Os registros originais continuam disponíveis.' })

function rotas(extra: Rotas = {}): Rotas {
  return {
    'GET /atendimentos/em-andamento': { status: 200, corpo: EM_ANDAMENTO },
    'GET /triagens/fila': { status: 200, corpo: { content: FILA, page: { size: 200, number: 0, totalElements: 1, totalPages: 1 } } },
    'GET /atendimentos/a1/historico': { status: 200, corpo: HISTORICO },
    'GET /atendimentos/a9/historico': { status: 200, corpo: { registros: [], possuiInformacoesRestritas: false, acessoDeEmergencia: false } },
    ...extra,
  }
}

beforeEach(() => {
  consultaDoResumo.intervaloMs = 20
})

async function abrirAtendimento(id = 'a1', extra: Rotas = {}, logado = MEDICO) {
  const resultado = renderizar(`/atendimentos/${id}`, logado, rotas(extra))
  return resultado
}

const regiao = (nome: string) => screen.findByRole('region', { name: nome })
const artigo = (texto: RegExp) => screen.findByRole('article', { name: texto })

describe('FE-07: listas do médico', () => {
  it('em atendimento (os do médico marcados) e fila, com links para o atendimento', async () => {
    renderizar('/atendimentos', MEDICO, rotas())
    await screen.findByRole('heading', { level: 1, name: 'Atendimentos' })
    const emAtendimento = await regiao('Em atendimento')
    const ana = (await within(emAtendimento).findByText('Ana Lima')).closest('tr') as HTMLElement
    expect(ana).toHaveTextContent('Laranja · Muito urgente')
    expect(ana).toHaveTextContent('Febre alta')
    expect(within(ana).getByText('Você')).toBeInTheDocument()
    expect(within(ana).getByRole('link', { name: 'Abrir Ana Lima' })).toHaveAttribute('href', '/atendimentos/a1')
    const beto = within(emAtendimento).getByText('Beto Reis').closest('tr') as HTMLElement
    expect(beto).toHaveTextContent('Sem classificação')
    expect(beto).toHaveTextContent('Dr. Outro')
    expect(emAtendimento).toHaveTextContent('1 paciente com você.')
    const fila = await regiao('Fila de atendimento')
    expect(await within(fila).findByRole('link', { name: 'Atender Caio Dias' })).toHaveAttribute('href', '/atendimentos/a9')
    expect(fila).toHaveTextContent('Tempo máximo excedido')
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
  })

  it('o enfermeiro vê as listas, sem abrir o atendimento: consulta o histórico', async () => {
    renderizar('/atendimentos', ENFERMEIRO, rotas())
    const emAtendimento = await regiao('Em atendimento')
    await within(emAtendimento).findByText('Ana Lima')
    expect(screen.queryByRole('link', { name: /^Abrir|^Atender/ })).not.toBeInTheDocument()
    await userEvent.click(within(emAtendimento).getByRole('button', { name: 'Histórico de Ana Lima' }))
    expect(await within(screen.getByRole('dialog', { name: 'Histórico de Ana Lima' })).findByText('Asma brônquica.')).toBeInTheDocument()
  })

  it('o enfermeiro não abre a página do atendimento', async () => {
    renderizar('/atendimentos/a1', ENFERMEIRO, rotas())
    expect(await screen.findByRole('heading', { level: 1, name: /não tem permissão/ })).toBeInTheDocument()
  })
})

describe('FE-07: o atendimento do paciente', () => {
  it('cabeçalho do atendimento e o prontuário autorizado, inclusive de outras instituições', async () => {
    await abrirAtendimento()
    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Lima' })).toBeInTheDocument()
    const atendimento = await regiao('Atendimento')
    expect(atendimento).toHaveTextContent('Laranja · Muito urgente')
    expect(atendimento).toHaveTextContent('Febre alta')
    expect(atendimento).toHaveTextContent('20/11/2026 às 08:30')
    const asma = await artigo(/Diagnóstico/)
    expect(asma).toHaveTextContent('Hospital B')
    expect(asma).toHaveTextContent('CID J45.9')
    expect(await within(await regiao('Prontuário')).findByRole('button', { name: 'Acesso de emergência' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Atendimento de Ana Lima · SIGH'))
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
  })

  it('paciente da fila ainda sem início: o cabeçalho vem da fila', async () => {
    await abrirAtendimento('a9')
    expect(await screen.findByRole('heading', { level: 1, name: 'Caio Dias' })).toBeInTheDocument()
    const atendimento = await regiao('Atendimento')
    expect(atendimento).toHaveTextContent('Vermelho · Emergência')
    expect(atendimento).toHaveTextContent('Começa no primeiro registro')
    expect(await screen.findByText(/O atendimento segue normalmente./)).toBeInTheDocument()
  })

  it('atendimento fora das listas: avisa e oferece voltar', async () => {
    await abrirAtendimento('zz')
    expect(await screen.findByText('Atendimento não encontrado nesta instituição')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para os atendimentos' })).toHaveAttribute('href', '/atendimentos')
  })
})

describe('FE-07: resumo por IA (RF-004)', () => {
  it('gera em segundo plano, mostra como gerado por IA, marca os registros usados e valida', async () => {
    let consultas = 0
    const { chamadas } = await abrirAtendimento('a1', {
      'POST /atendimentos/a1/resumos': { status: 202, corpo: resumo({}) },
      'GET /resumos/s1': () => {
        consultas++
        return { status: 200, corpo: consultas < 2 ? resumo({}) : GERADO }
      },
      'POST /resumos/s1/validacao': { status: 200, corpo: { ...GERADO, status: 'VALIDADO' } },
    })
    const painel = await regiao('Resumo do histórico por IA')
    await userEvent.click(within(painel).getByRole('button', { name: 'Gerar resumo do histórico' }))
    expect(await within(painel).findByText(/A IA está gerando o resumo/)).toBeInTheDocument()
    // O prontuário original já está disponível enquanto gera.
    expect(await artigo(/Diagnóstico/)).toBeInTheDocument()

    expect(await within(painel).findByText('Sugestão gerada por IA — sujeita à validação profissional')).toBeInTheDocument()
    expect(painel).toHaveTextContent('Paciente com asma brônquica e alergia a dipirona.')
    expect(painel).toHaveTextContent('Resumo gerado por IA, sujeito à validação profissional.')
    expect(painel).toHaveTextContent('Gerado em 20/11/2026 às 09:10 · modelo qwen3:8b')
    expect(painel).toHaveTextContent('Usou 1 registro do prontuário, marcado abaixo como "Usado no resumo".')
    expect(within(await artigo(/Diagnóstico/)).getByText('Usado no resumo')).toBeInTheDocument()
    expect(within(await artigo(/Alergia/)).queryByText('Usado no resumo')).not.toBeInTheDocument()
    expect(consultas).toBeGreaterThanOrEqual(2)

    await userEvent.click(within(painel).getByRole('button', { name: 'Validar resumo' }))
    expect(await within(painel).findByText('Validado pelo médico')).toBeInTheDocument()
    expect(chamadas.some((c) => c.chave === 'POST /resumos/s1/validacao')).toBe(true)
  })

  it('a falha da IA não impede ler o prontuário original (critério de aceite)', async () => {
    await abrirAtendimento('a1', {
      'POST /atendimentos/a1/resumos': { status: 202, corpo: resumo({}) },
      'GET /resumos/s1': { status: 200, corpo: resumo({ status: 'FALHOU', aviso: 'A IA não gerou o resumo. Siga pelos registros originais ou peça um novo resumo.' }) },
    })
    const painel = await regiao('Resumo do histórico por IA')
    await userEvent.click(within(painel).getByRole('button', { name: 'Gerar resumo do histórico' }))
    expect(await within(painel).findByText('A IA não gerou o resumo')).toBeInTheDocument()
    expect(within(painel).getByRole('button', { name: 'Pedir novo resumo' })).toBeInTheDocument()
    expect(await artigo(/Diagnóstico/)).toHaveTextContent('Asma brônquica.')
    expect(within(await artigo(/Diagnóstico/)).queryByText('Usado no resumo')).not.toBeInTheDocument()
  })

  it('IA indisponível (503) ao pedir: aviso, e o prontuário segue legível', async () => {
    await abrirAtendimento('a1', { 'POST /atendimentos/a1/resumos': { status: 503, corpo: { detail: 'IA indisponível' } } })
    const painel = await regiao('Resumo do histórico por IA')
    await userEvent.click(within(painel).getByRole('button', { name: 'Gerar resumo do histórico' }))
    expect(await within(painel).findByText(/A IA está indisponível ou ocupada agora/)).toBeInTheDocument()
    expect(within(painel).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(await artigo(/Alergia/)).toHaveTextContent('Alergia a dipirona.')
  })

  it('sem histórico para resumir (422): diz isso, sem tom de erro', async () => {
    await abrirAtendimento('a1', { 'POST /atendimentos/a1/resumos': { status: 422, corpo: { detail: 'Não há histórico autorizado para resumir.' } } })
    const painel = await regiao('Resumo do histórico por IA')
    await userEvent.click(within(painel).getByRole('button', { name: 'Gerar resumo do histórico' }))
    expect(await within(painel).findByText('Não há histórico autorizado para resumir.')).toBeInTheDocument()
    expect(within(painel).getByText('Sem resumo')).toBeInTheDocument()
  })

  it('resumo oculto por restrição posterior: sem texto, com o aviso da API', async () => {
    await abrirAtendimento('a1', {
      'POST /atendimentos/a1/resumos': { status: 202, corpo: resumo({}) },
      'GET /resumos/s1': { status: 200, corpo: resumo({ status: 'GERADO', texto: null, registrosDeOrigem: [], aviso: 'Resumo oculto: ele usa informação que o paciente restringiu.' }) },
    })
    const painel = await regiao('Resumo do histórico por IA')
    await userEvent.click(within(painel).getByRole('button', { name: 'Gerar resumo do histórico' }))
    expect(await within(painel).findByText('Resumo oculto')).toBeInTheDocument()
    expect(painel).toHaveTextContent('Resumo oculto: ele usa informação que o paciente restringiu.')
    expect(within(painel).queryByRole('button', { name: 'Validar resumo' })).not.toBeInTheDocument()
  })

  it('a recusa da validação aparece', async () => {
    await abrirAtendimento('a1', {
      'POST /atendimentos/a1/resumos': { status: 202, corpo: GERADO },
      'POST /resumos/s1/validacao': { status: 422, corpo: { detail: 'Só um resumo gerado pode ser validado.' } },
    })
    const painel = await regiao('Resumo do histórico por IA')
    await userEvent.click(within(painel).getByRole('button', { name: 'Gerar resumo do histórico' }))
    await userEvent.click(await within(painel).findByRole('button', { name: 'Validar resumo' }))
    expect(await within(painel).findByText('Só um resumo gerado pode ser validado.')).toBeInTheDocument()
  })
})

describe('FE-07: registros clínicos (RF-006, RF-007)', () => {
  it('registra diagnóstico com CID-10 e atualiza o prontuário', async () => {
    const { chamadas } = await abrirAtendimento('a1', { 'POST /atendimentos/a1/registros': { status: 201, corpo: registro('r9') } })
    const painel = await regiao('Novo registro')
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar registro' }))
    expect(within(painel).getByLabelText('Registro')).toHaveAccessibleDescription('Escreva o registro.')
    expect(within(painel).getByLabelText('Categoria da informação')).toHaveAccessibleDescription(/Informe a categoria/)
    expect(chamadas.some((c) => c.chave.startsWith('POST'))).toBe(false)

    await userEvent.selectOptions(within(painel).getByLabelText('Tipo'), 'DIAGNOSTICO')
    await userEvent.type(within(painel).getByLabelText('Categoria da informação'), 'Clínica geral')
    await userEvent.type(within(painel).getByLabelText(/^CID-10/), 'j459')
    await userEvent.type(within(painel).getByLabelText('Registro'), '  Crise asmática leve.  ')
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar registro' }))
    expect(within(painel).getByLabelText(/^CID-10/)).toHaveAccessibleDescription(/Use o formato do CID-10/)

    await userEvent.clear(within(painel).getByLabelText(/^CID-10/))
    await userEvent.type(within(painel).getByLabelText(/^CID-10/), 'j45.9')
    const antes = chamadas.filter((c) => c.chave === 'GET /atendimentos/a1/historico').length
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar registro' }))
    await waitFor(() =>
      expect(chamadas.find((c) => c.chave === 'POST /atendimentos/a1/registros')?.corpo).toEqual({
        tipo: 'DIAGNOSTICO',
        conteudo: 'Crise asmática leve.',
        categoriaInformacao: 'Clínica geral',
        codigoCID10: 'J45.9',
      }),
    )
    expect(await screen.findByText('Registro salvo no prontuário.')).toBeInTheDocument()
    await waitFor(() => expect(chamadas.filter((c) => c.chave === 'GET /atendimentos/a1/historico').length).toBeGreaterThan(antes))
    expect(within(painel).getByLabelText('Registro')).toHaveValue('')
  })

  it('evolução sem CID não manda o campo; o resumo de alta explica para que serve', async () => {
    const { chamadas } = await abrirAtendimento('a1', { 'POST /atendimentos/a1/registros': { status: 201, corpo: registro('r9') } })
    const painel = await regiao('Novo registro')
    expect(within(painel).getByLabelText('Tipo')).toHaveValue('EVOLUCAO')
    const categorias = document.getElementById(within(painel).getByLabelText('Categoria da informação').getAttribute('list') ?? '')
    await waitFor(() => expect([...(categorias?.querySelectorAll('option') ?? [])].map((o) => o.value)).toEqual(['Clínica geral', 'Alergias']))
    await userEvent.selectOptions(within(painel).getByLabelText('Tipo'), 'RESUMO_ALTA')
    expect(within(painel).getByText(/disponível para o administrativo anexar à alta/)).toBeInTheDocument()
    await userEvent.selectOptions(within(painel).getByLabelText('Tipo'), 'EVOLUCAO')
    await userEvent.type(within(painel).getByLabelText('Categoria da informação'), 'Clínica geral')
    await userEvent.type(within(painel).getByLabelText('Registro'), 'Melhora do quadro. Conduta: manter.')
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar registro' }))
    await waitFor(() =>
      expect(chamadas.find((c) => c.chave === 'POST /atendimentos/a1/registros')?.corpo).toEqual({
        tipo: 'EVOLUCAO',
        conteudo: 'Melhora do quadro. Conduta: manter.',
        categoriaInformacao: 'Clínica geral',
      }),
    )
  })

  it('erro de campo da API aparece no campo', async () => {
    await abrirAtendimento('a1', {
      'POST /atendimentos/a1/registros': { status: 400, corpo: { detail: 'Dados inválidos.', campos: { codigoCID10: 'deve seguir o formato do CID-10, como J45.9' } } },
    })
    const painel = await regiao('Novo registro')
    await userEvent.type(within(painel).getByLabelText('Categoria da informação'), 'Clínica geral')
    await userEvent.type(within(painel).getByLabelText(/^CID-10/), 'A00')
    await userEvent.type(within(painel).getByLabelText('Registro'), 'Texto')
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar registro' }))
    await waitFor(() => expect(within(painel).getByLabelText(/^CID-10/)).toHaveAccessibleDescription(/deve seguir o formato do CID-10, como J45.9/))
  })
})

describe('FE-07: encerrar', () => {
  it('pede confirmação, encerra e volta para os atendimentos', async () => {
    const { chamadas } = await abrirAtendimento('a1', { 'POST /atendimentos/a1/encerramento': { status: 204 } })
    await screen.findByRole('heading', { level: 1, name: 'Ana Lima' })
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar atendimento' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Encerrar o atendimento?' })
    expect(dialogo).toHaveTextContent('não dá para registrar nem pedir acesso de emergência')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Encerrar atendimento' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Atendimentos' })).toBeInTheDocument()
    expect(chamadas.some((c) => c.chave === 'POST /atendimentos/a1/encerramento')).toBe(true)
    expect(await screen.findByText('Atendimento de Ana Lima encerrado.')).toBeInTheDocument()
  })
})

describe('FE-07: auditoria — uma consulta ao histórico por vez (RF-008)', () => {
  /**
   * Pedidos que chegaram à API. O useConsulta adia o pedido para o microtask, então o da montagem de ensaio do StrictMode
   * nem sai: cada pedido registrado aqui seria um acesso na auditoria.
   */
  const consultasAoHistorico = (chamadas: { chave: string }[]) => chamadas.filter((c) => c.chave === 'GET /atendimentos/a1/historico').length

  it('abrir o atendimento consulta o histórico uma vez; salvar um registro, mais uma', async () => {
    const { chamadas } = await abrirAtendimento('a1', { 'POST /atendimentos/a1/registros': { status: 201, corpo: registro('r9') } })
    await artigo(/Diagnóstico/)
    await new Promise((r) => setTimeout(r, 50))
    expect(consultasAoHistorico(chamadas)).toBe(1)
    // As categorias do formulário vêm do mesmo prontuário, sem outra consulta.
    const painel = await regiao('Novo registro')
    const lista = document.getElementById(within(painel).getByLabelText('Categoria da informação').getAttribute('list') ?? '')
    expect([...(lista?.querySelectorAll('option') ?? [])].map((o) => o.value)).toEqual(['Clínica geral', 'Alergias'])

    await userEvent.type(within(painel).getByLabelText('Categoria da informação'), 'Clínica geral')
    await userEvent.type(within(painel).getByLabelText('Registro'), 'Evolução.')
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar registro' }))
    await screen.findByText('Registro salvo no prontuário.')
    await new Promise((r) => setTimeout(r, 50))
    expect(consultasAoHistorico(chamadas)).toBe(2)
  })

  it('o diálogo de histórico do enfermeiro também consulta uma vez', async () => {
    const { chamadas } = renderizar('/atendimentos', ENFERMEIRO, rotas())
    const emAtendimento = await regiao('Em atendimento')
    await userEvent.click(await within(emAtendimento).findByRole('button', { name: 'Histórico de Ana Lima' }))
    await within(screen.getByRole('dialog')).findByText('Asma brônquica.')
    await new Promise((r) => setTimeout(r, 50))
    expect(consultasAoHistorico(chamadas)).toBe(1)
  })
})

describe('FE-07: registro depois do acesso de emergência', () => {
  it('o registro novo aparece junto do que a emergência mostrou', async () => {
    let salvou = false
    const restrito = registro('rx', { tipo: 'DIAGNOSTICO', conteudo: 'Episódio depressivo.', categoriaInformacao: 'Saúde mental', restrito: true, criadoEm: '2026-08-01T10:00:00' })
    const novo = registro('rn', { tipo: 'EVOLUCAO', conteudo: 'Evolução nova.', criadoEm: '2026-11-21T09:00:00', instituicaoOrigem: 'Hospital A' })
    await abrirAtendimento('a1', {
      'GET /atendimentos/a1/historico': () => ({ status: 200, corpo: { ...HISTORICO, registros: salvou ? [novo, ...HISTORICO.registros] : HISTORICO.registros } }),
      'POST /atendimentos/a1/historico/emergencia': { status: 200, corpo: { registros: [...HISTORICO.registros, restrito], possuiInformacoesRestritas: false, acessoDeEmergencia: true } },
      'POST /atendimentos/a1/registros': () => {
        salvou = true
        return { status: 201, corpo: novo }
      },
    })
    const prontuario = await regiao('Prontuário')
    await userEvent.click(await within(prontuario).findByRole('button', { name: 'Acesso de emergência' }))
    await userEvent.type(within(prontuario).getByLabelText('Justificativa da emergência'), 'Paciente inconsciente na sala vermelha.')
    await userEvent.click(within(prontuario).getByRole('button', { name: 'Acessar em emergência' }))
    expect(await within(prontuario).findByText('Episódio depressivo.')).toBeInTheDocument()

    const painel = await regiao('Novo registro')
    await userEvent.type(within(painel).getByLabelText('Categoria da informação'), 'Clínica geral')
    await userEvent.type(within(painel).getByLabelText('Registro'), 'Evolução nova.')
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar registro' }))
    expect(await within(prontuario).findByText('Evolução nova.', { selector: 'p' })).toBeInTheDocument()
    // O restrito da emergência continua, e o novo vem primeiro (mais recente).
    expect(within(prontuario).getByText('Episódio depressivo.')).toBeInTheDocument()
    expect(within(prontuario).getAllByRole('article')[0]).toHaveTextContent('Evolução nova.')
  })
})

describe('FE-07: o acompanhamento do resumo não fica preso', () => {
  it('depois de três falhas seguidas ao consultar, para e mostra o erro', async () => {
    let consultas = 0
    await abrirAtendimento('a1', {
      'POST /atendimentos/a1/resumos': { status: 202, corpo: resumo({}) },
      'GET /resumos/s1': () => {
        consultas++
        return { status: 404, corpo: { detail: 'Resumo não encontrado.' } }
      },
    })
    const painel = await regiao('Resumo do histórico por IA')
    await userEvent.click(within(painel).getByRole('button', { name: 'Gerar resumo do histórico' }))
    expect(await within(painel).findByText(/Não foi possível acompanhar o resumo \(Resumo não encontrado.\)/)).toBeInTheDocument()
    expect(within(painel).queryByText(/A IA está gerando o resumo/)).not.toBeInTheDocument()
    const feitas = consultas
    expect(feitas).toBe(3)
    await new Promise((r) => setTimeout(r, 100))
    expect(consultas).toBe(feitas)
    expect(within(painel).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
