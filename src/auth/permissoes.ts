import { PERFIS_DE_INSTITUICAO, type Perfil, type VinculoAtivo } from '@/api/tipos'

export interface ContextoDeAcesso {
  perfis: readonly Perfil[]
  /** Instituição escolhida no cabeçalho; obrigatória para médico, enfermeiro e administrativo (RF-012). */
  instituicaoAtiva: VinculoAtivo | null
}

export interface RotaComPerfis {
  perfis: readonly Perfil[]
}

/** Se o perfil está liberado agora: tem o perfil e, se ele é de instituição, o vínculo ativo o habilita. */
export function perfilLiberado(perfil: Perfil, contexto: ContextoDeAcesso) {
  if (!contexto.perfis.includes(perfil)) return false
  if (!PERFIS_DE_INSTITUICAO.includes(perfil)) return true
  return contexto.instituicaoAtiva?.perfis.includes(perfil) ?? false
}

/**
 * A mesma regra para o menu e para a guarda de rota. É conveniência de interface: quem autoriza de verdade é a
 * API, que responde 403 sem vínculo.
 */
export function podeAcessar(rota: RotaComPerfis, contexto: ContextoDeAcesso) {
  return rota.perfis.some((perfil) => perfilLiberado(perfil, contexto))
}

/** Vínculos em que o usuário pode operar com algum perfil de instituição. */
export function vinculosOperaveis(vinculos: readonly VinculoAtivo[], perfis: readonly Perfil[]) {
  return vinculos.filter((vinculo) =>
    vinculo.perfis.some((perfil) => PERFIS_DE_INSTITUICAO.includes(perfil) && perfis.includes(perfil)),
  )
}
