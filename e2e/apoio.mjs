// Apoio dos testes de ponta a ponta (TST-02 e TST-03): navegador, login com segundo fator, evidências e resultado.
// Roda contra a API no perfil `demonstracao` e o front em `npm run dev`. Não grava senha nem segredo em lugar nenhum.
import { createHmac } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const FRONT = process.env.SIGH_FRONT ?? 'http://localhost:5173'
export const API = process.env.SIGH_API ?? 'http://localhost:8080'

/** O Playwright vem do projeto, se instalado, ou de PW_LIB (a instalação global). */
export function carregarPlaywright() {
  const exigir = createRequire(import.meta.url)
  try {
    return exigir('playwright')
  } catch {
    if (!process.env.PW_LIB) throw new Error('Instale o playwright ou defina PW_LIB com o caminho dele.')
    return exigir(process.env.PW_LIB)
  }
}

/** Senha dos usuários *.demo: da variável SIGH_SENHA_DEMONSTRACAO ou do arquivo de ambiente local, nunca do repositório. */
export function senhaDeDemonstracao() {
  if (process.env.SIGH_SENHA_DEMONSTRACAO) return process.env.SIGH_SENHA_DEMONSTRACAO
  const env = readFileSync(join(homedir(), '.config/sigh/sigh-local.env'), 'utf8')
  const achado = env.match(/^(?:export\s+)?SIGH_SENHA_DEMONSTRACAO=["']?([^"'\n]+)/m)
  if (!achado) throw new Error('SIGH_SENHA_DEMONSTRACAO não encontrada.')
  return achado[1]
}

// ---------- TOTP (RFC 6238), como o aplicativo autenticador faz ----------

function base32(texto) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of texto.replace(/[\s=]/g, '').toUpperCase()) bits += alfabeto.indexOf(c).toString(2).padStart(5, '0')
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

function codigo(segredo, passo) {
  const contador = Buffer.alloc(8)
  contador.writeBigUInt64BE(BigInt(passo))
  const hmac = createHmac('sha1', base32(segredo)).update(contador).digest()
  const inicio = hmac[hmac.length - 1] & 0xf
  const numero = (hmac.readUInt32BE(inicio) & 0x7fffffff) % 1_000_000
  return String(numero).padStart(6, '0')
}

const ultimoPasso = new Map()

/** Código de agora. Se o deste período de 30 s já foi usado com este segredo, espera o próximo (a API não aceita repetido). */
export async function codigoNovo(segredo) {
  let passo = Math.floor(Date.now() / 30_000)
  if (ultimoPasso.get(segredo) === passo) {
    await new Promise((r) => setTimeout(r, 30_000 - (Date.now() % 30_000) + 500))
    passo = Math.floor(Date.now() / 30_000)
  }
  ultimoPasso.set(segredo, passo)
  return codigo(segredo, passo)
}

// ---------- Sessões ----------

const segredos = new Map()
// Opcional: guardar os segredos de teste num arquivo fora do repositório, para reaproveitar entre execuções
// sem reiniciar a API (o banco de demonstração é recriado a cada partida, e com ele os segredos).
const ARQUIVO_DE_SEGREDOS = process.env.SIGH_E2E_SEGREDOS
if (ARQUIVO_DE_SEGREDOS) {
  try {
    for (const [login, segredo] of Object.entries(JSON.parse(readFileSync(ARQUIVO_DE_SEGREDOS, 'utf8')))) segredos.set(login, segredo)
  } catch {
    // Sem arquivo ainda.
  }
}
const guardarSegredos = () => ARQUIVO_DE_SEGREDOS && writeFileSync(ARQUIVO_DE_SEGREDOS, JSON.stringify(Object.fromEntries(segredos)), { mode: 0o600 })

/**
 * Entra pela tela de login, como a pessoa faria. Com segundo fator: na primeira vez cadastra (lê o segredo que a
 * tela mostra para digitar no aplicativo) e nas seguintes valida o código. Devolve a página já dentro do SIGH.
 */
export async function entrar(navegador, login, { viewport = { width: 1280, height: 800 } } = {}) {
  const contexto = await navegador.newContext({ viewport, locale: 'pt-BR' })
  const p = await contexto.newPage()
  await p.goto(`${FRONT}/entrar`)
  await p.getByLabel('Login').fill(login)
  await p.getByLabel('Senha', { exact: true }).fill(senhaDeDemonstracao())
  await p.getByRole('button', { name: 'Acessar plataforma' }).click()
  await p.waitForURL((u) => !u.pathname.match(/^\/entrar\/?$/), { timeout: 20_000 })
  if (p.url().includes('/segundo-fator/cadastro')) {
    await p.getByRole('img', { name: /QR code/ }).waitFor()
    const texto = await p.locator('body').innerText()
    const segredo = texto.match(/\b([A-Z2-7]{4}(?: [A-Z2-7]{1,4}){3,})\b/)?.[1]
    if (!segredo) throw new Error(`Segredo do segundo fator não apareceu para ${login}.`)
    segredos.set(login, segredo.replace(/\s/g, ''))
    guardarSegredos()
    await p.getByLabel('Código de 6 dígitos').fill(await codigoNovo(segredos.get(login)))
    await p.getByRole('button', { name: 'Ativar segundo fator' }).click()
  } else if (p.url().includes('/segundo-fator')) {
    const segredo = segredos.get(login)
    if (!segredo) throw new Error(`${login} já tem segundo fator, mas o segredo não é deste teste. Reinicie a API de demonstração.`)
    await p.getByLabel('Código de 6 dígitos').fill(await codigoNovo(segredo))
    await p.getByRole('button', { name: 'Confirmar código' }).click()
  }
  await p.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 20_000 })
  await p.getByRole('heading', { level: 1 }).first().waitFor()
  return p
}

