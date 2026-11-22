import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { adicionarVinculo, encerrarVinculo } from '@/api/usuarios'
import { useEnvio } from '@/api/useEnvio'
import type { InstituicaoDaRede, Perfil, UsuarioDetalhe, VinculoDoUsuario } from '@/api/tipos'
import { NOME_DO_PERFIL } from '@/api/tipos'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { Dialogo } from '@/componentes/Dialogo'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Tabela, type Coluna } from '@/componentes/Tabela'
import { FormularioDeVinculo } from '@/paginas/auditor/FormularioDeVinculo'
import { exigeRegistro, VINCULO_VAZIO, type CamposDoVinculo } from '@/paginas/auditor/vinculos'
import { PERFIS_DE_INSTITUICAO } from '@/paginas/auditor/textosDeUsuarios'
import { formatarData } from '@/util/datas'

export function DialogoDeVinculos({ usuario, instituicoes, aoFechar, aoAtualizar }: {
  usuario: UsuarioDetalhe | null
  instituicoes: InstituicaoDaRede[]
  aoFechar: () => void
  aoAtualizar: (usuario: UsuarioDetalhe) => void
}) {
  return (
    <Dialogo aberto={usuario !== null} titulo={usuario ? `Vínculos de ${usuario.nome}` : 'Vínculos'} aoFechar={aoFechar}>
      {usuario && <Conteudo usuario={usuario} instituicoes={instituicoes} aoFechar={aoFechar} aoAtualizar={aoAtualizar} />}
    </Dialogo>
  )
}

function Conteudo({ usuario, instituicoes, aoFechar, aoAtualizar }: {
  usuario: UsuarioDetalhe
  instituicoes: InstituicaoDaRede[]
  aoFechar: () => void
  aoAtualizar: (usuario: UsuarioDetalhe) => void
}) {
  const perfisDeInstituicao = usuario.perfis.filter((perfil: Perfil) => PERFIS_DE_INSTITUICAO.includes(perfil))
  const [campos, setCampos] = useState<CamposDoVinculo>(VINCULO_VAZIO)
  const [erros, setErros] = useState<{ instituicaoId?: string; registro?: string }>()
  const envio = useEnvio()

  async function adicionar(evento: FormEvent) {
    evento.preventDefault()
    const novos: { instituicaoId?: string; registro?: string } = {}
    if (!campos.instituicaoId) novos.instituicaoId = 'Escolha o hospital.'
    if (exigeRegistro(perfisDeInstituicao) && !campos.registro.trim()) novos.registro = 'Informe o registro profissional.'
    setErros(novos)
    if (novos.instituicaoId || novos.registro) return
    let atualizado: UsuarioDetalhe | undefined
    const ok = await envio.enviar(async () => {
      atualizado = await adicionarVinculo(usuario.id, {
        instituicaoId: campos.instituicaoId,
        perfis: perfisDeInstituicao,
        registroProfissional: exigeRegistro(perfisDeInstituicao) ? campos.registro.trim() : undefined,
      })
    })
    if (ok && atualizado) {
      setCampos(VINCULO_VAZIO)
      aoAtualizar(atualizado)
    }
  }

  async function encerrar(vinculo: VinculoDoUsuario) {
    let atualizado: UsuarioDetalhe | undefined
    const ok = await envio.enviar(async () => {
      atualizado = await encerrarVinculo(usuario.id, vinculo.id)
    })
    if (ok && atualizado) aoAtualizar(atualizado)
  }

  const colunas: Coluna<VinculoDoUsuario>[] = [
    { titulo: 'Hospital', celula: (v) => <span className="font-medium">{v.instituicaoNome}</span> },
    { titulo: 'Perfis', celula: (v) => v.perfis.map((perfil) => NOME_DO_PERFIL[perfil]).join(', ') },
    { titulo: 'Registro', celula: (v) => v.registroProfissional ?? '—' },
    { titulo: 'Desde', celula: (v) => formatarData(v.inicioEm) },
    {
      titulo: 'Situação',
      celula: (v) =>
        v.ativo ? (
          <Botao variante="secundario" disabled={envio.enviando} onClick={() => void encerrar(v)} aria-label={`Encerrar vínculo com ${v.instituicaoNome}`}>
            Encerrar
          </Botao>
        ) : (
          <Etiqueta tom="neutro" texto={`Encerrado em ${formatarData(v.fimEm ?? v.inicioEm)}`} />
        ),
    },
  ]

  return (
    <div className="grid gap-5">
      <Tabela legenda="Vínculos do usuário" legendaOculta colunas={colunas} linhas={usuario.vinculos} chave={(v) => v.id} textoVazio="Nenhum vínculo." />
      {perfisDeInstituicao.length > 0 && (
        <form onSubmit={adicionar} noValidate className="grid gap-3">
          <FormularioDeVinculo
            campos={campos}
            perfis={perfisDeInstituicao}
            instituicoes={instituicoes}
            erros={erros}
            aoMudar={(novos) => {
              setCampos(novos)
              setErros(undefined)
            }}
          />
          <div>
            <Botao type="submit" icone={Plus} carregando={envio.enviando} textoCarregando="Adicionando…">
              Adicionar vínculo
            </Botao>
          </div>
        </form>
      )}
      <RegiaoDeAlerta>
        {envio.erro && (
          <Alerta tom="erro" anunciar={false} titulo="A alteração não foi feita">
            {envio.erro}
          </Alerta>
        )}
      </RegiaoDeAlerta>
      <div className="flex justify-end">
        <Botao variante="secundario" onClick={aoFechar}>
          Fechar
        </Botao>
      </div>
    </div>
  )
}
