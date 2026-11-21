// TST-03: acessibilidade (WCAG 2.1 AA) e responsividade nas telas reais, em celular, tablet e computador.
// Para cada tela e tamanho: axe-core com as regras WCAG 2.0/2.1 A e AA (inclusive contraste, que o jsdom não mede),
// rolagem lateral (conteúdo cortado), e, no computador, o percurso só com Tab: foco visível, sem armadilha.
// Pré-requisitos: os mesmos do funcionais.mjs. Uso: `node e2e/acessibilidade.mjs [pasta-das-evidencias]`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { carregarPlaywright, entrar, usarInstituicao, FRONT, senhaDeDemonstracao } from './apoio.mjs'

const PASTA = process.argv[2] ?? join(import.meta.dirname, '..', 'docs', 'testes', 'evidencias', 'tst-03')
mkdirSync(PASTA, { recursive: true })
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
const TAMANHOS = {
  celular: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  computador: { width: 1280, height: 800 },
}
/** 320 px de largura: o reflow do WCAG 1.4.10 (equivale a 1280 px com zoom de 400%). */
const REFLOW = { width: 320, height: 640 }

async function axe(p) {
  await p.addScriptTag({ content: AXE })
  return p.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
    return r.violations.map((v) => ({ regra: v.id, impacto: v.impact, ajuda: v.help, onde: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) }))
  })
}

