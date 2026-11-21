import { Check, Hospital } from 'lucide-react'
import { useId } from 'react'
import { NOME_DO_PERFIL, PERFIS_DE_INSTITUICAO, type Perfil } from '@/api/tipos'
import { aparenciaDoCartao } from '@/paginas/painel/aparencia'
import { Bloco } from '@/paginas/painel/Bloco'

export interface HospitalDaPilha {
  id: string
  nome: string
  /** Perfis de instituição da pessoa nele; vazio para o gestor da rede sem vínculo. */
  perfis: readonly Perfil[]
}

/** Altura do cartão e quanto de cada cartão de trás aparece acima do da frente (o alvo de toque do projeto). */
const ALTURA = 128
const FRESTA = 44
/** Cada nível para trás fica 4% menor, até 92%: o nome continua com pelo menos 12px. */
const ESCALA_POR_NIVEL = 0.04
const ESCALA_MINIMA = 0.92

/**
 * Pilha de cartões dos hospitais (FE-09). O escolhido fica na frente. A ordem no DOM não muda com a escolha (só a
 * posição na tela): mover o elemento com foco tiraria o foco dele.
 *
 * - "radio" (no Painel): cada cartão é um rádio. As setas trocam de hospital, e o leitor de tela lê "Hospital do
 *   painel" e qual está marcado. Trocar aqui só muda os números e a instituição do topo, sem sair da página.
 * - "botoes" (no Início, sem instituição escolhida): escolher leva ao painel, então só Enter, Espaço ou clique
 *   escolhem. Uma seta não pode tirar a pessoa da página (WCAG 3.2.2).
 */
export function PilhaDeHospitais({
  hospitais,
  selecionado,
  aoEscolher,
  gestor,
  modo = 'radio',
  className = '',
}: {
  hospitais: HospitalDaPilha[]
  selecionado: string | null
  aoEscolher: (id: string) => void
  gestor: boolean
  modo?: 'radio' | 'botoes'
  className?: string
}) {
  const grupo = useId()
  // Posição na tela: os outros na ordem da lista, o escolhido por último (na frente).
  const naTela = [...hospitais.filter((h) => h.id !== selecionado), ...hospitais.filter((h) => h.id === selecionado)]
  const ajuda = gestor
    ? 'Escolha um cartão para ver os números de outro hospital da rede.'
    : modo === 'botoes'
      ? 'Escolha o hospital em que vai trabalhar agora.'
      : 'Escolha um cartão para trocar de hospital. A instituição do topo da página muda junto.'
  const cartoes = (
    <div className="relative" style={{ height: Math.max(0, naTela.length - 1) * FRESTA + ALTURA }}>
      {hospitais.map((hospital, indice) => {
        const posicao = naTela.indexOf(hospital)
        const atras = naTela.length - 1 - posicao
        const escolhido = hospital.id === selecionado
        const perfis = hospital.perfis.filter((perfil) => PERFIS_DE_INSTITUICAO.includes(perfil))
        const { foto, cor } = aparenciaDoCartao(indice)
        const classe = `absolute inset-x-0 flex cursor-pointer flex-col rounded-controle p-4 text-left text-white shadow-sobreposto transition-[top,transform] duration-500 ease-out ${cor.fundo}`
        const estilo = {
          top: posicao * FRESTA,
          height: ALTURA,
          zIndex: posicao + 1,
          transform: `scale(${Math.max(ESCALA_MINIMA, 1 - atras * ESCALA_POR_NIVEL)})`,
          transformOrigin: 'top center',
        }
        const conteudo = (
          <>
            <span aria-hidden="true" className="absolute inset-0 rounded-controle bg-cover bg-center" style={{ backgroundImage: `url(${foto})` }} />
            <span aria-hidden="true" className={`absolute inset-0 rounded-controle ${cor.veu}`} />
            <span className="relative flex flex-1 flex-col">
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-start gap-2">
                  <Hospital size={18} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" />
                  {/* Atrás, só a faixa de cima aparece: o nome fica numa linha. Na frente, cabe em até três. */}
                  <span className={`text-corpo font-semibold ${escolhido ? 'line-clamp-3' : 'truncate'}`}>{hospital.nome}</span>
                </span>
                {escolhido && <Check size={18} aria-hidden="true" className="shrink-0" />}
              </span>
              {/* Branco puro: com transparência, o texto de 12px fica abaixo de 4,5:1 sobre o véu. */}
              <span className="mt-auto text-rotulo text-white">
                {perfis.length > 0 ? `Você aqui: ${perfis.map((perfil) => NOME_DO_PERFIL[perfil]).join(' · ')}` : 'Gestão da rede'}
              </span>
            </span>
          </>
        )
        if (modo === 'botoes') {
          return (
            // Com foco, o cartão passa por cima dos outros (só na pilha visual), para o contorno aparecer inteiro.
            <button key={hospital.id} type="button" onClick={() => aoEscolher(hospital.id)} className={`${classe} focus-visible:z-50!`} style={estilo}>
              {conteudo}
            </button>
          )
        }
        return (
          <label
            key={hospital.id}
            className={`${classe} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foco`}
            style={estilo}
          >
            <input type="radio" name={grupo} value={hospital.id} checked={escolhido} onChange={() => aoEscolher(hospital.id)} className="sr-only" />
            {conteudo}
          </label>
        )
      })}
    </div>
  )
  return (
    <Bloco titulo={hospitais.length === 1 ? 'Hospital' : `Hospitais (${hospitais.length})`} className={className}>
      {modo === 'botoes' ? (
        <div role="group" aria-label="Hospital em que vai trabalhar" aria-describedby={`${grupo}-ajuda`}>
          {cartoes}
        </div>
      ) : (
        <fieldset aria-describedby={`${grupo}-ajuda`}>
          <legend className="sr-only">Hospital do painel</legend>
          {cartoes}
        </fieldset>
      )}
      <p id={`${grupo}-ajuda`} className="mt-3 text-rotulo text-texto-suave">
        {hospitais.length > 1 ? ajuda : gestor ? 'A rede tem um hospital só.' : 'Você tem vínculo com um hospital só.'}
      </p>
    </Bloco>
  )
}
