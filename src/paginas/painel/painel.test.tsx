import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PainelDaInstituicao } from '@/api/tipos'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { HOSPITAL_A, HOSPITAL_B, renderizar, usuario, type Rotas } from '@/testes/renderizar'

function painel(instituicaoId: string, instituicaoNome: string, mudar: Partial<PainelDaInstituicao> = {}): PainelDaInstituicao {
  return {
    instituicaoId,
    instituicaoNome,
    tipo: 'PUBLICA',
    geradoEm: '2026-11-21T14:32:10',
    leitos: [
      { categoria: 'ENFERMARIA', status: 'OCUPADO', quantidade: 3 },
      { categoria: 'ENFERMARIA', status: 'LIVRE', quantidade: 1 },
      { categoria: 'UTI', status: 'OCUPADO', quantidade: 1 },
      { categoria: 'UTI', status: 'BLOQUEADO', quantidade: 1 },
    ],
    aguardandoTriagem: { quantidade: 2, maiorEsperaMinutos: 75 },
    fila: [
      { cor: 'VERMELHO', quantidade: 1, maiorEsperaMinutos: 4, tempoMaximoMinutos: 0, acimaDoTempoMaximo: 1 },
      { cor: 'LARANJA', quantidade: 0, maiorEsperaMinutos: null, tempoMaximoMinutos: 10, acimaDoTempoMaximo: 0 },
      { cor: 'AMARELO', quantidade: 3, maiorEsperaMinutos: 90, tempoMaximoMinutos: 60, acimaDoTempoMaximo: 2 },
      { cor: 'VERDE', quantidade: 1, maiorEsperaMinutos: 40, tempoMaximoMinutos: 120, acimaDoTempoMaximo: 0 },
      { cor: 'AZUL', quantidade: 0, maiorEsperaMinutos: null, tempoMaximoMinutos: 240, acimaDoTempoMaximo: 0 },
    ],
    emAtendimento: 5,
    internados: 4,
    chegadasHoje: 17,
    transferencias: { recebidas: 1, enviadas: 2 },
    ...mudar,
  }
}

const NUMEROS: Record<string, PainelDaInstituicao> = {
  'hospital-a': painel('hospital-a', 'Hospital A'),
  'hospital-b': painel('hospital-b', 'Hospital B', {
    tipo: 'PRIVADA',
    leitos: [{ categoria: 'UTI', status: 'LIVRE', quantidade: 2 }],
    aguardandoTriagem: { quantidade: 0, maiorEsperaMinutos: null },
    chegadasHoje: 3,
  }),
  'hospital-c': painel('hospital-c', 'Hospital C', { chegadasHoje: 9 }),
}

/** GET /painel devolve os números da instituição pedida. */
const rotaDoPainel: Rotas[string] = (_corpo, url) => {
  const id = new URL(url, 'http://localhost').searchParams.get('instituicaoId') ?? ''
  const numeros = NUMEROS[id]
  return numeros ? { status: 200, corpo: numeros } : { status: 403, corpo: { detail: 'Sem vínculo ativo com a instituição.' } }
}

const pedidosDoPainel = (chamadas: { chave: string; url: string }[]) =>
  chamadas.filter((c) => c.chave === 'GET /painel').map((c) => new URL(c.url, 'http://localhost').searchParams.get('instituicaoId'))

function administrativoEmDois() {
  window.sessionStorage.setItem('sigh.instituicao', 'hospital-a')
  return usuario(['ADMINISTRATIVO'], [
    { ...HOSPITAL_A, perfis: ['ADMINISTRATIVO'] },
    { ...HOSPITAL_B, perfis: ['ADMINISTRATIVO'] },
  ])
}

const chegadasHoje = () => within(screen.getByRole('region', { name: 'Agora no hospital' })).getByText('Chegadas hoje').closest('div')

