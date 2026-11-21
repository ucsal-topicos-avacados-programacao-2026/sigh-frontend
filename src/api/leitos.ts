import { requisicao } from '@/api/cliente'
import type {
  AtendimentoSemLeito,
  CategoriaLeito,
  InternacaoAtiva,
  Leito,
  Pagina,
  SolicitacaoTransferencia,
  StatusLeito,
} from '@/api/tipos'

export const leitosDaInstituicao = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<Pagina<Leito>>('GET', '/leitos', { consulta: { instituicaoId, size: 500, sort: 'codigo' }, sinal })

export const leitosLivres = (instituicaoId: string, categoria: CategoriaLeito, sinal?: AbortSignal) =>
  requisicao<Pagina<Leito>>('GET', '/leitos', { consulta: { instituicaoId, categoria, status: 'LIVRE', size: 500 }, sinal })

export const cadastrarLeito = (dados: { instituicaoId: string; codigo: string; setor: string; categoria: CategoriaLeito }) =>
  requisicao<Leito>('POST', '/leitos', { corpo: dados })

export const alterarStatusDoLeito = (leitoId: string, status: Exclude<StatusLeito, 'OCUPADO'>) =>
  requisicao<Leito>('PATCH', `/leitos/${encodeURIComponent(leitoId)}/status`, { corpo: { status } })

export const internacoesAtivas = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<InternacaoAtiva[]>('GET', '/internacoes', { consulta: { instituicaoId }, sinal })

export const atendimentosSemLeito = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<AtendimentoSemLeito[]>('GET', '/internacoes/atendimentos-sem-leito', { consulta: { instituicaoId }, sinal })

export const internar = (atendimentoId: string, leitoId: string) =>
  requisicao<unknown>('POST', '/internacoes', { corpo: { atendimentoId, leitoId } })

export const transferirNaInstituicao = (internacaoId: string, leitoDestinoId: string) =>
  requisicao<unknown>('POST', `/internacoes/${encodeURIComponent(internacaoId)}/transferencia`, { corpo: { leitoDestinoId } })

export const solicitarTransferencia = (internacaoId: string, instituicaoDestinoId: string, categoria: CategoriaLeito) =>
  requisicao<SolicitacaoTransferencia>('POST', `/internacoes/${encodeURIComponent(internacaoId)}/solicitacoes-transferencia`, {
    corpo: { instituicaoDestinoId, categoria },
  })

export const darAlta = (internacaoId: string, resumoAltaId: string) =>
  requisicao<unknown>('POST', `/internacoes/${encodeURIComponent(internacaoId)}/alta`, { corpo: { resumoAltaId } })

export const solicitacoesRecebidas = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<Pagina<SolicitacaoTransferencia>>('GET', '/solicitacoes-transferencia/recebidas', { consulta: { instituicaoId, size: 100 }, sinal })

export const solicitacoesEnviadas = (instituicaoId: string, sinal?: AbortSignal) =>
  requisicao<Pagina<SolicitacaoTransferencia>>('GET', '/solicitacoes-transferencia/enviadas', { consulta: { instituicaoId, size: 100 }, sinal })

export const aceitarTransferencia = (solicitacaoId: string, leitoId: string) =>
  requisicao<SolicitacaoTransferencia>('POST', `/solicitacoes-transferencia/${encodeURIComponent(solicitacaoId)}/aceite`, { corpo: { leitoId } })

export const recusarTransferencia = (solicitacaoId: string, motivo: string) =>
  requisicao<SolicitacaoTransferencia>('POST', `/solicitacoes-transferencia/${encodeURIComponent(solicitacaoId)}/recusa`, { corpo: { motivo } })

export const cancelarTransferencia = (solicitacaoId: string) =>
  requisicao<SolicitacaoTransferencia>('POST', `/solicitacoes-transferencia/${encodeURIComponent(solicitacaoId)}/cancelamento`)
