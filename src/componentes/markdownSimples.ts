/**
 * Leitura do pequeno pedaço de Markdown que o modelo de IA usa nos resumos: títulos ("# ..." ou uma linha inteira
 * em negrito), listas ("- ", "* ", "• " ou "1. ") e, dentro do texto, negrito e itálico. Todo o resto é texto puro:
 * nada vira HTML, então o que vem da IA nunca é interpretado como marcação da página.
 */
export type Bloco =
  | { tipo: 'titulo'; trechos: Trecho[] }
  | { tipo: 'paragrafo'; trechos: Trecho[] }
  | { tipo: 'lista'; ordenada: boolean; inicio?: number; itens: Trecho[][] }

export interface Trecho {
  texto: string
  negrito?: boolean
  italico?: boolean
}

const TITULO = /^#{1,6}\s+(.+?)\s*#*\s*$/
const LINHA_EM_NEGRITO = /^\*\*(.+?)\*\*:?\s*$/
const ITEM = /^\s*(?:[-*•]|(\d+)[.)])\s+(.+)$/

/** Negrito (**...** ou __...__) e itálico (*...* ou _..._) dentro de uma linha. */
export function trechos(linha: string): Trecho[] {
  const partes: Trecho[] = []
  // Itálico só com letra ou número colado às marcas: "2 * 3", "(*)" e "dose_maxima" continuam como estão.
  const marca = /(\*\*|__)(.+?)\1|(?<![\p{L}\p{N}*_])([*_])(?=[\p{L}\p{N}])(.+?)(?<=[\p{L}\p{N}.!?])\3(?![\p{L}\p{N}*_])/gu
  let fim = 0
  for (const achado of linha.matchAll(marca)) {
    if (achado.index > fim) partes.push({ texto: linha.slice(fim, achado.index) })
    if (achado[2] !== undefined) partes.push({ texto: achado[2], negrito: true })
    else partes.push({ texto: achado[4] ?? '', italico: true })
    fim = achado.index + achado[0].length
  }
  if (fim < linha.length) partes.push({ texto: linha.slice(fim) })
  return partes.filter((p) => p.texto !== '')
}

export function blocos(texto: string): Bloco[] {
  const saida: Bloco[] = []
  let paragrafo: string[] = []
  const fecharParagrafo = () => {
    // A quebra de linha simples continua quebra: o modelo às vezes separa itens só com ela.
    if (paragrafo.length) saida.push({ tipo: 'paragrafo', trechos: trechos(paragrafo.join('\n')) })
    paragrafo = []
  }
  for (const bruta of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const linha = bruta.trim()
    if (!linha) {
      fecharParagrafo()
      continue
    }
    const titulo = linha.match(TITULO)?.[1] ?? linha.match(LINHA_EM_NEGRITO)?.[1]
    if (titulo) {
      fecharParagrafo()
      saida.push({ tipo: 'titulo', trechos: trechos(titulo) })
      continue
    }
    const item = bruta.match(ITEM)
    if (item) {
      fecharParagrafo()
      const ordenada = item[1] !== undefined
      const anterior = saida.at(-1)
      if (anterior?.tipo === 'lista' && anterior.ordenada === ordenada) anterior.itens.push(trechos(item[2] ?? ''))
      else if (ordenada && item[1] !== '1') saida.push({ tipo: 'lista', ordenada, inicio: Number(item[1]), itens: [trechos(item[2] ?? '')] })
      else saida.push({ tipo: 'lista', ordenada, itens: [trechos(item[2] ?? '')] })
      continue
    }
    paragrafo.push(linha)
  }
  fecharParagrafo()
  return saida
}
