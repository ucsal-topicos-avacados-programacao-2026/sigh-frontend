import axe from 'axe-core'

/** Violações do axe no elemento (sem contraste: o jsdom não calcula cor; ele fica para o teste no navegador). */
export async function violacoesDeAcessibilidade(elemento: Element) {
  const resultado = await axe.run(elemento, { rules: { 'color-contrast': { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

/**
 * Botões e links com aria-label cujo nome acessível não começa pelo texto visível (WCAG 2.5.3, "Label in Name"):
 * quem usa comando de voz fala o que vê. Devolve "texto visível → nome acessível" de cada um.
 */
export function nomesQueNaoComecamPeloTexto(elemento: Element) {
  return [...elemento.querySelectorAll('button[aria-label], a[aria-label]')]
    .map((e) => ({ visivel: (e.textContent ?? '').replace(/\s+/g, ' ').trim(), nome: e.getAttribute('aria-label') ?? '' }))
    .filter(({ visivel, nome }) => visivel && !nome.toLowerCase().startsWith(visivel.toLowerCase()))
    .map(({ visivel, nome }) => `${visivel} → ${nome}`)
}
