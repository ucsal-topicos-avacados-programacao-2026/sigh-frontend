import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AguardandoTriagem, PacienteNaFila, RegistroDoHistorico } from '@/api/tipos'
import { validarSinais, SINAIS_VAZIOS } from '@/paginas/enfermeiro/sinaisVitais'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { HOSPITAL_A, renderizar, usuario, type Rotas } from '@/testes/renderizar'
import { formatarEspera } from '@/util/espera'

const ENFERMEIRO = usuario(['ENFERMEIRO'], [{ ...HOSPITAL_A, perfis: ['ENFERMEIRO'] }])
const AGUARDANDO: AguardandoTriagem[] = [
  { atendimentoId: 'a1', paciente: 'Ana Lima', chegadaEm: '2026-11-20T08:00:00', motivo: 'Febre alta', triagemPendente: null },
  { atendimentoId: 'a2', paciente: 'Beto Reis', chegadaEm: '2026-11-20T08:10:00', motivo: 'Dor no peito', triagemPendente: { id: 't2', sintomas: 'Dor no peito', corSugerida: 'AMARELO' } },
]
const FILA: PacienteNaFila[] = [
  { triagemId: 't9', atendimentoId: 'a9', pacienteNome: 'Caio Dias', corConfirmada: 'VERMELHO', chegadaEm: '2026-11-20T07:00:00', minutosDeEspera: 12, tempoMaximoExcedido: true },
  { triagemId: 't8', atendimentoId: 'a8', pacienteNome: 'Davi Souza', corConfirmada: 'VERDE', chegadaEm: '2026-11-20T06:00:00', minutosDeEspera: 65, tempoMaximoExcedido: false },
]
const triagem = (id: string, extra: object = {}) => ({ id, atendimentoId: 'a1', sintomas: 'x', sinaisVitais: null, corSugerida: null, corConfirmada: null, confirmadaEm: null, ...extra })
const pagina = <T,>(itens: T[]) => ({ content: itens, page: { size: 200, number: 0, totalElements: itens.length, totalPages: 1 } })
const REGISTRO: RegistroDoHistorico = {
  id: 'r1',
  tipo: 'DIAGNOSTICO',
  criadoEm: '2026-10-01T10:00:00',
  conteudo: 'Episódio depressivo.',
  categoriaInformacao: 'Saúde mental',
  codigoCID10: 'F32.1',
  instituicaoOrigemId: 'h2',
  instituicaoOrigem: 'Hospital B',
  restrito: true,
}

function rotas(extra: Rotas = {}): Rotas {
  return {
    'GET /triagens/aguardando': { status: 200, corpo: AGUARDANDO },
    'GET /triagens/fila': { status: 200, corpo: pagina(FILA) },
    'POST /triagens': { status: 201, corpo: triagem('t1') },
    'POST /triagens/t1/sugestao': { status: 200, corpo: triagem('t1', { corSugerida: 'LARANJA' }) },
    'POST /triagens/t1/confirmacao': { status: 200, corpo: triagem('t1', { corConfirmada: 'LARANJA' }) },
    ...extra,
  }
}

async function abrir(extra: Rotas = {}) {
  const resultado = renderizar('/triagem', ENFERMEIRO, rotas(extra))
  await screen.findByRole('heading', { level: 1, name: 'Triagem' })
  return resultado
}

const regiao = (nome: string) => screen.findByRole('region', { name: nome })
const quantas = (chamadas: { chave: string }[], chave: string) => chamadas.filter((c) => c.chave === chave).length

async function preencherDados(dialogo: HTMLElement, sinais: Record<string, string> = { 'Pressão arterial (mmHg)': '120/80', 'Frequência cardíaca (bpm)': '90', 'Temperatura (°C)': '38,5', 'Saturação de oxigênio (%)': '96' }) {
  // Com espaços nas pontas: a API recebe o texto sem eles.
  await userEvent.type(within(dialogo).getByLabelText('Sintomas'), '  Febre e calafrios há dois dias  ')
  for (const [rotulo, valor] of Object.entries(sinais)) await userEvent.type(within(dialogo).getByLabelText(new RegExp(`^${rotulo.replace(/[()%]/g, '\\$&')}`)), valor)
}

