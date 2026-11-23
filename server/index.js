// 星轨对位服务器：单人玩法只负责「托管 H5 构建产物」+ 预留 ws 骨架。
// 与顶牛子同构：同端口静态托管 + SPA 回退 + 心跳 + 64KB 帧上限，便于日后接每日挑战/双人竞速。
import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { readPort } from './port.js'

const HEARTBEAT_MS = 15_000

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export function createServerApp(port = readPort(), { heartbeatMs = HEARTBEAT_MS } = {}) {
  const staticDir = process.env.STATIC_DIR
    ? path.resolve(process.env.STATIC_DIR)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/build/h5')

  let staticReady = null
  const httpServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      if (url.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true, service: 'star-track', time: Date.now() }))
        return
      }

      let pathname = decodeURIComponent(url.pathname)
      if (pathname.includes('..')) { res.writeHead(403).end(); return } // 防目录穿越
      if (pathname === '/') pathname = '/index.html'
      const file = path.join(staticDir, pathname)
      if (!file.startsWith(staticDir)) { res.writeHead(403).end(); return }

      staticReady ||= fs.readdir(staticDir).then(() => true, () => false)
      if (!(await staticReady)) {
        res.writeHead(426).end('WebSocket only（未找到 dist/build/h5，请先 npm run build:h5）')
        return
      }

      const data = await fs.readFile(file).catch(() => null)
      if (data === null) {
        // SPA 路由回退：任何非资源路径都回 index.html
        const index = await fs.readFile(path.join(staticDir, 'index.html')).catch(() => null)
        if (index === null) { res.writeHead(404).end('Not Found'); return }
        res.writeHead(200, { 'Content-Type': TYPES['.html'] }).end(index)
        return
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' }).end(data)
    } catch (e) {
      console.error('[server] static error:', e.message)
      res.writeHead(500).end()
    }
  })

  const wss = new WebSocketServer({ server: httpServer, maxPayload: 64 * 1024 })

  wss.on('connection', (socket) => {
    const conn = {
      alive: true,
      send(obj) { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(obj)) },
    }
    conn.send({ type: 'hello', payload: { service: 'star-track', ts: Date.now() } })

    socket.on('error', (err) => console.error('[server] socket error:', err.message))
    socket.on('pong', () => { conn.alive = true })
    socket.on('message', (raw) => {
      conn.alive = true
      let msg
      try { msg = JSON.parse(raw.toString()) } catch {
        conn.send({ type: 'error', payload: { code: 'BAD_JSON', message: '消息格式错误' } })
        return
      }
      const { type, requestId, payload } = msg || {}
      const reply = (t, p) => conn.send({ type: t, payload: p, ...(requestId ? { requestId } : {}) })
      switch (type) {
        case 'health':
          return reply('health.ok', { ok: true, ts: Date.now(), echo: payload?.echo ?? null })
        default:
          return reply('error', { code: 'UNKNOWN_TYPE', message: `未知消息类型: ${type}` })
      }
    })

    const beat = setInterval(() => {
      if (socket.readyState !== socket.OPEN) { clearInterval(beat); return }
      if (!conn.alive) { clearInterval(beat); socket.terminate(); return }
      conn.alive = false
      try { socket.ping() } catch { /* readyState 竞态：下一轮再判 */ }
    }, heartbeatMs)
    beat.unref?.()

    socket.on('close', () => clearInterval(beat))
  })

  return { httpServer, wss, port }
}

// 直接运行时启动（被 import 时不启动）
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (entry && entry === import.meta.url) {
  const app = createServerApp(Number(process.env.PORT || readPort()))
  app.httpServer.listen(app.port, () => {
    console.log(`[star-track] server listening on :${app.port}`)
  })
}
