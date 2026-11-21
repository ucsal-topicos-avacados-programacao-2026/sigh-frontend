import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AtendimentoSemLeito, InternacaoAtiva, Leito, SolicitacaoTransferencia } from '@/api/tipos'
import { violacoesDeAcessibilidade, nomesQueNaoComecamPeloTexto } from '@/testes/acessibilidade'
import { HOSPITAL_A, renderizar, usuario, type Rotas } from '@/testes/renderizar'
import { useAtualizacaoPeriodica } from '@/util/useAtualizacaoPeriodica'

const ADMINISTRATIVO = usuario(['ADMINISTRATIVO'], [{ ...HOSPITAL_A, perfis: ['ADMINISTRATIVO'] }])
const leito = (id: string, codigo: string, categoria: Leito['categoria'], status: Leito['status'], setor = 'Setor'): Leito => ({
  id,
  instituicaoId: 'hospital-a',
  codigo,
  setor,
  categoria,
  status,
})
const LEITOS = [
  leito('l1', 'ENF-101', 'ENFERMARIA', 'LIVRE', 'Clínica médica'),
  leito('l2', 'UTI-101', 'UTI', 'OCUPADO', 'UTI adulto'),
  leito('l3', 'ISO-101', 'ISOLAMENTO', 'EM_HIGIENIZACAO'),
  leito('l4', 'PED-101', 'PEDIATRICO', 'BLOQUEADO'),
  leito('l5', 'UTI-102', 'UTI', 'LIVRE', 'UTI adulto'),
]
const INTERNACAO: InternacaoAtiva = {
  id: 'i1',
  atendimentoId: 'a0',
  paciente: 'Maria Souza',
  leitoId: 'l2',
  leitoCodigo: 'UTI-101',
  setor: 'UTI adulto',
  categoria: 'UTI',
  admitidaEm: '2026-11-18T08:00:00',
  resumosDeAlta: [
    { id: 'r2', criadoEm: '2026-11-20T10:00:00', autor: 'Dr. Paulo' },
    { id: 'r1', criadoEm: '2026-11-19T10:00:00', autor: 'Dra. Ana' },
  ],
  solicitacaoPendenteId: null,
}
const NA_FILA: AtendimentoSemLeito = { atendimentoId: 'a1', paciente: 'João Lima', chegadaEm: '2026-11-20T07:30:00', status: 'EM_ATENDIMENTO', motivo: 'Dor torácica' }
const pedido = (id: string, extra: Partial<SolicitacaoTransferencia>): SolicitacaoTransferencia => ({
  id,
  internacaoId: 'ix',
  paciente: 'Bia Rocha',
  instituicaoOrigemId: 'h2',
  instituicaoOrigem: 'Hospital B',
  instituicaoDestinoId: 'hospital-a',
  categoria: 'UTI',
  status: 'PENDENTE',
  solicitadaEm: '2026-11-20T09:00:00',
  decididaEm: null,
  leitoDestinoId: null,
  motivoRecusa: null,
  ...extra,
})
const pagina = <T,>(itens: T[]) => ({ content: itens, page: { size: 500, number: 0, totalElements: itens.length, totalPages: 1 } })

