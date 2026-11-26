import { describe, it, expect } from 'vitest'
import {
  normalizeSym, keyOf, groupOf, applyMat, applyDir, groupImages, imageOf,
  axisCells, directionTable, DIR_KEYS, compose, fixedPointOf,
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

describe('复合双镜（第 11 章新元素）', () => {
  const g = (a, b) => normalizeSym({ type: 'g', a, b })

  it('斜轴 × 斜轴：群阶 4，一个源点补三点', () => {
    const sym = g({ type: 'd1', c: 0 }, { type: 'd2', c: 6 })
    expect(groupOf(sym).length).toBe(4)
    expect(groupImages(sym, [1, 2]).map((p) => keyOf(p))).toEqual(['1,2', '2,1', '4,5', '5,4'])
    // 四个元素互不相同，且各自二阶
    for (const m of groupOf(sym)) {
      const twice = compose(m, m)
      // −0 与 0 视为相同（浮点合成可能带符号零）
      const norm = [twice.a, twice.b, twice.c, twice.d, twice.tx, twice.ty].map((v) => (Object.is(v, -0) ? 0 : v))
      expect(norm).toEqual([1, 0, 0, 1, 0, 0])
    }
  })

  it('两轴交点（A·B 不动点）算轴格：不能落星', () => {
    const sym = g({ type: 'd1', c: 0 }, { type: 'd2', c: 6 })
    const axis = axisCells(sym, 7)
    expect(fixedPointOf(groupOf(sym)[3])).toEqual([3, 3])
    expect(axis.has('3,3')).toBe(true)      // 交点
    expect(axis.has('0,0')).toBe(true)      // 斜轴 ╱
    expect(axis.has('0,6')).toBe(true)      // 斜轴 ╲
  })

  it('不可交换的两条轴直接拒绝（{I,A,B,A·B} 不封闭）', () => {
    expect(() => groupOf(g({ type: 'v', axis: 3 }, { type: 'd1', c: 0 }))).toThrow(/不可交换/)
  })

  it('子轴只能二阶：嵌套复合 / 旋转都拒绝', () => {
    expect(() => normalizeSym({ type: 'g', a: { type: 'r', cx: 3, cy: 3 }, b: { type: 'd1', c: 0 } })).toThrow()
    expect(() => normalizeSym({ type: 'g', a: { type: 'g', a: { type: 'v', axis: 2 }, b: { type: 'h', axis: 2 } }, b: { type: 'd1', c: 0 } })).toThrow()
  })

  it('方向也随两道斜镜翻两次：右 → 下 → 上 → 左', () => {
    const sym = g({ type: 'd1', c: 0 }, { type: 'd2', c: 6 })
    expect(applyDir(groupOf(sym)[1], 'R')).toBe('D')
    expect(applyDir(groupOf(sym)[2], 'R')).toBe('U')
    expect(applyDir(groupOf(sym)[3], 'R')).toBe('L')
  })
})

describe('symmetry / 八重星芒 d4 与星阵平移 t', () => {
  const d4 = (axis = 'v') => normalizeSym({ type: 'd4', cx: 4, cy: 4, axis })

  it('d4 群阶为 8，元素互不相同且闭合', () => {
    for (const axis of ['v', 'h', 'd1', 'd2']) {
      const g8 = groupOf(d4(axis))
      expect(g8).toHaveLength(8)
      const set = new Set(g8.map((m) => [m.a, m.b, m.c, m.d, m.tx, m.ty].join('/')))
      expect(set.size).toBe(8)
    }
  })

  it('d4 一源补七点，且八个像绕中心成环', () => {
    const sym = d4()
    const imgs = groupImages(sym, [1, 2]).map((p) => p.join(','))
    expect(imgs).toHaveLength(8)
    expect(new Set(imgs).size).toBe(8)
    expect(imgs).toEqual(['1,2', '6,1', '7,6', '2,7', '7,2', '6,7', '1,6', '2,1'])
  })

  it('d4 镜轴整条是轴格，中心也在轴上', () => {
    const cells = axisCells(d4('v'), 9)
    expect(cells.size).toBe(9)
    for (let y = 0; y < 9; y++) expect(cells.has(`4,${y}`)).toBe(true)
    expect(axisCells(d4('d1'), 9).size).toBe(9)
    expect(axisCells(d4('d2'), 9).size).toBe(9)
    expect(axisCells(d4('h'), 9).size).toBe(9)
    expect(axisCells(d4('d1'), 9).has('4,4')).toBe(true)
  })

  it('d4 方向：转 90° 右→下，镜轴把方向翻回去', () => {
    const g8 = groupOf(d4())
    expect(applyDir(g8[1], 'R')).toBe('D')
    expect(applyDir(g8[4], 'R')).toBe('L') // 竖轴镜像
  })

  it('d4 中心必须落在格点或格心，非法镜轴拒绝', () => {
    expect(() => normalizeSym({ type: 'd4', cx: 4, cy: 5.5, axis: 'v' })).toThrow()
    expect(() => normalizeSym({ type: 'd4', cx: 4, cy: 4, axis: 'p' })).toThrow()
    expect(() => normalizeSym({ type: 'd4', cx: 4, cy: 4, axis: 'r' })).toThrow()
  })

  it('t 群阶 = 步数 + 1，逐格平移且不改变方向', () => {
    const sym = normalizeSym({ type: 't', vx: 1, vy: 2, steps: 2 })
    expect(groupOf(sym)).toHaveLength(3)
    expect(groupImages(sym, [1, 1])).toEqual([[1, 1], [2, 3], [3, 5]])
    for (let i = 0; i < 3; i++) expect(applyDir(groupOf(sym)[i], 'R')).toBe('R')
    expect(axisCells(sym, 9).size).toBe(0)
  })

  it('t 参数非法时报错：零向量 / 非整数 / 步数越界', () => {
    expect(() => normalizeSym({ type: 't', vx: 0, vy: 0 })).toThrow()
    expect(() => normalizeSym({ type: 't', vx: 1.5, vy: 0 })).toThrow()
    expect(() => normalizeSym({ type: 't', vx: 1, vy: 1, steps: 0 })).toThrow()
    expect(() => normalizeSym({ type: 't', vx: 1, vy: 1, steps: 4 })).toThrow()
    expect(normalizeSym({ type: 't', vx: -2, vy: 0 })).toMatchObject({ vx: -2, vy: 0, steps: 1 })
  })
})