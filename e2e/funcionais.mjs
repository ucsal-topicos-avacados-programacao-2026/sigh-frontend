// TST-02: testes funcionais de ponta a ponta, pelas "formas de verificação" da ERS (cap. 3.2), com dados fictícios.
// Pré-requisitos: API no perfil `demonstracao` recém-iniciada (banco recriado), IA local (Ollama com qwen3:8b) e
// `npm run dev`. Uso: `node e2e/funcionais.mjs [pasta-das-evidencias]`.
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { Relatorio, api, carregarPlaywright, codigoNovo, entrar, segredoDe, senhaDeDemonstracao, tokenDa, usarInstituicao, FRONT } from './apoio.mjs'

const PASTA = process.argv[2] ?? join(import.meta.dirname, '..', 'docs', 'testes', 'evidencias', 'tst-02')
const PUBLICO = 'Hospital Público Exemplo'
const UNIVERSITARIO = 'Hospital Universitário Exemplo'
const ANA = { nome: 'Ana Souza Exemplo', cpf: '11144477735' }
/** O registro de saúde mental da Ana, restrito por ela na carga de demonstração. */
const RESTRITO_DA_ANA = '60000000-0000-0000-0000-000000000005'

/** CPF fictício válido e novo a cada execução. */
function cpfNovo() {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  if (new Set(d).size === 1) d[0] = (d[0] + 1) % 10
  for (const n of [10, 11]) {
    const r = (d.reduce((s, v, i) => s + v * (n - i), 0) * 10) % 11
    d.push(r === 10 ? 0 : r)
  }
  return d.join('')
}

/** Consulta só de leitura no banco de demonstração (container local `sigh-db`), para conferir o que a tela não mostra. */
function sql(consulta) {
  return execFileSync('docker', ['exec', 'sigh-db', 'psql', '-U', 'postgres', '-d', 'sigh_demonstracao', '-tAc', consulta], { encoding: 'utf8' }).trim()
}

const MENSAGEM_DO_GATILHO = 'Registros de auditoria não podem ser alterados nem excluídos.'

/**
 * Tentativa de alterar a auditoria direto no banco, dentro de uma transação que é sempre desfeita (se a proteção
 * falhar, nada se perde). Devolve a mensagem de erro do banco, ou null se o comando passou.
 */
function sqlQueDeveFalhar(comando) {
  try {
    execFileSync('docker', ['exec', 'sigh-db', 'psql', '-U', 'postgres', '-d', 'sigh_demonstracao', '-v', 'ON_ERROR_STOP=1', '-c', `BEGIN; ${comando}; ROLLBACK;`], { encoding: 'utf8', stdio: 'pipe' })
    return null
  } catch (erro) {
    return String(erro.stderr ?? erro.message).split('\n').find((l) => l.includes('ERROR')) ?? 'erro'
  }
}

const linha = (p, regiao, texto) => p.getByRole('region', { name: regiao }).getByRole('row', { name: new RegExp(texto) })

const { chromium } = carregarPlaywright()
const navegador = await chromium.launch({ channel: 'chrome' })
const r = new Relatorio(PASTA)
const novo = { nome: 'Teste Ponta a Ponta Exemplo', cpf: cpfNovo() }
const cpfMascarado = (c) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
// O CPF do teste é sorteado e válido: pode ser o de alguém. Ele fica coberto em todas as capturas.
r.esconder.push((p) => p.getByLabel('CPF do paciente'), (p) => p.getByText(cpfMascarado(novo.cpf)))

const adm = await entrar(navegador, 'administrativo.demo')
const enf = await entrar(navegador, 'enfermeiro.demo')
const med = await entrar(navegador, 'medico.demo')

async function admitir(p, cpf, motivo, cadastro) {
  await p.goto(`${FRONT}/pacientes`)
  await p.getByLabel('CPF do paciente').fill(cpfMascarado(cpf))
  await p.getByRole('button', { name: 'Buscar' }).click()
  if (cadastro) {
    await p.getByRole('heading', { name: 'Cadastrar paciente' }).waitFor()
    await p.getByLabel('Nome completo').fill(cadastro.nome)
    await p.getByLabel('Data de nascimento').fill(cadastro.nascimento)
    await p.getByRole('radio', { name: /Autoriza o compartilhamento/ }).check()
  } else {
    await p.getByRole('heading', { name: 'Paciente já cadastrado na rede' }).waitFor()
  }
  await p.getByLabel('Motivo do atendimento').fill(motivo)
}

// ---------------------------------------------------------------- RF-001

