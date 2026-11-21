import { NOME_DO_TIPO_DE_REGISTRO, type RegistroDoHistorico } from '@/api/tipos'
import { formatarData } from '@/util/datas'

export function descreverRegistro(registro: RegistroDoHistorico | undefined) {
  if (!registro) return 'Um registro do seu histórico'
  return `${NOME_DO_TIPO_DE_REGISTRO[registro.tipo]} de ${formatarData(registro.criadoEm.slice(0, 10))}, ${registro.instituicaoOrigem}`
}

export function descreverAlvo(alvo: { categoria: string | null; registroId: string | null }, historico: RegistroDoHistorico[] | undefined) {
  if (alvo.categoria) return `Categoria: ${alvo.categoria}`
  return `Registro: ${descreverRegistro(historico?.find((r) => r.id === alvo.registroId))}`
}

export const EFEITO_DA_RESTRICAO =
  'Nenhuma instituição da rede vê essa informação, nem a que fez o registro, a não ser com uma autorização adicional sua ou numa emergência.'

export const EFEITO_DO_ENCERRAMENTO =
  'Essa informação volta a seguir o seu consentimento de compartilhamento: a instituição que fez o registro volta a ver, e as outras veem se o compartilhamento valer para elas.'