function rotas(extra: Rotas = {}): Rotas {
  return {
    'GET /leitos': (_c, url) => {
      const p = new URL(url, 'http://localhost').searchParams
      if (p.get('instituicaoId') === 'h3') return { status: 200, corpo: pagina([leito('d1', 'X-1', 'UTI', 'LIVRE'), leito('d2', 'X-2', 'UTI', 'LIVRE')]) }
      return { status: 200, corpo: pagina(LEITOS) }
    },
    'GET /internacoes': { status: 200, corpo: [INTERNACAO] },
    'GET /internacoes/atendimentos-sem-leito': { status: 200, corpo: [NA_FILA] },
    'GET /solicitacoes-transferencia/recebidas': { status: 200, corpo: pagina([pedido('s1', {})]) },
    'GET /solicitacoes-transferencia/enviadas': {
      status: 200,
      corpo: pagina([
        pedido('s2', { internacaoId: 'i1', paciente: 'Maria Souza', instituicaoOrigemId: 'hospital-a', instituicaoOrigem: 'Hospital A', instituicaoDestinoId: 'h3' }),
        pedido('s3', { internacaoId: 'iz', paciente: 'Caio Dias', instituicaoDestinoId: 'h3', status: 'RECUSADA', motivoRecusa: 'Sem vaga na UTI' }),
      ]),
    },
    'GET /api/instituicoes': { status: 200, corpo: [{ id: 'hospital-a', nome: 'Hospital A' }, { id: 'h3', nome: 'Hospital C' }] },
    ...extra,
  }
}

async function abrir(rota: '/leitos' | '/internacoes', extra: Rotas = {}) {
  const resultado = renderizar(rota, ADMINISTRATIVO, rotas(extra))
  await screen.findByRole('heading', { level: 1, name: rota === '/leitos' ? 'Leitos' : 'Internações' })
  return resultado
}

const regiao = (nome: string | RegExp) => screen.findByRole('region', { name: nome })
const quantas = (chamadas: { chave: string }[], chave: string) => chamadas.filter((c) => c.chave === chave).length
const opcoes = (select: HTMLElement) => within(select).getAllByRole('option').map((o) => o.textContent)

describe('FE-04: mapa de leitos (RF-005)', () => {
  it('conta por estado, agrupa por categoria e mostra quem ocupa', async () => {
    const { chamadas } = await abrir('/leitos')
    const uti = await regiao('UTI (2)')
    const valor = (rotulo: string) => screen.getByText(rotulo, { selector: 'dt' }).nextElementSibling?.textContent
    expect(valor('Livres')).toBe('2')
    expect(valor('Ocupados')).toBe('1')
    expect(valor('Em higienização')).toBe('1')
    expect(valor('Bloqueados')).toBe('1')
    const ocupado = within(uti).getByText('UTI-101').closest('li') as HTMLElement
    expect(ocupado).toHaveTextContent('Ocupado')
    expect(await within(ocupado).findByText(/Maria Souza/)).toBeInTheDocument()
    expect(within(ocupado).getByRole('link', { name: 'Ver internação' })).toHaveAttribute('href', '/internacoes')
    expect(new URL(chamadas.find((c) => c.chave === 'GET /leitos')?.url ?? '', 'http://x').searchParams.get('instituicaoId')).toBe('hospital-a')
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
  })

  it('cada estado tem só as ações que a API aceita; o ocupado não tem nenhuma', async () => {
    await abrir('/leitos')
    await regiao('UTI (2)')
    const acoes = (codigo: string) => within(screen.getByText(codigo).closest('li') as HTMLElement).queryAllByRole('button').map((b) => b.textContent)
    expect(acoes('ENF-101')).toEqual(['Bloquear'])
    expect(acoes('UTI-101')).toEqual([])
    expect(acoes('ISO-101')).toEqual(['Concluir higienização', 'Bloquear'])
    expect(acoes('PED-101')).toEqual(['Desbloquear'])
  })

  it('concluir a higienização libera o leito e atualiza o mapa', async () => {
    const { chamadas } = await abrir('/leitos', { 'PATCH /leitos/l3/status': { status: 200, corpo: { ...LEITOS[2], status: 'LIVRE' } } })
    await regiao('UTI (2)')
    const antes = quantas(chamadas, 'GET /leitos')
    await userEvent.click(screen.getByRole('button', { name: 'Concluir higienização: leito ISO-101' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'PATCH /leitos/l3/status')?.corpo).toEqual({ status: 'LIVRE' }))
    expect(await screen.findByText('Leito ISO-101 liberado.')).toBeInTheDocument()
    await waitFor(() => expect(quantas(chamadas, 'GET /leitos')).toBeGreaterThan(antes))
  })

  it('a recusa da API aparece num alerta', async () => {
    await abrir('/leitos', { 'PATCH /leitos/l1/status': { status: 422, corpo: { detail: 'Leito ocupado só é desocupado por alta ou transferência.' } } })
    await regiao('UTI (2)')
    await userEvent.click(screen.getByRole('button', { name: 'Bloquear: leito ENF-101' }))
    expect(await screen.findByText('Leito ocupado só é desocupado por alta ou transferência.')).toBeInTheDocument()
  })

  it('filtra por categoria e estado', async () => {
    await abrir('/leitos')
    await regiao('UTI (2)')
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'LIVRE')
    expect(screen.getByRole('region', { name: 'UTI (1)' })).toHaveTextContent('UTI-102')
    expect(screen.getByRole('region', { name: 'Enfermaria (1)' })).toBeInTheDocument()
    expect(screen.queryByText('ISO-101')).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'PEDIATRICO')
    expect(screen.getByText('Nenhum leito com esses filtros.')).toBeInTheDocument()
  })

  it('cadastra um leito, com código e setor obrigatórios', async () => {
    const { chamadas } = await abrir('/leitos', { 'POST /leitos': { status: 201, corpo: leito('l9', 'ENF-102', 'ENFERMARIA', 'LIVRE') } })
    await regiao('UTI (2)')
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar leito' }))
    const dialogo = screen.getByRole('dialog', { name: 'Cadastrar leito' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cadastrar' }))
    expect(within(dialogo).getByLabelText('Código')).toHaveAccessibleDescription(/Informe o código do leito./)
    expect(within(dialogo).getByLabelText('Setor')).toHaveAccessibleDescription('Informe o setor.')
    await userEvent.type(within(dialogo).getByLabelText('Código'), ' ENF-102 ')
    await userEvent.type(within(dialogo).getByLabelText('Setor'), 'Clínica médica')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Categoria'), 'ENFERMARIA')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cadastrar' }))
    await waitFor(() =>
      expect(chamadas.find((c) => c.chave === 'POST /leitos')?.corpo).toEqual({ instituicaoId: 'hospital-a', codigo: 'ENF-102', setor: 'Clínica médica', categoria: 'ENFERMARIA' }),
    )
    expect(await screen.findByText('Leito ENF-102 cadastrado.')).toBeInTheDocument()
  })
})

