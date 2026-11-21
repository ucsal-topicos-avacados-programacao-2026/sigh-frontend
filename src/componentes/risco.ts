import type { CorRisco } from '@/api/tipos'
import type { TomDaEtiqueta } from '@/componentes/Etiqueta'

export const RISCO: Record<CorRisco, { cor: string; significado: string; tom: TomDaEtiqueta }> = {
  VERMELHO: { cor: 'Vermelho', significado: 'Emergência', tom: 'risco-vermelho' },
  LARANJA: { cor: 'Laranja', significado: 'Muito urgente', tom: 'risco-laranja' },
  AMARELO: { cor: 'Amarelo', significado: 'Urgente', tom: 'risco-amarelo' },
  VERDE: { cor: 'Verde', significado: 'Pouco urgente', tom: 'risco-verde' },
  AZUL: { cor: 'Azul', significado: 'Não urgente', tom: 'risco-azul' },
}

export const CORES_DE_RISCO = Object.keys(RISCO) as CorRisco[]

export const nomeDoRisco = (cor: CorRisco) => `${RISCO[cor].cor} · ${RISCO[cor].significado}`
