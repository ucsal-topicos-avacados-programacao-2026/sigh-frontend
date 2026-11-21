import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { HOSPITAL_A, renderizar, usuario } from '@/testes/renderizar'

function simularLargura(largura: number) {
  window.matchMedia = ((consulta: string) => {
    const minimo = Number(/min-width:\s*(\d+)px/.exec(consulta)?.[1] ?? 0)
    return {
      matches: largura >= minimo,
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
}

const RECEPCIONISTA = usuario(['RECEPCAO', 'ADMINISTRATIVO'], [{ ...HOSPITAL_A, perfis: ['RECEPCAO', 'ADMINISTRATIVO'] }])

describe('menu em gaveta abaixo de 1024px', () => {
  afterEach(() => {
    // @ts-expect-error volta ao jsdom sem matchMedia (desktop)
    delete window.matchMedia
  })

  it('fechada fica inerte; aberta é um diálogo com o foco preso e o resto da página inerte', async () => {
    simularLargura(768)
    renderizar('/pacientes', RECEPCIONISTA)
    await screen.findByRole('heading', { level: 1, name: 'Pacientes' })
    const gaveta = document.getElementById('menu-lateral') as HTMLElement
    expect(gaveta).toHaveAttribute('inert')

    const abrir = screen.getByRole('button', { name: 'Abrir menu' })
    expect(abrir).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(abrir)
    const dialogo = screen.getByRole('dialog', { name: 'Menu principal' })
    expect(gaveta).not.toHaveAttribute('inert')
    expect(within(dialogo).getByRole('button', { name: 'Fechar menu' })).toHaveFocus()
    expect(document.getElementById('conteudo')?.parentElement).toHaveAttribute('inert')
    expect(screen.getByText('Pular para o conteúdo')).toHaveAttribute('inert')
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus())
  })

  it('tocar no fundo escuro fecha a gaveta', async () => {
    simularLargura(768)
    renderizar('/pacientes', RECEPCIONISTA)
    await screen.findByRole('heading', { level: 1, name: 'Pacientes' })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const fundo = document.querySelector('.bg-slate-900\\/40') as HTMLElement
    await userEvent.click(fundo)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('escolher um item fecha a gaveta e leva o foco ao título da tela', async () => {
    simularLargura(768)
    renderizar('/pacientes', RECEPCIONISTA)
    await screen.findByRole('heading', { level: 1, name: 'Pacientes' })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Leitos' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Leitos' })).toHaveFocus()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abaixo de 640px, o usuário e a instituição vão para a gaveta, e sair vira só ícone', async () => {
    simularLargura(375)
    renderizar('/pacientes', RECEPCIONISTA)
    await screen.findByRole('heading', { level: 1, name: 'Pacientes' })
    expect(screen.getByRole('button', { name: 'Sair do SIGH' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByText('Pessoa de Teste')).toBeInTheDocument()
    expect(within(dialogo).getByText(/Hospital A/)).toBeInTheDocument()
  })
})
