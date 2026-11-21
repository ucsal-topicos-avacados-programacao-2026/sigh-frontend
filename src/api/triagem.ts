import { requisicao } from '@/api/cliente'
import type { AguardandoTriagem, CorRisco, Pagina, PacienteNaFila, PreClassificacao, SinaisVitais, Triagem } from '@/api/tipos'

export const aguardandoTriagem = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<AguardandoTriagem[]>('GET', '/triagens/aguardando', { consulta: { instituicaoId }, sinal })

export const filaDeAtendimento = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<Pagina<PacienteNaFila>>('GET', '/triagens/fila', { consulta: { instituicaoId, size: 200 }, sinal })

export const registrarTriagem = (atendimentoId: string, sintomas: string, sinaisVitais: SinaisVitais) =>
  requisicao<Triagem>('POST', '/triagens', { corpo: { atendimentoId, sintomas, sinaisVitais } })

export const sugerirRisco = (triagemId: string) => requisicao<Triagem>('POST', `/triagens/${encodeURIComponent(triagemId)}/sugestao`)

export const confirmarRisco = (triagemId: string, cor: CorRisco) =>
  requisicao<Triagem>('POST', `/triagens/${encodeURIComponent(triagemId)}/confirmacao`, { corpo: { cor } })

export const registrarSinaisVitais = (triagemId: string, sinaisVitais: SinaisVitais) =>
  requisicao<Triagem>('PATCH', `/triagens/${encodeURIComponent(triagemId)}/sinais-vitais`, { corpo: { sinaisVitais } })

export const preClassificacao = (atendimentoId: string, instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<PreClassificacao>('GET', '/triagens/pre-classificacao', { consulta: { atendimentoId, instituicaoId }, sinal })