describe('FE-04: atualização periódica', () => {
  afterEach(() => vi.useRealTimers())

  it('chama a cada intervalo com a aba visível, e não com ela escondida', () => {
    vi.useFakeTimers()
    const atualizar = vi.fn()
    const visibilidade = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const { unmount } = renderHook(() => useAtualizacaoPeriodica(atualizar, 30_000))
    act(() => vi.advanceTimersByTime(30_000))
    expect(atualizar).toHaveBeenCalledTimes(1)
    visibilidade.mockReturnValue('hidden')
    act(() => vi.advanceTimersByTime(60_000))
    expect(atualizar).toHaveBeenCalledTimes(1)
    visibilidade.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(atualizar).toHaveBeenCalledTimes(2)
    unmount()
    act(() => vi.advanceTimersByTime(60_000))
    expect(atualizar).toHaveBeenCalledTimes(2)
    visibilidade.mockRestore()
  })
})

describe('FE-04: internar (só leitos livres são alocáveis)', () => {
  it('a lista de leitos tem só os livres, por categoria; internar atualiza tudo', async () => {
    const { chamadas } = await abrir('/internacoes', { 'POST /internacoes': { status: 201, corpo: {} } })
    const fila = await regiao('Atendimentos sem internação')
    await within(fila).findByText('João Lima')
    expect(fila).toHaveTextContent('Em atendimento')
    expect(fila).toHaveTextContent('Dor torácica')
    await userEvent.click(within(fila).getByRole('button', { name: 'Internar João Lima' }))
    const dialogo = screen.getByRole('dialog', { name: 'Internar paciente' })
    const escolha = within(dialogo).getByLabelText('Leito')
    expect(opcoes(escolha)).toEqual(['Escolha um leito livre', 'ENF-101 · Clínica médica', 'UTI-102 · UTI adulto'])
    expect(within(escolha).getAllByRole('group').map((g) => g.getAttribute('label'))).toEqual(['Enfermaria', 'UTI'])

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Internar' }))
    expect(escolha).toHaveAccessibleDescription('Escolha o leito.')
    const antes = { leitos: quantas(chamadas, 'GET /leitos'), fila: quantas(chamadas, 'GET /internacoes/atendimentos-sem-leito'), internadas: quantas(chamadas, 'GET /internacoes') }
    await userEvent.selectOptions(escolha, 'l5')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Internar' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /internacoes')?.corpo).toEqual({ atendimentoId: 'a1', leitoId: 'l5' }))
    expect(await screen.findByText('João Lima internado no leito UTI-102.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Internações' })).toHaveFocus())
    await waitFor(() => {
      expect(quantas(chamadas, 'GET /leitos')).toBeGreaterThan(antes.leitos)
      expect(quantas(chamadas, 'GET /internacoes/atendimentos-sem-leito')).toBeGreaterThan(antes.fila)
      expect(quantas(chamadas, 'GET /internacoes')).toBeGreaterThan(antes.internadas)
    })
  })

  it('sem leito livre, a lista vira fila de espera e o diálogo não oferece leito', async () => {
    await abrir('/internacoes', { 'GET /leitos': { status: 200, corpo: pagina(LEITOS.map((l) => ({ ...l, status: l.status === 'LIVRE' ? 'OCUPADO' : l.status }))) } })
    const fila = await regiao('Fila de espera por leito')
    expect(within(fila).getByText('Nenhum leito livre agora')).toBeInTheDocument()
    await userEvent.click(await within(fila).findByRole('button', { name: 'Internar João Lima' }))
    const dialogo = screen.getByRole('dialog', { name: 'Internar paciente' })
    expect(within(dialogo).queryByLabelText('Leito')).not.toBeInTheDocument()
    expect(within(dialogo).getByText(/continua na fila de espera/)).toBeInTheDocument()
    expect(within(dialogo).queryByRole('button', { name: 'Internar' })).not.toBeInTheDocument()
  })
})

