import axe from 'axe-core'

/** Violações do axe no elemento (sem contraste: o jsdom não calcula cor; ele fica para o teste no navegador). */
export async function violacoesDeAcessibilidade(elemento: Element) {
  const resultado = await axe.run(elemento, { rules: { 'color-contrast': { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}
