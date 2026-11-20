import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Users } from 'lucide-react'
import { AvisoIA, TITULO_DO_AVISO_DE_IA } from '@/componentes/AvisoIA'
import { GradeDeIndicadores } from '@/componentes/CartaoIndicador'
import { Selecao } from '@/componentes/Campo'
import { DialogoConfirmacao } from '@/componentes/DialogoConfirmacao'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Painel } from '@/componentes/Painel'
import { Tabela, type Coluna } from '@/componentes/Tabela'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'

interface Linha {
  nome: string
  idade: number
}

const colunas: Coluna<Linha>[] = [
  { titulo: 'Paciente', celula: (l) => l.nome },
  { titulo: 'Idade', celula: (l) => l.idade, numerica: true },
]

describe('Tabela', () => {
  it('com linhas: legenda, cabeçalhos de coluna e região rolável pelo teclado', async () => {
    const { container } = render(
      <Painel titulo="Pacientes da rede">
        <Tabela legenda="Pacientes da rede" legendaOculta colunas={colunas} linhas={[{ nome: 'Ana', idade: 30 }]} chave={(l) => l.nome} />
      </Painel>,
    )
    const tabela = screen.getByRole('table', { name: 'Pacientes da rede' })
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Paciente', 'Idade'])
    expect(screen.getByRole('group', { name: 'Pacientes da rede' })).toHaveAttribute('tabindex', '0')
    expect(tabela).toHaveTextContent('Ana')
    expect(await violacoesDeAcessibilidade(container)).toEqual([])
  })

  it('carregando, vazia e com erro', async () => {
    const aoTentar = vi.fn()
    const { rerender, container } = render(<Tabela legenda="Leitos" colunas={colunas} linhas={undefined} chave={(l) => l.nome} carregando />)
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Carregando registros…')
    rerender(<Tabela legenda="Leitos" colunas={colunas} linhas={[]} chave={(l) => l.nome} textoVazio="Nenhum leito nesta instituição." />)
    expect(screen.getByText('Nenhum leito nesta instituição.')).toBeInTheDocument()
    expect(await violacoesDeAcessibilidade(container)).toEqual([])
    rerender(<Tabela legenda="Leitos" colunas={colunas} linhas={undefined} chave={(l) => l.nome} erro="Falhou." aoTentarDeNovo={aoTentar} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(aoTentar).toHaveBeenCalledOnce()
  })
})

function DialogoDeTeste({ aoConfirmar }: { aoConfirmar: () => void }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}>
        Encerrar
      </button>
      <DialogoConfirmacao
        aberto={aberto}
        titulo="Encerrar atendimento?"
        mensagem="O atendimento não poderá ser reaberto."
        rotuloConfirmar="Encerrar atendimento"
        perigo
        aoConfirmar={aoConfirmar}
        aoCancelar={() => setAberto(false)}
      />
    </>
  )
}

describe('DialogoConfirmacao', () => {
  it('abre com o foco no Cancelar, trava a rolagem, Esc cancela e o foco volta ao botão que abriu', async () => {
    const aoConfirmar = vi.fn()
    const { container } = render(<DialogoDeTeste aoConfirmar={aoConfirmar} />)
    const abrir = screen.getByRole('button', { name: 'Encerrar' })
    await userEvent.click(abrir)
    const dialogo = screen.getByRole('alertdialog', { name: 'Encerrar atendimento?' })
    expect(dialogo).toHaveAccessibleDescription('O atendimento não poderá ser reaberto.')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    expect(await violacoesDeAcessibilidade(container)).toEqual([])

    dialogo.dispatchEvent(new Event('cancel', { cancelable: true }))
    await waitFor(() => expect(dialogo).not.toHaveAttribute('open'))
    expect(document.body.style.overflow).toBe('')
    expect(abrir).toHaveFocus()
    expect(aoConfirmar).not.toHaveBeenCalled()
  })

  it('desmontar com o diálogo aberto destrava a rolagem', async () => {
    const { unmount } = render(<DialogoDeTeste aoConfirmar={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar' }))
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('AvisoIA', () => {
  it('a ressalva fica junto do conteúdo gerado, para o leitor de tela', async () => {
    const { container } = render(
      <AvisoIA aviso="Resumo gerado por IA, sujeito à validação profissional." metadado="Gerado em 20/11 · modelo qwen3:8b">
        <p>Alergia a dipirona.</p>
      </AvisoIA>,
    )
    expect(screen.getByRole('region', { name: TITULO_DO_AVISO_DE_IA })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: TITULO_DO_AVISO_DE_IA })).toHaveAccessibleDescription(
      'Resumo gerado por IA, sujeito à validação profissional.',
    )
    expect(await violacoesDeAcessibilidade(container)).toEqual([])
  })
})

describe('demais componentes', () => {
  it('etiqueta, indicadores, seleção e painel sem violações', async () => {
    const { container } = render(
      <Painel titulo="Resumo" subtitulo="Dados da instituição">
        <Etiqueta tom="risco-amarelo" texto="Amarelo" />
        <GradeDeIndicadores indicadores={[{ rotulo: 'Acessos', valor: '12', icone: Users }]} />
        <Selecao rotulo="Categoria" ajuda="Filtra os leitos." erro="Escolha uma categoria.">
          <option value="">Todas</option>
        </Selecao>
      </Painel>,
    )
    expect(screen.getByRole('region', { name: 'Resumo' })).toBeInTheDocument()
    expect(screen.getByRole('term')).toHaveTextContent('Acessos')
    expect(screen.getByRole('definition')).toHaveTextContent('12')
    expect(screen.getByLabelText('Categoria')).toHaveAccessibleDescription('Filtra os leitos. Escolha uma categoria.')
    expect(await violacoesDeAcessibilidade(container)).toEqual([])
  })
})
