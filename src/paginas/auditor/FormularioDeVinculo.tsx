import type { InstituicaoDaRede, Perfil } from '@/api/tipos'
import { CampoTexto, Selecao } from '@/componentes/Campo'
import { exigeRegistro, rotuloDoRegistro, type CamposDoVinculo } from '@/paginas/auditor/vinculos'

export function FormularioDeVinculo({ campos, perfis, instituicoes, erros, aoMudar }: {
  campos: CamposDoVinculo
  perfis: readonly Perfil[]
  instituicoes: InstituicaoDaRede[]
  erros?: { instituicaoId?: string; registro?: string }
  aoMudar: (campos: CamposDoVinculo) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Selecao
        rotulo="Hospital"
        value={campos.instituicaoId}
        onChange={(e) => aoMudar({ ...campos, instituicaoId: e.target.value })}
        erro={erros?.instituicaoId}
      >
        <option value="">Escolha o hospital</option>
        {instituicoes.map((instituicao) => (
          <option key={instituicao.id} value={instituicao.id}>
            {instituicao.nome}
          </option>
        ))}
      </Selecao>
      {exigeRegistro(perfis) && (
        <CampoTexto
          rotulo={rotuloDoRegistro(perfis)}
          autoComplete="off"
          value={campos.registro}
          onChange={(e) => aoMudar({ ...campos, registro: e.target.value })}
          erro={erros?.registro}
        />
      )}
    </div>
  )
}
