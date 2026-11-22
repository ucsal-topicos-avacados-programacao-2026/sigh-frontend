import { requisicao } from '@/api/cliente'
import type {
  AcaoAdministrativa,
  NovoUsuario,
  NovoVinculo,
  Pagina,
  Perfil,
  SenhaTemporaria,
  UsuarioCriado,
  UsuarioDetalhe,
} from '@/api/tipos'

export interface FiltroDeUsuarios {
  busca: string
  perfil: Perfil | ''
  situacao: 'todos' | 'ativos' | 'desativados'
}

export const usuarios = (filtro: FiltroDeUsuarios, pagina: number, tamanho: number, sinal?: AbortSignal) =>
  requisicao<Pagina<UsuarioDetalhe>>('GET', '/usuarios', {
    consulta: {
      busca: filtro.busca.trim(),
      perfil: filtro.perfil || undefined,
      ativo: filtro.situacao === 'todos' ? undefined : filtro.situacao === 'ativos',
      page: pagina,
      size: tamanho,
    },
    sinal,
  })

export const acoesAdministrativas = (pagina: number, tamanho: number, sinal?: AbortSignal) =>
  requisicao<Pagina<AcaoAdministrativa>>('GET', '/usuarios/acoes', { consulta: { page: pagina, size: tamanho }, sinal })

export const criarUsuario = (dados: NovoUsuario) => requisicao<UsuarioCriado>('POST', '/usuarios', { corpo: dados })

export const alterarAtivo = (id: string, ativo: boolean) =>
  requisicao<UsuarioDetalhe>('PATCH', `/usuarios/${encodeURIComponent(id)}/ativo`, { corpo: { ativo } })

export const redefinirSenha = (id: string) =>
  requisicao<SenhaTemporaria>('POST', `/usuarios/${encodeURIComponent(id)}/senha-temporaria`)

export const zerarSegundoFator = (id: string) =>
  requisicao<UsuarioDetalhe>('POST', `/usuarios/${encodeURIComponent(id)}/segundo-fator/reinicio`)

export const adicionarVinculo = (id: string, vinculo: NovoVinculo) =>
  requisicao<UsuarioDetalhe>('POST', `/usuarios/${encodeURIComponent(id)}/vinculos`, { corpo: vinculo })

export const encerrarVinculo = (id: string, vinculoId: string) =>
  requisicao<UsuarioDetalhe>('POST', `/usuarios/${encodeURIComponent(id)}/vinculos/${encodeURIComponent(vinculoId)}/encerramento`)