await r.caso('CT-01', 'RF-001, RN-004', 'Mesmo CPF em duas instituições usa o mesmo prontuário',
  'No 2º hospital, a busca acha o paciente já cadastrado e o atendimento é aberto no prontuário existente, sem cadastro duplicado.',
  async ({ foto, conferir, observar }) => {
    await usarInstituicao(adm, PUBLICO)
    await admitir(adm, novo.cpf, 'Dor de cabeça forte há dois dias', { nome: novo.nome, nascimento: '1990-03-15' })
    await foto(adm, '1-cadastro-no-publico')
    await adm.getByRole('button', { name: 'Cadastrar e abrir atendimento' }).click()
    await adm.getByRole('heading', { name: 'Atendimento aberto' }).waitFor()
    await foto(adm, '2-atendimento-aberto-no-publico')

    await usarInstituicao(adm, UNIVERSITARIO)
    await admitir(adm, novo.cpf, 'Retorno para reavaliação')
    await foto(adm, '3-ja-cadastrado-no-universitario')
    await adm.getByRole('button', { name: 'Abrir atendimento' }).click()
    await adm.getByRole('heading', { name: 'Atendimento aberto' }).waitFor()

    const pacientes = sql(`select count(*) from paciente where cpf = '${novo.cpf}'`)
    const prontuarios = sql(`select count(distinct a.prontuario_id) || '/' || count(*) from atendimento a join prontuario p on p.id = a.prontuario_id join paciente x on x.id = p.paciente_id where x.cpf = '${novo.cpf}'`)
    conferir(pacientes === '1', `Há 1 cadastro com o CPF (banco: ${pacientes}).`)
    conferir(prontuarios === '1/2', `Os 2 atendimentos (Público e Universitário) estão no mesmo prontuário (banco: ${prontuarios.replace('/', ' prontuário, ')} atendimentos).`)
    observar('No Universitário a tela mostrou "Paciente já cadastrado na rede" com nome e nascimento, e pediu só o motivo.')
    await usarInstituicao(adm, PUBLICO)
  })

// ---------------------------------------------------------------- RF-003

async function triar(p, paciente, cor, { confirmar = true, fotoAntes, exigirSugestao = false } = {}) {
  await p.goto(`${FRONT}/triagem`)
  const acao = p.getByRole('button', { name: new RegExp(`^(Triar|Continuar triagem de) ${paciente}$`) })
  await acao.click()
  const dialogo = p.getByRole('dialog')
  if (await dialogo.getByLabel('Sintomas').count()) {
    await dialogo.getByLabel('Sintomas').fill('Dor torácica em aperto há 1 hora, com falta de ar e sudorese.')
    await dialogo.getByLabel('Pressão arterial (mmHg)').fill('150/95')
    await dialogo.getByLabel('Frequência cardíaca (bpm)').fill('112')
    await dialogo.getByLabel('Frequência respiratória (irpm)').fill('24')
    await dialogo.getByLabel('Temperatura (°C)').fill('36,9')
    await dialogo.getByLabel('Saturação de oxigênio (%)').fill('93')
    await dialogo.getByRole('button', { name: 'Registrar e pedir sugestão' }).click()
  }
  await dialogo.getByText(/Sugestão gerada por IA|Triagem sem sugestão da IA/).first().waitFor({ timeout: 90_000 })
  const comSugestao = (await dialogo.getByText('Sugestão gerada por IA').count()) > 0
  if (exigirSugestao && !comSugestao) throw new Error('A IA não devolveu sugestão (a tela mostrou "Triagem sem sugestão da IA").')
  if (fotoAntes) await fotoAntes()
  if (!confirmar) {
    await dialogo.getByRole('button', { name: 'Fechar sem confirmar' }).click()
    return
  }
  await dialogo.getByRole('radio', { name: new RegExp(`^${cor}`) }).check()
  await dialogo.getByRole('button', { name: 'Confirmar classificação' }).click()
  await dialogo.waitFor({ state: 'hidden' })
}

await r.caso('CT-02', 'RF-003, RN-001, RN-008', 'Triagem sem histórico só vale com a confirmação do enfermeiro',
  'A IA sugere a cor (identificada como sugestão). Fechando sem confirmar, o paciente continua aguardando triagem; só depois da confirmação ele entra na fila.',
  async ({ foto, conferir, observar }) => {
    await usarInstituicao(enf, PUBLICO)
    await triar(enf, novo.nome, 'Laranja', { confirmar: false, exigirSugestao: true, fotoAntes: () => foto(enf, '1-sugestao-da-ia') })
    observar('A IA devolveu a sugestão de cor, identificada como "Sugestão gerada por IA — sujeita à validação profissional".')
    await linha(enf, 'Aguardando triagem', novo.nome).getByText('Falta confirmar').waitFor()
    conferir(!(await linha(enf, 'Fila de atendimento', novo.nome).count()), 'Sem confirmação, o paciente fica em "Aguardando triagem", marcado "Falta confirmar", e não entra na fila.')
    await foto(enf, '2-falta-confirmar')
    await triar(enf, novo.nome, 'Laranja')
    await linha(enf, 'Fila de atendimento', novo.nome).waitFor()
    conferir(true, 'Depois de confirmar Laranja, o paciente aparece na fila de atendimento.')
    await foto(enf, '3-na-fila')
  })

