// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DirectionPad from '../src/components/star/DirectionPad.vue'
import StarBoard from '../src/components/star/StarBoard.vue'

// 组件层测试：补上「纯逻辑单测」覆盖不到的事件链路。
// 关键回归点：方向盘必须真的 emit change（game 页曾因 setDir 未接线而点击无反应）。

const SIZE = 500
const PAD = SIZE * 0.07 // 35
const STEP = (SIZE - PAD * 2) / 4 // 107.5（board=5 → 4 段）

const LEVEL_V = {
  id: 2,
  name: '初辉',
  board: 5,
  arrows: false,
  sym: { type: 'v', hx: 4 },
  axisCells: new Set(['2,0', '2,1', '2,2', '2,3', '2,4']),
  sources: [[0, 4], [1, 1]],
  strays: [],
}

function installUni() {
  globalThis.uni = {
    getStorageSync: () => '',
    setStorageSync: () => {},
    removeStorageSync: () => {},
    getSystemInfoSync: () => ({ windowWidth: SIZE, windowHeight: SIZE }),
    // 这里的 rect 用可变变量，模拟「窗口缩放后 DOM 位置真的变了」
    createSelectorQuery: () => ({
      in() { return this },
      select() { return this },
      boundingClientRect(cb) {
        cb({ ...RECT })
        return this
      },
      exec() {},
    }),
  }
}

const tapAt = (wrapper, cx, cy) => wrapper.find('.board').trigger('tap', { touches: [{ clientX: cx, clientY: cy }] })
const cellPx = (gx, gy) => [PAD + gx * STEP, PAD + gy * STEP]

let RECT = { left: 0, top: 0, width: SIZE, height: SIZE }

beforeEach(() => {
  RECT = { left: 0, top: 0, width: SIZE, height: SIZE }
  installUni()
})

describe('DirectionPad', () => {
  it('点 R 键 emit change(R)，选中态跟随 props', async () => {
    const w = mount(DirectionPad, { props: { dir: 'U' } })
    const keys = w.findAll('.key')
    expect(keys.length).toBe(4)
    // 生产构建里 uni 会把 @tap 编译成 click，这里用未经 uni 编译的原始事件名触发
    await keys[1].trigger('tap')
    expect(w.emitted('change')).toEqual([['R']])
  })

  it('选中态由 dir 决定（不是自己记住状态）', async () => {
    const w = mount(DirectionPad, { props: { dir: 'U' } })
    expect(w.findAll('.key')[0].classes()).toContain('on')
    await w.setProps({ dir: 'L' })
    expect(w.findAll('.key')[0].classes()).not.toContain('on')
    expect(w.findAll('.key')[3].classes()).toContain('on')
  })
})

describe('StarBoard', () => {
  it('落在格点上时 emit point，带格坐标', async () => {
    const w = mount(StarBoard, { props: { level: LEVEL_V, size: SIZE } })
    const [x, y] = cellPx(0, 4)
    await tapAt(w, x, y)
    expect(w.emitted('point')).toEqual([[{ x: 0, y: 4 }]])
  })

  it('落在轴格上时 emit reject（不 emit point）', async () => {
    const w = mount(StarBoard, { props: { level: LEVEL_V, size: SIZE } })
    const [x, y] = cellPx(2, 1)
    await tapAt(w, x, y)
    expect(w.emitted('reject')).toEqual([[{ x: 2, y: 1, reason: 'AXIS_CELL' }]])
    expect(w.emitted('point')).toBeUndefined()
  })

  it('落在格子死角（距最近格点 > 0.6）时忽略点击', async () => {
    const w = mount(StarBoard, { props: { level: LEVEL_V, size: SIZE } })
    const [x, y] = cellPx(2, 2)
    await tapAt(w, x + STEP * 0.55, y + STEP * 0.55)
    expect(w.emitted('point')).toBeUndefined()
  })

  it('disabled 时任何点击都不响应', async () => {
    const w = mount(StarBoard, { props: { level: LEVEL_V, size: SIZE, disabled: true } })
    const [x, y] = cellPx(4, 4)
    await tapAt(w, x, y)
    expect(w.emitted('point')).toBeUndefined()
    expect(w.emitted('reject')).toBeUndefined()
  })

  it('箭头关按 dir 画不同朝向的箭头', () => {
    const level = { ...LEVEL_V, arrows: true, sources: [[0, 4, 'R']] }
    const w = mount(StarBoard, { props: { level, size: SIZE, placed: [[4, 4, 'D']] } })
    const arrows = w.findAll('.arrow')
    expect(arrows.length).toBe(2)
    expect(arrows[0].attributes('style')).toContain('rotate(90deg)')
    expect(arrows[1].attributes('style')).toContain('rotate(180deg)')
  })

  it('残星与源星形状可区分（空心环 vs 实心四芒）', () => {
    const level = { ...LEVEL_V, strays: [[1, 3]] }
    const w = mount(StarBoard, { props: { level, size: SIZE } })
    expect(w.findAll('.stray').length).toBe(1)
    expect(w.findAll('.stray-core').length).toBe(1)
    expect(w.findAll('.star.source').length).toBe(2)
    expect(w.findAll('.star.source .bar').length).toBe(4)
  })

  it('尺寸变化后按新几何重新测量（浏览器缩放 / 平板旋转）', async () => {
    const w = mount(StarBoard, { props: { level: LEVEL_V, size: 500 } })
    // 先确认旧几何能命中
    await tapAt(w, ...cellPx(4, 4))
    expect(w.emitted('point')).toEqual([[{ x: 4, y: 4 }]])

    // 模拟窗口缩小：DOM 位置与尺寸都变了，size 跟着变
    const newSize = 335
    RECT = { left: 20, top: 10, width: newSize, height: newSize }
    await w.setProps({ size: newSize })
    await nextTick()

    const pad2 = newSize * 0.07
    const step2 = (newSize - pad2 * 2) / 4
    await tapAt(w, 20 + pad2 + 4 * step2, 10 + pad2 + 4 * step2)
    // 第二次点击也必须命中，而不是因为 rect 过期落到界外
    expect(w.emitted('point').at(-1)).toEqual([{ x: 4, y: 4 }])
  })
})
