import type { Perfil } from '@/api/tipos'
import { PERFIS_COM_REGISTRO, REGISTRO_PROFISSIONAL } from '@/paginas/auditor/textosDeUsuarios'

export interface CamposDoVinculo {
  instituicaoId: string
  registro: string
}

export const VINCULO_VAZIO: CamposDoVinculo = { instituicaoId: '', registro: '' }

export function exigeRegistro(perfis: readonly Perfil[]) {
  return perfis.some((perfil) => PERFIS_COM_REGISTRO.includes(perfil))
}

export function rotuloDoRegistro(perfis: readonly Perfil[]) {
  const nome = perfis.map((perfil) => REGISTRO_PROFISSIONAL[perfil]).find(Boolean)
  return nome ? `Registro profissional (${nome})` : 'Registro profissional'
}
