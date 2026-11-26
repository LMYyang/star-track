import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import raw from '../src/data/levels.v4.json'
import { hydrateLevels } from '../src/core/star/levels.js'
import golden from './fixtures/level-targets.golden.json'

// 目标集黄金快照：任何关卡数据 / 对称实现改动，只要影响了某一关的目标点，
// 这里就会逐关对出差异。改数据后确认差异合理，再跑 scripts/gen-golden.mjs 更新快照。

const { levels } = hydrateLevels(raw)

describe('全量目标集黄金快照', () => {
  it('关卡数量与快照一致', () => {
    expect(levels.length).toBe(golden.count)
    expect(golden.count).toBe(levels.length)
  })

  it.each(golden.levels.map((g) => [g.id, g]))('第 %i 关目标集不变', (id, g) => {
    const lv = levels.find((l) => l.id === id)
    expect(lv, `缺少第 ${id} 关`).toBeTruthy()
    expect(lv.board).toBe(g.board)
    expect(lv.sym.type).toBe(g.sym)
    expect(lv.arrows).toBe(g.arrows)
    expect([...lv.targets.keys()].sort()).toEqual(g.targets)
  })

  it('每关目标集大小与 targetCount 一致', () => {
    for (const lv of levels) {
      expect(lv.targets.size).toBe(lv.targetCount)
      expect(lv.targets.size).toBeGreaterThan(0)
    }
  })

  it('快照自身结构完整（无空目标关）', () => {
    for (const g of golden.levels) {
      expect(g.targets.length, `第 ${g.id} 关目标为空`).toBeGreaterThan(0)
      expect(new Set(g.targets).size).toBe(g.targets.length)
    }
  })
})
