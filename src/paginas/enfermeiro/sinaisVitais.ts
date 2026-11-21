import type { SinaisVitais } from '@/api/tipos'

export interface CamposDosSinais {
  pressaoArterial: string
  frequenciaCardiaca: string
  frequenciaRespiratoria: string
  temperatura: string
  saturacaoOxigenio: string
}

export type ErrosDosSinais = Partial<Record<keyof CamposDosSinais, string>>

export const SINAIS_VAZIOS: CamposDosSinais = {
  pressaoArterial: '',
  frequenciaCardiaca: '',
  frequenciaRespiratoria: '',
  temperatura: '',
  saturacaoOxigenio: '',
}

const numero = (texto: string) => Number(texto.trim().replace(',', '.'))
const umaCasa = (texto: string) => /^\d+([.,]\d)?$/.test(texto.trim())

export function validarSinais(campos: CamposDosSinais): { erros: ErrosDosSinais; sinais: SinaisVitais } {
  const erros: ErrosDosSinais = {}
  const sinais: SinaisVitais = {}
  const pa = campos.pressaoArterial.trim()
  if (pa) {
    if (/^\d{2,3}\/\d{2,3}$/.test(pa)) sinais.pressaoArterial = pa
    else erros.pressaoArterial = 'Use sistólica/diastólica, por exemplo 120/80.'
  }
  for (const campo of ['frequenciaCardiaca', 'frequenciaRespiratoria'] as const) {
    const texto = campos[campo].trim()
    if (!texto) continue
    if (/^\d+$/.test(texto) && numero(texto) > 0) sinais[campo] = numero(texto)
    else erros[campo] = 'Use um número inteiro maior que zero.'
  }
  const temperatura = campos.temperatura.trim()
  if (temperatura) {
    if (umaCasa(temperatura) && numero(temperatura) > 0 && numero(temperatura) < 1000) sinais.temperatura = numero(temperatura)
    else erros.temperatura = 'Use um número maior que zero, com até uma casa decimal (por exemplo 38,5).'
  }
  const saturacao = campos.saturacaoOxigenio.trim()
  if (saturacao) {
    if (umaCasa(saturacao) && numero(saturacao) <= 100) sinais.saturacaoOxigenio = numero(saturacao)
    else erros.saturacaoOxigenio = 'Use de 0 a 100, com até uma casa decimal.'
  }
  return { erros, sinais }
}
