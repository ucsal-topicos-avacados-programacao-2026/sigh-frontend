import { requisicao } from '@/api/cliente'
import type { PainelDaInstituicao } from '@/api/tipos'

/** Números da instituição para o painel (FE-09): médico, enfermeiro e administrativo com vínculo; o gestor, a rede. */
export const painelDaInstituicao = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<PainelDaInstituicao>('GET', '/painel', { consulta: { instituicaoId }, sinal })
