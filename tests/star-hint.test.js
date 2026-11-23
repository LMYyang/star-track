import { describe, it, expect } from 'vitest'
import { nextHint } from '../src/core/star/hint.js'
import { hydrateLevels } from '../src/core/star/levels.js'
import { judgeForUi } from '../src/core/star/judge.js'
import { RAW } from './helpers.js'

const STAR = hydrateLevels(RAW)
const L1 = STAR.byId.get(1)
const L37 = STAR.byId.get(37)

describe('hint / 提示选择', () => {
  it('空盘时提示一个缺失点', () => {
    const h = nextHint(L1, [])
    expect(h.kind).toBe('missing')
    expect(h.point).toHaveLength(2)
    expect(L1.targets.has(h.point.join(',') )).toBe(true)
  })

  it('提示只给一个点，不泄露全解', () => {
    const h = nextHint(L1, [])
    expect(Array.isArray(h.point)).toBe(true)
    expect(h.point).toHaveLength(2)
    expect(Object.keys(h).sort()).toEqual(['kind', 'point', 'text'])
  })

  it('缺点优先于多点', () => {
    const h = nextHint(L1, [[4, 4], [0, 0]])
    expect(h.kind).toBe('missing')
  })

  it('没有缺点时指出一个多余点', () => {
    const l = STAR.byId.get(2) // 3 源点
    const correct = [...l.targets.values()].map((v) => v.p)
    // 找一个既不是目标、也不与源点重合的格点当「多余点」
    let extra = null
    for (let x = 0; x < l.board && !extra; x++) {
      for (let y = 0; y < l.board && !extra; y++) {
        if (!l.targets.has(`${x},${y}`) && !l.sources.some((s) => s[0] === x && s[1] === y)) extra = [x, y]
      }
    }
    const h = nextHint(l, [...correct, extra])
    expect(h.kind).toBe('extra')
    expect(h.point).toEqual(extra)
  })

  it('完全正确时没有提示可给', () => {
    const correct = [...L1.targets.values()].map((v) => v.p)
    expect(nextHint(L1, correct)).toBeNull()
    expect(judgeForUi(L1.targets, correct).pass).toBe(true)
  })

  it('箭头关的提示点带方向', () => {
    const h = nextHint(L37, [])
    expect(h.point).toHaveLength(3)
    expect(['U', 'R', 'D', 'L']).toContain(h.point[2])
  })
})
