export function erroDaNovaSenha(senha: string, confirmacao: string): string | undefined {
  if (senha.length < 10) return 'Use ao menos 10 caracteres.'
  if (senha.length > 72) return 'Use no máximo 72 caracteres.'
  if (!/\p{L}/u.test(senha) || !/\d/.test(senha)) return 'Use letras e números.'
  if (senha !== confirmacao) return 'As senhas não são iguais.'
  return undefined
}
