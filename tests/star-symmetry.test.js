import { describe, it, expect } from 'vitest'
import {
  normalizeSym, keyOf, groupOf, applyMat, applyDir, groupImages, imageOf,
  axisCells, directionTable, DIR_KEYS,
} from '../src/core/star/symmetry.js'

const SYMS = [
  { type: 'v', axis: 2 }, { type: 'v', axis: 2.5 },
  { type: 'h', axis: 3 }, { type: 'h', axis: 3.5 },
  { type: 'd1', c: 0 }, { type: 'd1', c: 2 },
  { type: 'd2', c: 6 }, { type: 'd2', c: 4 },
  { type: 'p', cx: 3, cy: 3 }, { type: 'p', cx: 3.5, cy: 3.5 },
  { type: 'cross', ax: 3, ay: 3 }, { type: 'cross', ax: 3.5, ay: 2.5 },
]

describe('symmetry / 参数与键', () => {
  it('未知类型直接抛错', () => {
    expect(() => normalizeSym({ type: 'x' })).toThrow('未知对称类型')
  })

  it('轴位只接受整数或半整数', () => {
    expect(() => normalizeSym({ type: 'v', axis: 2.3 })).toThrow('整数或半整数')
    expect(normalizeSym({ type: 'v', axis: 2.5 }).hx).toBe(5)
  })

  it('斜轴 c 必须是整数', () => {
    expect(() => normalizeSym({ type: 'd1', c: 0.5 })).toThrow('整数')
  })

  it('keyOf 区分带方向与不带方向', () => {
    expect(keyOf([1, 2])).toBe('1,2')
    expect(keyOf([1, 2, 'U'])).toBe('1,2,U')
  })
})

describe('symmetry / 翻折的数学性质', () => {
  for (const raw of SYMS) {
    const sym = normalizeSym(raw)
    const label = JSON.stringify(raw)
    it(`${label} 对合：翻两次回原位`, () => {
      for (let x = 0; x < 9; x++) {
        for (let y = 0; y < 9; y++) {
          const p = [x, y]
          const q = imageOf(sym, p)
          expect(imageOf(sym, q)).toEqual(p)
        }
      }
    })
    it(`${label} 像保持整数`, () => {
      for (let x = 0; x < 9; x++) {
        for (let y = 0; y < 9; y++) {
          const q = imageOf(sym, [x, y])
          expect(Number.isInteger(q[0]) && Number.isInteger(q[1])).toBe(true)
        }
      }
    })
  }

  it('groupOf 群阶：单轴 2、双轴 4', () => {
    expect(groupOf(normalizeSym({ type: 'v', axis: 2 }))).toHaveLength(2)
    expect(groupOf(normalizeSym({ type: 'p', cx: 3, cy: 3 }))).toHaveLength(2)
    expect(groupOf(normalizeSym({ type: 'cross', ax: 3, ay: 3 }))).toHaveLength(4)
  })

  it('双轴四像 = 自身 + 竖镜像 + 横镜像 + 中心', () => {
    const sym = normalizeSym({ type: 'cross', ax: 3, ay: 3 })
    expect(new Set(groupImages(sym, [1, 2]).map((p) => keyOf(p)))).toEqual(
      new Set(['1,2', '5,2', '1,4', '5,4'])
    )
  })

  it('双轴群封闭：对任一像再取群，结果集不变', () => {
    const sym = normalizeSym({ type: 'cross', ax: 3, ay: 3 })
    const base = new Set(groupImages(sym, [1, 2]).map((p) => keyOf(p)))
    for (const q of groupImages(sym, [1, 2])) {
      const again = new Set(groupImages(sym, q).map((p) => keyOf(p)))
      expect(again.size).toBe(base.size)
      for (const k of again) expect(base.has(k)).toBe(true)
    }
  })

  it('竖轴公式：x 关于 2 取反', () => {
    const sym = normalizeSym({ type: 'v', axis: 2 })
    expect(imageOf(sym, [0, 4])).toEqual([4, 4])
    expect(imageOf(sym, [3, 1])).toEqual([1, 1])
  })

  it('45° 斜轴 y=x：互换 x/y', () => {
    const sym = normalizeSym({ type: 'd1', c: 0 })
    expect(imageOf(sym, [1, 6])).toEqual([6, 1])
    const sym2 = normalizeSym({ type: 'd2', c: 6 })
    expect(imageOf(sym2, [1, 0])).toEqual([6, 5])
  })
})

