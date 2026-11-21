
export function somenteDigitos(texto: string) {
  return texto.replace(/\D/g, '').slice(0, 11)
}

export function mascararCpf(texto: string) {
  const d = somenteDigitos(texto)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function digitoVerificador(digitos: string, quantidade: number) {
  let soma = 0
  for (let i = 0; i < quantidade; i++) soma += Number(digitos[i]) * (quantidade + 1 - i)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cpfValido(texto: string) {
  const d = texto.replace(/\D/g, '')
  if (d.length !== 11 || new Set(d).size === 1) return false
  return digitoVerificador(d, 9) === Number(d[9]) && digitoVerificador(d, 10) === Number(d[10])
}

export function erroDoCpf(texto: string) {
  const d = texto.replace(/\D/g, '')
  if (d.length === 0) return 'Informe o CPF.'
  if (d.length < 11) return 'O CPF tem 11 dígitos.'
  if (!cpfValido(d)) return 'CPF inválido. Confira os dígitos.'
  return undefined
}
