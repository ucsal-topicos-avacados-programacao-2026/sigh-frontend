import { blocos, trechos } from '@/componentes/markdownSimples'

describe('Markdown simples do texto da IA (FE-10)', () => {
  it('títulos, listas e parágrafos, sem sobrar marcação', () => {
    const texto = `**Diagnósticos anteriores**
- 2026-09-22 | Hospital Público | DIAGNOSTICO (CID J45.9): Asma brônquica persistente leve.

## Alergias
* Alergia a **dipirona**, com urticária.
* Sem outras.

1. Primeiro
2) Segundo

Paciente estável,
com orientação.`
    expect(blocos(texto)).toEqual([
      { tipo: 'titulo', trechos: [{ texto: 'Diagnósticos anteriores' }] },
      { tipo: 'lista', ordenada: false, itens: [[{ texto: '2026-09-22 | Hospital Público | DIAGNOSTICO (CID J45.9): Asma brônquica persistente leve.' }]] },
      { tipo: 'titulo', trechos: [{ texto: 'Alergias' }] },
      { tipo: 'lista', ordenada: false, itens: [[{ texto: 'Alergia a ' }, { texto: 'dipirona', negrito: true }, { texto: ', com urticária.' }], [{ texto: 'Sem outras.' }]] },
      { tipo: 'lista', ordenada: true, itens: [[{ texto: 'Primeiro' }], [{ texto: 'Segundo' }]] },
      { tipo: 'paragrafo', trechos: [{ texto: 'Paciente estável,\ncom orientação.' }] },
    ])
  })

  it('negrito e itálico dentro da linha; asterisco solto e multiplicação ficam como estão', () => {
    expect(trechos('Uso de __salbutamol__ e *budesonida* agora')).toEqual([
      { texto: 'Uso de ' },
      { texto: 'salbutamol', negrito: true },
      { texto: ' e ' },
      { texto: 'budesonida', italico: true },
      { texto: ' agora' },
    ])
    expect(trechos('2 * 3 jatos; nota*')).toEqual([{ texto: '2 * 3 jatos; nota*' }])
    expect(trechos('dose_maxima_diaria')).toEqual([{ texto: 'dose_maxima_diaria' }])
    expect(trechos('Medicação (*) suspensa; ver nota (*)')).toEqual([{ texto: 'Medicação (*) suspensa; ver nota (*)' }])
    expect(trechos('3*10^9/L e 5*10^3')).toEqual([{ texto: '3*10^9/L e 5*10^3' }])
  })

  it('HTML vindo da IA continua texto', () => {
    expect(blocos('<b>forte</b> <script>x()</script>')).toEqual([{ tipo: 'paragrafo', trechos: [{ texto: '<b>forte</b> <script>x()</script>' }] }])
  })

  it('lista numerada mantém o número de onde começa, e itens separados só por quebra de linha continuam em linhas', () => {
    expect(blocos('3. Asma\n4. Hipertensão')).toEqual([{ tipo: 'lista', ordenada: true, inicio: 3, itens: [[{ texto: 'Asma' }], [{ texto: 'Hipertensão' }]] }])
    expect(blocos('Alergias: dipirona\nMedicações: salbutamol')).toEqual([{ tipo: 'paragrafo', trechos: [{ texto: 'Alergias: dipirona\nMedicações: salbutamol' }] }])
  })
})