await r.caso('CT-03', 'RF-003, RN-005', 'Prioridade segue o risco confirmado, sem rebaixar quem não tem histórico',
  'O paciente sem histórico, confirmado como Laranja, fica na fila acima dos Amarelos e Verdes, que chegaram antes dele.',
  async ({ foto, conferir }) => {
    const linhas = await enf.getByRole('region', { name: 'Fila de atendimento' }).getByRole('row').allInnerTexts()
    const corpo = linhas.slice(1)
    const posicao = (texto) => corpo.findIndex((l) => l.includes(texto))
    const meu = posicao(novo.nome)
    const primeiroAmarelo = corpo.findIndex((l) => l.includes('Amarelo'))
    const primeiroVerde = corpo.findIndex((l) => l.includes('Verde'))
    conferir(primeiroAmarelo >= 0 && primeiroVerde >= 0, 'A fila tem pacientes Amarelos e Verdes para comparar.')
    conferir(meu >= 0 && meu < primeiroAmarelo && meu < primeiroVerde,
      `Na fila, o paciente sem histórico (Laranja) está na posição ${meu + 1}, acima do 1º Amarelo (${primeiroAmarelo + 1}) e do 1º Verde (${primeiroVerde + 1}).`)
    await foto(enf, '1-fila-por-prioridade')
  })

await r.caso('CT-04', 'RF-002, RF-003, RF-009', 'Triagem com histórico usa só os dados autorizados',
  'O histórico que o enfermeiro vê traz os registros da paciente, avisa que há informação restrita e não mostra o registro restrito.',
  async ({ foto, conferir }) => {
    await usarInstituicao(adm, PUBLICO)
    await admitir(adm, ANA.cpf, 'Falta de ar e chiado no peito')
    await adm.getByRole('button', { name: 'Abrir atendimento' }).click()
    await adm.getByRole('heading', { name: 'Atendimento aberto' }).waitFor()

    await enf.goto(`${FRONT}/triagem`)
    await enf.getByRole('button', { name: `Histórico de ${ANA.nome}` }).first().click()
    const dialogo = enf.getByRole('dialog')
    await dialogo.getByText('Asma brônquica persistente leve', { exact: false }).waitFor()
    const texto = await dialogo.innerText()
    conferir(/dipirona/i.test(texto), 'O histórico mostra a alergia a dipirona registrada antes.')
    conferir(/informações restritas/i.test(texto), 'O histórico avisa que há informações restritas pelo paciente.')
    conferir(!/depressivo/i.test(texto), 'O registro restrito (episódio depressivo) não aparece.')
    await foto(enf, '1-historico-com-restricao')
    await enf.keyboard.press('Escape')
    await triar(enf, ANA.nome, 'Laranja', { exigirSugestao: true })
    await linha(enf, 'Fila de atendimento', ANA.nome).waitFor()
    // Fontes que a IA usou na sugestão desta triagem (gravadas pela API): há fontes, e o registro restrito não está entre elas.
    const fontes = sql(`select string_agg(r.categoria_informacao, ', ' order by r.categoria_informacao) || '|' || count(*) || '|' || count(*) filter (where r.id = '${RESTRITO_DA_ANA}') from triagem t join atendimento a on a.id = t.atendimento_id join prontuario p on p.id = a.prontuario_id join paciente x on x.id = p.paciente_id join triagem_fontes_historico f on f.triagem_id = t.id join registro_clinico r on r.id = f.fontes_historico_id where x.cpf = '${ANA.cpf}' and t.cor_sugerida is not null`)
    const [categorias, total, restritos] = fontes.split('|')
    conferir(Number(total) > 0, `A sugestão da IA usou ${total} registro(s) do histórico (${categorias}).`)
    conferir(restritos === '0', 'O registro restrito não está entre as fontes que a IA usou na triagem (banco).')
    conferir(true, 'A triagem da paciente com histórico foi confirmada como Laranja e ela entrou na fila.')
  })

// ---------------------------------------------------------------- RF-005, RF-006

const estadoDoLeito = async (p, codigo) => {
  await p.goto(`${FRONT}/leitos`)
  const cartao = p.getByRole('listitem').filter({ has: p.getByText(codigo, { exact: true }) })
  await cartao.first().waitFor()
  return cartao.first().innerText()
}

