import { describe, it, expect } from 'vitest'
import { judge, judgeForUi, deriveTargets } from '../src/core/star/judge.js'
import { normalizeSym, axisCells } from '../src/core/star/symmetry.js'
import { RAW } from './helpers.js'

function levelOf(id) {
  const raw = RAW.levels.find((l) => l.id === id)
  const sym = normalizeSym(raw.sym)
  const lv = { ...raw, sym, axisCells: axisCells(sym, raw.board) }
  lv.targets = deriveTargets(lv, sym)
  return lv
}

describe('judge / 目标集推导', () => {
  it('L1 竖直镜像：两点补成 (4,4)(3,1)', () => {
    const lv = levelOf(1)
    expect([...lv.targets.keys()].sort()).toEqual(['3,1', '4,4'])
  })

  it('双轴关一点补三点（L25 共 9 个目标）', () => {
    const lv = levelOf(25)
    expect(lv.targets.size).toBe(9)
  })

  it('箭头关的目标键带方向（L37）', () => {
    const lv = levelOf(37)
    expect([...lv.targets.keys()].sort()).toEqual(['4,5,R', '6,1,U', '6,3,L', '6,6,D'])
  })

  it('目标集不含源点自身，也不含轴格', () => {
    for (const raw of RAW.levels) {
      const lv = levelOf(raw.id)
      const targetCoords = new Set([...lv.targets.values()].map(({ p }) => `${p[0]},${p[1]}`))
      for (const s of lv.sources) {
        expect(targetCoords.has(`${s[0]},${s[1]}`)).toBe(false)
      }
      for (const { p } of lv.targets.values()) {
        expect(lv.axisCells.has(`${p[0]},${p[1]}`)).toBe(false)
      }
    }
  })
})

describe('judge / 通过与否', () => {
  it('全部补齐即通过', () => {
    expect(judgeForUi(levelOf(1).targets, [[4, 4], [3, 1]])).toEqual({ pass: true, deviations: 0 })
  })

  it('缺点 1 个 → 偏差 1', () => {
    expect(judgeForUi(levelOf(1).targets, [[4, 4]])).toEqual({ pass: false, deviations: 1 })
  })

  it('多点 1 个 → 偏差 1', () => {
    expect(judgeForUi(levelOf(1).targets, [[4, 4], [3, 1], [2, 4]])).toEqual({ pass: false, deviations: 1 })
  })

  it('点对但方向错 → 缺 1 多 1（偏差 2）', () => {
    const lv = levelOf(37)
    const wrong = [[4, 5, 'L'], [6, 1, 'U'], [6, 3, 'L'], [6, 6, 'D']]
    expect(judgeForUi(lv.targets, wrong)).toEqual({ pass: false, deviations: 2 })
  })

  it('方向也对 → 通过', () => {
    const lv = levelOf(37)
    const right = [[4, 5, 'R'], [6, 1, 'U'], [6, 3, 'L'], [6, 6, 'D']]
    expect(judgeForUi(lv.targets, right)).toEqual({ pass: true, deviations: 0 })
  })

  it('重复落点只算一个点（按集合判定）', () => {
    const lv = levelOf(1)
    expect(judgeForUi(lv.targets, [[4, 4], [4, 4], [3, 1]])).toEqual({ pass: true, deviations: 0 })
  })

  it('空盘：偏差数 = 目标数', () => {
    const lv = levelOf(25)
    expect(judgeForUi(lv.targets, [])).toEqual({ pass: false, deviations: 9 })
  })
})

describe('judge / 对外只暴露汇总', () => {
  it('judgeForUi 只有 pass 与 deviations 两个字段', () => {
    const lv = levelOf(1)
    const ui = judgeForUi(lv.targets, [[0, 0]])
    expect(Object.keys(ui).sort()).toEqual(['deviations', 'pass'])
  })

  it('内部 judge 给出 missing/extra 明细，供提示使用', () => {
    const lv = levelOf(1)
    const r = judge(lv.targets, [[4, 4]])
    expect(r.missing.map((v) => v.p.join(',')).sort()).toEqual(['3,1'])
    expect(r.extra).toHaveLength(0)
  })

  it('轴格上的点不参与判定：放在轴格只会算作多点', () => {
    const lv = levelOf(1) // v@2，轴格是 x=2 一整列
    const full = [[4, 4], [3, 1], [2, 0]]
    expect(judgeForUi(lv.targets, full).deviations).toBe(1)
  })
})
