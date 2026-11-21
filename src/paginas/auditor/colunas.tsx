import { ClipboardCheck, Siren } from 'lucide-react'
import { NOME_DO_PERFIL, type RegistroAuditoria } from '@/api/tipos'
import { Botao } from '@/componentes/Botao'
import { Etiqueta } from '@/componentes/Etiqueta'
import type { Coluna } from '@/componentes/Tabela'
import { codigoDoRegistro } from '@/paginas/auditor/textos'
import { formatarDataHora } from '@/util/datas'

export function colunasDoLog(aoAnalisar: (registro: RegistroAuditoria) => void): Coluna<RegistroAuditoria>[] {
  return [
    {
      titulo: 'Data e hora',
      celula: (r) => (
        <>
          <span className="block whitespace-nowrap">{formatarDataHora(r.ocorridoEm)}</span>
          <span className="block text-rotulo text-texto-suave tabular-nums">{codigoDoRegistro(r.id)}</span>
        </>
      ),
    },
    {
      titulo: 'Profissional',
      celula: (r) => (
        <>
          <span className="block font-medium">{r.profissional}</span>
          <span className="block text-texto-suave">{NOME_DO_PERFIL[r.perfil]}</span>
        </>
      ),
    },
    { titulo: 'Instituição', celula: (r) => r.instituicao ?? '—' },
    {
      titulo: 'Finalidade',
      celula: (r) => (
        <div className="flex max-w-md flex-col items-start gap-1">
          <span>{r.finalidade}</span>
          {r.emergencia && <Etiqueta tom="atencao" icone={Siren} texto="Emergência" />}
          {r.justificativa && <span className="text-texto-suave">Justificativa: {r.justificativa}</span>}
        </div>
      ),
    },
    {
      titulo: 'Ação',
      celula: (r) => (
        <Botao
          variante="secundario"
          icone={ClipboardCheck}
          onClick={() => aoAnalisar(r)}
          aria-label={`Analisar o acesso ${codigoDoRegistro(r.id)} de ${r.profissional}`}
          className="whitespace-nowrap"
        >
          Analisar
        </Botao>
      ),
    },
  ]
}
