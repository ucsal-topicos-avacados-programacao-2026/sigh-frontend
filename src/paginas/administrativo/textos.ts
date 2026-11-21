import type { StatusAtendimento, StatusLeito, StatusSolicitacaoTransferencia } from '@/api/tipos'
import type { TomDaEtiqueta } from '@/componentes/Etiqueta'

export const ESTADO_DO_LEITO: Record<StatusLeito, { texto: string; tom: TomDaEtiqueta }> = {
  LIVRE: { texto: 'Livre', tom: 'sucesso' },
  OCUPADO: { texto: 'Ocupado', tom: 'info' },
  EM_HIGIENIZACAO: { texto: 'Em higienização', tom: 'atencao' },
  BLOQUEADO: { texto: 'Bloqueado', tom: 'neutro' },
}

export const SITUACAO_DO_ATENDIMENTO: Record<StatusAtendimento, string> = {
  ABERTO: 'Aguardando triagem',
  EM_TRIAGEM: 'Em triagem',
  EM_ATENDIMENTO: 'Em atendimento',
  ENCERRADO: 'Encerrado',
}

export const SITUACAO_DO_PEDIDO: Record<StatusSolicitacaoTransferencia, { texto: string; tom: TomDaEtiqueta }> = {
  PENDENTE: { texto: 'Aguardando o destino', tom: 'atencao' },
  ACEITA: { texto: 'Aceita', tom: 'sucesso' },
  RECUSADA: { texto: 'Recusada', tom: 'erro' },
  CANCELADA: { texto: 'Cancelada', tom: 'neutro' },
}

export const ATUALIZAR_A_CADA_MS = 30_000