describe('FE-06: listas da triagem', () => {
  it('aguardando por chegada, com o que falta; fila por prioridade, com espera e alerta de limite', async () => {
    await abrir()
    const aguardando = await regiao('Aguardando triagem')
    await within(aguardando).findByText('Ana Lima')
    const beto = within(aguardando).getByText('Beto Reis').closest('tr') as HTMLElement
    expect(beto).toHaveTextContent('Falta confirmar')
    expect(beto).toHaveTextContent('Sugestão da IA: Amarelo · Urgente')
    expect(within(beto).getByRole('button', { name: 'Continuar a triagem de Beto Reis' })).toBeInTheDocument()
    expect(within(aguardando).getByText('Ana Lima').closest('tr')).toHaveTextContent('Sem triagem')

    const fila = await regiao('Fila de atendimento')
    const linhas = (await within(fila).findAllByRole('row')).slice(1)
    expect(linhas[0]).toHaveTextContent('Vermelho · Emergência')
    expect(linhas[0]).toHaveTextContent('12 min')
    expect(linhas[0]).toHaveTextContent('Tempo máximo excedido')
    expect(linhas[1]).toHaveTextContent('1 h 05 min')
    expect(linhas[1]).not.toHaveTextContent('Tempo máximo excedido')
    expect(within(fila).getByText('1 paciente passou do tempo máximo de espera')).toBeInTheDocument()
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
  })
})

describe('FE-06: triagem com sugestão da IA (RF-003, RN-005)', () => {
  it('registra sintomas e sinais, mostra a sugestão como de IA e confirma a cor sugerida', async () => {
    const { chamadas } = await abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Triar Ana Lima' }))
    const dialogo = screen.getByRole('dialog', { name: 'Triagem de Ana Lima' })
    await preencherDados(dialogo)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar e pedir sugestão' }))

    expect(await within(dialogo).findByText('Sugestão gerada por IA — sujeita à validação profissional')).toBeInTheDocument()
    expect(chamadas.find((c) => c.chave === 'POST /triagens')?.corpo).toEqual({
      atendimentoId: 'a1',
      sintomas: 'Febre e calafrios há dois dias',
      sinaisVitais: { pressaoArterial: '120/80', frequenciaCardiaca: 90, temperatura: 38.5, saturacaoOxigenio: 96 },
    })
    expect(within(dialogo).getByRole('radio', { name: 'Laranja · Muito urgente' })).toBeChecked()
    expect(within(dialogo).getByRole('radio', { name: 'Laranja · Muito urgente' })).toHaveAccessibleDescription('Sugestão da IA')
    expect(dialogo).toHaveTextContent('A triagem só termina com a sua confirmação.')

    const antes = quantas(chamadas, 'GET /triagens/fila')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar classificação' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /triagens/t1/confirmacao')?.corpo).toEqual({ cor: 'LARANJA' }))
    expect(await screen.findByText('Classificação de Ana Lima confirmada: Laranja · Muito urgente.')).toBeInTheDocument()
    await waitFor(() => expect(quantas(chamadas, 'GET /triagens/fila')).toBeGreaterThan(antes))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Triagem' })).toHaveFocus())
  })

  it('o enfermeiro altera a sugestão, e a tela diz que alterou', async () => {
    const { chamadas } = await abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Triar Ana Lima' }))
    const dialogo = screen.getByRole('dialog')
    await preencherDados(dialogo, {})
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar e pedir sugestão' }))
    await userEvent.click(await within(dialogo).findByRole('radio', { name: 'Amarelo · Urgente' }))
    expect(dialogo).toHaveTextContent('Você alterou a sugestão da IA: de Laranja · Muito urgente para Amarelo · Urgente.')
    expect(chamadas.find((c) => c.chave === 'POST /triagens')?.corpo).toMatchObject({ sinaisVitais: {} })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar classificação' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /triagens/t1/confirmacao')?.corpo).toEqual({ cor: 'AMARELO' }))
  })

  it('sem a confirmação do enfermeiro, a triagem não termina (critério de aceite)', async () => {
    const { chamadas } = await abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Triar Ana Lima' }))
    const dialogo = screen.getByRole('dialog')
    await preencherDados(dialogo, {})
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar e pedir sugestão' }))
    await within(dialogo).findByText('Sugestão gerada por IA — sujeita à validação profissional')
    const antes = quantas(chamadas, 'GET /triagens/aguardando')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Fechar sem confirmar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(chamadas.some((c) => c.chave.endsWith('/confirmacao'))).toBe(false)
    // A lista é buscada de novo, e a API devolve o paciente com "Continuar triagem".
    await waitFor(() => expect(quantas(chamadas, 'GET /triagens/aguardando')).toBeGreaterThan(antes))
  })

  it('confirmar sem escolher a cor não envia', async () => {
    const { chamadas } = await abrir({ 'POST /triagens/t1/sugestao': { status: 503, corpo: { detail: 'IA indisponível' } } })
    await userEvent.click(await screen.findByRole('button', { name: 'Triar Ana Lima' }))
    const dialogo = screen.getByRole('dialog')
    await preencherDados(dialogo, {})
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar e pedir sugestão' }))
    await within(dialogo).findByText('Triagem sem sugestão da IA')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar classificação' }))
    expect(within(dialogo).getByRole('group', { name: 'Classificação de risco' })).toHaveAccessibleDescription('Escolha a classificação de risco.')
    expect(chamadas.some((c) => c.chave.endsWith('/confirmacao'))).toBe(false)
  })
})