let internacaoNoPublico = false
await r.caso('CT-05', 'RF-005, RF-006', 'Internação só oferece leito livre e o leito passa a ocupado',
  'A escolha de leito mostra só os livres; depois de internar, o leito escolhido fica ocupado.',
  async ({ foto, conferir }) => {
    await usarInstituicao(adm, PUBLICO)
    await adm.goto(`${FRONT}/internacoes`)
    await adm.getByRole('button', { name: `Internar ${novo.nome}` }).click()
    const dialogo = adm.getByRole('dialog')
    const opcoes = (await dialogo.getByLabel('Leito').locator('option').allInnerTexts()).filter((o) => !o.startsWith('Escolha'))
    const livres = sql(`select string_agg(codigo, ',' order by codigo) from leito l join instituicao i on i.id = l.instituicao_id where i.nome = '${PUBLICO}' and l.status = 'LIVRE'`)
    conferir(opcoes.map((o) => o.split(' · ')[0]).sort().join(',') === livres, `A lista de leitos mostra só os livres do hospital (${livres}).`)
    await foto(adm, '1-escolha-de-leito')
    await dialogo.getByLabel('Leito').selectOption({ label: opcoes.find((o) => o.startsWith('ENF-103')) })
    await dialogo.getByRole('button', { name: 'Internar' }).click()
    await dialogo.waitFor({ state: 'hidden' })
    await adm.getByRole('region', { name: 'Internados' }).getByRole('row', { name: new RegExp(novo.nome) }).waitFor()
    internacaoNoPublico = true
    conferir(/Ocupado/.test(await estadoDoLeito(adm, 'ENF-103')), 'O leito ENF-103 passou de livre para ocupado.')
    await foto(adm, '2-leito-ocupado')
  })

await r.caso('CT-06', 'RF-005, RF-006', 'Transferência para outro leito do mesmo hospital',
  'O paciente vai para o leito escolhido, que fica ocupado; o leito anterior vai para higienização.',
  async ({ foto, conferir }) => {
    if (!internacaoNoPublico) throw new Error('Depende do CT-05.')
    await adm.goto(`${FRONT}/internacoes`)
    await adm.getByRole('button', { name: `Transferir ${novo.nome}` }).click()
    const dialogo = adm.getByRole('dialog')
    await dialogo.getByRole('radio', { name: /Outro leito desta instituição/ }).check()
    const opcoes = await dialogo.getByLabel('Leito de destino').locator('option').allInnerTexts()
    await dialogo.getByLabel('Leito de destino').selectOption({ label: opcoes.find((o) => o.startsWith('UTI-102')) })
    await foto(adm, '1-transferencia-interna')
    await dialogo.getByRole('button', { name: 'Transferir' }).click()
    await dialogo.waitFor({ state: 'hidden' })
    conferir(/Ocupado/.test(await estadoDoLeito(adm, 'UTI-102')), 'O leito de destino UTI-102 ficou ocupado.')
    conferir(/higieniza/i.test(await estadoDoLeito(adm, 'ENF-103')), 'O leito anterior ENF-103 foi para "Em higienização".')
    await foto(adm, '2-leitos-depois')
  })

