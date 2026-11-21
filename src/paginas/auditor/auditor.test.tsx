import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnaliseAuditoria, IndicadorInstituicao, RegistroAuditoria } from '@/api/tipos'
import { periodoPadrao } from '@/paginas/auditor/textos'
import { violacoesDeAcessibilidade } from '@/testes/acessibilidade'
import { renderizar, usuario, type Rotas } from '@/testes/renderizar'

const AUDITOR = usuario(['AUDITOR_GESTOR'])

const EMERGENCIA: RegistroAuditoria = {
  id: 'e1a2b3c4-0000-0000-0000-000000000001',
  prontuarioId: 'pr1',
  profissional: 'Dra. Carla Lima',
  perfil: 'MEDICO',
  instituicao: 'Hospital A',
  ocorridoEm: '2026-11-18T03:10:00',
  finalidade: 'Acesso de emergência',
  emergencia: true,
  justificativa: 'Paciente inconsciente na sala vermelha.',
}
const NORMAL: RegistroAuditoria = {
  ...EMERGENCIA,
  id: 'f9e8d7c6-0000-0000-0000-000000000002',
  profissional: 'Enf. Davi Rocha',
  perfil: 'ENFERMEIRO',
  instituicao: 'Hospital B',
  ocorridoEm: '2026-11-17T10:00:00',
  finalidade: 'Atendimento',
  emergencia: false,
  justificativa: null,
}
const INDICADORES: IndicadorInstituicao[] = [
  { instituicaoId: 'h1', instituicao: 'Hospital A', totalAcessos: 10, acessosEmergencia: 2 },
  { instituicaoId: 'h2', instituicao: 'Hospital B', totalAcessos: 4, acessosEmergencia: 0 },
]
const ANALISE: AnaliseAuditoria = {
  id: 'a1',
  registroAuditoriaId: NORMAL.id,
  tipo: 'ALERTA',
  conclusao: 'INDEVIDO',
  descricao: 'Acesso sem atendimento aberto.',
  registradaEm: '2026-11-19T09:00:00',
}

const pagina = <T,>(itens: T[], total = itens.length) => ({
  content: itens,
  page: { size: 20, number: 0, totalElements: total, totalPages: Math.max(1, Math.ceil(total / 20)) },
})

function rotas(extra: Rotas = {}): Rotas {
  return {
    'GET /auditoria/emergencias/pendentes': { status: 200, corpo: pagina([EMERGENCIA]) },
    'GET /auditoria/registros': { status: 200, corpo: pagina([EMERGENCIA, NORMAL]) },
    'GET /auditoria/indicadores': { status: 200, corpo: INDICADORES },
    'GET /auditoria/analises': { status: 200, corpo: pagina([ANALISE]) },
    ...extra,
  }
}

async function abrir(rota: '/auditoria' | '/relatorios', extra: Rotas = {}) {
  const resultado = renderizar(rota, AUDITOR, rotas(extra))
  await screen.findByRole('heading', { level: 1, name: rota === '/auditoria' ? 'Auditoria' : 'Relatórios' })
  return resultado
}

const regiao = (nome: string) => screen.findByRole('region', { name: nome })
const parametros = (url: string) => Object.fromEntries(new URL(url, 'http://localhost').searchParams)
const ultima = (chamadas: { chave: string; url: string }[], chave: string) => [...chamadas].reverse().find((c) => c.chave === chave)

/** Nenhum controle que altere ou apague o log (RN-006, critério de aceite do FE-08). */
function semAcaoDeAlterarOuExcluir() {
  const controles = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')]
  const proibidos = controles.filter((c) => /editar|excluir|apagar|remover|alterar|deletar/i.test(c.textContent + ' ' + (c.getAttribute('aria-label') ?? '')))
  expect(proibidos.map((c) => c.textContent)).toEqual([])
}