describe('FE-06: IA indisponível — aviso e triagem manual (RN-008)', () => {
  it('avisa, deixa classificar sem sugestão e tentar a sugestão de novo', async () => {
    let tentativas = 0
    const { chamadas } = await abrir({
      'POST /triagens/t1/sugestao': () => {
        tentativas++
        return tentativas === 1 ? { status: 503, corpo: { detail: 'IA indisponível' } } : { status: 200, corpo: triagem('t1', { corSugerida: 'VERDE' }) }
      },
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Triar Ana Lima' }))
    const dialogo = screen.getByRole('dialog')
    await preencherDados(dialogo, {})
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar e pedir sugestão' }))
    expect(await within(dialogo).findByText(/A sugestão por IA não está disponível agora/)).toBeInTheDocument()
    expect(within(dialogo).getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false)
    expect(within(dialogo).queryByText('Sugestão gerada por IA — sujeita à validação profissional')).not.toBeInTheDocument()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Tentar a sugestão de novo' }))
    expect(await within(dialogo).findByRole('radio', { name: 'Verde · Pouco urgente' })).toBeChecked()
    expect(quantas(chamadas, 'POST /triagens')).toBe(1)
  })

  it('a sugestão que chega depois nunca troca a cor que a enfermeira já escolheu', async () => {
    let tentativas = 0
    const { chamadas } = await abrir({
      'POST /triagens/t1/sugestao': () => {
        tentativas++
        return tentativas === 1 ? { status: 503, corpo: { detail: 'IA indisponível' } } : { status: 200, corpo: triagem('t1', { corSugerida: 'AMARELO' }) }
      },
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Triar Ana Lima' }))
    const dialogo = screen.getByRole('dialog')
    await preencherDados(dialogo, {})
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar e pedir sugestão' }))
    await within(dialogo).findByText('Triagem sem sugestão da IA')
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Vermelho · Emergência' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Tentar a sugestão de novo' }))
    await within(dialogo).findByText('Sugestão gerada por IA — sujeita à validação profissional')
    expect(within(dialogo).getByRole('radio', { name: 'Vermelho · Emergência' })).toBeChecked()
    expect(dialogo).toHaveTextContent('Você alterou a sugestão da IA: de Amarelo · Urgente para Vermelho · Emergência.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar classificação' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /triagens/t1/confirmacao')?.corpo).toEqual({ cor: 'VERMELHO' }))
  })

  it('falha de rede também cai na triagem manual', async () => {
    await abrir()
    const original = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => (String(url).endsWith('/sugestao') ? Promise.reject(new TypeError('rede')) : original(url, init))))
    await userEvent.click(await screen.findByRole('button', { name: 'Triar Ana Lima' }))
    const dialogo = screen.getByRole('dialog')
    await preencherDados(dialogo, {})
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar e pedir sugestão' }))
    expect(await within(dialogo).findByText(/A sugestão por IA não está disponível agora/)).toBeInTheDocument()
  })
})

