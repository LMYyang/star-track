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
    case 'g': {
      // 复合双镜（第十一章「双镜」）：两条二阶镜轴合成的四阶群。
      // 子轴必须各自是二阶对称（v/h/p/d1/d2），且两条轴必须可交换——
      // 不可交换时 {I, A, B, A·B} 不封闭，不是群，直接拒绝。
      const a = normalizeSym(raw.a)
      const b = normalizeSym(raw.b)
      const ALLOWED = ['v', 'h', 'p', 'd1', 'd2']
      if (!ALLOWED.includes(a.type) || !ALLOWED.includes(b.type)) {
        throw new Error(`复合双镜的子轴只能是 v/h/p/d1/d2: ${a.type}+${b.type}`)
      }
      return { type: 'g', a, b }
    }
    case 'd4': {
      // 八重星芒（第十五章）：绕中心 90° 旋转 × 过中心的镜轴，合成的 8 阶二面体群 D4。
      // 中心与 r 同规则（落在格点或格心），否则转过去会落到半格。
      const hx = half(raw.cx, 'cx')
      const hy = half(raw.cy, 'cy')
      if ((hx + hy) % 2 !== 0) throw new Error(`八重对称中心必须落在格点或格心: (${raw.cx}, ${raw.cy})`)
      const axis = raw.axis || 'v'
      if (!['v', 'h', 'd1', 'd2'].includes(axis)) throw new Error(`八重对称的镜轴只能是 v/h/d1/d2: ${axis}`)
      return { type: 'd4', hx, hy, axis }
    }
    case 't': {
      // 星阵平移（第十六章）：整片星图沿向量 (vx, vy) 平移复制，步数 steps 决定复制几次。
      // 有限平移：群取 {I, T, T², …}，最多 3 步（再多就出板了，也超出心算范围）。
      const vx = Number(raw.vx)
      const vy = Number(raw.vy)
      if (!Number.isInteger(vx) || !Number.isInteger(vy)) throw new Error(`平移向量必须是整数: (${raw.vx}, ${raw.vy})`)
      if (vx === 0 && vy === 0) throw new Error('平移向量不能为零')
      const steps = raw.steps == null ? 1 : Number(raw.steps)
      if (!Number.isInteger(steps) || steps < 1 || steps > 3) throw new Error(`平移步数必须是 1–3: ${raw.steps}`)
      return { type: 't', vx, vy, steps }
    }
    default:
      throw new Error(`未知对称类型: ${t}`)
  }
}

/** 单位矩阵（字面量：本文件此处尚未声明 M） */
const ID = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }

/** 矩阵复合 m1 ∘ m2（先 m2 后 m1），仿射项一并合成 */
export function compose(m1, m2) {
  return M(
    m1.a * m2.a + m1.b * m2.c,
    m1.a * m2.b + m1.b * m2.d,
    m1.c * m2.a + m1.d * m2.c,
    m1.c * m2.b + m1.d * m2.d,
    m1.a * m2.tx + m1.b * m2.ty + m1.tx,
    m1.c * m2.tx + m1.d * m2.ty + m1.ty,
  )
}

function sameMat(m1, m2) {
  return ['a', 'b', 'c', 'd', 'tx', 'ty'].every((k) => Math.abs(m1[k] - m2[k]) < 1e-9)
}

/** 二阶对称的不动点（轴心格）：解 (M − I)p = −t；无整数解返回 null */
export function fixedPointOf(m) {
  const det = (m.a - 1) * (m.d - 1) - m.b * m.c
  if (Math.abs(det) < 1e-9) return null
  const px = (-m.tx * (m.d - 1) + m.b * m.ty) / det
  const py = (-(m.a - 1) * m.ty + m.c * m.tx) / det
  if (!Number.isInteger(px) || !Number.isInteger(py)) return null
  return [px, py]
}

/** 单条二阶对称映射（复合型取第一子轴） */
function mirrorOf(sym) {
  return groupOf(sym)[1]
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
    case 'g': {
      // 两条二阶镜轴合成的四阶群 {I, A, B, A·B}
      const A = groupOf(sym.a)[1]
      const B = groupOf(sym.b)[1]
      const AB = compose(A, B)
      if (!sameMat(AB, compose(B, A))) {
        throw new Error('复合双镜的两条轴不可交换：{I,A,B,A·B} 不封闭')
      }
      if (sameMat(A, B)) throw new Error('复合双镜的两条轴重合')
      if (sameMat(AB, ID)) throw new Error('复合双镜退化（A·B = 恒等）')
      return [ID, A, B, AB]
    }
    case 'd4': {
      // 8 阶二面体群：四条旋转 × 过中心的镜轴及其组合
      const s = (sym.hx + sym.hy) / 2
      const d = (sym.hy - sym.hx) / 2
      const rot = [
        ID,
        M(0, -1, 1, 0, s, d),
        M(-1, 0, 0, -1, sym.hx, sym.hy),
        M(0, 1, -1, 0, -d, s),
      ]
      let mir
      if (sym.axis === 'v') mir = M(-1, 0, 0, 1, sym.hx, 0)
      else if (sym.axis === 'h') mir = M(1, 0, 0, -1, 0, sym.hy)
      else if (sym.axis === 'd1') {
        const c = (sym.hy - sym.hx) / 2 // y = x + c 过中心
        mir = M(0, 1, 1, 0, -c, c)
      } else {
        const c = (sym.hx + sym.hy) / 2 // x + y = c 过中心
        mir = M(0, -1, -1, 0, c, c)
      }
      return [...rot, ...rot.map((m) => compose(m, mir))]
    }
    case 't': {
      // 有限平移群 {I, T, T², …}：T 为常向量平移
      const T = M(1, 0, 0, 1, sym.vx, sym.vy)
      const out = [ID]
      let cur = ID
      for (let i = 0; i < sym.steps; i++) {
        cur = compose(T, cur)
        out.push(cur)
      }
      return out
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

export const GROUP_ORDER_4 = ['cross', 'r', 'g']

/** 群阶：直接数群元素，避免复合型再维护一张对照表 */
export function groupOrder(sym) {
  return groupOf(sym).length
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
  // 复合双镜：两条子轴的轴格取并集；A·B 的不动点（通常是两轴交点）同样是死点
  if (sym.type === 'g') {
    for (const k of axisCells(sym.a, n)) cells.add(k)
    for (const k of axisCells(sym.b, n)) cells.add(k)
    const fp = fixedPointOf(groupOf(sym)[3])
    if (fp) push(fp[0], fp[1])
  }
  // 八重星芒：过中心的镜轴整条都是死格；中心落在格点上时中心格也是死格
  if (sym.type === 'd4') {
    const cx = sym.hx / 2
    const cy = sym.hy / 2
    if (sym.axis === 'v' && sym.hx % 2 === 0) for (let y = 0; y < n; y++) push(cx, y)
    if (sym.axis === 'h' && sym.hy % 2 === 0) for (let x = 0; x < n; x++) push(x, cy)
    if (sym.axis === 'd1') {
      const c = (sym.hy - sym.hx) / 2
      for (let x = 0; x < n; x++) push(x, x + c)
    }
    if (sym.axis === 'd2') {
      const c = (sym.hx + sym.hy) / 2
      for (let x = 0; x < n; x++) push(x, c - x)
    }
    if (sym.hx % 2 === 0 && sym.hy % 2 === 0) push(cx, cy)
  }
  // 平移没有轴格：所有格点都能参与复制（边界由目标越界检查兜住）
  return cells
}
