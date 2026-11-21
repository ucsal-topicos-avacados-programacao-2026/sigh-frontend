/** Datas sem hora (AAAA-MM-DD), lidas sem fuso: new Date('1958-03-12') cai no dia anterior no Brasil. */

function partes(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return { ano: ano ?? 0, mes: mes ?? 1, dia: dia ?? 1 }
}

export function formatarData(iso: string) {
  const { ano, mes, dia } = partes(iso)
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`
}

export function idade(iso: string, hoje = new Date()) {
  const { ano, mes, dia } = partes(iso)
  let anos = hoje.getFullYear() - ano
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) anos--
  return anos
}

/** Hoje no fuso de quem usa, no formato do input date (para o max da data de nascimento). */
export function hojeIso(hoje = new Date()) {
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${hoje.getFullYear()}-${mes}-${dia}`
}

/**
 * Data e hora vindas da API (LocalDateTime, sem fuso: já é a hora da rede). Mostra como veio, sem converter:
 * "12/03/2026 às 14:05".
 */
export function formatarDataHora(iso: string) {
  const [data = '', hora = ''] = iso.split('T')
  return `${formatarData(data)} às ${hora.slice(0, 5)}`
}
