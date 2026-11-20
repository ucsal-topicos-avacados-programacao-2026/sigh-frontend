import { LogOut, Menu as IconeMenu, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { NOME_DO_PERFIL } from '@/api/tipos'
import { podeAcessar } from '@/auth/permissoes'
import { useSessao } from '@/auth/SessaoProvider'
import { Botao, BotaoIcone } from '@/componentes/Botao'
import { Marca } from '@/componentes/Marca'
import { GRUPOS_DO_MENU, ITENS_DE_MENU } from '@/rotas'

/** Se a tela tem pelo menos a largura; aoMudar roda na própria mudança (não num efeito). */
function useLarguraMinima(largura: number, aoMudar?: (corresponde: boolean) => void) {
  const consulta = `(min-width: ${largura}px)`
  const [corresponde, setCorresponde] = useState(() => window.matchMedia?.(consulta).matches ?? true)
  const callback = useRef(aoMudar)
  useEffect(() => {
    callback.current = aoMudar
  })
  useEffect(() => {
    const lista = window.matchMedia?.(consulta)
    if (!lista) return
    const quandoMudar = () => {
      setCorresponde(lista.matches)
      callback.current?.(lista.matches)
    }
    lista.addEventListener('change', quandoMudar)
    return () => lista.removeEventListener('change', quandoMudar)
  }, [consulta])
  return corresponde
}

function iniciais(nome: string) {
  const partes = nome.replace(/^(Dra?|Enf)\.\s*/i, '').trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

/** Seletor da instituição ativa: com um vínculo, texto fixo; sem vínculo (paciente, auditor), nada. */
function SeletorDeInstituicao({ escuro = false }: { escuro?: boolean }) {
  const { vinculos, instituicaoAtiva, escolherInstituicao } = useSessao()
  const id = useId()
  if (vinculos.length === 0) return null
  if (vinculos.length === 1) {
    return (
      <p className={`text-corpo ${escuro ? 'text-lateral-texto' : 'text-texto-medio'}`}>
        <span className={`text-rotulo font-semibold ${escuro ? 'text-lateral-texto-suave' : 'text-texto-suave'}`}>Instituição ativa: </span>
        {vinculos[0]?.instituicaoNome}
      </p>
    )
  }
  return (
    <div className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 ${escuro ? '' : ''}`}>
      <label htmlFor={id} className={`text-rotulo font-semibold ${escuro ? 'text-lateral-texto-suave' : 'text-texto-suave'}`}>
        Instituição ativa
      </label>
      <select
        id={id}
        value={instituicaoAtiva?.instituicaoId ?? ''}
        onChange={(evento) => escolherInstituicao(evento.target.value)}
        className={`campo w-full sm:w-[240px] lg:w-[280px] ${escuro ? 'border-lateral-texto-suave bg-[#173452] text-white' : ''}`}
      >
        {!instituicaoAtiva && (
          <option value="" disabled className="bg-white text-texto">
            Escolha a instituição
          </option>
        )}
        {vinculos.map((vinculo) => (
          <option key={vinculo.instituicaoId} value={vinculo.instituicaoId} className="bg-white text-texto">
            {vinculo.instituicaoNome}
          </option>
        ))}
      </select>
    </div>
  )
}

function Usuario({ escuro = false }: { escuro?: boolean }) {
  const { usuario } = useSessao()
  if (!usuario) return null
  const perfis = usuario.perfis.map((perfil) => NOME_DO_PERFIL[perfil]).join(' · ')
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-[#eaf2ff] text-rotulo font-bold text-info"
      >
        {iniciais(usuario.nome)}
      </span>
      <div className="min-w-0">
        <p className={`truncate text-corpo font-semibold ${escuro ? 'text-white' : 'text-texto'}`}>{usuario.nome}</p>
        <p className={`text-rotulo ${escuro ? 'text-lateral-texto-suave' : 'text-texto-suave'}`}>{perfis}</p>
      </div>
    </div>
  )
}

export function AppLayout() {
  const sessao = useSessao()
  const { usuario, instituicaoAtiva, sair } = sessao
  const [menuPedido, setMenuAberto] = useState(false)
  // Ao passar para o desktop, a gaveta fecha: voltando para tela pequena, ela não reabre sozinha.
  const desktop = useLarguraMinima(1024, (corresponde) => {
    if (corresponde) setMenuAberto(false)
  })
  const largo = useLarguraMinima(640)
  // A partir de 1024px a sidebar é fixa: o menu "aberto" só existe abaixo disso.
  const menuAberto = menuPedido && !desktop
  const abrirMenu = useRef<HTMLButtonElement>(null)
  const fecharMenu = useRef<HTMLButtonElement>(null)
  const escolheuItem = useRef(false)
  const local = useLocation()
  const navegar = useNavigate()
  const anuncio = useRef<HTMLParagraphElement>(null)

  const itens = useMemo(
    () => ITENS_DE_MENU.filter((item) => usuario && podeAcessar(item, { perfis: usuario.perfis, instituicaoAtiva })),
    [usuario, instituicaoAtiva],
  )

  // Sidebar como diálogo abaixo de 1024px: foco no "Fechar menu", Esc fecha, rolagem da página travada.
  useEffect(() => {
    if (!menuAberto) return
    const botaoDeAbrir = abrirMenu.current
    fecharMenu.current?.focus()
    document.body.style.overflow = 'hidden'
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAberto(false)
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', aoTeclar)
      // Ao fechar sem escolher item, o foco volta ao botão que abriu; escolhendo, vai para o h1 da página nova.
      if (!escolheuItem.current) botaoDeAbrir?.focus()
      escolheuItem.current = false
    }
  }, [menuAberto])

  // Trocar de instituição não navega sozinho; se a página atual não existe na nova, vai para o início.
  const instituicaoAnterior = useRef(instituicaoAtiva?.instituicaoId)
  useEffect(() => {
    const atual = instituicaoAtiva?.instituicaoId
    if (instituicaoAnterior.current === atual) return
    const habia = instituicaoAnterior.current !== undefined
    instituicaoAnterior.current = atual
    if (!habia || !instituicaoAtiva) return
    const disponivel = itens.some((item) => local.pathname.startsWith(item.caminho))
    if (anuncio.current) {
      anuncio.current.textContent = disponivel
        ? `Instituição ativa: ${instituicaoAtiva.instituicaoNome}.`
        : `Instituição ativa: ${instituicaoAtiva.instituicaoNome}. Esta página não está disponível nela.`
    }
    if (!disponivel) navegar('/')
  }, [instituicaoAtiva, itens, local.pathname, navegar])

  const lateralVisivel = desktop || menuAberto

  return (
    <>
      <a
        href="#conteudo"
        inert={menuAberto}
        onClick={(evento) => {
          evento.preventDefault()
          document.getElementById('conteudo')?.focus()
        }}
        className="sr-only-focavel fixed top-2 left-2 z-[60] rounded-controle bg-primaria px-4 py-3 text-corpo font-semibold text-white"
      >
        Pular para o conteúdo
      </a>

      {!desktop && menuAberto && (
        <div aria-hidden="true" className="fixed inset-0 z-[25] bg-slate-900/40" onClick={() => setMenuAberto(false)} />
      )}

      {/* div, e não aside: abaixo de 1024px ela vira diálogo, papel que o aside não aceita. Fora disso, é uma região
          nomeada, para a marca e o usuário não ficarem fora de um marco. */}
      <div
        id="menu-lateral"
        inert={!lateralVisivel}
        role={!desktop && menuAberto ? 'dialog' : 'region'}
        aria-modal={!desktop && menuAberto ? true : undefined}
        aria-label={!desktop && menuAberto ? 'Menu principal' : 'Menu lateral'}
        className={`superficie-escura fixed inset-y-0 left-0 z-30 flex w-lateral flex-col bg-lateral transition-transform duration-200 ${
          lateralVisivel ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-topbar shrink-0 items-center border-b border-white/[.07] px-5">
          <Marca clara />
          {!desktop && <BotaoIcone ref={fecharMenu} icone={X} rotulo="Fechar menu" escuro className="ml-auto" onClick={() => setMenuAberto(false)} />}
        </div>
        {!largo && (
          <div className="flex flex-col gap-4 border-b border-white/[.07] px-5 py-4">
            <Usuario escuro />
            <SeletorDeInstituicao escuro />
          </div>
        )}
        <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-3 pb-4">
          {GRUPOS_DO_MENU.map((grupo) => {
            const doGrupo = itens.filter((item) => item.grupo === grupo)
            if (doGrupo.length === 0) return null
            const rotuloId = `grupo-${grupo.replace(/\W+/g, '-').toLowerCase()}`
            return (
              <div key={grupo}>
                <p id={rotuloId} className="mx-3 mt-4 mb-2 text-rotulo font-bold tracking-[.08em] text-lateral-texto-suave">
                  {grupo}
                </p>
                <ul aria-labelledby={rotuloId} className="flex flex-col gap-1">
                  {doGrupo.map(({ caminho, rotulo, icone: Icone }) => (
                    <li key={caminho}>
                      <NavLink
                        to={caminho}
                        onClick={() => {
                          escolheuItem.current = true
                          setMenuAberto(false)
                        }}
                        className={({ isActive }) =>
                          `relative flex min-h-alvo items-center gap-3 rounded-controle px-3 py-2.5 text-corpo transition-colors duration-150 ${
                            isActive ? 'bg-lateral-ativo font-semibold text-white' : 'text-lateral-texto hover:bg-lateral-hover hover:text-white'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icone size={20} strokeWidth={1.8} aria-hidden="true" className={isActive ? 'text-lateral-icone-ativo' : ''} />
                            {rotulo}
                            {isActive && <span aria-hidden="true" className="absolute right-3 size-1.5 rounded-full bg-acento" />}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>
      </div>

      {/* Com a gaveta aberta, o resto da página fica inerte: o foco não escapa dela (WCAG 2.4.3). */}
      <div inert={menuAberto} className="min-h-screen lg:ml-lateral">
        <header className="sticky top-0 z-20 flex h-topbar-movel items-center justify-between gap-3 border-b border-[#e9edf2] bg-superficie px-3 sm:h-topbar sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            {!desktop && (
              <BotaoIcone
                ref={abrirMenu}
                icone={IconeMenu}
                rotulo="Abrir menu"
                aria-expanded={menuAberto}
                aria-controls="menu-lateral"
                onClick={() => setMenuAberto(true)}
              />
            )}
            {largo ? <SeletorDeInstituicao /> : <Marca />}
          </div>
          <div className="flex items-center gap-4">
            {largo && <Usuario />}
            {largo ? (
              <Botao variante="secundario" icone={LogOut} onClick={() => sair({ texto: 'Você saiu do SIGH.', tom: 'info' })}>
                Sair
              </Botao>
            ) : (
              <BotaoIcone icone={LogOut} rotulo="Sair do SIGH" onClick={() => sair({ texto: 'Você saiu do SIGH.', tom: 'info' })} />
            )}
          </div>
        </header>
        <p ref={anuncio} role="status" className="sr-only" />
        <main id="conteudo" tabIndex={-1} className="flex flex-col gap-6 px-4 py-4 sm:p-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </>
  )
}
