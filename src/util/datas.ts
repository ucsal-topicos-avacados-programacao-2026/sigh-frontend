
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

export function hojeIso(hoje = new Date()) {
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${hoje.getFullYear()}-${mes}-${dia}`
}

export function formatarDataHora(iso: string) {
  const [data = '', hora = ''] = iso.split('T')
  return `${formatarData(data)} às ${hora.slice(0, 5)}`
}
