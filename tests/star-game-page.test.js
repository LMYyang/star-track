// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// 集成测试：挂载 game 页，真点「方向盘 / 撤销 / 清空 / 提交」。
// 这一层专门守「模板写了 handler 但脚本没定义」这类纯逻辑单测测不到的断线。

let onLoadCb = null
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (cb) => { onLoadCb = cb },
  onShow: () => {},
  onUnload: () => {},
  onHide: () => {},
}))

import Game from '../src/pages/star/game.vue'
import DirectionPad from '../src/components/star/DirectionPad.vue'
import StarBoard from '../src/components/star/StarBoard.vue'
import BottomBar from '../src/components/star/BottomBar.vue'

const store = new Map()

beforeEach(() => {
  onLoadCb = null
  store.clear()
  globalThis.uni = {
    getStorageSync: (k) => (store.has(k) ? store.get(k) : ''),
    setStorageSync: (k, v) => { store.set(k, v) },
    removeStorageSync: (k) => { store.delete(k) },
    getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667 }),
    onWindowResize: () => {},
    createSelectorQuery: () => ({
      in() { return this },
      select() { return this },
      boundingClientRect(cb) { cb({ left: 0, top: 0, width: 335, height: 335 }); return this },
      exec() {},
    }),
    navigateBack: vi.fn(),
    navigateTo: vi.fn(),
    redirectTo: vi.fn(),
    reLaunch: vi.fn(),
    showModal: vi.fn(),
  }
})

async function mountGame(levelId) {
  const w = mount(Game)
  expect(typeof onLoadCb).toBe('function')
  onLoadCb({ id: String(levelId) })
  await nextTick()
  await nextTick()
  return w
}

describe('game 页事件接线', () => {
  it('打开箭头关：方向盘在场，且切换方向真的改了状态', async () => {
    const w = await mountGame(37)
    expect(w.text()).toContain('第 37 关')
    const pad = w.findComponent(DirectionPad)
    expect(pad.exists()).toBe(true)

    // 默认 U 选中
    expect(w.find('.key.on').text()).toBe('U')

    pad.vm.$emit('change', 'L')
    await nextTick()
    expect(w.find('.key.on').text()).toBe('L')

    pad.vm.$emit('change', 'D')
    await nextTick()
    expect(w.find('.key.on').text()).toBe('D')
  })

  it('落星 → 撤销 → 清空，计数与按钮都跟着走', async () => {
    const w = await mountGame(37)
    const board = w.findComponent(StarBoard)
    const bar = w.findComponent(BottomBar)

    board.vm.$emit('point', { x: 4, y: 5 })
    await nextTick()
    expect(w.text()).toContain('已补 1 / 需 4')

    bar.vm.$emit('undo')
    await nextTick()
    expect(w.text()).toContain('已补 0 / 需 4')

    board.vm.$emit('point', { x: 4, y: 5 })
    board.vm.$emit('point', { x: 6, y: 3 })
    await nextTick()
    expect(w.text()).toContain('已补 2 / 需 4')

    bar.vm.$emit('clear')
    await nextTick()
    expect(w.text()).toContain('已补 0 / 需 4')
  })

  it('点轴格给出提示，空盘提交被拦下', async () => {
    const w = await mountGame(37)
    const board = w.findComponent(StarBoard)
    board.vm.$emit('reject', { x: 3, y: 0, reason: 'AXIS_CELL' })
    await nextTick()
    expect(w.text()).toContain('轴上的格点不能落星')

    w.findComponent(BottomBar).vm.$emit('submit')
    await nextTick()
    expect(w.text()).toContain('至少先补一颗星')
  })

  it('补齐四点提交 → 通关弹层与三星', async () => {
    const w = await mountGame(37)
    const board = w.findComponent(StarBoard)
    const pad = w.findComponent(DirectionPad)
    for (const [x, y, d] of [[4, 5, 'R'], [6, 3, 'L'], [6, 1, 'U'], [6, 6, 'D']]) {
      pad.vm.$emit('change', d)
      await nextTick()
      board.vm.$emit('point', { x, y })
      await nextTick()
    }
    expect(w.text()).toContain('已补 4 / 需 4')

    w.findComponent(BottomBar).vm.$emit('submit')
    await nextTick()
    await nextTick()
    expect(w.text()).toContain('星轨对齐')
    expect(w.text()).toContain('三星归位')
  })

  it('进度落盘：通关后再挂载仍记得星级', async () => {
    const w = await mountGame(37)
    const board = w.findComponent(StarBoard)
    const pad = w.findComponent(DirectionPad)
    for (const [x, y, d] of [[4, 5, 'R'], [6, 3, 'L'], [6, 1, 'U'], [6, 6, 'D']]) {
      pad.vm.$emit('change', d)
      await nextTick()
      board.vm.$emit('point', { x, y })
      await nextTick()
    }
    w.findComponent(BottomBar).vm.$emit('submit')
    await nextTick()
    await nextTick()

    const raw = store.get('startrack_progress_v1')
    expect(raw && raw.stars && raw.stars[37]).toBe(3)
  })
})