describe('FE-04: transferir e dar alta (RF-006)', () => {
  it('para outro leito da instituição: só os livres, sem o leito atual', async () => {
    const { chamadas } = await abrir('/internacoes', { 'POST /internacoes/i1/transferencia': { status: 200, corpo: {} } })
    const internados = await regiao('Internados')
    await userEvent.click(await within(internados).findByRole('button', { name: 'Transferir Maria Souza' }))
    const dialogo = screen.getByRole('dialog', { name: 'Transferir paciente' })
    expect(opcoes(within(dialogo).getByLabelText('Leito de destino'))).toEqual(['Escolha um leito livre', 'ENF-101 · Clínica médica', 'UTI-102 · UTI adulto'])
    await userEvent.selectOptions(within(dialogo).getByLabelText('Leito de destino'), 'l1')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Transferir' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /internacoes/i1/transferencia')?.corpo).toEqual({ leitoDestinoId: 'l1' }))
    expect(await screen.findByText('Maria Souza transferido para o leito ENF-101.')).toBeInTheDocument()
  })

  it('para outra instituição: pedido com destino e categoria, mostrando as vagas de lá', async () => {
    const { chamadas } = await abrir('/internacoes', { 'POST /internacoes/i1/solicitacoes-transferencia': { status: 201, corpo: pedido('s9', {}) } })
    const internados = await regiao('Internados')
    await userEvent.click(await within(internados).findByRole('button', { name: 'Transferir Maria Souza' }))
    const dialogo = screen.getByRole('dialog', { name: 'Transferir paciente' })
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Outra instituição da rede' }))
    expect(within(dialogo).getByRole('radio', { name: 'Outra instituição da rede' })).toHaveAccessibleDescription(/continua neste leito até o destino aceitar/)
    const destino = within(dialogo).getByLabelText('Instituição de destino')
    await waitFor(() => expect(opcoes(destino)).toEqual(['Escolha', 'Hospital C']))
    expect(within(dialogo).getByLabelText('Categoria do leito')).toHaveValue('UTI')
    await userEvent.selectOptions(destino, 'h3')
    await waitFor(() => expect(within(dialogo).getByLabelText('Categoria do leito')).toHaveAccessibleDescription('O destino tem 2 leitos livres nessa categoria agora.'))
    const vagas = chamadas.filter((c) => c.chave === 'GET /leitos').map((c) => new URL(c.url, 'http://x').searchParams).find((p) => p.get('instituicaoId') === 'h3')
    expect(vagas?.get('categoria')).toBe('UTI')
    expect(vagas?.get('status')).toBe('LIVRE')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Pedir transferência' }))
    await waitFor(() =>
      expect(chamadas.find((c) => c.chave === 'POST /internacoes/i1/solicitacoes-transferencia')?.corpo).toEqual({ instituicaoDestinoId: 'h3', categoria: 'UTI' }),
    )
    expect(await screen.findByText('Pedido de transferência enviado para Hospital C.')).toBeInTheDocument()
  })

  it('com pedido pendente: etiqueta na linha e não deixa pedir outro', async () => {
    await abrir('/internacoes', { 'GET /internacoes': { status: 200, corpo: [{ ...INTERNACAO, solicitacaoPendenteId: 's2' }] } })
    const internados = await regiao('Internados')
    expect(await within(internados).findByText('Transferência pedida')).toBeInTheDocument()
    await userEvent.click(within(internados).getByRole('button', { name: 'Transferir Maria Souza' }))
    const dialogo = screen.getByRole('dialog')
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Outra instituição da rede' }))
    expect(within(dialogo).getByText(/Já há um pedido de transferência aguardando o destino/)).toBeInTheDocument()
    expect(within(dialogo).queryByRole('button', { name: 'Pedir transferência' })).not.toBeInTheDocument()
  })

  it('alta com o resumo mais recente já escolhido; o leito vai para higienização', async () => {
    const { chamadas } = await abrir('/internacoes', { 'POST /internacoes/i1/alta': { status: 200, corpo: {} } })
    const internados = await regiao('Internados')
    await userEvent.click(await within(internados).findByRole('button', { name: 'Dar alta a Maria Souza' }))
    const dialogo = screen.getByRole('dialog', { name: 'Dar alta' })
    expect(within(dialogo).getByRole('radio', { name: 'Resumo de 20/11/2026 às 10:00' })).toBeChecked()
    expect(dialogo).toHaveTextContent('O leito UTI-101 vai para higienização.')
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Resumo de 19/11/2026 às 10:00' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Dar alta' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /internacoes/i1/alta')?.corpo).toEqual({ resumoAltaId: 'r1' }))
    expect(await screen.findByText('Alta registrada para Maria Souza. O leito UTI-101 foi para higienização.')).toBeInTheDocument()
  })

  it('sem resumo de alta, não há alta: explica e não oferece o botão', async () => {
    await abrir('/internacoes', { 'GET /internacoes': { status: 200, corpo: [{ ...INTERNACAO, resumosDeAlta: [] }] } })
    const internados = await regiao('Internados')
    await userEvent.click(await within(internados).findByRole('button', { name: 'Dar alta a Maria Souza' }))
    const dialogo = screen.getByRole('dialog', { name: 'Dar alta' })
    expect(within(dialogo).getByText('Falta o resumo de alta')).toBeInTheDocument()
    expect(within(dialogo).queryByRole('button', { name: 'Dar alta' })).not.toBeInTheDocument()
  })
})

