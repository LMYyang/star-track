// 音效合成器：零依赖手写 WAV（44 字节头 + PCM16 单声道 22050Hz）。
// 运行 node scripts/gen-sounds.mjs 产出音效到 src/static/sounds/（产物已提交，仅调音色时重跑）。
// 噪声源用种子 rng：产物逐字节可复现，重跑不产生 diff。
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'src', 'static', 'sounds')
const SR = 22050

function toWav(samples) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2)
  }
  return buf
}

const sec = (s) => Math.round(s * SR)
const silence = (s) => new Float32Array(sec(s))

function mix(dst, src, at = 0) {
  const off = sec(at)
  for (let i = 0; i < src.length && off + i < dst.length; i++) dst[off + i] += src[i]
  return dst
}

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 正弦滑频敲击 */
function tone(f0, f1, dur, tau, amp) {
  const n = sec(dur)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const f = f0 + (f1 - f0) * (t / dur)
    phase += (2 * Math.PI * f) / SR
    out[i] = Math.sin(phase) * amp * Math.exp(-i / SR / tau)
  }
  return out
}

/** 星光质感音符：基频 + 二三次谐波，快 attack、指数尾 */
function pluck(f, dur, amp, seed = 1) {
  const n = sec(dur)
  const out = new Float32Array(n)
  const r = rng(seed)
  const p2 = r() * Math.PI * 2
  const p3 = r() * Math.PI * 2
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const ph = 2 * Math.PI * f * t
    const env = Math.min(1, t / 0.008) * Math.exp(-t / (dur / 4))
    out[i] = (Math.sin(ph) * 0.7 + Math.sin(2 * ph + p2) * 0.22 + Math.sin(3 * ph + p3) * 0.1) * amp * env
  }
  return out
}

const sounds = {}

// 点击按钮：轻短高频滴声
{
  const out = silence(0.09)
  mix(out, tone(1180, 880, 0.055, 0.018, 0.4))
  sounds.tap = out
}
// 落点：木质星粒归位（清脆上行短音）
{
  const out = silence(0.16)
  mix(out, tone(520, 760, 0.07, 0.02, 0.42))
  mix(out, pluck(1310, 0.1, 0.22, 3), 0.01)
  sounds.place = out
}
// 移除：低一档的下行
{
  const out = silence(0.15)
  mix(out, tone(700, 460, 0.07, 0.02, 0.36))
  sounds.remove = out
}
// 清空：三连短促下行
{
  const out = silence(0.45)
  mix(out, pluck(880, 0.1, 0.3, 11), 0)
  mix(out, pluck(660, 0.1, 0.3, 12), 0.1)
  mix(out, pluck(494, 0.16, 0.32, 13), 0.2)
  sounds.clear = out
}
// 未通过（还有次数）：柔和的双音「不是这里」
{
  const out = silence(0.4)
  mix(out, tone(880, 840, 0.1, 0.05, 0.25))
  mix(out, tone(660, 620, 0.18, 0.1, 0.3), 0.14)
  sounds.pass = out
}
// 失败：低柔下行五度
{
  const out = silence(0.7)
  mix(out, tone(420, 400, 0.22, 0.09, 0.3))
  mix(out, tone(280, 250, 0.42, 0.16, 0.42), 0.2)
  sounds.fail = out
}
// 提示：星光闪烁（高频琶音 + 泛音尾巴）
{
  const out = silence(0.55)
  mix(out, pluck(1568, 0.14, 0.45, 21), 0)
  mix(out, pluck(2093, 0.2, 0.35, 22), 0.1)
  mix(out, tone(3200, 3800, 0.14, 0.05, 0.1), 0.08)
  sounds.hint = out
}
// 通关：上行琶音
{
  const out = silence(0.95)
  mix(out, pluck(659.25, 0.18, 0.55, 31), 0)
  mix(out, pluck(783.99, 0.18, 0.55, 32), 0.11)
  mix(out, pluck(987.77, 0.18, 0.6, 33), 0.22)
  mix(out, pluck(1318.51, 0.42, 0.7, 34), 0.22)
  sounds.win = out
}

mkdirSync(OUT, { recursive: true })
for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(join(OUT, `${name}.wav`), toWav(samples))
  console.log(`[gen:sounds] ${name}.wav`)
}
console.log(`[gen:sounds] 完成，输出目录 ${OUT}`)
