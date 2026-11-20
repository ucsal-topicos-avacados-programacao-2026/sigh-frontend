/** Aviso que a tela de login mostra ao voltar para ela (sessão expirada, saída, prazo do segundo fator). */
export interface AvisoDaSessao {
  texto: string
  tom: 'info' | 'atencao'
}

export const SESSAO_EXPIRADA: AvisoDaSessao = { texto: 'Sua sessão expirou. Entre de novo.', tom: 'info' }