describe('FE-06: retomar e reclassificar', () => {
  it('a triagem começada volta direto na classificação, com a sugestão já marcada', async () => {
    const { chamadas } = await abrir({ 'POST /triagens/t2/confirmacao': { status: 200, corpo: triagem('t2', { corConfirmada: 'AMARELO' }) } })
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar a triagem de Beto Reis' }))
    const dialogo = screen.getByRole('dialog', { name: 'Triagem de Beto Reis' })
    expect(within(dialogo).queryByLabelText('Sintomas')).not.toBeInTheDocument()
    expect(within(dialogo).getByRole('radio', { name: 'Amarelo · Urgente' })).toBeChecked()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar classificação' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /triagens/t2/confirmacao')?.corpo).toEqual({ cor: 'AMARELO' }))
    expect(chamadas.some((c) => c.chave === 'POST /triagens')).toBe(false)
  })

  it('triagem começada sem sugestão: oferece pedir a sugestão', async () => {
    await abrir({
      'GET /triagens/aguardando': { status: 200, corpo: [{ ...AGUARDANDO[1], triagemPendente: { id: 't1', sintomas: 'x', corSugerida: null } }] },
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar a triagem de Beto Reis' }))
    const dialogo = screen.getByRole('dialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Pedir sugestão da IA' }))
    expect(await within(dialogo).findByRole('radio', { name: 'Laranja · Muito urgente' })).toBeChecked()
  })

  it('reclassificar um paciente da fila registra uma triagem nova para o atendimento dele', async () => {
    const { chamadas } = await abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Reclassificar Caio Dias' }))
    const dialogo = screen.getByRole('dialog', { name: 'Reclassificar Caio Dias' })
    await preencherDados(dialogo, {})
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar e pedir sugestão' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /triagens')?.corpo).toMatchObject({ atendimentoId: 'a9' }))
    // Na reclassificação não há retomada: fechar descarta, e vale a cor anterior.
    expect(await within(dialogo).findByText(/Se fechar agora, ela é descartada, e continua valendo a cor anterior./)).toBeInTheDocument()
    expect(dialogo).not.toHaveTextContent('dá para retomar')
  })
})

describe('FE-06: validação dos dados', () => {
  it('sintomas obrigatórios e sinais no formato da API', async () => {
    const { chamadas } = await abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Triar Ana Lima' }))
    const dialogo = screen.getByRole('dialog')
    await userEvent.type(within(dialogo).getByLabelText(/^Pressão arterial/), '12080')
    await userEvent.type(within(dialogo).getByLabelText(/^Frequência cardíaca/), '0')
    await userEvent.type(within(dialogo).getByLabelText(/^Temperatura/), '38,55')
    await userEvent.type(within(dialogo).getByLabelText(/^Saturação/), '101')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar e pedir sugestão' }))
    expect(within(dialogo).getByLabelText('Sintomas')).toHaveAccessibleDescription(/Descreva os sintomas./)
    expect(within(dialogo).getByLabelText(/^Pressão arterial/)).toHaveAccessibleDescription(/Use sistólica\/diastólica/)
    expect(within(dialogo).getByLabelText(/^Frequência cardíaca/)).toHaveAccessibleDescription('Use um número inteiro maior que zero.')
    expect(within(dialogo).getByLabelText(/^Temperatura/)).toHaveAccessibleDescription(/até uma casa decimal/)
    expect(within(dialogo).getByLabelText(/^Saturação/)).toHaveAccessibleDescription('Use de 0 a 100, com até uma casa decimal.')
    expect(chamadas.some((c) => c.chave === 'POST /triagens')).toBe(false)
  })

  it('regras dos sinais vitais', () => {
    expect(validarSinais({ ...SINAIS_VAZIOS, frequenciaRespiratoria: '18', temperatura: '37', saturacaoOxigenio: '0' })).toEqual({
      erros: {},
      sinais: { frequenciaRespiratoria: 18, temperatura: 37, saturacaoOxigenio: 0 },
    })
    expect(validarSinais({ ...SINAIS_VAZIOS, frequenciaCardiaca: '9.5' }).erros.frequenciaCardiaca).toBeDefined()
    expect(validarSinais({ ...SINAIS_VAZIOS, saturacaoOxigenio: '100' }).sinais.saturacaoOxigenio).toBe(100)
    expect(validarSinais({ ...SINAIS_VAZIOS, pressaoArterial: '9/60' }).erros.pressaoArterial).toBeDefined()
    expect(validarSinais(SINAIS_VAZIOS)).toEqual({ erros: {}, sinais: {} })
  })

  it('espera em texto curto', () => {
    expect(formatarEspera(0)).toBe('0 min')
    expect(formatarEspera(59)).toBe('59 min')
    expect(formatarEspera(60)).toBe('1 h')
    expect(formatarEspera(125)).toBe('2 h 05 min')
  })
})