let transferido = false
await r.caso('CT-07', 'RF-006', 'Transferência para outro hospital da rede, com aceite do destino',
  'A origem pede e vê as vagas do destino; o destino aceita escolhendo um leito livre; o paciente continua no mesmo prontuário e o leito da origem vai para higienização.',
  async ({ foto, conferir }) => {
    if (!internacaoNoPublico) throw new Error('Depende do CT-05.')
    await adm.goto(`${FRONT}/internacoes`)
    await adm.getByRole('button', { name: `Transferir ${novo.nome}` }).click()
    const dialogo = adm.getByRole('dialog')
    await dialogo.getByRole('radio', { name: /Outra instituição da rede/ }).check()
    const destino = dialogo.getByLabel('Instituição de destino')
    await destino.selectOption({ label: UNIVERSITARIO })
    await dialogo.getByLabel('Categoria do leito').selectOption({ label: 'Enfermaria' })
    await dialogo.getByText(/vaga|livre/i).first().waitFor()
    await foto(adm, '1-pedido-com-vagas-do-destino')
    await dialogo.getByRole('button', { name: 'Pedir transferência' }).click()
    await dialogo.waitFor({ state: 'hidden' })
    await adm.getByRole('region', { name: 'Pedidos enviados' }).getByText(novo.nome).first().waitFor()

    await usarInstituicao(adm, UNIVERSITARIO)
    await adm.goto(`${FRONT}/internacoes`)
    await adm.getByRole('button', { name: `Aceitar a transferência de ${novo.nome}` }).click()
    const aceite = adm.getByRole('dialog')
    const opcoes = (await aceite.getByLabel('Leito').locator('option').allInnerTexts()).filter((o) => !o.startsWith('Escolha'))
    conferir(opcoes.length > 0 && opcoes.every((o) => o.startsWith('ENF-')), `O destino escolhe entre os leitos livres da categoria pedida (${opcoes.map((o) => o.split(' · ')[0]).join(', ')}).`)
    await aceite.getByLabel('Leito').selectOption({ label: opcoes[0] })
    await foto(adm, '2-aceite-no-destino')
    await aceite.getByRole('button', { name: 'Aceitar' }).click()
    await aceite.waitFor({ state: 'hidden' })
    await adm.getByRole('region', { name: 'Internados' }).getByRole('row', { name: new RegExp(novo.nome) }).waitFor()
    transferido = true
    await foto(adm, '3-internado-no-destino')
    const prontuarios = sql(`select count(distinct p.id) from paciente x join prontuario p on p.paciente_id = x.id where x.cpf = '${novo.cpf}'`)
    conferir(prontuarios === '1', 'O paciente continua com um único prontuário depois da transferência.')
    await usarInstituicao(adm, PUBLICO)
    conferir(/higieniza/i.test(await estadoDoLeito(adm, 'UTI-102')), 'O leito da origem (UTI-102) foi para "Em higienização".')
  })

await r.caso('CT-08', 'RF-006, RF-007', 'Alta com o resumo de internação anexado',
  'O médico registra o resumo de alta; o administrativo do hospital onde o paciente está dá a alta com esse resumo; o leito vai para higienização e depois volta a livre.',
  async ({ foto, conferir }) => {
    if (!transferido) throw new Error('Depende do CT-07.')
    await usarInstituicao(med, PUBLICO)
    await med.goto(`${FRONT}/atendimentos`)
    await med.getByRole('button', { name: `Atender ${novo.nome}` }).or(med.getByRole('link', { name: `Atender ${novo.nome}` })).first().click()
    await med.getByRole('heading', { level: 1, name: novo.nome }).waitFor()
    await med.getByLabel('Tipo').selectOption({ label: 'Resumo de internação ou alta' })
    await med.getByLabel('Registro', { exact: true }).fill('Internado por dor torácica; evoluiu estável, sem novos episódios. Alta com orientação e retorno ambulatorial.')
    await med.getByLabel('Categoria da informação').fill('Clínica geral')
    await med.getByRole('button', { name: 'Salvar registro' }).click()
    await med.getByText(/Registro salvo|foi salvo/i).first().waitFor()
    await foto(med, '1-resumo-de-alta-registrado')

    await usarInstituicao(adm, UNIVERSITARIO)
    await adm.goto(`${FRONT}/internacoes`)
    const leitoAtual = (await adm.getByRole('region', { name: 'Internados' }).getByRole('row', { name: new RegExp(novo.nome) }).innerText()).match(/ENF-\d+/)?.[0]
    await adm.getByRole('button', { name: `Dar alta a ${novo.nome}` }).click()
    const dialogo = adm.getByRole('dialog')
    await dialogo.getByRole('radio', { name: /Resumo de/ }).first().check()
    await foto(adm, '2-alta-com-resumo')
    await dialogo.getByRole('button', { name: 'Dar alta' }).click()
    await dialogo.waitFor({ state: 'hidden' })
    // A lista recarrega depois da alta: espera a linha sumir (até 10 s) antes de conferir.
    await adm.getByRole('region', { name: 'Internados' }).getByRole('row', { name: new RegExp(novo.nome) }).waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})
    conferir(!(await adm.getByRole('region', { name: 'Internados' }).getByRole('row', { name: new RegExp(novo.nome) }).count()), 'O paciente saiu da lista de internados.')
    conferir(/higieniza/i.test(await estadoDoLeito(adm, leitoAtual)), `O leito ${leitoAtual} foi para "Em higienização" com a alta.`)
    await adm.getByRole('button', { name: `Concluir higienização: leito ${leitoAtual}` }).click()
    await adm.waitForTimeout(800)
    conferir(/Livre/.test(await estadoDoLeito(adm, leitoAtual)), `Concluída a higienização, o leito ${leitoAtual} voltou a livre.`)
    await foto(adm, '3-leito-livre-de-novo')
    const resumo = sql(`select count(*) from internacao i join prontuario p on p.id = i.prontuario_id join paciente x on x.id = p.paciente_id where x.cpf = '${novo.cpf}' and i.alta_em is not null and i.resumo_alta_id is not null`)
    conferir(resumo === '1', 'A internação ficou com a data de alta e o resumo anexado (banco).')
    await usarInstituicao(adm, PUBLICO)
  })

