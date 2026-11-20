import type { VinculoAtivo } from '@/api/tipos'
import { podeAcessar, vinculosOperaveis } from '@/auth/permissoes'

const hospitalA: VinculoAtivo = { instituicaoId: 'a', instituicaoNome: 'Hospital A', perfis: ['MEDICO'] }
const hospitalB: VinculoAtivo = { instituicaoId: 'b', instituicaoNome: 'Hospital B', perfis: ['ENFERMEIRO'] }

describe('podeAcessar', () => {
  it('perfil de instituição só com a instituição ativa que habilita o perfil (RF-012)', () => {
    const rotaDoMedico = { perfis: ['MEDICO'] as const }
    expect(podeAcessar(rotaDoMedico, { perfis: ['MEDICO'], instituicaoAtiva: hospitalA })).toBe(true)
    expect(podeAcessar(rotaDoMedico, { perfis: ['MEDICO'], instituicaoAtiva: null })).toBe(false)
    expect(podeAcessar(rotaDoMedico, { perfis: ['MEDICO'], instituicaoAtiva: hospitalB })).toBe(false)
    expect(podeAcessar(rotaDoMedico, { perfis: ['ENFERMEIRO'], instituicaoAtiva: hospitalA })).toBe(false)
  })

  it('paciente e auditor não dependem de instituição', () => {
    expect(podeAcessar({ perfis: ['PACIENTE'] }, { perfis: ['PACIENTE'], instituicaoAtiva: null })).toBe(true)
    expect(podeAcessar({ perfis: ['AUDITOR_GESTOR'] }, { perfis: ['AUDITOR_GESTOR'], instituicaoAtiva: null })).toBe(true)
    expect(podeAcessar({ perfis: ['AUDITOR_GESTOR'] }, { perfis: ['PACIENTE'], instituicaoAtiva: null })).toBe(false)
  })

  it('rota de vários perfis: basta um liberado', () => {
    const fila = { perfis: ['ENFERMEIRO', 'MEDICO'] as const }
    expect(podeAcessar(fila, { perfis: ['MEDICO', 'ENFERMEIRO'], instituicaoAtiva: hospitalB })).toBe(true)
  })
})

describe('vinculosOperaveis', () => {
  it('só os vínculos com um perfil de instituição que o usuário tem', () => {
    const auditoria: VinculoAtivo = { instituicaoId: 'c', instituicaoNome: 'Rede', perfis: ['AUDITOR_GESTOR'] }
    expect(vinculosOperaveis([hospitalA, hospitalB, auditoria], ['MEDICO'])).toEqual([hospitalA])
  })
})
