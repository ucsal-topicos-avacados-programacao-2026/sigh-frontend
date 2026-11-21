import foto1 from '@/assets/hospitais/hospital-1.jpg'
import foto2 from '@/assets/hospitais/hospital-2.jpg'
import foto3 from '@/assets/hospitais/hospital-3.jpg'
import foto4 from '@/assets/hospitais/hospital-4.jpg'

/**
 * Fotos genéricas (Unsplash, sem nome de hospital nem pessoa) e os véus por cima delas. O véu é a cor do cartão a
 * 80%: com ela, o texto branco tem pelo menos 4,5:1 mesmo sobre o pixel mais claro da foto. Sem a foto, fica a cor.
 */
const FOTOS = [foto1, foto2, foto3, foto4]
const CORES = [
  { fundo: 'bg-primaria', veu: 'bg-primaria/80' },
  { fundo: 'bg-primaria-hover', veu: 'bg-primaria-hover/80' },
  { fundo: 'bg-veu-verde', veu: 'bg-veu-verde/80' },
  { fundo: 'bg-lateral', veu: 'bg-lateral/80' },
]

/**
 * Foto e cor do cartão pela posição na lista (fixas: o cartão não muda ao vir para a frente). A foto troca a cada
 * cartão e a cor anda um passo a mais a cada volta das fotos, então os 16 primeiros hospitais têm combinações
 * diferentes (4 fotos × 4 cores); depois disso, repetem.
 */
export function aparenciaDoCartao(indice: number) {
  return {
    foto: FOTOS[indice % FOTOS.length] as string,
    cor: CORES[(indice + Math.floor(indice / FOTOS.length)) % CORES.length] as (typeof CORES)[number],
  }
}
