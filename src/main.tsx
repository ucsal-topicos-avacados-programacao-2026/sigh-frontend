import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from '@/App'
import { SessaoProvider } from '@/auth/SessaoProvider'
import { ProvedorDeToast } from '@/componentes/Toast'
// Fonte embutida no app (os arquivos do Google Fonts, pelo @fontsource): o navegador não chama o Google.
import '@fontsource-variable/plus-jakarta-sans'
import '@/estilos/index.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado')

createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter>
      <SessaoProvider>
        <ProvedorDeToast>
          <App />
        </ProvedorDeToast>
      </SessaoProvider>
    </BrowserRouter>
  </StrictMode>,
)
