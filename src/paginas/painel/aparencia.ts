import foto1 from '@/assets/hospitais/hospital-1.jpg'
import foto2 from '@/assets/hospitais/hospital-2.jpg'
import foto3 from '@/assets/hospitais/hospital-3.jpg'
import foto4 from '@/assets/hospitais/hospital-4.jpg'

const FOTOS = [foto1, foto2, foto3, foto4]
const CORES = [
  { fundo: 'bg-primaria', veu: 'bg-primaria/80' },
  { fundo: 'bg-primaria-hover', veu: 'bg-primaria-hover/80' },
  { fundo: 'bg-veu-verde', veu: 'bg-veu-verde/80' },
  { fundo: 'bg-lateral', veu: 'bg-lateral/80' },
]

export function aparenciaDoCartao(indice: number) {
  return {
    foto: FOTOS[indice % FOTOS.length] as string,
    cor: CORES[(indice + Math.floor(indice / FOTOS.length)) % CORES.length] as (typeof CORES)[number],
  }
}
