export interface AvisoDaSessao {
  texto: string
  tom: 'info' | 'atencao'
}

export const SESSAO_EXPIRADA: AvisoDaSessao = { texto: 'Sua sessão expirou. Entre de novo.', tom: 'info' }
