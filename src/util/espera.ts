/** Minutos de espera em texto curto: "45 min", "1 h", "2 h 05 min". */
export function formatarEspera(minutos: number) {
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${String(resto).padStart(2, '0')} min`
}
