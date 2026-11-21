import type { CategoriaLeito, Leito } from '@/api/tipos'

/**
 * Só os leitos livres são alocáveis (critério do FE-04): a lista nunca oferece outro estado. O leito atual de quem é
 * transferido está ocupado, então também nunca aparece.
 */
export function leitosLivres(leitos: Leito[] | undefined, categoria?: CategoriaLeito) {
  return (leitos ?? []).filter((l) => l.status === 'LIVRE' && (!categoria || l.categoria === categoria))
}
