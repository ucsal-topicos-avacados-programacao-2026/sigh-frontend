import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Perfil } from '@/api/tipos'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { HOSPITAL_A, HOSPITAL_B, renderizar, usuario } from '@/testes/renderizar'

async function itensDoMenu() {
  const menu = await screen.findByRole('navigation', { name: 'Menu principal' })
  return within(menu).queryAllByRole('link').map((link) => link.textContent)
}

describe('menu por perfil (FE-02: o perfil vê somente o menu permitido)', () => {
  const casos: [string, Perfil[], string[]][] = [
    ['paciente', ['PACIENTE'], ['Meu prontuário', 'Consentimentos']],
    ['enfermeiro', ['ENFERMEIRO'], ['Triagem', 'Atendimentos']],
    ['médico', ['MEDICO'], ['Atendimentos']],
    ['administrativo', ['ADMINISTRATIVO'], ['Pacientes', 'Leitos', 'Internações']],
    ['auditor', ['AUDITOR_GESTOR'], ['Auditoria', 'Relatórios']],
  ]

  it.each(casos)('%s', async (_nome, perfis, esperado) => {
    const deInstituicao = perfis.filter((p) => p !== 'PACIENTE' && p !== 'AUDITOR_GESTOR')
    const vinculos = deInstituicao.length ? [{ ...HOSPITAL_A, perfis: deInstituicao }] : []
    renderizar('/', usuario(perfis, vinculos))
    await screen.findByRole('heading', { level: 1 })
    expect(await itensDoMenu()).toEqual(esperado)
  })

  it('com dois vínculos, só depois de escolher a instituição; e o menu segue o perfil de cada uma', async () => {
    const logado = usuario(['MEDICO', 'ENFERMEIRO'], [
      { ...HOSPITAL_A, perfis: ['MEDICO'] },
      { ...HOSPITAL_B, perfis: ['ENFERMEIRO'] },
    ])
    renderizar('/', logado)
    expect(await screen.findByText('Escolha a instituição', { selector: 'p' })).toBeInTheDocument()
    expect(await itensDoMenu()).toEqual([])

    await userEvent.selectOptions(screen.getByLabelText('Instituição ativa'), 'hospital-b')
    expect(await itensDoMenu()).toEqual(['Triagem', 'Atendimentos'])
    await userEvent.selectOptions(screen.getByLabelText('Instituição ativa'), 'hospital-a')
    expect(await itensDoMenu()).toEqual(['Atendimentos'])
  })

  it('o item da página atual é marcado para o leitor de tela', async () => {
    renderizar('/leitos', usuario(['ADMINISTRATIVO'], [{ ...HOSPITAL_A, perfis: ['ADMINISTRATIVO'] }]))
    await screen.findByRole('heading', { level: 1, name: 'Leitos' })
    expect(screen.getByRole('link', { name: 'Leitos' })).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(document.title).toBe('Leitos · SIGH'))
  })
})

describe('guarda de rota', () => {
  it('sem sessão, a rota autenticada leva ao login', async () => {
    renderizar('/atendimentos')
    expect(await screen.findByRole('heading', { level: 1, name: 'Entre na sua conta' })).toBeInTheDocument()
  })

  it('perfil sem acesso vê a página de permissão, sem o conteúdo da área', async () => {
    renderizar('/leitos', usuario(['MEDICO'], [{ ...HOSPITAL_A, perfis: ['MEDICO'] }]))
    expect(await screen.findByRole('heading', { level: 1, name: /não tem permissão/ })).toBeInTheDocument()
    expect(screen.getByText(/instituição ativa \(Hospital A\)/)).toBeInTheDocument()
    expect(screen.queryByText('Em construção')).not.toBeInTheDocument()
  })

  it('endereço que não existe mostra a página não encontrada', async () => {
    renderizar('/nao-existe', usuario(['PACIENTE']))
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
  })

  it('o início leva à primeira tela do menu', async () => {
    renderizar('/', usuario(['AUDITOR_GESTOR']))
    expect(await screen.findByRole('heading', { level: 1, name: 'Auditoria' })).toBeInTheDocument()
  })
})

describe('shell autenticado', () => {
  it('sair descarta o token e volta ao login com o aviso', async () => {
    renderizar('/', usuario(['PACIENTE']))
    await screen.findByRole('heading', { level: 1, name: 'Meu prontuário' })
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(await screen.findByText('Você saiu do SIGH.')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('sigh.token')).toBeNull()
  })

  it('só com o teclado: pular para o conteúdo, percorrer o menu e abrir uma tela', async () => {
    renderizar('/', usuario(['ADMINISTRATIVO'], [{ ...HOSPITAL_A, perfis: ['ADMINISTRATIVO'] }]))
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Pacientes' })
    // A página leva o foco ao título ao abrir; espera isso acontecer para não cair no meio do Tab abaixo.
    await waitFor(() => expect(titulo).toHaveFocus())
    const teclado = userEvent.setup()
    ;(document.activeElement as HTMLElement | null)?.blur()
    await teclado.tab()
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveFocus()
    await teclado.keyboard('{Enter}')
    expect(document.getElementById('conteudo')).toHaveFocus()

    ;(document.activeElement as HTMLElement | null)?.blur()
    await teclado.tab() // pular para o conteúdo
    await teclado.tab() // Pacientes
    await teclado.tab() // Leitos
    expect(screen.getByRole('link', { name: 'Leitos' })).toHaveFocus()
    await teclado.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: 'Leitos' })).toHaveFocus()
    await teclado.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Sair' })).toHaveFocus()
  })

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar('/', usuario(['ADMINISTRATIVO'], [{ ...HOSPITAL_A, perfis: ['ADMINISTRATIVO'] }]))
    await screen.findByRole('heading', { level: 1, name: 'Pacientes' })
    expect(await violacoesDeAcessibilidade(container)).toEqual([])
  })
})
