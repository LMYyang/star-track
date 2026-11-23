import { describe, it, expect } from 'vitest'
import {
  emptyProgress, loadProgress, saveProgress, recordWin, recordAttempt,
  isUnlocked, starOf, chapterStars, resetProgress,
} from '../src/core/star/progress.js'
import { memStorage } from './helpers.js'

describe('progress / 存取', () => {
  it('空存档返回默认值', () => {
    const p = loadProgress(memStorage(null))
    expect(p).toEqual(emptyProgress())
  })

  it('脏存档被修复成合法结构', () => {
    const p = loadProgress(memStorage({ cleared: -3, stars: { 1: 9, 2: 'x', abc: 3, 3: 2 }, plays: 'no' }))
    expect(p.cleared).toBe(0)
    expect(p.stars).toEqual({ 3: 2 })
    expect(p.totalStars).toBe(2)
    expect(p.plays).toBe(0)
  })

  it('存 → 读 一致', () => {
    const st = memStorage()
    const p = recordWin(emptyProgress(), { levelNo: 3, star: 2 })
    saveProgress(p, st)
    expect(loadProgress(st)).toEqual(p)
  })

  it('reset 清空', () => {
    const st = memStorage()
    saveProgress(recordWin(emptyProgress(), { levelNo: 5, star: 3 }), st)
    expect(resetProgress(st)).toEqual(emptyProgress())
    expect(loadProgress(st).cleared).toBe(0)
  })
})

describe('progress / 通关记账', () => {
  it('通关推进解锁，但 cleared 不回退', () => {
    let p = recordWin(emptyProgress(), { levelNo: 1, star: 3 })
    expect(p.cleared).toBe(1)
    p = recordWin(p, { levelNo: 1, star: 2 })
    expect(p.cleared).toBe(1)
    p = recordWin(p, { levelNo: 4, star: 1 })
    expect(p.cleared).toBe(4)
  })

  it('星级取历史最高，不降级', () => {
    let p = recordWin(emptyProgress(), { levelNo: 2, star: 3 })
    p = recordWin(p, { levelNo: 2, star: 1 })
    expect(starOf(p, 2)).toBe(3)
    expect(p.totalStars).toBe(3)
  })

  it('attempt 累加局数', () => {
    const p = recordAttempt(recordAttempt(emptyProgress()))
    expect(p.plays).toBe(2)
  })

  it('章节星数累加', () => {
    const p = { ...emptyProgress(), stars: { 1: 3, 2: 2, 3: 1 } }
    expect(chapterStars(p, [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }])).toBe(6)
  })
})

describe('progress / 解锁', () => {
  it('第 1 关永远可玩', () => {
    expect(isUnlocked(emptyProgress(), 1)).toBe(true)
  })
  it('第 2 关需要第 1 关通关', () => {
    expect(isUnlocked(emptyProgress(), 2)).toBe(false)
    expect(isUnlocked(recordWin(emptyProgress(), { levelNo: 1, star: 1 }), 2)).toBe(true)
  })
  it('第 40 关需要 cleared ≥ 39', () => {
    expect(isUnlocked({ ...emptyProgress(), cleared: 38 }, 40)).toBe(false)
    expect(isUnlocked({ ...emptyProgress(), cleared: 39 }, 40)).toBe(true)
  })
})