describe('FE-06: histórico e acesso de emergência (RF-010)', () => {
  it('paciente sem histórico segue o mesmo fluxo (critério de aceite)', async () => {
    await abrir({ 'GET /atendimentos/a1/historico': { status: 200, corpo: { registros: [], possuiInformacoesRestritas: false, acessoDeEmergencia: false } } })
    await userEvent.click(await screen.findByRole('button', { name: 'Histórico de Ana Lima' }))
    const dialogo = screen.getByRole('dialog', { name: 'Histórico de Ana Lima' })
    expect(await within(dialogo).findByText(/Siga a triagem normalmente/)).toBeInTheDocument()
    expect(within(dialogo).queryByRole('button', { name: 'Acesso de emergência' })).not.toBeInTheDocument()
  })

  it('com informações restritas: acesso de emergência com justificativa, e os restritos aparecem marcados', async () => {
    const { chamadas } = await abrir({
      'GET /atendimentos/a9/historico': { status: 200, corpo: { registros: [], possuiInformacoesRestritas: true, acessoDeEmergencia: false } },
      'POST /atendimentos/a9/historico/emergencia': { status: 200, corpo: { registros: [REGISTRO], possuiInformacoesRestritas: false, acessoDeEmergencia: true } },
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Histórico de Caio Dias' }))
    const dialogo = screen.getByRole('dialog', { name: 'Histórico de Caio Dias' })
    await userEvent.click(await within(dialogo).findByRole('button', { name: 'Acesso de emergência' }))
    await userEvent.type(within(dialogo).getByLabelText('Justificativa da emergência'), '   curta   ')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Acessar em emergência' }))
    expect(within(dialogo).getByLabelText('Justificativa da emergência')).toHaveAccessibleDescription(/pelo menos 20 caracteres/)
    expect(chamadas.some((c) => c.chave.endsWith('/emergencia'))).toBe(false)

    await userEvent.clear(within(dialogo).getByLabelText('Justificativa da emergência'))
    await userEvent.type(within(dialogo).getByLabelText('Justificativa da emergência'), '  Paciente inconsciente na sala vermelha.  ')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Acessar em emergência' }))
    await waitFor(() =>
      expect(chamadas.find((c) => c.chave === 'POST /atendimentos/a9/historico/emergencia')?.corpo).toEqual({ justificativa: 'Paciente inconsciente na sala vermelha.' }),
    )
    expect(await within(dialogo).findByText('Restrito pelo paciente')).toBeInTheDocument()
    expect(within(dialogo).getByText('Acesso de emergência', { selector: 'p' })).toBeInTheDocument()
  })

  it('a recusa da API (por exemplo, quem confirmou a cor) aparece no formulário', async () => {
    await abrir({
      'GET /atendimentos/a9/historico': { status: 200, corpo: { registros: [], possuiInformacoesRestritas: true, acessoDeEmergencia: false } },
      'POST /atendimentos/a9/historico/emergencia': {
        status: 422,
        corpo: { detail: 'Quem confirmou a classificação de risco não pode usar o acesso de emergência com base nela: outro profissional precisa fazê-lo.' },
      },
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Histórico de Caio Dias' }))
    const dialogo = screen.getByRole('dialog')
    await userEvent.click(await within(dialogo).findByRole('button', { name: 'Acesso de emergência' }))
    await userEvent.type(within(dialogo).getByLabelText('Justificativa da emergência'), 'Paciente inconsciente na sala vermelha.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Acessar em emergência' }))
    expect(await within(dialogo).findByText(/outro profissional precisa fazê-lo/)).toBeInTheDocument()
  })
})
