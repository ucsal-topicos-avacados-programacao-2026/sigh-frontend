import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

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
