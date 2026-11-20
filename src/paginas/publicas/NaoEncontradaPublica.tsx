import { Link } from 'react-router'
import { TituloPagina } from '@/componentes/TituloPagina'
import { CartaoDeEntrada } from '@/paginas/publicas/CartaoDeEntrada'

/** Endereço desconhecido sem sessão: o cartão do login, sem formulário. */
export function NaoEncontradaPublica() {
  return (
    <CartaoDeEntrada>
      <p className="text-rotulo font-semibold text-texto-suave">Erro 404</p>
      <div className="mt-2">
        <TituloPagina titulo="Página não encontrada" />
      </div>
      <p className="mt-3 text-corpo text-texto">O endereço pode estar errado ou a página foi removida.</p>
      <div className="mt-6">
        <Link
          to="/entrar"
          className="inline-flex min-h-alvo items-center justify-center rounded-controle bg-primaria px-4 text-corpo font-semibold text-white shadow-botao hover:bg-primaria-hover lg:min-h-controle"
        >
          Ir para o login
        </Link>
      </div>
    </CartaoDeEntrada>
  )
}
