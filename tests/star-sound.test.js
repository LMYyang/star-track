import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetForTest, useSound } from '../src/composables/useSound.js'

// 首启静音策略 + 持久化 toggle 的单测（stub 掉 uni 音频与 storage）

const store = new Map()
let created = 0

function installUni() {
  created = 0
  store.clear()
  globalThis.uni = {
    getStorageSync: (k) => (store.has(k) ? store.get(k) : ''),
    setStorageSync: (k, v) => { store.set(k, v) },
    removeStorageSync: (k) => { store.delete(k) },
    createInnerAudioContext: () => {
      created += 1
      return { src: '', paused: true, play: () => Promise.resolve(), stop: vi.fn(), onError: vi.fn() }
    },
  }
}

beforeEach(() => {
  installUni()
  _resetForTest()
})

afterEach(() => {
  delete globalThis.uni
})

describe('useSound', () => {
  it('首次进入默认静音（避免自动播放策略报错）', () => {
    const s = useSound()
    expect(s.muted.value).toBe(true)
    s.play('tap')
    expect(created).toBe(0)
  })

  it('toggle 后出声并落盘为 false', () => {
    const s = useSound()
    const now = s.toggleMute()
    expect(now).toBe(false)
    expect(store.get('startrack_muted')).toBe(false)

    _resetForTest() // 模拟重开页面
    const s2 = useSound()
    expect(s2.muted.value).toBe(false)
  })

  it('存档里是 true 时保持静音', () => {
    store.set('startrack_muted', true)
    const s = useSound()
    expect(s.muted.value).toBe(true)
  })

  it('未静音时同名音效 50ms 内只播一次', () => {
    store.set('startrack_muted', false)
    const s = useSound()
    s.play('tap')
    s.play('tap')
    expect(created).toBe(1)
  })

  it('未知音效名直接忽略', () => {
    store.set('startrack_muted', false)
    const s = useSound()
    s.play('nope')
    expect(created).toBe(0)
  })
})
