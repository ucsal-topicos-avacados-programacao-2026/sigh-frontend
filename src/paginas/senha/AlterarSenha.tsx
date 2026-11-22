import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { alterarSenha } from '@/api/auth'
import { useEnvio } from '@/api/useEnvio'
import { Alerta, RegiaoDeAlerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { CampoSenha } from '@/componentes/Campo'
import { Painel } from '@/componentes/Painel'
import { useToast } from '@/componentes/Toast'
import { TituloPagina } from '@/componentes/TituloPagina'
import { erroDaNovaSenha } from '@/paginas/senha/regrasDeSenha'

export function AlterarSenha() {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erroAtual, setErroAtual] = useState<string>()
  const [erroNova, setErroNova] = useState<string>()
  const envio = useEnvio()
  const { avisar } = useToast()

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const semAtual = atual ? undefined : 'Digite a sua senha atual.'
    const problema = erroDaNovaSenha(nova, confirmacao)
    setErroAtual(semAtual)
    setErroNova(problema)
    if (semAtual || problema) return
    const ok = await envio.enviar(() => alterarSenha(atual, nova))
    if (ok) {
      setAtual('')
      setNova('')
      setConfirmacao('')
      avisar('Senha alterada.')
    }
  }

  return (
    <>
      <TituloPagina titulo="Alterar senha" trilha="Minha conta" subtitulo="Troque a sua senha. As outras sessões continuam até expirar." />
      <div className="max-w-xl">
        <Painel titulo="Trocar a senha">
          <form onSubmit={enviar} noValidate className="grid gap-4">
            <CampoSenha
              rotulo="Senha atual"
              autoComplete="current-password"
              value={atual}
              onChange={(e) => {
                setAtual(e.target.value)
                setErroAtual(undefined)
              }}
              erro={erroAtual}
            />
            <CampoSenha
              rotulo="Nova senha"
              ajuda="De 10 a 72 caracteres, com letras e números."
              autoComplete="new-password"
              value={nova}
              onChange={(e) => {
                setNova(e.target.value)
                setErroNova(undefined)
              }}
              erro={erroNova}
            />
            <CampoSenha
              rotulo="Repita a nova senha"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => {
                setConfirmacao(e.target.value)
                setErroNova(undefined)
              }}
            />
            <RegiaoDeAlerta>
              {envio.erro && (
                <Alerta tom="erro" anunciar={false} titulo="A senha não foi alterada">
                  {envio.erro}
                </Alerta>
              )}
            </RegiaoDeAlerta>
            <div>
              <Botao type="submit" icone={KeyRound} carregando={envio.enviando} textoCarregando="Salvando…">
                Alterar senha
              </Botao>
            </div>
          </form>
        </Painel>
      </div>
    </>
  )
}
