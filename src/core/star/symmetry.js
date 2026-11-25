const DIR_VEC = { U: [0, -1], R: [1, 0], D: [0, 1], L: [-1, 0] }
const VEC_DIR = new Map(Object.entries(DIR_VEC).map(([k, v]) => [v.join(','), k]))

export const DIR_KEYS = ['U', 'R', 'D', 'L']

export function normalizeSym(raw) {
  const half = (v, name) => {
    const n = Number(v)
    if (!Number.isFinite(n)) throw new Error(`${name} 非法: ${v}`)
    const h = Math.round(n * 2)
    if (Math.abs(n * 2 - h) > 1e-9) throw new Error(`${name} 必须是整数或半整数: ${v}`)
    return h
  }
  const t = raw?.type
  switch (t) {
    case 'v': return { type: 'v', hx: half(raw.axis, 'axis') }
    case 'h': return { type: 'h', hy: half(raw.axis, 'axis') }
    case 'p': return { type: 'p', hx: half(raw.cx, 'cx'), hy: half(raw.cy, 'cy') }
    case 'cross': return { type: 'cross', hx: half(raw.ax, 'ax'), hy: half(raw.ay, 'ay') }
    case 'd1':
    case 'd2':
      if (!Number.isInteger(raw.c)) throw new Error(`斜轴 c 必须是整数: ${raw.c}`)
      return { type: t, c: raw.c }
    case 'r': {
      // 绕中心旋转 90° 生成的四阶群。中心必须落在格点或格心，
      // 否则「把格点转过去」会落到半格位置，无法吸附落星。
      const hx = half(raw.cx, 'cx')
      const hy = half(raw.cy, 'cy')
      if ((hx + hy) % 2 !== 0) throw new Error(`旋转中心必须落在格点或格心: (${raw.cx}, ${raw.cy})`)
      return { type: 'r', hx, hy }
    }
    default:
      throw new Error(`未知对称类型: ${t}`)
  }
}

export function keyOf(p) {
  return p.length === 3 ? `${p[0]},${p[1]},${p[2]}` : `${p[0]},${p[1]}`
}

const M = (a, b, c, d, tx, ty) => ({ a, b, c, d, tx, ty })

export function groupOf(sym) {
  switch (sym.type) {
    case 'v': return [M(1, 0, 0, 1, 0, 0), M(-1, 0, 0, 1, sym.hx, 0)]
    case 'h': return [M(1, 0, 0, 1, 0, 0), M(1, 0, 0, -1, 0, sym.hy)]
    case 'p': return [M(1, 0, 0, 1, 0, 0), M(-1, 0, 0, -1, sym.hx, sym.hy)]
    case 'd1': return [M(1, 0, 0, 1, 0, 0), M(0, 1, 1, 0, -sym.c, sym.c)]
    case 'd2': return [M(1, 0, 0, 1, 0, 0), M(0, -1, -1, 0, sym.c, sym.c)]
    case 'cross': return [
      M(1, 0, 0, 1, 0, 0),
      M(-1, 0, 0, 1, sym.hx, 0),
      M(1, 0, 0, -1, 0, sym.hy),
      M(-1, 0, 0, -1, sym.hx, sym.hy),
    ]
    case 'r': {
      // 屏幕坐标 y 向下：顺时针 90° 即 (dx, dy) → (−dy, dx)
      // M90:  x' = (hx + hy)/2 − y      y' = x − (hx − hy)/2
      // M270: x' = y + (hx − hy)/2      y' = (hx + hy)/2 − x
      const s = (sym.hx + sym.hy) / 2
      const d = (sym.hy - sym.hx) / 2
      return [
        M(1, 0, 0, 1, 0, 0),
        M(0, -1, 1, 0, s, d),
        M(-1, 0, 0, -1, sym.hx, sym.hy),
        M(0, 1, -1, 0, -d, s),
      ]
    }
    default: throw new Error(`groupOf 不支持: ${sym.type}`)
  }
}

export function applyMat(m, p) {
  return [m.a * p[0] + m.b * p[1] + m.tx, m.c * p[0] + m.d * p[1] + m.ty]
}

export function applyDir(m, d) {
  const [dx, dy] = DIR_VEC[d]
  const k = VEC_DIR.get(`${m.a * dx + m.b * dy},${m.c * dx + m.d * dy}`)
  if (!k) throw new Error(`方向映射失败: ${d}`)
  return k
}

export const GROUP_ORDER_4 = ['cross', 'r']

export function groupOrder(sym) {
  return GROUP_ORDER_4.includes(sym.type) ? 4 : 2
}

export function groupImages(sym, p) {
  return groupOf(sym).map((m) => applyMat(m, p))
}

export function imageOf(sym, p) {
  const elems = groupOf(sym)
  const m = sym.type === 'cross' ? elems[3] : elems[1]
  return applyMat(m, p)
}

export function dirImage(sym, d) {
  return applyDir(groupOf(sym)[1], d)
}

export function directionTable(sym, i = 1) {
  return DIR_KEYS.map((d) => applyDir(groupOf(sym)[i], d))
}

export function axisCells(sym, n) {
  const cells = new Set()
  const push = (x, y) => { if (x >= 0 && x < n && y >= 0 && y < n) cells.add(`${x},${y}`) }

  if (sym.type === 'v' && sym.hx % 2 === 0) for (let y = 0; y < n; y++) push(sym.hx / 2, y)
  if (sym.type === 'h' && sym.hy % 2 === 0) for (let x = 0; x < n; x++) push(x, sym.hy / 2)
  if (sym.type === 'p' && sym.hx % 2 === 0 && sym.hy % 2 === 0) push(sym.hx / 2, sym.hy / 2)
  if (sym.type === 'cross') {
    if (sym.hx % 2 === 0) for (let y = 0; y < n; y++) push(sym.hx / 2, y)
    if (sym.hy % 2 === 0) for (let x = 0; x < n; x++) push(x, sym.hy / 2)
  }
  if (sym.type === 'd1') for (let x = 0; x < n; x++) push(x, x + sym.c)
  if (sym.type === 'd2') for (let x = 0; x < n; x++) push(x, sym.c - x)
  // 旋转中心落在格点上时，中心格是唯一不动点，和轴格一样不能落星
  if (sym.type === 'r' && sym.hx % 2 === 0 && sym.hy % 2 === 0) push(sym.hx / 2, sym.hy / 2)

  return cells
}
