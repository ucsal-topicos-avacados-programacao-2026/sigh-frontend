import { cpfValido, erroDoCpf, mascararCpf, somenteDigitos } from '@/paginas/pacientes/cpf'
import { formatarData, hojeIso, idade } from '@/util/datas'

describe('CPF (mesma regra do Cpf.ehValido da API)', () => {
  it('máscara progressiva e no máximo 11 dígitos', () => {
    expect(mascararCpf('529')).toBe('529')
    expect(mascararCpf('5299')).toBe('529.9')
    expect(mascararCpf('5299822')).toBe('529.982.2')
    expect(mascararCpf('5299822472')).toBe('529.982.247-2')
    expect(mascararCpf('52998224725999')).toBe('529.982.247-25')
    expect(somenteDigitos('529.982.247-25')).toBe('52998224725')
  })

  // 123.456.789-09: o primeiro dígito vem do caso "resto menor que 2", que vale 0.
  it.each(['529.982.247-25', '52998224725', '111.444.777-35', '123.456.789-09'])('válido: %s', (cpf) => {
    expect(cpfValido(cpf)).toBe(true)
    expect(erroDoCpf(cpf)).toBeUndefined()
  })

  it.each([
    ['529.982.247-24', 'CPF inválido. Confira os dígitos.'],
    ['529.982.247-35', 'CPF inválido. Confira os dígitos.'],
    // Só o primeiro dígito errado; o segundo foi calculado sobre ele e bate.
    ['529.982.247-33', 'CPF inválido. Confira os dígitos.'],
    ['111.111.111-11', 'CPF inválido. Confira os dígitos.'],
    ['000.000.000-00', 'CPF inválido. Confira os dígitos.'],
    ['529.982.247', 'O CPF tem 11 dígitos.'],
    ['', 'Informe o CPF.'],
  ])('inválido: %s', (cpf, mensagem) => {
    expect(cpfValido(cpf)).toBe(false)
    expect(erroDoCpf(cpf)).toBe(mensagem)
  })
})

describe('datas sem fuso', () => {
  it('formata sem cair no dia anterior', () => {
    expect(formatarData('1958-03-01')).toBe('01/03/1958')
  })

  it('idade só sobe no dia do aniversário', () => {
    expect(idade('1958-03-12', new Date(2026, 2, 11))).toBe(67)
    expect(idade('1958-03-12', new Date(2026, 2, 12))).toBe(68)
    expect(idade('1958-12-31', new Date(2026, 11, 30))).toBe(67)
  })

  it('hoje no formato do input date', () => {
    expect(hojeIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