describe('FE-09: painel por hospital', () => {
  it('mostra os números do hospital ativo: ocupação, espera, fila por cor, movimento e transferências', async () => {
    renderizar('/painel', administrativoEmDois(), { 'GET /painel': rotaDoPainel })
    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(await screen.findByText('67%', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('4 de 6 leitos ocupados')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Ocupado: 4 \(67%\), Livre: 1 \(17%\), Bloqueado: 1 \(17%\)/ })).toBeInTheDocument()
    expect(screen.getByText(/Hospital A · Hospital público · números de 14:32/)).toBeInTheDocument()

    const espera = screen.getByRole('region', { name: 'Aguardando triagem' })
    expect(within(espera).getByText('2')).toBeInTheDocument()
    expect(within(espera).getByText('Há mais tempo: 1 h 15 min')).toBeInTheDocument()

    const fila = screen.getByRole('region', { name: 'Fila do médico por classificação de risco' })
    expect(within(fila).getByText('5 pacientes na fila.')).toBeInTheDocument()
    expect(within(fila).getByText('3 acima do tempo máximo')).toBeInTheDocument()
    const vermelho = within(fila).getByText('Vermelho · Emergência').closest('li') as HTMLElement
    expect(within(vermelho).getByText('Atendimento imediato')).toBeInTheDocument()
    expect(within(vermelho).getByText('1 acima do máximo')).toBeInTheDocument()
    const amarelo = within(fila).getByText('Amarelo · Urgente').closest('li') as HTMLElement
    expect(within(amarelo).getByText('Maior espera 1 h 30 min')).toBeInTheDocument()
    expect(within(amarelo).getByText('Tempo máximo 1 h')).toBeInTheDocument()
    expect(within(amarelo).getByText('2 acima do máximo')).toBeInTheDocument()

    expect(chegadasHoje()).toHaveTextContent('17')
    const categorias = screen.getByRole('region', { name: 'Leitos livres por categoria' })
    expect(within(categorias).getByText('Enfermaria').closest('li')).toHaveTextContent('1 de 4')
    expect(within(categorias).getByText('UTI').closest('li')).toHaveTextContent('0 de 2')
    expect(within(categorias).queryByText('Pediátrico')).not.toBeInTheDocument()
    const transferencias = screen.getByRole('region', { name: 'Transferências pendentes' })
    expect(within(transferencias).getByText('Recebidas').closest('div')).toHaveTextContent('1')
    expect(within(transferencias).getByText('Enviadas').closest('div')).toHaveTextContent('2')
  })

  it('escolher outro cartão troca a instituição ativa e os números, sem mostrar os do hospital anterior', async () => {
    const { chamadas } = renderizar('/painel', administrativoEmDois(), { 'GET /painel': rotaDoPainel })
    await screen.findByText('67%', { selector: 'p' })
    const grupo = screen.getByRole('group', { name: 'Hospital do painel' })
    expect(within(grupo).getByRole('radio', { name: /Hospital A/ })).toBeChecked()
    expect(within(grupo).getAllByRole('radio')).toHaveLength(2)

    await userEvent.click(within(grupo).getByRole('radio', { name: /Hospital B/ }))
    expect(within(grupo).getByRole('radio', { name: /Hospital B/ })).toBeChecked()
    expect(screen.getByLabelText('Instituição ativa')).toHaveValue('hospital-b')
    await waitFor(() => expect(chegadasHoje()).toHaveTextContent('3'))
    expect(screen.queryByText('67%', { selector: 'p' })).not.toBeInTheDocument()
    expect(screen.getByText('Ninguém aguardando.')).toBeInTheDocument()
    expect(screen.getByText(/Hospital B · Hospital privado/)).toBeInTheDocument()
    expect(pedidosDoPainel(chamadas)).toEqual(['hospital-a', 'hospital-b'])
  })

  it('enquanto os números do novo hospital não chegam, não mostra os do anterior', async () => {
    let soltarB: () => void = () => {}
    const respostaB = new Promise<void>((resolver) => (soltarB = resolver))
    renderizar('/painel', administrativoEmDois(), { 'GET /painel': rotaDoPainel })
    await screen.findByText('67%', { selector: 'p' })
    // O simulador responde na hora; a resposta do hospital B espera a promessa, como uma rede lenta.
    const fetchOriginal = globalThis.fetch
    vi.stubGlobal('fetch', async (...args: Parameters<typeof fetch>) => {
      if (String(args[0]).includes('hospital-b')) await respostaB
      return fetchOriginal(...args)
    })
    await userEvent.click(screen.getByRole('radio', { name: /Hospital B/ }))
    await waitFor(() => expect(chegadasHoje()).toHaveTextContent('—'))
    expect(screen.queryByText('67%', { selector: 'p' })).not.toBeInTheDocument()
    soltarB()
    await waitFor(() => expect(chegadasHoje()).toHaveTextContent('3'))
  })

  it('pelo teclado: Tab chega ao hospital marcado e as setas trocam de hospital', async () => {
    const { chamadas } = renderizar('/painel', administrativoEmDois(), { 'GET /painel': rotaDoPainel })
    await screen.findByText('67%', { selector: 'p' })
    const marcado = screen.getByRole('radio', { name: /Hospital A/ })
    marcado.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: /Hospital B/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Hospital B/ })).toHaveFocus()
    await waitFor(() => expect(pedidosDoPainel(chamadas)).toContain('hospital-b'))
  })

  it('o gestor da rede vê todos os hospitais credenciados, sem trocar instituição nenhuma', async () => {
    const { chamadas } = renderizar('/painel', usuario(['AUDITOR_GESTOR']), {
      'GET /api/instituicoes': {
        status: 200,
        corpo: [
          { id: 'hospital-a', nome: 'Hospital A' },
          { id: 'hospital-b', nome: 'Hospital B' },
          { id: 'hospital-c', nome: 'Hospital C' },
        ],
      },
      'GET /painel': rotaDoPainel,
    })
    const grupo = await screen.findByRole('group', { name: 'Hospital do painel' })
    expect(within(grupo).getAllByRole('radio')).toHaveLength(3)
    expect(within(grupo).getByRole('radio', { name: /Hospital A/ })).toBeChecked()
    expect(within(grupo).getByRole('radio', { name: /Hospital A/ }).closest('label')).toHaveTextContent('Gestão da rede')
    await waitFor(() => expect(chegadasHoje()).toHaveTextContent('17'))
    await userEvent.click(within(grupo).getByRole('radio', { name: /Hospital C/ }))
    await waitFor(() => expect(chegadasHoje()).toHaveTextContent('9'))
    expect(screen.queryByLabelText('Instituição ativa')).not.toBeInTheDocument()
    expect(pedidosDoPainel(chamadas)).toEqual(['hospital-a', 'hospital-c'])
    // O gestor não opera a fila nem os leitos: o painel não oferece essas telas.
    expect(screen.queryByRole('link', { name: 'Abrir leitos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir triagem' })).not.toBeInTheDocument()
  })

  it('os links levam só às telas que a pessoa pode abrir', async () => {
    window.sessionStorage.setItem('sigh.instituicao', 'hospital-a')
    renderizar('/painel', usuario(['ENFERMEIRO'], [{ ...HOSPITAL_A, perfis: ['ENFERMEIRO'] }]), { 'GET /painel': rotaDoPainel })
    await screen.findByText('67%', { selector: 'p' })
    expect(screen.getByRole('link', { name: 'Abrir triagem' })).toHaveAttribute('href', '/triagem')
    expect(screen.getByRole('link', { name: 'Abrir atendimentos' })).toHaveAttribute('href', '/atendimentos')
    expect(screen.queryByRole('link', { name: 'Abrir leitos' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Hospital A/ }).closest('label')).toHaveTextContent('Você aqui: Enfermeiro')
    expect(screen.getByText('Você tem vínculo com um hospital só.')).toBeInTheDocument()
  })

  it('falha da API: alerta com "Tentar de novo", que pede de novo', async () => {
    let falhar = true
    const { chamadas } = renderizar('/painel', administrativoEmDois(), {
      'GET /painel': (corpo, url) => (falhar ? { status: 500, corpo: { detail: 'Erro interno.' } } : rotaDoPainel(corpo, url)),
    })
    expect(await screen.findByText('Não foi possível carregar os números')).toBeInTheDocument()
    falhar = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('67%', { selector: 'p' })).toBeInTheDocument()
    expect(pedidosDoPainel(chamadas)).toEqual(['hospital-a', 'hospital-a'])
  })

  it('hospital sem leitos nem fila mostra os zeros sem barra vazia', async () => {
    NUMEROS['hospital-a'] = painel('hospital-a', 'Hospital A', {
      leitos: [],
      fila: NUMEROS['hospital-a']!.fila.map((linha) => ({ ...linha, quantidade: 0, maiorEsperaMinutos: null, acimaDoTempoMaximo: 0 })),
    })
    try {
      renderizar('/painel', administrativoEmDois(), { 'GET /painel': rotaDoPainel })
      expect(await screen.findAllByText('Nenhum leito cadastrado.')).toHaveLength(2)
      expect(screen.queryByRole('img', { name: /Leitos por situação/ })).not.toBeInTheDocument()
      expect(screen.getByText('Ninguém classificado aguardando o médico.')).toBeInTheDocument()
      expect(screen.queryByText(/acima do tempo máximo/)).not.toBeInTheDocument()
    } finally {
      NUMEROS['hospital-a'] = painel('hospital-a', 'Hospital A')
    }
  })

  it('o botão Atualizar pede os números de novo', async () => {
    const { chamadas } = renderizar('/painel', administrativoEmDois(), { 'GET /painel': rotaDoPainel })
    await screen.findByText('67%', { selector: 'p' })
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    await waitFor(() => expect(pedidosDoPainel(chamadas)).toEqual(['hospital-a', 'hospital-a']))
  })

  it('atualiza sozinho: ao voltar para a aba, pede os números de novo', async () => {
    const { chamadas } = renderizar('/painel', administrativoEmDois(), { 'GET /painel': rotaDoPainel })
    await screen.findByText('67%', { selector: 'p' })
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(pedidosDoPainel(chamadas)).toEqual(['hospital-a', 'hospital-a']))
  })

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar('/painel', administrativoEmDois(), { 'GET /painel': rotaDoPainel })
    await screen.findByText('67%', { selector: 'p' })
    expect(await violacoesDeAcessibilidade(container)).toEqual([])
  })
})
