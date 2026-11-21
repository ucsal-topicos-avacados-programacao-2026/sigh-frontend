import { NOME_DO_TIPO_DE_REGISTRO, type RegistroDoHistorico } from '@/api/tipos'
import { formatarData } from '@/util/datas'

/** Como um registro aparece quando é alvo de restrição ou autorização: "Diagnóstico de 12/03/2026, Hospital A". */
export function descreverRegistro(registro: RegistroDoHistorico | undefined) {
  if (!registro) return 'Um registro do seu histórico'
  return `${NOME_DO_TIPO_DE_REGISTRO[registro.tipo]} de ${formatarData(registro.criadoEm.slice(0, 10))}, ${registro.instituicaoOrigem}`
}

/** Alvo de restrição ou autorização, em texto. */
export function descreverAlvo(alvo: { categoria: string | null; registroId: string | null }, historico: RegistroDoHistorico[] | undefined) {
  if (alvo.categoria) return `Categoria: ${alvo.categoria}`
  return `Registro: ${descreverRegistro(historico?.find((r) => r.id === alvo.registroId))}`
}

/**
 * Efeito de restringir, igual em toda a tela. Conferido com RegistroClinicoRepository.historicoVisivel: a restrição
 * vale para todas as instituições, inclusive a que fez o registro; só a autorização adicional e a emergência liberam.
 */
export const EFEITO_DA_RESTRICAO =
  'Nenhuma instituição da rede vê essa informação, nem a que fez o registro, a não ser com uma autorização adicional sua ou numa emergência.'

/** Efeito de encerrar uma restrição: a informação volta a seguir o consentimento de compartilhamento. */
export const EFEITO_DO_ENCERRAMENTO =
  'Essa informação volta a seguir o seu consentimento de compartilhamento: a instituição que fez o registro volta a ver, e as outras veem se o compartilhamento valer para elas.'