export const segredoDe = (login) => segredos.get(login)

/** Troca a instituição ativa no topo (usuário com mais de um vínculo). */
export async function usarInstituicao(p, nome) {
  const seletor = p.getByLabel('Instituição ativa')
  if (await seletor.count()) {
    const valor = await seletor.locator('option', { hasText: nome }).getAttribute('value')
    await seletor.selectOption(valor)
  } else {
    await p.getByRole('button', { name: new RegExp(nome) }).first().click()
  }
  await p.waitForTimeout(300)
}

/** Token da sessão aberta no navegador, para conferências direto na API. */
export const tokenDa = (p) => p.evaluate(() => sessionStorage.getItem('sigh.token'))

export async function api(token, metodo, caminho, corpo) {
  const r = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  const texto = await r.text()
  let json
  try {
    json = texto ? JSON.parse(texto) : undefined
  } catch {
    json = texto
  }
  return { status: r.status, corpo: json }
}

// ---------- Resultado e evidências ----------

export class Relatorio {
  constructor(pasta) {
    this.pasta = pasta
    this.casos = []
    /** Funções (página → locator) do que fica coberto em toda captura, como o CPF do paciente do teste. */
    this.esconder = []
    mkdirSync(pasta, { recursive: true })
  }

  /** Foto da tela (só a parte visível, em JPEG), com nome fixo para o relatório. */
  async foto(p, nome) {
    await p.waitForTimeout(400)
    const arquivo = `${nome}.jpg`
    await p.screenshot({ path: join(this.pasta, arquivo), type: 'jpeg', quality: 70, mask: this.esconder.map((f) => f(p)) })
    return arquivo
  }

  /** Roda um caso: passou se a função terminar sem erro. Uma falha não interrompe os casos seguintes. */
  async caso(id, requisito, titulo, esperado, executar) {
    const caso = { id, requisito, titulo, esperado, resultado: 'passou', observado: [], evidencias: [] }
    const inicio = Date.now()
    try {
      await executar({
        observar: (texto) => caso.observado.push(texto),
        foto: async (p, nome) => caso.evidencias.push(await this.foto(p, `${id}-${nome}`)),
        conferir: (condicao, mensagem) => {
          if (!condicao) throw new Error(mensagem)
          caso.observado.push(mensagem)
        },
      })
    } catch (erro) {
      caso.resultado = 'falhou'
      caso.erro = String(erro?.message ?? erro).split('\n')[0]
    }
    caso.segundos = Math.round((Date.now() - inicio) / 1000)
    this.casos.push(caso)
    console.log(`${caso.resultado === 'passou' ? 'PASSOU' : 'FALHOU'} ${id} ${titulo}${caso.erro ? ` — ${caso.erro}` : ''}`)
    return caso
  }

  salvar(nome = 'resultado.json') {
    writeFileSync(join(this.pasta, nome), JSON.stringify({ quando: new Date().toISOString(), casos: this.casos }, null, 2))
  }
}
