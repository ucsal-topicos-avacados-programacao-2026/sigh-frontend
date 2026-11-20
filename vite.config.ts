import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * O front roda em HTTPS quando SIGH_FRONT_CERTIFICADO e SIGH_FRONT_CHAVE apontam para um par PEM (por exemplo,
 * gerado pelo mkcert para localhost). Em HTTPS, a API com HSTS não quebra o front (veja o README).
 */
function https(ambiente: Record<string, string>) {
  const certificado = ambiente.SIGH_FRONT_CERTIFICADO
  const chave = ambiente.SIGH_FRONT_CHAVE
  return certificado && chave ? { cert: readFileSync(certificado), key: readFileSync(chave) } : undefined
}

export default defineConfig(({ mode }) => {
  const ambiente = { ...process.env, ...loadEnv(mode, process.cwd(), '') } as Record<string, string>
  const api = ambiente.VITE_API_URL ?? ''
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { https: https(ambiente) },
    preview: {
      https: https(ambiente),
      // Só no build: o servidor de desenvolvimento precisa de script inline para o recarregamento do React.
      headers: {
        'Content-Security-Policy': `default-src 'self'; connect-src 'self' ${api}; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/testes/preparar.ts'],
      css: false,
    },
  }
})
