import logoCoracao from '@/assets/logo-coracao.png'
import logoSigh from '@/assets/logo-sigh.png'

interface PropriedadesMarca {
  variante?: 'completa' | 'compacta'
  clara?: boolean
}

export function Marca({ variante = 'compacta', clara = false }: PropriedadesMarca) {
  if (variante === 'completa') {
    return (
      <div className="flex flex-col items-start gap-2">
        <img src={logoSigh} alt="SIGH" width={109} height={96} className="h-24 w-auto" />
        <p className="text-rotulo font-semibold tracking-[.12em] text-info uppercase">Rede de hospitais</p>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <img src={logoCoracao} alt="" width={37} height={32} className="h-8 w-auto" />
      <div>
        <p className={`text-[18px] leading-6 font-bold tracking-tight ${clara ? 'text-white' : 'text-texto-forte'}`}>SIGH</p>
        <p className={`text-rotulo font-semibold tracking-[.08em] uppercase ${clara ? 'text-lateral-texto-suave' : 'text-info'}`}>
          Rede de hospitais
        </p>
      </div>
    </div>
  )
}