// ---------------------------------------------------------------- RF-004, RF-009, RF-010

let atendimentoDaAna = null
await r.caso('CT-09', 'RF-004, RN-008, RF-009', 'Resumo por IA confere com o prontuário e não revela o restrito',
  'O resumo aparece como sugestão da IA, traz a alergia e o medicamento registrados e não menciona o registro restrito.',
  async ({ foto, conferir, observar }) => {
    await usarInstituicao(med, PUBLICO)
    await med.goto(`${FRONT}/atendimentos`)
    await med.getByRole('button', { name: `Atender ${ANA.nome}` }).or(med.getByRole('link', { name: `Atender ${ANA.nome}` })).first().click()
    await med.getByRole('heading', { level: 1, name: ANA.nome }).waitFor()
    atendimentoDaAna = med.url().split('/').pop()
    await med.getByRole('button', { name: 'Gerar resumo do histórico' }).click()
    const regiao = med.getByRole('region', { name: 'Resumo do histórico por IA' })
    await regiao.getByText('Sugestão gerada por IA').first().waitFor({ timeout: 180_000 })
    await med.waitForTimeout(500)
    const texto = await regiao.innerText()
    conferir(/dipirona/i.test(texto), 'O resumo traz a alergia a dipirona.')
    conferir(/salbutamol|broncodilatador/i.test(texto), 'O resumo traz o medicamento registrado (salbutamol).')
    conferir(/asma/i.test(texto), 'O resumo traz o diagnóstico de asma.')
    conferir(!/depress/i.test(texto), 'O resumo não menciona o registro restrito (episódio depressivo).')
    conferir(!texto.includes('**'), 'O resumo aparece formatado, sem asteriscos de Markdown (FE-10).')
    observar(`Trecho do resumo: "${texto.replace(/\s+/g, ' ').slice(0, 300)}…"`)
    await foto(med, '1-resumo-por-ia')
  })

await r.caso('CT-10', 'RF-010, RN-003', 'Acesso de emergência só com justificativa e fica identificado',
  'Sem justificativa suficiente a emergência é recusada; com justificativa, o registro restrito aparece marcado.',
  async ({ foto, conferir }) => {
    if (!atendimentoDaAna) throw new Error('Depende do CT-09.')
    const regiao = med.getByRole('region', { name: 'Prontuário' })
    await regiao.getByText(/informações restritas/i).first().waitFor()
    await regiao.getByRole('button', { name: /emergência/i }).first().click()
    const justificativa = med.getByLabel('Justificativa da emergência')
    await justificativa.fill('Urgente')
    await med.getByRole('button', { name: 'Acessar em emergência' }).click()
    await med.getByText(/20 caracteres|ao menos|pelo menos/i).first().waitFor()
    conferir(true, 'Com justificativa curta, a emergência é recusada e a tela explica o tamanho mínimo.')
    await justificativa.fill('Piora súbita da falta de ar, sem acompanhante; preciso do histórico completo para decidir a conduta.')
    await med.getByRole('button', { name: 'Acessar em emergência' }).click()
    await regiao.getByText(/depressivo/i).first().waitFor()
    conferir(/restrit/i.test(await regiao.innerText()), 'Depois da justificativa, o registro restrito aparece, marcado como restrito.')
    await regiao.getByText(/depressivo/i).first().scrollIntoViewIfNeeded()
    await foto(med, '1-emergencia-com-restrito-marcado')
  })

// ---------------------------------------------------------------- RF-008, RN-006

const aud = await entrar(navegador, 'auditor.demo')
const pac = await entrar(navegador, 'paciente.demo')

