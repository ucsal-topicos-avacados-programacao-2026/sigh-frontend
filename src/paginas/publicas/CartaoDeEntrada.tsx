import type { ReactNode } from 'react'
import { Marca } from '@/componentes/Marca'

/**
 * Foto do lado esquerdo das telas de entrada: o primeiro arquivo src/assets/entrada.{webp,jpg,jpeg,png} que
 * existir. Sem arquivo, o lado esquerdo fica com o painel azul e a frase. A foto precisa ter licença de uso.
 */
const fotos = import.meta.glob<string>('../../assets/entrada.{webp,jpg,jpeg,png}', { eager: true, import: 'default' })
const FOTO_DE_ENTRADA: string | undefined = Object.values(fotos)[0]

/**
 * Telas de entrada (login, segundo fator): a partir de 1024px, a tela se divide em foto com véu azul à esquerda e
 * formulário à direita. Abaixo disso, a foto com o véu vira o fundo da tela, e o formulário fica num cartão branco
 * por cima (o cartão garante o contraste dos campos e do texto).
 */
export function CartaoDeEntrada({ children, largo = false }: { children: ReactNode; largo?: boolean }) {
  return (
    <div className="relative grid min-h-screen bg-superficie lg:grid-cols-2">
      {/* Fundo no celular e no tablet: a mesma foto e o mesmo véu do lado esquerdo do desktop. */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-entrada-veu lg:hidden">
        {FOTO_DE_ENTRADA && <img src={FOTO_DE_ENTRADA} alt="" className="size-full object-cover object-[45%_30%]" />}
        <div className="absolute inset-0 bg-entrada-veu/55" />
      </div>
      <aside aria-label="Apresentação do SIGH" className="relative hidden overflow-hidden bg-entrada-veu lg:block">
        {FOTO_DE_ENTRADA && (
          // Decorativa: o texto do painel é o que tem significado.
          <img src={FOTO_DE_ENTRADA} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        {/* Véu azul sobre a foto, mais escuro embaixo, para o texto branco ter contraste. */}
        <div aria-hidden="true" className="absolute inset-0 bg-entrada-veu/45" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-entrada-veu/95 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="max-w-md text-[28px] leading-9 font-semibold">Cuidar melhor começa por conhecer quem chega.</p>
          <p className="mt-3 max-w-md text-destaque text-white/90">
            Com a história de saúde de cada paciente disponível em toda a rede, a equipe acolhe melhor e decide com mais
            confiança.
          </p>
        </div>
      </aside>
      <main className="relative flex items-center justify-center px-4 py-8 sm:px-10 lg:py-10">
        <div
          className={`w-full rounded-painel bg-superficie p-6 shadow-dialogo sm:p-8 lg:rounded-none lg:p-0 lg:shadow-none ${
            largo ? 'max-w-[520px]' : 'max-w-[400px]'
          }`}
        >
          <Marca variante="completa" />
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
