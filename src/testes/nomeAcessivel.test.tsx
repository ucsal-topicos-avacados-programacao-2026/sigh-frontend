import { render } from '@testing-library/react'
import { nomesQueNaoComecamPeloTexto } from '@/testes/acessibilidade'

describe('nome acessível começa pelo texto visível (WCAG 2.5.3)', () => {
  it('acusa o botão cujo nome não começa pelo que está escrito nele; aceita os outros e ignora símbolos e botões só com ícone', () => {
    const { container } = render(
      <div>
        <button aria-label="Cancelar o pedido de Maria">Cancelar pedido</button>
        <button aria-label="Cancelar pedido de Maria">Cancelar pedido</button>
        <a href="/x" aria-label="Abrir Ana Souza">
          Abrir
        </a>
        <button aria-label="Fechar">×</button>
        <button aria-label="Só ícone" />
      </div>,
    )
    expect(nomesQueNaoComecamPeloTexto(container)).toEqual(['Cancelar pedido → Cancelar o pedido de Maria'])
  })
})
