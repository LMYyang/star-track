import { beforeEach, describe, expect, it } from 'vitest'
import { useStar } from '../src/composables/useStar.js'
import { STAR, LEVELS } from '../src/core/star/levelData.js'

// 全量通关演练：用真实状态机把每关的目标点逐颗落下再提交。
// 覆盖斜轴、中心、双轴、残星、箭头、旋转与暗域各章，替代手动点击的冒烟测试。

const store = new Map()

beforeEach(() => {
  store.clear()
  globalThis.uni = {
    getStorageSync: (k) => (store.has(k) ? store.get(k) : ''),
    setStorageSync: (k, v) => { store.set(k, v) },
    removeStorageSync: (k) => { store.delete(k) },
    getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667 }),
  }
})

describe('全量通关演练', () => {
  it('关卡数据装载为 64 关、十章', () => {
    expect(LEVELS.length).toBe(64)
    expect(STAR.chapters.length).toBe(10)
  })

  it.each(LEVELS.map((l) => [l.id, l]))('第 %i 关：照目标集落点即可三星通关', (id, lv) => {
    const s = useStar(lv)
    s.markEntered()

    for (const entry of lv.targets.values()) {
      const p = entry.p
      if (lv.arrows) s.setDir(p[2])
      expect(s.tap({ x: p[0], y: p[1] })).not.toBe('reject')
    }

    expect(s.placedCount.value).toBe(lv.targetCount)
    const r = s.submit()
    expect(r, `第 ${id} 关提交无返回`).toBeTruthy()
    expect(r.pass).toBe(true)
    expect(r.star).toBe(3)
    expect(r.deviations).toBe(0)
  })

  it('落错点会失败，清空后可重来', () => {
    const lv = LEVELS.find((l) => l.targetCount >= 1)
    const s = useStar(lv)
    s.markEntered()
    // 找一个既不是目标、也不是轴格的空点
    let wrong = null
    for (let x = 0; x < lv.board && !wrong; x++) {
      for (let y = 0; y < lv.board && !wrong; y++) {
        const k = `${x},${y}`
        if (!lv.targets.has(k) && !lv.axisCells.has(k) && !lv.blockedCells.has(k)) wrong = { x, y }
      }
    }
    expect(wrong).toBeTruthy()
    s.tap(wrong)
    expect(s.submit().pass).toBe(false)
    s.clear()
    expect(s.placedCount.value).toBe(0)
    s.retry()
    expect(s.state.placed.length).toBe(0)
    expect(s.state.mistakes).toBe(0)
  })

  it('暗域格点：落星被拒绝，也不会被算成偏差', () => {
    const lv = LEVELS.find((l) => l.blockedList.length > 0)
    const s = useStar(lv)
    const b = lv.blockedList[0]
    expect(s.tap({ x: b[0], y: b[1] })).toMatchObject({ ok: false, reason: 'BLOCKED' })
    expect(s.placedCount.value).toBe(0)
  })

  it('提示给出的点一定是缺口里的目标点', () => {
    for (const lv of LEVELS) {
      const s = useStar(lv)
      s.markEntered()
      // 只补一个目标，剩下都是缺口
      const first = [...lv.targets.values()][0].p
      if (lv.arrows) s.setDir(first[2])
      s.tap({ x: first[0], y: first[1] })
      const h = s.hint()
      expect(h, `第 ${lv.id} 关提示为空`).toBeTruthy()
      const k = h.point.length === 3 ? h.point.join(',') : `${h.point[0]},${h.point[1]}`
      expect(lv.targets.has(k), `第 ${lv.id} 关提示点 ${k} 不在目标集`).toBe(true)
      expect(s.placedCount.value).toBe(1)
    }
  })
})
