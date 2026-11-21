import { requisicao } from '@/api/cliente'
import type { PainelDaInstituicao } from '@/api/tipos'

export const painelDaInstituicao = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<PainelDaInstituicao>('GET', '/painel', { consulta: { instituicaoId }, sinal })