describe('FE-08: Auditoria — log imutável (RN-006)', () => {
  it('nenhuma ação de alteração ou exclusão aparece; a única ação é analisar', async () => {
    await abrir('/auditoria')
    const log = await regiao('Registro de acessos')
    await within(log).findByText('Enf. Davi Rocha')
    await within(await regiao('Análises registradas')).findByText('Acesso sem atendimento aberto.')
    semAcaoDeAlterarOuExcluir()
    expect(within(log).getAllByRole('button').map((b) => b.textContent)).toEqual(['Analisar', 'Analisar'])
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
  })

  it('mostra cada acesso com data, código, profissional, perfil, instituição, finalidade e justificativa', async () => {
    await abrir('/auditoria')
    const log = await regiao('Registro de acessos')
    const linha = (await within(log).findByText('Dra. Carla Lima')).closest('tr') as HTMLElement
    expect(linha).toHaveTextContent('18/11/2026 às 03:10')
    expect(linha).toHaveTextContent('E1A2B3C4')
    expect(linha).toHaveTextContent('Médico')
    expect(linha).toHaveTextContent('Hospital A')
    expect(linha).toHaveTextContent('Emergência')
    expect(linha).toHaveTextContent('Justificativa: Paciente inconsciente na sala vermelha.')
    const comum = within(log).getByText('Enf. Davi Rocha').closest('tr') as HTMLElement
    expect(comum).not.toHaveTextContent('Emergência')
    expect(comum).not.toHaveTextContent('Justificativa')
  })

  it('o período padrão são os últimos 30 dias, contando hoje', () => {
    expect(periodoPadrao(new Date(2026, 10, 20))).toEqual({ inicio: '2026-10-22', fim: '2026-11-20' })
    expect(periodoPadrao(new Date(2026, 2, 1))).toEqual({ inicio: '2026-01-31', fim: '2026-03-01' })
  })
})

describe('FE-08: filtros por instituição e período', () => {
  it('busca os últimos 30 dias e aplica instituição, emergência e período só ao clicar em Aplicar', async () => {
    const { chamadas } = await abrir('/auditoria')
    const padrao = periodoPadrao()
    await waitFor(() => expect(ultima(chamadas, 'GET /auditoria/registros')).toBeDefined())
    expect(parametros(ultima(chamadas, 'GET /auditoria/registros')?.url ?? '')).toEqual({ ...padrao, page: '0', size: '20' })

    const filtros = screen.getByRole('form', { name: 'Filtros' })
    const instituicao = within(filtros).getByLabelText('Instituição')
    await waitFor(() => expect(within(instituicao).getAllByRole('option').map((o) => o.textContent)).toEqual(['Todas', 'Hospital A', 'Hospital B']))
    await userEvent.selectOptions(instituicao, 'h2')
    await userEvent.click(within(filtros).getByLabelText('Só emergências'))
    const de = within(filtros).getByLabelText('De')
    await userEvent.clear(de)
    await userEvent.type(de, '2026-11-01')
    const buscas = chamadas.filter((c) => c.chave === 'GET /auditoria/registros').length
    // Nada muda até aplicar.
    expect(chamadas.filter((c) => c.chave === 'GET /auditoria/registros').length).toBe(buscas)

    await userEvent.click(within(filtros).getByRole('button', { name: 'Aplicar' }))
    await waitFor(() =>
      expect(parametros(ultima(chamadas, 'GET /auditoria/registros')?.url ?? '')).toEqual({
        inicio: '2026-11-01',
        fim: padrao.fim,
        instituicaoId: 'h2',
        emergencia: 'true',
        page: '0',
        size: '20',
      }),
    )
    // As instituições do filtro seguem o período aplicado.
    await waitFor(() => expect(parametros(ultima(chamadas, 'GET /auditoria/indicadores')?.url ?? '')).toEqual({ inicio: '2026-11-01', fim: padrao.fim }))
  })

  it('período com o fim antes do início: erro claro, sem buscar', async () => {
    const { chamadas } = await abrir('/auditoria')
    const filtros = screen.getByRole('form', { name: 'Filtros' })
    const ate = within(filtros).getByLabelText('Até')
    await userEvent.clear(ate)
    await userEvent.type(ate, '2020-01-01')
    await waitFor(() => expect(ultima(chamadas, 'GET /auditoria/registros')).toBeDefined())
    const buscas = chamadas.filter((c) => c.chave === 'GET /auditoria/registros').length
    await userEvent.click(within(filtros).getByRole('button', { name: 'Aplicar' }))
    expect(ate).toHaveAccessibleDescription('A data final é anterior à inicial.')
    expect(chamadas.filter((c) => c.chave === 'GET /auditoria/registros').length).toBe(buscas)
  })

  it('pagina o log de 20 em 20', async () => {
    const { chamadas } = await abrir('/auditoria', { 'GET /auditoria/registros': { status: 200, corpo: pagina([EMERGENCIA, NORMAL], 45) } })
    const log = await regiao('Registro de acessos')
    expect(await within(log).findByText('Página 1 de 3 · 45 acessos')).toBeInTheDocument()
    await userEvent.click(within(log).getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(parametros(ultima(chamadas, 'GET /auditoria/registros')?.url ?? '').page).toBe('1'))
  })
})

