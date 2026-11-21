import type { CorRisco } from '@/api/tipos'
import { Etiqueta } from '@/componentes/Etiqueta'
import { RISCO, nomeDoRisco } from '@/componentes/risco'

export function SeloRisco({ cor }: { cor: CorRisco }) {
  return <Etiqueta tom={RISCO[cor].tom} texto={nomeDoRisco(cor)} />
}
