import { Copy } from 'lucide-react'
import { useState } from 'react'
import { Alerta } from '@/componentes/Alerta'
import { Botao } from '@/componentes/Botao'
import { Dialogo } from '@/componentes/Dialogo'

export interface SenhaParaMostrar {
  login: string
  senha: string
}

export function DialogoDeSenhaTemporaria({ senha, aoFechar }: { senha: SenhaParaMostrar | null; aoFechar: () => void }) {
  const [copiaFalhou, setCopiaFalhou] = useState(false)
  const [copiada, setCopiada] = useState(false)

  async function copiar() {
    if (!senha) return
    try {
      await navigator.clipboard.writeText(senha.senha)
      setCopiada(true)
      setCopiaFalhou(false)
    } catch {
      setCopiaFalhou(true)
    }
  }

  return (
    <Dialogo
      aberto={senha !== null}
      titulo="Senha temporária"
      descricao={senha ? `Entregue a senha ao usuário ${senha.login}. Ela só aparece agora e vale até o primeiro login, quando ele escolhe a própria senha.` : undefined}
      aoFechar={aoFechar}
    >
      {senha && (
        <div className="grid gap-4">
          <p className="rounded-controle bg-superficie-suave p-4 text-center font-mono text-titulo-secao font-semibold tracking-wider text-texto-forte select-all" aria-label="Senha temporária">
            {senha.senha}
          </p>
          {copiaFalhou && (
            <Alerta tom="atencao" titulo="Não foi possível copiar">
              Selecione a senha acima e copie à mão.
            </Alerta>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao variante="secundario" icone={Copy} onClick={() => void copiar()}>
              {copiada ? 'Senha copiada' : 'Copiar senha'}
            </Botao>
            <Botao onClick={aoFechar}>Já anotei, fechar</Botao>
          </div>
        </div>
      )}
    </Dialogo>
  )
}
