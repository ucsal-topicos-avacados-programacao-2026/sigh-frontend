import { aparenciaDoCartao } from '@/paginas/painel/aparencia'

describe('aparência dos cartões de hospital', () => {
  it('os 16 primeiros hospitais têm combinações diferentes de foto e cor; o 17º repete o 1º', () => {
    const combinacoes = Array.from({ length: 16 }, (_, i) => aparenciaDoCartao(i)).map(({ foto, cor }) => `${foto}|${cor.veu}`)
    expect(new Set(combinacoes).size).toBe(16)
    expect(aparenciaDoCartao(16)).toEqual(aparenciaDoCartao(0))
  })

  it('os 4 primeiros têm fotos e cores todas diferentes', () => {
    const primeiros = [0, 1, 2, 3].map(aparenciaDoCartao)
    expect(new Set(primeiros.map((a) => a.foto)).size).toBe(4)
    expect(new Set(primeiros.map((a) => a.cor.veu)).size).toBe(4)
  })

  it('o 5º reaproveita a foto do 1º com outra cor', () => {
    expect(aparenciaDoCartao(4).foto).toBe(aparenciaDoCartao(0).foto)
    expect(aparenciaDoCartao(4).cor).not.toEqual(aparenciaDoCartao(0).cor)
  })
})
