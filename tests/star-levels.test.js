import { describe, it, expect } from 'vitest'
import { validateAll } from '../src/core/star/validate.js'
import { hydrateLevels, rateStar, CHAPTERS } from '../src/core/star/levels.js'
import { groupOrder } from '../src/core/star/symmetry.js'
import { LEVELS } from '../src/core/star/levelData.js'
import { RAW } from './helpers.js'

const STAR = hydrateLevels(RAW)

describe('levels / 数据完整性', () => {
  it('全部关卡通过校验', () => {
    expect(validateAll(RAW)).toMatchObject({ ok: true, errors: [] })
  })

  it('id 从 1 连续到 N，章节递增', () => {
    expect(STAR.levels.map((l) => l.id)).toEqual(
      Array.from({ length: STAR.levels.length }, (_, i) => i + 1)
    )
    let prev = 0
    for (const l of STAR.levels) {
      expect(l.chapter).toBeGreaterThanOrEqual(prev)
      prev = l.chapter
    }
  })

  it('十章分组，每章非空', () => {
    expect(CHAPTERS).toHaveLength(10)
    expect(STAR.chapters).toHaveLength(10)
    for (const c of STAR.chapters) expect(c.levels.length).toBeGreaterThan(0)
    expect(STAR.chapters.map((c) => c.levels.length).reduce((a, b) => a + b, 0)).toBe(STAR.levels.length)
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

  it('残星只出现在第六章及以后', () => {
    const strayLevels = STAR.levels.filter((l) => l.strays.length > 0)
    expect(strayLevels.length).toBeGreaterThanOrEqual(3)
    expect(strayLevels.every((l) => l.chapter >= 6)).toBe(true)
  })

  it('箭头关只出现在第七章及以后', () => {
    const arrowLevels = STAR.levels.filter((l) => l.arrows)
    expect(arrowLevels.length).toBeGreaterThanOrEqual(3)
    expect(arrowLevels.every((l) => l.chapter >= 7)).toBe(true)
  })

  it('旋转关只在第八章及以后，且群阶为 4', () => {
    const rot = STAR.levels.filter((l) => l.sym.type === 'r')
    expect(rot.length).toBeGreaterThanOrEqual(5)
    expect(rot.every((l) => l.chapter >= 8)).toBe(true)
    for (const l of rot) expect(groupOrder(l.sym)).toBe(4)
  })

  it('暗域只在第九章及以后，且不压源点/目标/残星/轴格', () => {
    const blockedLevels = STAR.levels.filter((l) => l.blockedList.length > 0)
    expect(blockedLevels.length).toBeGreaterThanOrEqual(6)
    for (const l of blockedLevels) {
      expect(l.chapter).toBeGreaterThanOrEqual(9)
      expect(l.blockedList.length).toBeLessThanOrEqual(6)
      const srcXY = new Set(l.sources.map((s) => `${s[0]},${s[1]}`))
      for (const b of l.blockedList) {
        const k = `${b[0]},${b[1]}`
        expect(srcXY.has(k)).toBe(false)
        expect(l.targets.has(k)).toBe(false)
        expect(l.axisCells.has(k)).toBe(false)
        expect(l.strays.some((s) => `${s[0]},${s[1]}` === k)).toBe(false)
      }
    }
  })

  it('每关目标数 = 源点数 ×（群阶-1），且目标互不重复', () => {
    for (const l of STAR.levels) {
      const order = groupOrder(l.sym)
      expect(l.targetCount).toBe(l.sources.length * (order - 1))
      expect(l.targets.size).toBe(l.targetCount)
    }
  })

  it('箭头关：同一格点不会要求两个方向', () => {
    for (const l of STAR.levels.filter((x) => x.arrows)) {
      const pos = new Set()
      for (const { p } of l.targets.values()) {
        const k = `${p[0]},${p[1]}`
        expect(pos.has(k), `第 ${l.id} 关 ${k} 重复`).toBe(false)
        pos.add(k)
      }
    }
  })
})

describe('levels / 新章节结构', () => {
  it('总关卡数与数据入口一致', () => {
    expect(STAR.levels.length).toBe(LEVELS.length)
    expect(LEVELS.length).toBe(64)
  })

  it('第 8/9/10 章关卡数分别为 7/8/9', () => {
    expect(STAR.byId.get(41).chapter).toBe(8)
    expect(STAR.byId.get(48).chapter).toBe(9)
    expect(STAR.byId.get(56).chapter).toBe(10)
    expect(STAR.chapters.find((c) => c.no === 8).levels.length).toBe(7)
    expect(STAR.chapters.find((c) => c.no === 9).levels.length).toBe(8)
    expect(STAR.chapters.find((c) => c.no === 10).levels.length).toBe(9)
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

  it('L41 四重旋转：一个点转出右、下、左三颗', () =>
    expect(keys(41)).toEqual(['0,3', '1,4', '3,0', '3,4', '4,1', '4,3']))

  it('L44 绕格心旋转：没有轴格，四角成环', () => {
    const l = STAR.byId.get(44)
    expect(l.axisCells.size).toBe(0)
    const first = l.sources[0] // [0,0]
    const got = [...l.targets.values()].filter((e) => e.src === first).map((e) => e.p.join(','))
    expect(got.sort()).toEqual(['0,5', '5,0', '5,5'])
  })

  it('L48 暗域关：目标是镜像点，暗域格不在答案里', () => {
    expect(keys(48)).toEqual(['4,0', '4,5', '6,0', '6,2'])
    for (const b of STAR.byId.get(48).blockedList) {
      expect(STAR.byId.get(48).targets.has(`${b[0]},${b[1]}`)).toBe(false)
    }
  })

  it('L55 旋转 + 暗域：暗域压在四条中心线上', () => {
    const l = STAR.byId.get(55)
    expect(l.targetCount).toBe(9)
    expect([...l.blockedList.map((b) => b.join(','))].sort()).toEqual(['0,4', '4,0', '4,8', '8,4'])
  })

  it('L56 旋转 + 箭头：方向随群元素一起转 90°', () =>
    expect(keys(56)).toEqual(['0,4,L', '1,5,U', '4,6,D', '5,1,D', '5,5,L', '6,2,R']))
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