describe('FE-08: emergências e análise (RN-003, RF-011)', () => {
  it('a fila mostra as emergências pendentes; analisar registra o parecer e atualiza a fila', async () => {
    const { chamadas } = await abrir('/auditoria', {
      'POST /auditoria/registros/e1a2b3c4-0000-0000-0000-000000000001/analises': { status: 201, corpo: { ...ANALISE, tipo: 'PARECER' } },
    })
    const fila = await regiao('Emergências aguardando análise')
    expect(await within(fila).findByText('Dra. Carla Lima')).toBeInTheDocument()
    expect(fila).toHaveTextContent('1 acesso de emergência sem análise conclusiva')
    await userEvent.click(within(fila).getByRole('button', { name: 'Analisar o acesso E1A2B3C4 de Dra. Carla Lima' }))

    const dialogo = screen.getByRole('dialog', { name: 'Registrar análise' })
    expect(dialogo).toHaveTextContent('O registro do acesso não é alterado.')
    expect(dialogo).toHaveTextContent('Paciente inconsciente na sala vermelha.')
    expect(within(dialogo).getByRole('radio', { name: 'Parecer' })).toBeChecked()
    expect(within(dialogo).getByLabelText('Conclusão')).toHaveAccessibleDescription(/sai da fila de pendentes/)

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar análise' }))
    expect(within(dialogo).getByLabelText('Descrição')).toHaveAccessibleDescription('Descreva a análise.')
    // Só espaços também não vale.
    await userEvent.type(within(dialogo).getByLabelText('Descrição'), '   ')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar análise' }))
    expect(within(dialogo).getByLabelText('Descrição')).toHaveAccessibleDescription('Descreva a análise.')
    expect(chamadas.some((c) => c.chave.startsWith('POST'))).toBe(false)
    await userEvent.clear(within(dialogo).getByLabelText('Descrição'))

    await userEvent.selectOptions(within(dialogo).getByLabelText('Conclusão'), 'REGULAR')
    await userEvent.type(within(dialogo).getByLabelText('Descrição'), '  Justificativa compatível com o atendimento.  ')
    const filasAntes = chamadas.filter((c) => c.chave === 'GET /auditoria/emergencias/pendentes').length
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar análise' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(chamadas.find((c) => c.chave.startsWith('POST'))?.corpo).toEqual({
      tipo: 'PARECER',
      conclusao: 'REGULAR',
      descricao: 'Justificativa compatível com o atendimento.',
    })
    expect(await screen.findByText('Análise registrada.')).toBeInTheDocument()
    await waitFor(() => expect(chamadas.filter((c) => c.chave === 'GET /auditoria/emergencias/pendentes').length).toBeGreaterThan(filasAntes))
  })

  it('num acesso comum, o tipo começa como alerta, e dá para registrar com a conclusão pendente', async () => {
    const { chamadas } = await abrir('/auditoria', {
      'POST /auditoria/registros/f9e8d7c6-0000-0000-0000-000000000002/analises': { status: 201, corpo: ANALISE },
    })
    const log = await regiao('Registro de acessos')
    await userEvent.click(await within(log).findByRole('button', { name: 'Analisar o acesso F9E8D7C6 de Enf. Davi Rocha' }))
    const dialogo = screen.getByRole('dialog', { name: 'Registrar análise' })
    expect(within(dialogo).getByRole('radio', { name: 'Alerta de possível acesso indevido' })).toBeChecked()
    expect(within(dialogo).getByLabelText('Conclusão')).toHaveValue('PENDENTE')
    await userEvent.type(within(dialogo).getByLabelText('Descrição'), 'Conferir com a instituição.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar análise' }))
    await waitFor(() => expect(chamadas.find((c) => c.chave.startsWith('POST'))?.corpo).toEqual({ tipo: 'ALERTA', conclusao: 'PENDENTE', descricao: 'Conferir com a instituição.' }))
  })

  it('a recusa da API aparece no diálogo, que continua aberto', async () => {
    await abrir('/auditoria', {
      'POST /auditoria/registros/e1a2b3c4-0000-0000-0000-000000000001/analises': { status: 404, corpo: { detail: 'Registro de auditoria não encontrado.' } },
    })
    const fila = await regiao('Emergências aguardando análise')
    await userEvent.click(await within(fila).findByRole('button', { name: /Analisar o acesso E1A2B3C4/ }))
    const dialogo = screen.getByRole('dialog')
    await userEvent.type(within(dialogo).getByLabelText('Descrição'), 'Teste.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar análise' }))
    expect(await within(dialogo).findByText('Registro de auditoria não encontrado.')).toBeInTheDocument()
  })

  it('Esc fecha o diálogo e o foco volta ao botão que o abriu', async () => {
    await abrir('/auditoria')
    const fila = await regiao('Emergências aguardando análise')
    const botao = await within(fila).findByRole('button', { name: /Analisar o acesso E1A2B3C4/ })
    await userEvent.click(botao)
    expect(within(screen.getByRole('dialog')).getByRole('radio', { name: 'Parecer' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(botao).toHaveFocus()
  })

  it('sem emergências pendentes, diz isso', async () => {
    await abrir('/auditoria', { 'GET /auditoria/emergencias/pendentes': { status: 200, corpo: pagina([]) } })
    expect(await within(await regiao('Emergências aguardando análise')).findByText('Nenhuma emergência aguardando análise.')).toBeInTheDocument()
  })

  it('análises registradas: alertas e pareceres separados', async () => {
    const { chamadas } = await abrir('/auditoria')
    const painel = await regiao('Análises registradas')
    const linha = (await within(painel).findByText('Acesso sem atendimento aberto.')).closest('tr') as HTMLElement
    expect(linha).toHaveTextContent('F9E8D7C6')
    expect(linha).toHaveTextContent('Indevido')
    expect(linha).toHaveTextContent('19/11/2026 às 09:00')
    expect(parametros(ultima(chamadas, 'GET /auditoria/analises')?.url ?? '').tipo).toBe('ALERTA')
    expect(within(painel).getByRole('button', { name: 'Alertas' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(within(painel).getByRole('button', { name: 'Pareceres' }))
    await waitFor(() => expect(parametros(ultima(chamadas, 'GET /auditoria/analises')?.url ?? '').tipo).toBe('PARECER'))
    expect(within(painel).getByRole('button', { name: 'Pareceres' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('FE-08: Relatórios', () => {
  it('soma os indicadores do período e lista por instituição; nada de alterar ou excluir', async () => {
    await abrir('/relatorios')
    const tabela = await regiao('Acessos por instituição')
    await within(tabela).findByText('Hospital A')
    const valores = (rotulo: string) => screen.getByText(rotulo, { selector: 'dt' }).nextElementSibling?.textContent
    expect(valores('Acessos aos prontuários')).toBe('14')
    expect(valores('Acessos de emergência')).toBe('2')
    expect(valores('Parte em emergência')).toBe('14,3%')
    expect(valores('Instituições com acesso')).toBe('2')
    const linhaA = within(tabela).getByText('Hospital A').closest('tr') as HTMLElement
    expect(linhaA).toHaveTextContent('Hospital A10220%')
    semAcaoDeAlterarOuExcluir()
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([])
  })

  it('filtra por instituição (na tela) e por período (na API)', async () => {
    const { chamadas } = await abrir('/relatorios')
    const tabela = await regiao('Acessos por instituição')
    await within(tabela).findByText('Hospital A')
    const filtros = screen.getByRole('form', { name: 'Filtros' })
    await userEvent.selectOptions(within(filtros).getByLabelText('Instituição'), 'h2')
    const de = within(filtros).getByLabelText('De')
    await userEvent.clear(de)
    await userEvent.type(de, '2026-10-01')
    await userEvent.click(within(filtros).getByRole('button', { name: 'Aplicar' }))

    await waitFor(() => expect(parametros(ultima(chamadas, 'GET /auditoria/indicadores')?.url ?? '').inicio).toBe('2026-10-01'))
    await waitFor(() => expect(within(tabela).queryByText('Hospital A')).not.toBeInTheDocument())
    expect(within(tabela).getByText('Hospital B')).toBeInTheDocument()
    const valores = (rotulo: string) => screen.getByText(rotulo, { selector: 'dt' }).nextElementSibling?.textContent
    expect(valores('Acessos aos prontuários')).toBe('4')
    expect(valores('Parte em emergência')).toBe('0%')
    expect(valores('Instituições com acesso')).toBe('1')
    expect(screen.getByText(/Período: 01\/10\/2026 a .* · Hospital B/)).toBeInTheDocument()
  })

  it('sem acessos no período: zero, sem divisão por zero', async () => {
    await abrir('/relatorios', { 'GET /auditoria/indicadores': { status: 200, corpo: [] } })
    expect(await screen.findByText('Nenhum acesso no período.')).toBeInTheDocument()
    expect(screen.getByText('Parte em emergência', { selector: 'dt' }).nextElementSibling).toHaveTextContent('—')
  })

  it('o erro da API aparece com a mensagem dela', async () => {
    await abrir('/relatorios', { 'GET /auditoria/indicadores': { status: 422, corpo: { detail: 'A data final do período é anterior à inicial.' } } })
    expect(await screen.findByText('A data final do período é anterior à inicial.')).toBeInTheDocument()
  })

  it('imprime o relatório', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {})
    await abrir('/relatorios')
    await within(await regiao('Acessos por instituição')).findByText('Hospital A')
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir relatório' }))
    expect(imprimir).toHaveBeenCalledOnce()
  })
})

describe('FE-08: fila de emergências depois da análise', () => {
  it('analisar a única emergência da última página volta à primeira, que não fica vazia', async () => {
    let analisado = false
    const vinte = Array.from({ length: 20 }, (_, i) => ({ ...EMERGENCIA, id: `0000000${i}-fila`, profissional: `Profissional ${i}` }))
    const ultima21 = { ...EMERGENCIA, id: 'ffffffff-ultima', profissional: 'Dra. Última' }
    const { chamadas } = await abrir('/auditoria', {
      'GET /auditoria/emergencias/pendentes': (_corpo, url) => {
        const p = Number(new URL(url, 'http://localhost').searchParams.get('page'))
        if (!analisado) return { status: 200, corpo: { content: p === 0 ? vinte : [ultima21], page: { size: 20, number: p, totalElements: 21, totalPages: 2 } } }
        return { status: 200, corpo: { content: p === 0 ? vinte : [], page: { size: 20, number: p, totalElements: 20, totalPages: 1 } } }
      },
      'POST /auditoria/registros/ffffffff-ultima/analises': () => {
        analisado = true
        return { status: 201, corpo: { ...ANALISE, tipo: 'PARECER', conclusao: 'REGULAR' } }
      },
    })
    const fila = await regiao('Emergências aguardando análise')
    await within(fila).findByText('Profissional 0')
    await userEvent.click(within(fila).getByRole('button', { name: 'Próxima' }))
    await userEvent.click(await within(fila).findByRole('button', { name: /de Dra. Última/ }))
    const dialogo = screen.getByRole('dialog')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Conclusão'), 'REGULAR')
    await userEvent.type(within(dialogo).getByLabelText('Descrição'), 'Regular.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar análise' }))

    const filaDepois = await regiao('Emergências aguardando análise')
    expect(await within(filaDepois).findByText('Profissional 0')).toBeInTheDocument()
    expect(within(filaDepois).queryByText('Nenhuma emergência aguardando análise.')).not.toBeInTheDocument()
    expect(filaDepois).toHaveTextContent('20 acessos de emergência sem análise conclusiva')
    expect(parametros(ultima(chamadas, 'GET /auditoria/emergencias/pendentes')?.url ?? '').page).toBe('0')
    // O botão que abriu o diálogo não existe mais: o foco vai para o título, e não se perde no <body>.
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Auditoria' })).toHaveFocus())
  })
})

describe('FE-08: o diálogo não fecha no meio do envio', () => {
  it('Esc durante o envio não fecha; ao terminar, fecha', async () => {
    await abrir('/auditoria')
    let soltar: () => void = () => {}
    const original = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit = {}) => {
        if (init.method !== 'POST') return original(url, init)
        await new Promise<void>((resolve) => (soltar = resolve))
        return new Response(JSON.stringify(ANALISE), { status: 201, headers: { 'Content-Type': 'application/json' } })
      }),
    )
    const fila = await regiao('Emergências aguardando análise')
    await userEvent.click(await within(fila).findByRole('button', { name: /Analisar o acesso E1A2B3C4/ }))
    const dialogo = screen.getByRole('dialog')
    await userEvent.type(within(dialogo).getByLabelText('Descrição'), 'Regular.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar análise' }))
    expect(within(dialogo).getByRole('button', { name: 'Registrando…' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Fechar' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    soltar()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Análise registrada.')).toBeInTheDocument()
  })
})
