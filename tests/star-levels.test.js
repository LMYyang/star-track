import { describe, it, expect } from 'vitest'
import { validateAll } from '../src/core/star/validate.js'
import { hydrateLevels, rateStar, CHAPTERS } from '../src/core/star/levels.js'
import { RAW } from './helpers.js'

const STAR = hydrateLevels(RAW)

describe('levels / 数据完整性', () => {
  it('40 关全部通过校验', () => {
    expect(validateAll(RAW)).toMatchObject({ ok: true, errors: [] })
  })

  it('id 从 1 连续到 40，章节 1~7 递增', () => {
    expect(STAR.levels.map((l) => l.id)).toEqual(
      Array.from({ length: 40 }, (_, i) => i + 1)
    )
    let prev = 0
    for (const l of STAR.levels) {
      expect(l.chapter).toBeGreaterThanOrEqual(prev)
      prev = l.chapter
    }
  })

  it('七章分组，每章非空', () => {
    expect(CHAPTERS).toHaveLength(7)
    expect(STAR.chapters).toHaveLength(7)
    for (const c of STAR.chapters) expect(c.levels.length).toBeGreaterThan(0)
    expect(STAR.chapters.map((c) => c.levels.length).reduce((a, b) => a + b, 0)).toBe(40)
  })

  it('板面只用 5/7/9，源点 2~8 个', () => {
    for (const l of STAR.levels) {
      expect([5, 7, 9]).toContain(l.board)
      expect(l.sources.length).toBeGreaterThanOrEqual(2)
      expect(l.sources.length).toBeLessThanOrEqual(8)
    }
  })

  it('难度单调：前 3 关不限提交次数，之后逐步收紧', () => {
    expect(STAR.levels.slice(0, 3).every((l) => l.moves === 99)).toBe(true)
    expect(STAR.levels.at(-1).moves).toBe(3)
  })

  it('残星只出现在第六章', () => {
    const strayLevels = STAR.levels.filter((l) => l.strays.length > 0)
    expect(strayLevels.length).toBeGreaterThanOrEqual(3)
    expect(strayLevels.every((l) => l.chapter === 6)).toBe(true)
  })

  it('箭头关只出现在第七章', () => {
    const arrowLevels = STAR.levels.filter((l) => l.arrows)
    expect(arrowLevels.length).toBeGreaterThanOrEqual(3)
    expect(arrowLevels.every((l) => l.chapter === 7)).toBe(true)
  })

  it('每关目标数 = 源点数 ×（群阶-1），且目标互不重复', () => {
    for (const l of STAR.levels) {
      const order = l.sym.type === 'cross' ? 4 : 2
      expect(l.targetCount).toBe(l.sources.length * (order - 1))
      expect(l.targets.size).toBe(l.targetCount)
    }
  })
})

describe('levels / 基准关（文档演算结果）', () => {
  const keys = (id) => [...STAR.byId.get(id).targets.keys()].sort()

  it('L1 v@2 5×5', () => expect(keys(1)).toEqual(['3,1', '4,4']))
  it('L14 d1 c=0 7×7', () => expect(keys(14)).toEqual(['1,0', '3,0', '4,2', '6,1']))
  it('L19 p(3,3) 7×7', () => expect(keys(19)).toEqual(['4,5', '6,3', '6,6']))
  it('L25 cross(3,3) 7×7 共 9 点', () =>
    expect(keys(25)).toEqual(['0,5', '2,4', '2,6', '4,0', '4,2', '4,4', '4,6', '6,1', '6,5']))
  it('L31 残星关：目标 3 点，残星不参与', () => expect(keys(31)).toEqual(['4,5', '5,0', '6,3']))
  it('L37 箭头关：4 个目标带方向', () =>
    expect(keys(37)).toEqual(['4,5,R', '6,1,U', '6,3,L', '6,6,D']))
  it('L40 双轴+箭头：同一源点的多像方向由各自群元素决定', () => {
    const l = STAR.byId.get(40)
    const src = l.sources[0] // [1,2,'U']，十字 (4,4)
    // 竖镜像保方向 U、横镜像变 D、180° 变 D —— 不能只算一次方向
    const got = {}
    for (const { p, src: s } of l.targets.values()) {
      if (s[0] === src[0] && s[1] === src[1]) got[`${p[0]},${p[1]}`] = p[2]
    }
    expect(got).toEqual({ '7,2': 'U', '1,6': 'D', '7,6': 'D' })
    expect(new Set(Object.values(got)).size).toBe(2)
    // 位置集合本身仍是 4 像
    const coords = new Set([`${src[0]},${src[1]}`, ...Object.keys(got)])
    expect(coords.size).toBe(4)
    expect(l.targetCount).toBe(9)
  })
})

describe('levels / 星级规则', () => {
  it('零失误零提示 3★', () => {
    expect(rateStar({ pass: true, mistakes: 0, hintsUsed: 0 })).toBe(3)
  })
  it('用 1 次提示仍可 2★', () => {
    expect(rateStar({ pass: true, mistakes: 0, hintsUsed: 1 })).toBe(2)
  })
  it('失误 3 次只给 1★', () => {
    expect(rateStar({ pass: true, mistakes: 3, hintsUsed: 0 })).toBe(1)
  })
  it('未通过 0★', () => {
    expect(rateStar({ pass: false, mistakes: 0, hintsUsed: 0 })).toBe(0)
  })
})

describe('levels / 装配即拒绝坏数据', () => {
  const bad = (patch) => ({ ...RAW.levels[0], ...patch })
  const hydrate = (patch) => () => hydrateLevels({ version: 1, levels: [bad(patch)] })

  it('board 非法', () => expect(hydrate({ board: 6 })).toThrow('board'))
  it('源点越界', () => expect(hydrate({ sources: [[9, 9]] })).toThrow('越界'))
  it('源点落在轴格', () => expect(hydrate({ sources: [[2, 0]] })).toThrow('轴格'))
  it('斜轴 c 半格', () => expect(hydrate({ sym: { type: 'd1', c: 0.5 } })).toThrow('整数'))
  it('残星与源点重合', () => expect(hydrate({ strays: [[9, 9]] })).toThrow('越界'))
})
