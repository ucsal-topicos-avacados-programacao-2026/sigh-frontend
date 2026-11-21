import axe from 'axe-core'

export async function violacoesDeAcessibilidade(elemento: Element) {
  const resultado = await axe.run(elemento, { rules: { 'color-contrast': { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

export function nomesQueNaoComecamPeloTexto(elemento: Element) {
  return [...elemento.querySelectorAll('button[aria-label], a[aria-label]')]
    .map((e) => ({ visivel: (e.textContent ?? '').replace(/\s+/g, ' ').trim(), nome: e.getAttribute('aria-label') ?? '' }))
    .filter(({ visivel, nome }) => /\p{L}/u.test(visivel) && !nome.toLowerCase().startsWith(visivel.toLowerCase()))
    .map(({ visivel, nome }) => `${visivel} → ${nome}`)
}
