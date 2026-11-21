import type { CategoriaLeito, Leito } from '@/api/tipos'

export function leitosLivres(leitos: Leito[] | undefined, categoria?: CategoriaLeito) {
  return (leitos ?? []).filter((l) => l.status === 'LIVRE' && (!categoria || l.categoria === categoria))
}