describe('FE-04: pedidos de transferência entre instituições', () => {
  it('aceitar oferece só os leitos livres da categoria pedida', async () => {
    const { chamadas } = await abrir('/internacoes', { 'POST /solicitacoes-transferencia/s1/aceite': { status: 200, corpo: {} } })
    const recebidos = await regiao('Pedidos recebidos')
    await userEvent.click(await within(recebidos).findByRole('button', { name: 'Aceitar a transferência de Bia Rocha' }))
    const dialogo = screen.getByRole('dialog', { name: 'Aceitar a transferência' })
    expect(opcoes(within(dialogo).getByLabelText('Leito'))).toEqual(['Escolha um leito livre', 'UTI-102 · UTI adulto'])
    await userEvent.selectOptions(within(dialogo).getByLabelText('Leito'), 'l5')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Aceitar' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /solicitacoes-transferencia/s1/aceite')?.corpo).toEqual({ leitoId: 'l5' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Bia Rocha transferido para o leito UTI-102.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Internações' })).toHaveFocus())
  })

  it('recusar exige o motivo, que a origem vê', async () => {
    const { chamadas } = await abrir('/internacoes', { 'POST /solicitacoes-transferencia/s1/recusa': { status: 200, corpo: {} } })
    const recebidos = await regiao('Pedidos recebidos')
    await userEvent.click(await within(recebidos).findByRole('button', { name: 'Recusar a transferência de Bia Rocha' }))
    const dialogo = screen.getByRole('dialog', { name: 'Recusar a transferência' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Recusar' }))
    expect(within(dialogo).getByLabelText('Motivo')).toHaveAccessibleDescription(/Informe o motivo da recusa/)
    await userEvent.type(within(dialogo).getByLabelText('Motivo'), '   ')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Recusar' }))
    expect(within(dialogo).getByLabelText('Motivo')).toHaveAccessibleDescription(/Informe o motivo da recusa/)
    expect(chamadas.some((c) => c.chave.startsWith('POST'))).toBe(false)
    await userEvent.clear(within(dialogo).getByLabelText('Motivo'))
    await userEvent.type(within(dialogo).getByLabelText('Motivo'), '  UTI lotada  ')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Recusar' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave === 'POST /solicitacoes-transferencia/s1/recusa')?.corpo).toEqual({ motivo: 'UTI lotada' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Transferência de Bia Rocha recusada.')).toBeInTheDocument()
  })

  it('enviados: destino pelo nome, motivo da recusa, e cancelar o pendente', async () => {
    const { chamadas } = await abrir('/internacoes', { 'POST /solicitacoes-transferencia/s2/cancelamento': { status: 200, corpo: {} } })
    const enviados = await regiao('Pedidos enviados')
    const maria = (await within(enviados).findByText('Maria Souza')).closest('tr') as HTMLElement
    await waitFor(() => expect(maria).toHaveTextContent('Hospital C'))
    expect(maria).toHaveTextContent('Leito UTI-101')
    expect(maria).toHaveTextContent('Aguardando o destino')
    const caio = within(enviados).getByText('Caio Dias').closest('tr') as HTMLElement
    expect(caio).toHaveTextContent('Recusada')
    expect(caio).toHaveTextContent('Motivo: Sem vaga na UTI')
    expect(within(caio).queryByRole('button')).not.toBeInTheDocument()
    expect(nomesQueNaoComecamPeloTexto(enviados)).toEqual([])
    await userEvent.click(within(maria).getByRole('button', { name: 'Cancelar pedido de Maria Souza' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar pedido' }))
    await waitFor(() => expect(chamadas.some((c) => c.chave === 'POST /solicitacoes-transferencia/s2/cancelamento')).toBe(true))
    expect(await screen.findByText('Pedido de transferência de Maria Souza cancelado.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('a página de internações passa no axe', async () => {
    await abrir('/internacoes')
    await within(await regiao('Pedidos enviados')).findByText('Caio Dias')
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
  })
})