/** Conteúdo mais largo que a tela: aparece rolagem lateral e algo fica cortado. */
const rolagemLateral = (p) => p.evaluate(() => {
  const largura = document.documentElement.clientWidth
  const largos = [...document.querySelectorAll('body *')]
    .filter((e) => {
      const r = e.getBoundingClientRect()
      const estilo = getComputedStyle(e)
      return r.width > 0 && r.right > largura + 1 && estilo.position !== 'fixed' && !e.closest('[inert], [aria-hidden="true"], .sr-only, table, [data-rolagem]')
    })
    .slice(0, 3)
    .map((e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''}`)
  return { pagina: document.documentElement.scrollWidth > largura + 1, largos }
})

/**
 * Percorre a página só com Tab, do topo até o foco dar a volta (no máximo 120 teclas). Cada parada precisa ter foco
 * visível (contorno ou sombra, no próprio elemento ou no cartão que envolve o rádio escondido) e ocupar espaço na tela.
 * O campo de data tem partes internas (dia, mês, ano e o botão do calendário): o Chrome desenha o foco nelas, então
 * ele conta como visível. Se o foco sair para a barra do navegador, o Tab seguinte volta à página.
 */
async function teclado(p) {
  await p.evaluate(() => {
    window.scrollTo(0, 0)
    // Diálogo modal abre com o foco no primeiro campo: tira o foco antes de gravar o estilo "sem foco".
    document.activeElement?.blur()
    document.body.setAttribute('tabindex', '-1')
    document.body.focus()
    document.body.removeAttribute('tabindex')
    // Estilo de cada elemento sem foco: o foco só conta como visível se o contorno ou a sombra mudarem com ele
    // (botões e cartões com sombra o tempo todo não passam por isso).
    const assinatura = (el) => {
      const s = getComputedStyle(el)
      return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}|${s.boxShadow}`
    }
    window.__semFoco = new Map([...document.querySelectorAll('a, button, input, select, textarea, summary, label, [tabindex]')].map((el) => [el, assinatura(el)]))
    window.__assinatura = assinatura
  })
  const paradas = []
  let foraDaPagina = 0
  for (let i = 0; i < 120 && foraDaPagina < 2; i++) {
    await p.keyboard.press('Tab')
    const info = await p.evaluate(() => {
      const e = document.activeElement
      if (!e || e === document.body) return null
      const estilo = getComputedStyle(e)
      const r = e.getBoundingClientRect()
      const temContorno = (el) => {
        const s = getComputedStyle(el)
        const mudou = window.__semFoco?.get(el) !== undefined && window.__semFoco.get(el) !== window.__assinatura(el)
        return mudou && ((s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none'))
      }
      const cartao = e.closest('label')
      const visivel = temContorno(e) || (cartao && temContorno(cartao)) || (e.tagName === 'INPUT' && e.type === 'date')
      const rotulo = (e.getAttribute('aria-label') || e.labels?.[0]?.textContent || e.textContent || e.getAttribute('name') || '').trim().replace(/\s+/g, ' ').slice(0, 50)
      return { tag: e.tagName.toLowerCase(), tipo: e.getAttribute('type') ?? '', rotulo, focoVisivel: Boolean(visivel), ocupaEspaco: r.width > 0 && r.height > 0, inerte: Boolean(e.closest('[inert]')) }
    })
    if (!info) {
      foraDaPagina++
      continue
    }
    foraDaPagina = 0
    const chave = `${info.tag}:${info.tipo}:${info.rotulo}`
    if (paradas.length > 1 && paradas[0].chave === chave) break
    // Partes internas do campo de data repetem a mesma chave: conta uma parada só.
    if (paradas.length && paradas.at(-1).chave === chave && info.tipo === 'date') continue
    paradas.push({ ...info, chave })
  }
  return paradas
}

const { chromium } = carregarPlaywright()
const navegador = await chromium.launch({ channel: 'chrome' })
const resultados = []

/** Abre a tela em cada tamanho, com o estado montado por `preparar`, e roda as conferências. */
async function avaliar(nome, pagina, preparar) {
  for (const [tamanho, viewport] of Object.entries(TAMANHOS)) {
    await pagina.setViewportSize(viewport)
    await preparar(pagina)
    await pagina.waitForTimeout(700)
    const violacoes = await axe(pagina)
    const rolagem = await rolagemLateral(pagina)
    const arquivo = `${nome.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${tamanho}.jpg`
    // O QR e o segredo do cadastro do segundo fator ficam cobertos na captura: segredo não vai para o repositório.
    const segredos = [pagina.getByRole('img', { name: /QR code/ }), pagina.getByText(/^[A-Z2-7]{4}( [A-Z2-7]{1,4}){3,}$/)]
    await pagina.screenshot({ path: join(PASTA, arquivo), type: 'jpeg', quality: 60, fullPage: true, mask: segredos })
    const item = { tela: nome, tamanho, violacoes, rolagemLateral: rolagem, evidencia: arquivo }
    if (tamanho === 'computador') item.teclado = await teclado(pagina)
    resultados.push(item)
    console.log(`${nome} · ${tamanho}: ${violacoes.length} violação(ões) do axe${rolagem.pagina ? ', ROLAGEM LATERAL' : ''}${item.teclado ? `, ${item.teclado.length} paradas de Tab, ${item.teclado.filter((t) => !t.focoVisivel || !t.ocupaEspaco || t.inerte).length} com problema de foco` : ''}`)
  }
  await pagina.setViewportSize(REFLOW)
  await preparar(pagina)
  await pagina.waitForTimeout(500)
  const reflow = await rolagemLateral(pagina)
  resultados.push({ tela: nome, tamanho: '320px', violacoes: [], rolagemLateral: reflow })
  if (reflow.pagina) console.log(`${nome} · 320px: ROLAGEM LATERAL (${reflow.largos.join(', ')})`)
  await pagina.setViewportSize(TAMANHOS.computador)
}

// ---- Telas públicas ----
const anonimo = await (await navegador.newContext({ locale: 'pt-BR' })).newPage()
await avaliar('Entrada', anonimo, async (p) => { await p.goto(`${FRONT}/entrar`); await p.getByRole('heading', { level: 1 }).waitFor() })
await avaliar('Entrada com erro de senha', anonimo, async (p) => {
  await p.goto(`${FRONT}/entrar`)
  await p.getByLabel('Login').fill('administrativo.demo')
  await p.getByLabel('Senha', { exact: true }).fill('senha-errada-de-teste')
  await p.getByRole('button', { name: 'Acessar plataforma' }).click()
  await p.getByText(/inválid/i).first().waitFor()
})
await avaliar('Segundo fator: cadastro', anonimo, async (p) => {
  await p.goto(`${FRONT}/entrar`)
  await p.getByLabel('Login').fill('auditor.demo')
  await p.getByLabel('Senha', { exact: true }).fill(senhaDeDemonstracao())
  await p.getByRole('button', { name: 'Acessar plataforma' }).click()
  await p.getByLabel('Código de 6 dígitos').waitFor()
})
await avaliar('Página não encontrada', anonimo, async (p) => { await p.goto(`${FRONT}/nao-existe`); await p.getByRole('heading', { level: 1 }).waitFor() })

// ---- Administrativo ----
const adm = await entrar(navegador, 'administrativo.demo')
await usarInstituicao(adm, 'Hospital Público Exemplo')
const ir = (rota, titulo) => async (p) => { await p.goto(`${FRONT}${rota}`); await p.getByRole('heading', { level: 1, name: titulo }).waitFor() }
await avaliar('Início com dois vínculos', await entrar(navegador, 'administrativo.demo'), async (p) => {
  await p.goto(`${FRONT}/`)
  await p.getByRole('heading', { level: 1 }).waitFor()
})
await avaliar('Painel', adm, async (p) => { await ir('/painel', 'Painel')(p); await p.getByText('%').first().waitFor() })
await avaliar('Pacientes · paciente encontrado', adm, async (p) => {
  await ir('/pacientes', 'Pacientes')(p)
  await p.getByLabel('CPF do paciente').fill('111.444.777-35')
  await p.getByRole('button', { name: 'Buscar' }).click()
  await p.getByRole('heading', { name: 'Paciente já cadastrado na rede' }).waitFor()
})
await avaliar('Pacientes · cadastro novo', adm, async (p) => {
  await ir('/pacientes', 'Pacientes')(p)
  await p.getByLabel('CPF do paciente').fill('529.982.247-25')
  await p.getByRole('button', { name: 'Buscar' }).click()
  await p.getByRole('heading', { name: 'Cadastrar paciente' }).waitFor()
})
await avaliar('Leitos', adm, ir('/leitos', 'Leitos'))
await avaliar('Internações', adm, ir('/internacoes', 'Internações'))
await avaliar('Internações · diálogo de internar', adm, async (p) => {
  await ir('/internacoes', 'Internações')(p)
  await p.getByRole('button', { name: /^Internar / }).first().click()
  await p.getByRole('dialog').waitFor()
})

// ---- Enfermeiro ----
const enf = await entrar(navegador, 'enfermeiro.demo')
await usarInstituicao(enf, 'Hospital Público Exemplo')
await avaliar('Triagem', enf, ir('/triagem', 'Triagem'))
await avaliar('Triagem · diálogo de triagem', enf, async (p) => {
  await ir('/triagem', 'Triagem')(p)
  await p.getByRole('button', { name: /^Triar / }).first().click()
  await p.getByRole('dialog').getByLabel('Sintomas').waitFor()
})

// ---- Médico ----
const med = await entrar(navegador, 'medico.demo')
await usarInstituicao(med, 'Hospital Universitário Exemplo')
await avaliar('Atendimentos', med, ir('/atendimentos', 'Atendimentos'))
await avaliar('Atendimento do paciente', med, async (p) => {
  await ir('/atendimentos', 'Atendimentos')(p)
  await p.getByRole('region', { name: 'Em atendimento' }).getByRole('link', { name: /^Abrir / }).or(p.getByRole('region', { name: 'Em atendimento' }).getByRole('button', { name: /^Abrir / })).first().click()
  await p.getByRole('region', { name: 'Prontuário' }).waitFor()
})

// ---- Auditor ----
const aud = await entrar(navegador, 'auditor.demo')
await avaliar('Painel do gestor', aud, async (p) => { await ir('/painel', 'Painel')(p); await p.getByText('%').first().waitFor() })
await avaliar('Auditoria', aud, ir('/auditoria', 'Auditoria'))
await avaliar('Relatórios', aud, ir('/relatorios', 'Relatórios'))

// ---- Paciente ----
const pac = await entrar(navegador, 'paciente.demo')
await avaliar('Meu prontuário', pac, ir('/meu-prontuario', 'Meu prontuário'))
await avaliar('Consentimentos', pac, ir('/consentimentos', 'Consentimentos'))

writeFileSync(join(PASTA, 'resultado.json'), JSON.stringify({ quando: new Date().toISOString(), resultados }, null, 2))
await navegador.close()
const comViolacao = resultados.filter((r) => r.violacoes.length).length
const comRolagem = resultados.filter((r) => r.rolagemLateral?.pagina).length
const semFoco = resultados.flatMap((r) => r.teclado ?? []).filter((t) => !t.focoVisivel || !t.ocupaEspaco || t.inerte).length
console.log(`\n${resultados.length} avaliações · ${comViolacao} com violação do axe · ${comRolagem} com rolagem lateral · ${semFoco} paradas de Tab sem foco visível.`)
