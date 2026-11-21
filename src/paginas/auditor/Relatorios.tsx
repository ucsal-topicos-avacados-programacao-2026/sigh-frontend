import { Building2, Printer, ShieldAlert, Siren } from 'lucide-react'
import { useState } from 'react'
import { indicadores as buscarIndicadores } from '@/api/auditoria'
import type { IndicadorInstituicao } from '@/api/tipos'
import { useConsulta } from '@/api/useConsulta'
import { Botao } from '@/componentes/Botao'
import { GradeDeIndicadores } from '@/componentes/CartaoIndicador'
import { Painel } from '@/componentes/Painel'
import { Tabela, type Coluna } from '@/componentes/Tabela'
import { TituloPagina } from '@/componentes/TituloPagina'
import { FiltrosDoPeriodo, type Filtros } from '@/paginas/auditor/FiltrosDoPeriodo'
import { periodoPadrao } from '@/paginas/auditor/textos'
import { formatarData } from '@/util/datas'

const numero = new Intl.NumberFormat('pt-BR')
const porcentagem = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })

/** Parte das emergências no total, ou "—" sem acessos (não há divisão por zero na tela). */
function parteDeEmergencias(total: number, emergencias: number) {
  return total === 0 ? '—' : porcentagem.format(emergencias / total)
}

const COLUNAS: Coluna<IndicadorInstituicao>[] = [
  { titulo: 'Instituição', celula: (i) => <span className="font-medium">{i.instituicao}</span> },
  { titulo: 'Acessos', numerica: true, celula: (i) => numero.format(i.totalAcessos) },
  { titulo: 'Emergências', numerica: true, celula: (i) => numero.format(i.acessosEmergencia) },
  { titulo: 'Parte em emergência', numerica: true, celula: (i) => parteDeEmergencias(i.totalAcessos, i.acessosEmergencia) },
]

/**
 * FE-08: relatório de conformidade por período e instituição (RF-011), a partir de GET /auditoria/indicadores.
 * O filtro de instituição é aplicado aqui: a API devolve todas as instituições com acesso no período.
 */
export function Relatorios() {
  const [filtros, setFiltros] = useState<Filtros>(() => ({ ...periodoPadrao(), instituicaoId: '', soEmergencias: false }))
  const consulta = useConsulta((sinal) => buscarIndicadores({ inicio: filtros.inicio, fim: filtros.fim }, sinal), [filtros.inicio, filtros.fim])
  const todas = consulta.dados
  const linhas = todas?.filter((i) => !filtros.instituicaoId || i.instituicaoId === filtros.instituicaoId)
  const total = linhas?.reduce((soma, i) => soma + i.totalAcessos, 0) ?? 0
  const emergencias = linhas?.reduce((soma, i) => soma + i.acessosEmergencia, 0) ?? 0
  const nomeDaInstituicao = todas?.find((i) => i.instituicaoId === filtros.instituicaoId)?.instituicao
  const recorte = `${formatarData(filtros.inicio)} a ${formatarData(filtros.fim)}${filtros.instituicaoId ? ` · ${nomeDaInstituicao ?? 'instituição escolhida'}` : ' · todas as instituições'}`

  return (
    <>
      <TituloPagina
        titulo="Relatórios"
        trilha="Gestão da rede"
        subtitulo="Acessos aos prontuários por instituição e período, para o acompanhamento de conformidade."
        acoes={
          <Botao variante="secundario" icone={Printer} onClick={() => window.print()} disabled={!linhas} className="print:hidden">
            Imprimir relatório
          </Botao>
        }
      />
      <div className="print:hidden">
        <FiltrosDoPeriodo aplicados={filtros} instituicoes={todas} aoAplicar={setFiltros} />
      </div>
      <p className="text-corpo text-texto-suave" aria-live="polite">
        Período: {recorte}
      </p>
      <GradeDeIndicadores
        carregando={consulta.carregando}
        indicadores={[
          { rotulo: 'Acessos aos prontuários', valor: numero.format(total), icone: ShieldAlert },
          { rotulo: 'Acessos de emergência', valor: numero.format(emergencias), icone: Siren },
          { rotulo: 'Parte em emergência', valor: parteDeEmergencias(total, emergencias), icone: Siren },
          { rotulo: 'Instituições com acesso', valor: numero.format(linhas?.length ?? 0), icone: Building2 },
        ]}
      />
      <Painel titulo="Acessos por instituição" subtitulo="Da instituição com mais acessos para a com menos." carregando={consulta.carregando} semRespiro>
        <Tabela
          legenda={`Acessos por instituição, ${recorte}`}
          legendaOculta
          colunas={COLUNAS}
          linhas={linhas}
          chave={(i) => i.instituicaoId}
          carregando={consulta.carregando}
          erro={consulta.erro}
          aoTentarDeNovo={consulta.recarregar}
          textoVazio="Nenhum acesso no período."
        />
      </Painel>
    </>
  )
}