await r.caso('CT-11', 'RF-008, RF-011', 'Os acessos ficam registrados e disponíveis para o paciente e o auditor',
  'A paciente vê quem consultou o prontuário, com a emergência marcada; o auditor vê os acessos e analisa a emergência, que sai da fila.',
  async ({ foto, conferir }) => {
    await pac.goto(`${FRONT}/meu-prontuario`)
    const quem = pac.getByRole('region', { name: 'Quem acessou seu prontuário' })
    await quem.getByText(/Emergência/i).first().waitFor()
    const texto = await quem.innerText()
    conferir(/Enf\. Carla Lima/i.test(texto), 'A paciente vê o acesso do enfermeiro (consulta ao histórico na triagem).')
    conferir(/Paulo Reis/i.test(texto), 'A paciente vê os acessos do médico.')
    conferir(/Emergência/i.test(texto), 'O acesso de emergência aparece marcado para a paciente.')
    await quem.scrollIntoViewIfNeeded()
    await foto(pac, '1-quem-acessou')

    await aud.goto(`${FRONT}/auditoria`)
    const fila = aud.getByRole('region', { name: 'Emergências aguardando análise' })
    await fila.getByText(/Paulo Reis/).first().waitFor()
    await fila.scrollIntoViewIfNeeded()
    await foto(aud, '2-fila-de-emergencias')
    await fila.getByRole('button', { name: /^Analisar o acesso/ }).first().click()
    const dialogo = aud.getByRole('dialog')
    await dialogo.getByLabel('Conclusão').selectOption({ index: 1 })
    await dialogo.getByLabel('Descrição').fill('Justificativa compatível com a classificação laranja e o quadro descrito.')
    await dialogo.getByRole('button', { name: 'Registrar análise' }).click()
    await dialogo.waitFor({ state: 'hidden' })
    // A fila é montada de novo depois da análise: espera ela terminar de carregar (linhas ou o aviso de vazia).
    await fila.getByText(/^Carregando/).waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {})
    await fila.getByText('Nenhuma emergência aguardando análise.').or(fila.getByRole('row').nth(1)).first().waitFor({ timeout: 15_000 })
    await fila.getByText(/^Carregando/).waitFor({ state: 'detached', timeout: 15_000 })
    conferir(!(await fila.getByText(/Paulo Reis/).count()), 'Com a análise registrada, a emergência saiu da fila do auditor.')
    const registros = aud.getByRole('region', { name: 'Registro de acessos' })
    conferir((await registros.getByRole('row').count()) > 1, 'O registro de acessos do auditor lista os acessos feitos no teste.')
    await registros.scrollIntoViewIfNeeded()
    await foto(aud, '3-registro-de-acessos')
  })

await r.caso('CT-12', 'RF-008, RN-006', 'Registro de auditoria não pode ser alterado nem excluído',
  'Nenhuma tela oferece editar ou excluir; no banco, UPDATE, DELETE e TRUNCATE na auditoria são recusados.',
  async ({ conferir }) => {
    await aud.goto(`${FRONT}/auditoria`)
    await aud.getByRole('region', { name: 'Registro de acessos' }).getByRole('row').nth(1).waitFor()
    const botoes = await aud.getByRole('main').getByRole('button').allInnerTexts()
    conferir(!botoes.some((b) => /editar|excluir|apagar|remover/i.test(b)), 'A tela de auditoria não tem nenhum botão de editar, excluir ou apagar.')
    const antes = sql('select count(*) from registro_auditoria')
    // O TRUNCATE vai com CASCADE: sem ele, a chave estrangeira recusaria antes de o gatilho rodar.
    for (const comando of ["UPDATE registro_auditoria SET finalidade_declarada = 'alterada'", 'DELETE FROM registro_auditoria', 'TRUNCATE registro_auditoria CASCADE']) {
      const erro = sqlQueDeveFalhar(comando)
      conferir(erro?.includes(MENSAGEM_DO_GATILHO), `"${comando.split(' ')[0]}" na auditoria foi recusado pelo gatilho de imutabilidade ("${MENSAGEM_DO_GATILHO}").`)
    }
    conferir(sql('select count(*) from registro_auditoria') === antes, `A auditoria continua com os mesmos ${antes} registros.`)
  })

// ---------------------------------------------------------------- RF-012, RNF-005

