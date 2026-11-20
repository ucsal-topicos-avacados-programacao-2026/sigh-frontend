import { apagarToken, guardarToken, lerToken, tokenGuardado, tokenValido } from '@/auth/token'
import { tokenFicticio } from '@/testes/tokens'

describe('token de acesso', () => {
  it('lê o login, os perfis e a validade, com acentos no login', () => {
    const token = tokenFicticio('joão.médico', ['MEDICO', 'ENFERMEIRO'])
    const dados = lerToken(token)
    expect(dados?.login).toBe('joão.médico')
    expect(dados?.perfis).toEqual(['MEDICO', 'ENFERMEIRO'])
    expect(dados?.expiraEm).toBeGreaterThan(Date.now())
  })

  it('token de segundo fator pendente não tem perfil', () => {
    const token = tokenFicticio('medico', [])
    expect(lerToken(token)?.perfis).toEqual([])
  })

  it('recusa token malformado ou vencido', () => {
    expect(lerToken('isso-nao-e-um-token')).toBeNull()
    expect(tokenValido(tokenFicticio('medico', ['MEDICO'], -10))).toBe(false)
    expect(tokenValido(null)).toBe(false)
  })

  it('guardado no sessionStorage, e um vencido é descartado ao ler', () => {
    guardarToken(tokenFicticio('medico', ['MEDICO']))
    expect(tokenGuardado()).not.toBeNull()
    guardarToken(tokenFicticio('medico', ['MEDICO'], -10))
    expect(tokenGuardado()).toBeNull()
    expect(window.sessionStorage.getItem('sigh.token')).toBeNull()
    guardarToken(tokenFicticio('medico', ['MEDICO']))
    apagarToken()
    expect(tokenGuardado()).toBeNull()
    expect(window.localStorage.length).toBe(0)
  })
})
