import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.BLYNK_TOKEN || env.VITE_BLYNK_TOKEN

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'blynk-dev-api',
        configureServer(server) {
          server.middlewares.use('/api/blynk', async (req, res) => {
            try {
              const url = new URL(req.url ?? '', 'http://localhost')
              const pin = url.searchParams.get('pin')
              const status = url.searchParams.get('status')

              if (!token) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing BLYNK_TOKEN / VITE_BLYNK_TOKEN' }))
                return
              }

              // Hardware connection status (true/false).
              if (status === '1') {
                const upstream = await fetch(
                  `https://blynk.cloud/external/api/isHardwareConnected?token=${token}`,
                )
                const text = await upstream.text()
                res.statusCode = upstream.status
                res.setHeader('Content-Type', 'text/plain; charset=utf-8')
                res.end(text)
                return
              }

              if (!pin || !/^V\d+$/.test(pin)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid pin. Use ?pin=V0' }))
                return
              }

              const upstream = await fetch(
                `https://blynk.cloud/external/api/get?token=${token}&${pin}`,
              )
              const text = await upstream.text()

              res.statusCode = upstream.status
              res.setHeader('Content-Type', 'text/plain; charset=utf-8')
              res.end(text)
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Server error' }))
            }
          })
        },
      },
    ],
  }
})
