import { Plus, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { criarUsuario } from '@/api/usuarios'
import { useEnvio } from '@/api/useEnvio'
import { NOME_DO_PERFIL, PERFIS_CRIAVEIS, type InstituicaoDaRede, type Perfil, type UsuarioCriado } from '@/api/tipos'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { CampoTexto, Selecao } from '@/componentes/Campo'
import { Dialogo } from '@/componentes/Dialogo'
import { FormularioDeVinculo } from '@/paginas/auditor/FormularioDeVinculo'
import { exigeRegistro, VINCULO_VAZIO, type CamposDoVinculo } from '@/paginas/auditor/vinculos'
import { PERFIS_DE_INSTITUICAO } from '@/paginas/auditor/textosDeUsuarios'

const PADRAO_DO_LOGIN = /^[a-z0-9][a-z0-9._-]{2,39}$/

interface Erros {
  login?: string
  nome?: string
  perfil?: string
  vinculos?: Record<number, { instituicaoId?: string; registro?: string }>
  geral?: string
}

export function DialogoDeNovoUsuario({ aberto, instituicoes, aoFechar, aoCriar }: {
  aberto: boolean
  instituicoes: InstituicaoDaRede[]
  aoFechar: () => void
  aoCriar: (criado: UsuarioCriado) => void
}) {
  const [ocupado, setOcupado] = useState(false)
  return (
    <Dialogo aberto={aberto} titulo="Novo usuário" aoFechar={aoFechar} bloqueado={ocupado}>
      {aberto && <Formulario instituicoes={instituicoes} aoCancelar={aoFechar} aoCriar={aoCriar} aoMudarOcupado={setOcupado} />}
    </Dialogo>
  )
}

function Formulario({ instituicoes, aoCancelar, aoCriar, aoMudarOcupado }: {
  instituicoes: InstituicaoDaRede[]
  aoCancelar: () => void
  aoCriar: (criado: UsuarioCriado) => void
  aoMudarOcupado: (ocupado: boolean) => void
}) {
  const [login, setLogin] = useState('')
  const [nome, setNome] = useState('')
  const [perfil, setPerfil] = useState<Perfil | ''>('')
  const [vinculos, setVinculos] = useState<CamposDoVinculo[]>([VINCULO_VAZIO])
  const [erros, setErros] = useState<Erros>({})
  const envio = useEnvio()
  const daInstituicao = perfil !== '' && PERFIS_DE_INSTITUICAO.includes(perfil)

  function validar(): Erros {
    const novos: Erros = {}
    if (!PADRAO_DO_LOGIN.test(login)) novos.login = 'Use de 3 a 40 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.'
    if (!nome.trim()) novos.nome = 'Digite o nome.'
    if (!perfil) novos.perfil = 'Escolha o perfil.'
    if (daInstituicao) {
      const porLinha: NonNullable<Erros['vinculos']> = {}
      vinculos.forEach((vinculo, indice) => {
        const erro: { instituicaoId?: string; registro?: string } = {}
        if (!vinculo.instituicaoId) erro.instituicaoId = 'Escolha o hospital.'
        else if (vinculos.findIndex((outro) => outro.instituicaoId === vinculo.instituicaoId) !== indice) erro.instituicaoId = 'Hospital repetido.'
        if (exigeRegistro([perfil]) && !vinculo.registro.trim()) erro.registro = 'Informe o registro profissional.'
        if (erro.instituicaoId || erro.registro) porLinha[indice] = erro
      })
      if (Object.keys(porLinha).length > 0) novos.vinculos = porLinha
    }
    return novos
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const novos = validar()
    setErros(novos)
    if (Object.keys(novos).length > 0 || !perfil) return
    let criado: UsuarioCriado | undefined
    aoMudarOcupado(true)
    const ok = await envio.enviar(async () => {
      criado = await criarUsuario({
        login,
        nome: nome.trim(),
        perfis: [perfil],
        vinculos: daInstituicao
          ? vinculos.map((vinculo) => ({
              instituicaoId: vinculo.instituicaoId,
              perfis: [perfil],
              registroProfissional: exigeRegistro([perfil]) ? vinculo.registro.trim() : undefined,
            }))
          : [],
      })
    })
    aoMudarOcupado(false)
    if (ok && criado) aoCriar(criado)
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <CampoTexto
        rotulo="Login"
        ajuda="Letras minúsculas, números, ponto, hífen ou sublinhado."
        autoComplete="off"
        value={login}
        onChange={(e) => {
          setLogin(e.target.value.trim().toLowerCase())
          setErros((atuais) => ({ ...atuais, login: undefined }))
        }}
        erro={erros.login}
      />
      <CampoTexto
        rotulo="Nome completo"
        autoComplete="off"
        value={nome}
        onChange={(e) => {
          setNome(e.target.value)
          setErros((atuais) => ({ ...atuais, nome: undefined }))
        }}
        erro={erros.nome}
      />
      <Selecao
        rotulo="Perfil"
        value={perfil}
        onChange={(e) => {
          setPerfil(e.target.value as Perfil | '')
          setErros((atuais) => ({ ...atuais, perfil: undefined, vinculos: undefined }))
        }}
        erro={erros.perfil}
      >
        <option value="">Escolha o perfil</option>
        {PERFIS_CRIAVEIS.map((opcao) => (
          <option key={opcao} value={opcao}>
            {NOME_DO_PERFIL[opcao]}
          </option>
        ))}
      </Selecao>
      {daInstituicao && perfil && (
        <fieldset className="grid gap-4">
          <legend className="mb-1 text-corpo font-medium text-corpo-alerta">Hospitais em que atua</legend>
          {vinculos.map((vinculo, indice) => (
            <div key={indice} className="grid gap-2 rounded-controle border border-borda-divisoria p-3">
              <FormularioDeVinculo
                campos={vinculo}
                perfis={[perfil]}
                instituicoes={instituicoes}
                erros={erros.vinculos?.[indice]}
                aoMudar={(campos) => {
                  setVinculos((atuais) => atuais.map((atual, i) => (i === indice ? campos : atual)))
                  setErros((atuais) => ({ ...atuais, vinculos: undefined }))
                }}
              />
              {vinculos.length > 1 && (
                <div>
                  <Botao variante="texto" onClick={() => setVinculos((atuais) => atuais.filter((_, i) => i !== indice))}>
                    Remover este hospital
                  </Botao>
                </div>
              )}
            </div>
          ))}
          <div>
            <Botao variante="secundario" icone={Plus} onClick={() => setVinculos((atuais) => [...atuais, VINCULO_VAZIO])}>
              Adicionar outro hospital
            </Botao>
          </div>
        </fieldset>
      )}
      <p className="text-corpo text-texto-suave">
        O sistema gera uma senha temporária e mostra uma única vez. No primeiro acesso, a pessoa escolhe a própria senha.
      </p>
      <RegiaoDeAlerta>
        {envio.erro && (
          <Alerta tom="erro" anunciar={false} titulo="O usuário não foi criado">
            {envio.erro}
          </Alerta>
        )}
      </RegiaoDeAlerta>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="secundario" onClick={aoCancelar} disabled={envio.enviando}>
          Cancelar
        </Botao>
        <Botao type="submit" icone={UserPlus} carregando={envio.enviando} textoCarregando="Criando…">
          Criar usuário
        </Botao>
      </div>
    </form>
  )
}