describe('symmetry / 四重旋转 r', () => {
  const sym = normalizeSym({ type: 'r', cx: 3, cy: 3 })

  it('中心必须落在格点或格心', () => {
    expect(() => normalizeSym({ type: 'r', cx: 2.5, cy: 3 })).toThrow('旋转中心')
    expect(normalizeSym({ type: 'r', cx: 2.5, cy: 2.5 }).hx).toBe(5)
  })

  it('群阶 4，转四次回原位且每步都是整数格点', () => {
    expect(groupOf(sym)).toHaveLength(4)
    for (let x = 0; x < 9; x++) {
      for (let y = 0; y < 9; y++) {
        const orbit = groupImages(sym, [x, y])
        expect(orbit).toHaveLength(4)
        for (const q of orbit) expect(Number.isInteger(q[0]) && Number.isInteger(q[1])).toBe(true)
        expect(applyMat(groupOf(sym)[1], orbit[1])).toEqual(orbit[2])
        expect(applyMat(groupOf(sym)[1], orbit[2])).toEqual(orbit[3])
        expect(applyMat(groupOf(sym)[1], orbit[3])).toEqual(orbit[0])
      }
    }
  })

  it('顺时针 90°：(1, 0) 绕 (3,3) 转到 (6, 1)', () => {
    expect(imageOf(sym, [1, 0])).toEqual([6, 1])
    expect(applyMat(groupOf(sym)[2], [1, 0])).toEqual([5, 6])
    expect(applyMat(groupOf(sym)[3], [1, 0])).toEqual([0, 5])
  })

  it('绕格心（2.5, 2.5）旋转仍是格点', () => {
    const cellSym = normalizeSym({ type: 'r', cx: 2.5, cy: 2.5 })
    expect(imageOf(cellSym, [0, 0])).toEqual([5, 0])
  })

  it('中心格是死点；格心中心没有死点', () => {
    expect([...axisCells(sym, 7)]).toEqual(['3,3'])
    expect(axisCells(normalizeSym({ type: 'r', cx: 2.5, cy: 2.5 }), 7).size).toBe(0)
  })

  it('方向整体转 90°：U→R→D→L', () => {
    expect(directionTable(sym, 1)).toEqual(['R', 'D', 'L', 'U'])
    expect(directionTable(sym, 2)).toEqual(['D', 'L', 'U', 'R'])
    expect(directionTable(sym, 3)).toEqual(['L', 'U', 'R', 'D'])
  })
})

describe('symmetry / 轴格', () => {
  it('竖轴整格：5×5 共 5 个轴格', () => {
    expect(axisCells(normalizeSym({ type: 'v', axis: 2 }), 5).size).toBe(5)
  })
  it('缝轴没有轴格', () => {
    expect(axisCells(normalizeSym({ type: 'v', axis: 2.5 }), 5).size).toBe(0)
  })
  it('斜轴 y=x 在 7×7 上有 7 个轴格', () => {
    expect(axisCells(normalizeSym({ type: 'd1', c: 0 }), 7).size).toBe(7)
  })
  it('斜轴 x+y=6 在 7×7 上有 7 个轴格', () => {
    expect(axisCells(normalizeSym({ type: 'd2', c: 6 }), 7).size).toBe(7)
  })
  it('双轴十字 7×7 两条中线去重后 13 个', () => {
    expect(axisCells(normalizeSym({ type: 'cross', ax: 3, ay: 3 }), 7).size).toBe(13)
  })
  it('中心对称的轴格只有中心点', () => {
    expect([...axisCells(normalizeSym({ type: 'p', cx: 3, cy: 3 }), 7)]).toEqual(['3,3'])
  })
})

describe('symmetry / 方向翻折表', () => {
  const cases = [
    ['v', { type: 'v', axis: 2 }, ['U', 'L', 'D', 'R']],
    ['h', { type: 'h', axis: 3 }, ['D', 'R', 'U', 'L']],
    ['d1', { type: 'd1', c: 0 }, ['L', 'D', 'R', 'U']],
    ['d2', { type: 'd2', c: 6 }, ['R', 'U', 'L', 'D']],
    ['p', { type: 'p', cx: 3, cy: 3 }, ['D', 'L', 'U', 'R']],
  ]
  for (const [name, raw, want] of cases) {
    it(`${name} 方向表`, () => {
      expect(directionTable(normalizeSym(raw))).toEqual(want)
    })
  }

  it('双轴的元素 2/3 也保持方向合法（4 个元素各成一表）', () => {
    const sym = normalizeSym({ type: 'cross', ax: 3, ay: 3 })
    for (let i = 0; i < 4; i++) {
      const table = directionTable(sym, i)
      expect(table.every((d) => DIR_KEYS.includes(d))).toBe(true)
      expect(new Set(table).size).toBe(4)
    }
    expect(directionTable(sym, 1)).toEqual(['U', 'L', 'D', 'R'])
    expect(directionTable(sym, 2)).toEqual(['D', 'R', 'U', 'L'])
    expect(directionTable(sym, 3)).toEqual(['D', 'L', 'U', 'R'])
  })

  it('applyDir 结果永远落在四方向内', () => {
    for (const raw of SYMS) {
      const sym = normalizeSym(raw)
      for (const m of groupOf(sym)) {
        for (const d of DIR_KEYS) expect(DIR_KEYS.includes(applyDir(m, d))).toBe(true)
      }
    }
  })

  it('applyMat 与 applyDir 一致：矩阵作用于单位向量等于方向表', () => {
    const sym = normalizeSym({ type: 'd1', c: 0 })
    const m = groupOf(sym)[1]
    expect(applyMat(m, [1, 0])).toEqual([0, 1])
    expect(applyDir(m, 'R')).toBe('D')
  })
})
