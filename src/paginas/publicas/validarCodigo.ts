export function validarCodigo(codigo: string) {
  return /^\d{6}$/.test(codigo) ? undefined : 'Digite os 6 números que aparecem no aplicativo.'
}