await r.caso('CT-13', 'RF-012', 'Cada perfil vê e faz só o que é dele',
  'O menu de cada um dos cinco perfis mostra só as telas dele; abrir a tela de outro perfil mostra "sem permissão", e a API recusa com 403.',
  async ({ foto, conferir }) => {
    const esperado = {
      paciente: [pac, ['Meu prontuário', 'Consentimentos']],
      enfermeiro: [enf, ['Painel', 'Triagem', 'Atendimentos']],
      médico: [med, ['Painel', 'Atendimentos']],
      administrativo: [adm, ['Painel', 'Pacientes', 'Leitos', 'Internações']],
      auditor: [aud, ['Painel', 'Auditoria', 'Relatórios']],
    }
    for (const [perfil, [p, itens]] of Object.entries(esperado)) {
      await p.goto(`${FRONT}/`)
      await p.getByRole('heading', { level: 1 }).first().waitFor()
      const menu = (await p.getByRole('navigation', { name: 'Menu principal' }).getByRole('link').allInnerTexts()).map((t) => t.trim())
      conferir(JSON.stringify(menu) === JSON.stringify(itens), `Menu do ${perfil}: ${menu.join(', ')}.`)
    }
    await med.goto(`${FRONT}/leitos`)
    await med.getByRole('heading', { level: 1, name: /não tem permissão/ }).waitFor()
    conferir(true, 'O médico, ao abrir /leitos, vê "Você não tem permissão para acessar esta página".')
    await foto(med, '1-medico-sem-permissao')
    const instituicao = sql(`select id from instituicao where nome = '${PUBLICO}'`)
    const comoMedico = await api(await tokenDa(med), 'POST', '/leitos', { instituicaoId: instituicao, codigo: 'X-1', setor: 'Teste', categoria: 'ENFERMARIA' })
    conferir(comoMedico.status === 403, `A API recusa o médico cadastrando leito (HTTP ${comoMedico.status}).`)
    const comoPaciente = await api(await tokenDa(pac), 'GET', '/auditoria/registros?inicio=2026-01-01&fim=2026-12-31')
    conferir(comoPaciente.status === 403, `A API recusa a paciente lendo o registro de acessos da auditoria (HTTP ${comoPaciente.status}).`)
    const semPeriodo = await api(await tokenDa(pac), 'GET', '/auditoria/registros')
    conferir(semPeriodo.status === 403, `Mesmo sem o período (requisição incompleta), a paciente recebe 403, e não 400 (BE-28; HTTP ${semPeriodo.status}).`)
    const semVinculo = await api(await tokenDa(enf), 'GET', `/triagens/fila?instituicaoId=${sql("select id from instituicao where nome = 'Hospital Privado Exemplo'")}`)
    conferir(semVinculo.status === 403, `A API recusa o enfermeiro na fila de um hospital onde ele não tem vínculo (HTTP ${semVinculo.status}).`)
  })

await r.caso('CT-14', 'RNF-005, RF-012', 'Médico, enfermeiro e auditor só entram depois do segundo fator',
  'Depois da senha, o token pendente não abre nada; código errado é recusado; com o código certo o acesso é liberado. Administrativo e paciente não pedem código.',
  async ({ foto, conferir }) => {
    const instituicao = sql(`select id from instituicao where nome = '${PUBLICO}'`)
    for (const login of ['medico.demo', 'enfermeiro.demo', 'auditor.demo']) {
      const passo1 = await api(null, 'POST', '/auth/login', { login, senha: senhaDeDemonstracao() })
      conferir(passo1.corpo?.etapa === 'VALIDAR_SEGUNDO_FATOR', `${login}: depois da senha, a API pede o segundo fator.`)
      const pendente = passo1.corpo.token
      const protegida = login === 'auditor.demo' ? '/auditoria/emergencias/pendentes' : `/atendimentos/em-andamento?instituicaoId=${instituicao}`
      const antes = await api(pendente, 'GET', protegida)
      conferir([401, 403].includes(antes.status), `${login}: com o token pendente, a área protegida é recusada (HTTP ${antes.status}).`)
      const errado = await api(pendente, 'POST', '/auth/segundo-fator/validacao', { codigo: '000000' })
      conferir(errado.status >= 400, `${login}: código errado recusado (HTTP ${errado.status}).`)
      const certo = await api(pendente, 'POST', '/auth/segundo-fator/validacao', { codigo: await codigoNovo(segredoDe(login)) })
      conferir(certo.corpo?.etapa === 'ACESSO_LIBERADO', `${login}: com o código certo, o acesso é liberado.`)
      const depois = await api(certo.corpo.token, 'GET', protegida)
      conferir(depois.status === 200, `${login}: com o token final, a área protegida responde (HTTP ${depois.status}).`)
    }
    for (const login of ['administrativo.demo', 'paciente.demo']) {
      const passo = await api(null, 'POST', '/auth/login', { login, senha: senhaDeDemonstracao() })
      conferir(passo.corpo?.etapa === 'ACESSO_LIBERADO', `${login}: entra só com a senha, como prevê o RNF-005.`)
    }
    const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 } })
    const p = await contexto.newPage()
    await p.goto(`${FRONT}/entrar`)
    await p.getByLabel('Login').fill('medico.demo')
    await p.getByLabel('Senha', { exact: true }).fill(senhaDeDemonstracao())
    await p.getByRole('button', { name: 'Acessar plataforma' }).click()
    await p.getByLabel('Código de 6 dígitos').waitFor()
    await p.goto(`${FRONT}/atendimentos`)
    await p.waitForURL((u) => u.pathname.startsWith('/entrar'))
    conferir(true, 'Na tela, sem o código, tentar abrir /atendimentos volta para a entrada.')
    await foto(p, '1-codigo-pedido')
    await contexto.close()
  })

r.salvar()
await navegador.close()
const falhas = r.casos.filter((c) => c.resultado === 'falhou').length
console.log(`\n${r.casos.length - falhas} de ${r.casos.length} casos passaram.`)
