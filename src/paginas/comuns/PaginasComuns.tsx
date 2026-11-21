import { Construction } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import { useSessao } from '@/auth/SessaoProvider'
import { Alerta } from '@/componentes/Alerta'
import { TituloPagina } from '@/componentes/TituloPagina'
import { useInicio } from '@/paginas/comuns/useInicio'
import { PilhaDeHospitais } from '@/paginas/painel/PilhaDeHospitais'
import type { ItemDeMenu } from '@/rotas'

const LINK_PRIMARIO =
  'inline-flex min-h-alvo items-center justify-center rounded-controle bg-primaria px-4 text-corpo font-semibold text-white shadow-botao hover:bg-primaria-hover lg:min-h-controle'

export function Inicio() {
  const inicio = useInicio()
  const { vinculos, instituicaoAtiva, usuario, escolherInstituicao } = useSessao()
  if (inicio) return <Navigate to={inicio} replace />
  const profissional = usuario?.perfis.some((perfil) => perfil !== 'PACIENTE' && perfil !== 'AUDITOR_GESTOR')
  return (
    <>
      <TituloPagina titulo="Início" />
      {profissional && vinculos.length > 1 && !instituicaoAtiva ? (
        <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] sm:items-start">
          <Alerta tom="info" anunciar={false} titulo="Escolha a instituição">
            Você tem vínculo com mais de uma instituição. Escolha um cartão, ou use o topo da página, para dizer em qual vai
            trabalhar agora.
          </Alerta>
          <PilhaDeHospitais
            hospitais={vinculos.map((v) => ({ id: v.instituicaoId, nome: v.instituicaoNome, perfis: v.perfis }))}
            selecionado={null}
            aoEscolher={escolherInstituicao}
            gestor={false}
            modo="botoes"
          />
        </div>
      ) : (
        <Alerta tom="atencao" anunciar={false} titulo="Nenhuma área disponível">
          Você não tem vínculo ativo com nenhuma instituição. Fale com a administração da sua instituição.
        </Alerta>
      )}
    </>
  )
}

export function EmConstrucao({ item }: { item: ItemDeMenu }) {
  return (
    <>
      <TituloPagina titulo={item.rotulo} trilha={item.grupo.charAt(0) + item.grupo.slice(1).toLowerCase()} subtitulo={item.descricao} />
      <section aria-labelledby="em-construcao" className="flex items-start gap-3 rounded-painel border border-borda bg-superficie p-5">
        <Construction size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-texto-medio" />
        <div>
          <h2 id="em-construcao" className="text-destaque font-semibold text-texto-forte">
            Em construção
          </h2>
          <p className="mt-1 text-corpo text-texto-suave">Esta tela é entregue no card {item.card}.</p>
        </div>
      </section>
    </>
  )
}

function BlocoDeErro({ codigo, titulo, tituloDaAba, texto, acao }: { codigo: string; titulo: string; tituloDaAba?: string; texto: string; acao: React.ReactNode }) {
  return (
    <section className="max-w-[560px] rounded-painel border border-borda bg-superficie p-8">
      <p className="text-rotulo font-semibold text-texto-suave">{codigo}</p>
      <div className="mt-2">
        <TituloPagina titulo={titulo} tituloDaAba={tituloDaAba} />
      </div>
      <p className="mt-3 text-corpo text-texto">{texto}</p>
      <div className="mt-6">{acao}</div>
    </section>
  )
}

export function SemPermissao() {
  const { instituicaoAtiva } = useSessao()
  const inicio = useInicio() ?? '/'
  const texto = instituicaoAtiva
    ? `Seu perfil na instituição ativa (${instituicaoAtiva.instituicaoNome}) não dá acesso a esta área. Se você precisa dela, fale com a administração da instituição.`
    : 'Seu perfil não dá acesso a esta área.'
  return (
    <BlocoDeErro
      codigo="Erro 403"
      titulo="Você não tem permissão para acessar esta página"
      tituloDaAba="Sem permissão"
      texto={texto}
      acao={
        <Link to={inicio} className={LINK_PRIMARIO}>
          Ir para o início
        </Link>
      }
    />
  )
}

export function NaoEncontrada() {
  const inicio = useInicio() ?? '/'
  const texto = 'O endereço pode estar errado ou a página foi removida.'
  return (
    <BlocoDeErro
      codigo="Erro 404"
      titulo="Página não encontrada"
      texto={texto}
      acao={
        <Link to={inicio} className={LINK_PRIMARIO}>
          Ir para o início
        </Link>
      }
    />
  )
}
