// 音效单例：实例池（懒创建常驻复用）+ <50ms 防重入 + 静音持久化。
// 所有 uni 音频 API 包 try-catch：音频失败静默，绝不影响游戏逻辑。
import { ref } from 'vue'

const NAMES = ['tap', 'place', 'remove', 'clear', 'pass', 'fail', 'hint', 'win']
const MUTE_KEY = 'startrack_muted'

let ctxPool = null
let lastPlayAt = {}
let muted = null // ref，懒初始化（_resetForTest 后重读 storage）

export function _resetForTest() {
  ctxPool = null
  lastPlayAt = {}
  muted = null
}

function getCtx(name) {
  if (!ctxPool) ctxPool = {}
  if (!ctxPool[name]) {
    const ctx = uni.createInnerAudioContext()
    ctx.src = `/static/sounds/${name}.wav`
    ctx.onError?.(() => {})
    ctxPool[name] = ctx
  }
  return ctxPool[name]
}

export function useSound() {
  if (muted === null) {
    let stored = ''
    try { stored = uni.getStorageSync(MUTE_KEY) } catch { stored = '' }
    // 首启默认静音（避免浏览器自动播放策略报错）；只有玩家主动开启过（存 false）才出声
    muted = ref(stored === '' || stored === null || stored === undefined ? true : stored === true)
  }

  /** 播放音效。name ∈ NAMES；<50ms 同名重复忽略；muted 短路；异常静默 */
  function play(name) {
    if (muted.value || !NAMES.includes(name)) return
    const now = Date.now()
    if (lastPlayAt[name] && now - lastPlayAt[name] < 50) return
    lastPlayAt[name] = now
    try {
      const ctx = getCtx(name)
      if (ctx.paused === false) ctx.stop?.()
      const p = ctx.play()
      // play() 在 H5 返回 Promise，被 stop 打断时会产生 AbortError：吞掉，避免控制台噪音
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch { /* 音频不可用：静默 */ }
  }

  /** 切换静音并持久化 */
  function toggleMute() {
    muted.value = !muted.value
    try { uni.setStorageSync(MUTE_KEY, muted.value) } catch { /* 存储不可用 */ }
    return muted.value
  }

  return { play, muted, toggleMute, NAMES }
}
