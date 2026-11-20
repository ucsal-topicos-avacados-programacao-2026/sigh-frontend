import { podeAcessar } from '@/auth/permissoes'
import { useSessao } from '@/auth/SessaoProvider'
import { ITENS_DE_MENU } from '@/rotas'

/** Primeira tela do menu do usuário, para onde vão "/" e "Ir para o início". */
export function useInicio() {
  const { usuario, instituicaoAtiva } = useSessao()
  if (!usuario) return null
  return ITENS_DE_MENU.find((item) => podeAcessar(item, { perfis: usuario.perfis, instituicaoAtiva }))?.caminho ?? null
}
