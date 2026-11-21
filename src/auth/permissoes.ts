import { PERFIS_DE_INSTITUICAO, type Perfil, type VinculoAtivo } from '@/api/tipos'

export interface ContextoDeAcesso {
  perfis: readonly Perfil[]
  instituicaoAtiva: VinculoAtivo | null
}

export interface RotaComPerfis {
  perfis: readonly Perfil[]
}

export function perfilLiberado(perfil: Perfil, contexto: ContextoDeAcesso) {
  if (!contexto.perfis.includes(perfil)) return false
  if (!PERFIS_DE_INSTITUICAO.includes(perfil)) return true
  return contexto.instituicaoAtiva?.perfis.includes(perfil) ?? false
}

export function podeAcessar(rota: RotaComPerfis, contexto: ContextoDeAcesso) {
  return rota.perfis.some((perfil) => perfilLiberado(perfil, contexto))
}

export function vinculosOperaveis(vinculos: readonly VinculoAtivo[], perfis: readonly Perfil[]) {
  return vinculos.filter((vinculo) =>
    vinculo.perfis.some((perfil) => PERFIS_DE_INSTITUICAO.includes(perfil) && perfis.includes(perfil)),
  )
}
