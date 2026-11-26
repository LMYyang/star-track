// 生成第 11–14 章（第 65–96 关）并合并出 src/data/levels.v3.json
// 用法：node scripts/gen-levels-v3.mjs
// 做法：手写每关的「骨架参数」（对称/板宽/源点数/暗域数/残星数/箭头/限次），
// 具体格位用确定性伪随机搜索，并用真实 hydrateLevel 逐关校验，
// 保证产出一定可解（目标不越界、不压轴格/暗域、同格不撞方向）。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hydrateLevel } from '../src/core/star/levels.js'
import { normalizeSym, axisCells, groupOrder, imageOf, keyOf } from '../src/core/star/symmetry.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src', 'data', 'levels.v2.json')
const OUT = path.join(ROOT, 'src', 'data', 'levels.v3.json')

const d1 = (c) => ({ type: 'd1', c })
const d2 = (c) => ({ type: 'd2', c })
const g = (a, b) => ({ type: 'g', a, b })
const v = (axis) => ({ type: 'v', axis })
const h = (axis) => ({ type: 'h', axis })
const cross = (ax, ay) => ({ type: 'cross', ax, ay })
const p = (cx, cy) => ({ type: 'p', cx, cy })
const r = (cx, cy) => ({ type: 'r', cx, cy })

/** 第 11 章「双镜」：两道斜镜交叉（d1 + d2），一源补三点 */
const CH11 = [
  { name: '斜镜初现', board: 7, sym: g(d1(0), d2(6)), sources: 2, moves: 5, hints: 1 },
  { name: '十字斜光', board: 9, sym: g(d1(0), d2(8)), sources: 2, moves: 5, hints: 1 },
  { name: '偏轴双镜', board: 9, sym: g(d1(2), d2(8)), sources: 3, moves: 5, hints: 1 },
  { name: '错位交点', board: 9, sym: g(d1(-2), d2(8)), sources: 3, moves: 4, hints: 1 },
  { name: '奇轴之镜', board: 9, sym: g(d1(1), d2(7)), sources: 3, moves: 4, hints: 1 },
  { name: '四星环绕', board: 9, sym: g(d1(0), d2(8)), sources: 4, moves: 4, hints: 1 },
  { name: '斜镜深宫', board: 9, sym: g(d1(3), d2(9)), sources: 4, moves: 4, hints: 0 },
  { name: '双镜锁阵', board: 9, sym: g(d1(0), d2(8)), sources: 5, moves: 3, hints: 0, strays: 1 },
]

/** 第 12 章「深井」：九宫大板 + 密集暗域 */
const CH12 = [
  { name: '井口', board: 9, sym: v(4), sources: 3, moves: 4, blocked: 4, hints: 1 },
  { name: '井壁', board: 9, sym: h(4), sources: 3, moves: 4, blocked: 4, hints: 1 },
  { name: '四面暗星', board: 9, sym: cross(4, 4), sources: 4, moves: 4, blocked: 5, hints: 1 },
  { name: '旋入深井', board: 9, sym: r(4, 4), sources: 4, moves: 3, blocked: 5, hints: 1 },
  { name: '暗斑长廊', board: 9, sym: v(4), sources: 4, moves: 3, blocked: 6, hints: 0 },
  { name: '心口透气', board: 9, sym: p(4, 4), sources: 5, moves: 3, blocked: 6, hints: 0 },
  { name: '斜镜深井', board: 9, sym: g(d1(0), d2(8)), sources: 5, moves: 3, blocked: 6, hints: 0 },
  { name: '井底回旋', board: 9, sym: r(4, 4), sources: 6, moves: 3, blocked: 6, hints: 0 },
]

/** 第 13 章「星锁」：箭头方向 + 只给通过/不通过 + 提交次数收紧 */
const CH13 = [
  { name: '锁向', board: 7, sym: v(3), sources: 2, moves: 3, hints: 1, arrows: true },
  { name: '四方锁', board: 7, sym: cross(3, 3), sources: 2, moves: 3, hints: 1, arrows: true },
  { name: '斜锁', board: 7, sym: d1(0), sources: 2, moves: 2, hints: 1, arrows: true },
  { name: '旋锁', board: 7, sym: r(3, 3), sources: 2, moves: 2, hints: 0, arrows: true },
  { name: '双镜锁', board: 7, sym: g(d1(0), d2(6)), sources: 3, moves: 2, hints: 0, arrows: true },
  { name: '锁影', board: 9, sym: g(d1(0), d2(8)), sources: 3, moves: 2, hints: 0, arrows: true },
  { name: '暗锁', board: 9, sym: cross(4, 4), sources: 3, moves: 2, hints: 0, arrows: true, blocked: 2 },
  { name: '四向锁', board: 9, sym: g(d1(0), d2(8)), sources: 4, moves: 2, hints: 0, arrows: true, blocked: 2 },
]

/** 第 14 章「万象」：双镜 + 暗域 + 残星 + 箭头 + 盲判（不给偏差数） */
const CH14 = [
  { name: '万象初开', board: 9, sym: g(d1(0), d2(8)), sources: 2, moves: 2, blocked: 4, strays: 1, arrows: true, hints: 0 },
  { name: '盲判之始', board: 9, sym: g(d1(0), d2(8)), sources: 3, moves: 2, blocked: 4, strays: 1, arrows: true, hints: 0 },
  { name: '残星乱镜', board: 9, sym: cross(4, 4), sources: 3, moves: 2, blocked: 5, strays: 2, arrows: true, hints: 0 },
  { name: '旋影重重', board: 9, sym: r(4, 4), sources: 3, moves: 2, blocked: 5, strays: 2, arrows: true, hints: 0 },
  { name: '暗镜交织', board: 9, sym: g(d1(0), d2(8)), sources: 3, moves: 2, blocked: 6, strays: 3, arrows: true, hints: 0 },
  { name: '八方封锁', board: 9, sym: cross(4, 4), sources: 4, moves: 2, blocked: 6, strays: 3, arrows: true, hints: 0 },
  { name: '旋转终锁', board: 9, sym: r(4, 4), sources: 4, moves: 2, blocked: 6, strays: 3, arrows: true, hints: 0 },
  { name: '万象归一', board: 9, sym: g(d1(0), d2(8)), sources: 4, moves: 2, blocked: 6, strays: 3, arrows: true, hints: 0 },
]

const CHAPTER_SPECS = [
  { chapter: 11, specs: CH11 },
  { chapter: 12, specs: CH12 },
  { chapter: 13, specs: CH13 },
  { chapter: 14, specs: CH14 },
]

/** 确定性伪随机（mulberry32）：同种子同结果，保证脚本可复跑 */
function rngOf(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DIRS = ['U', 'R', 'D', 'L']

function buildLevel(spec, id, seed) {
  const rand = rngOf(seed)
  const sym = normalizeSym(spec.sym)
  const axis = axisCells(sym, spec.board)
  const n = spec.board
  const free = []
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
    if (!axis.has(`${x},${y}`)) free.push([x, y])
  }
  const shuffle = (arr) => {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // 1) 暗域：从自由格里挑，避开将来的轴格
  const blocked = shuffle(free).slice(0, spec.blocked || 0).map((c) => c.slice())

  // 2) 源点：逐个随机试放，用真实装配器验证（含「像不能压暗域/轴格/别的源点」）
  const sources = []
  const want = spec.sources
  for (let i = 0; i < want; i++) {
    let placed = false
    for (const cell of shuffle(free)) {
      if (sources.some((s) => s[0] === cell[0] && s[1] === cell[1])) continue
      if (blocked.some((b) => b[0] === cell[0] && b[1] === cell[1])) continue
      const candidate = spec.arrows
        ? [...sources, [cell[0], cell[1], DIRS[Math.floor(rand() * 4)]]]
        : [...sources, [cell[0], cell[1]]]
      try {
        const lv = hydrateLevel({
          id, name: 'probe', chapter: 1, board: n, sym: spec.sym,
          sources: candidate, blocked, moves: 9, hints: 1, arrows: !!spec.arrows,
        })
        // 目标数必须等于 源点 × (群阶-1)：否则说明有目标重合，难度会失真
        if (lv.targetCount !== candidate.length * (groupOrder(sym) - 1)) continue
        sources.push(candidate[candidate.length - 1])
        placed = true
        break
      } catch {
        // 该格位不合法，换下一个
      }
    }
    if (!placed) throw new Error(`第 ${id} 关：源点 ${i + 1} 找不到合法格位`)
  }

  // 3) 残星：避开源点/目标/暗域/轴格，且「镜像点在板内但不是目标」
  const strays = []
  const probe = hydrateLevel({
    id, name: 'probe', chapter: 1, board: n, sym: spec.sym,
    sources, blocked, moves: 9, hints: 1, arrows: !!spec.arrows,
  })
  const targets = probe.targets
  for (let i = 0; i < (spec.strays || 0); i++) {
    let placed = false
    for (const cell of shuffle(free)) {
      if (blocked.some((b) => b[0] === cell[0] && b[1] === cell[1])) continue
      if (sources.some((s) => s[0] === cell[0] && s[1] === cell[1])) continue
      if (strays.some((s) => s[0] === cell[0] && s[1] === cell[1])) continue
      if (targets.has(`${cell[0]},${cell[1]}`)) continue
      const img = imageOf(sym, cell)
      if (img[0] < 0 || img[0] >= n || img[1] < 0 || img[1] >= n) continue
      if (targets.has(`${img[0]},${img[1]}`)) continue
      if (sources.some((s) => s[0] === img[0] && s[1] === img[1])) continue
      strays.push(cell)
      placed = true
      break
    }
    if (!placed) throw new Error(`第 ${id} 关：残星 ${i + 1} 找不到合法格位`)
  }

  const raw = {
    id,
    name: spec.name,
    chapter: spec.chapter,
    board: n,
    sym: spec.sym,
    sources,
    strays: strays.length ? strays : [],
    arrows: !!spec.arrows,
    moves: spec.moves,
    hints: spec.hints,
    showMismatch: spec.showMismatch !== false,
  }
  if (blocked.length) raw.blocked = blocked
  const lv = hydrateLevel(raw)
  raw.targetCount = lv.targetCount
  return raw
}

const srcData = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const oldLevels = srcData.levels.slice()
const newLevels = []
let nextId = Math.max(...oldLevels.map((l) => l.id)) + 1

for (const { chapter, specs } of CHAPTER_SPECS) {
  for (const spec of specs) {
    const seedBase = nextId * 7919 + chapter * 131
    let lv = null
    // 复合双轴关的源点密度高时容易把像撞到别的源点上：换随机种子重试，
    // 仍不行就少放一个源点（保持「可解」优先于「凑数」）
    for (let reduce = 0; reduce <= 2 && !lv; reduce++) {
      const shrunk = { ...spec, chapter, sources: Math.max(2, spec.sources - reduce), showMismatch: chapter === 14 ? false : spec.showMismatch }
      for (let attempt = 0; attempt < 10 && !lv; attempt++) {
        try {
          lv = buildLevel(shrunk, nextId, seedBase + attempt * 997)
        } catch { /* 换种子 */ }
      }
    }
    if (!lv) throw new Error(`第 ${nextId} 关生成失败（${spec.name}）`)
    if (lv.sources.length !== spec.sources) {
      console.log(`  · 第 ${nextId} 关（${spec.name}）源点从 ${spec.sources} 降到 ${lv.sources.length}`)
    }
    newLevels.push(lv)
    nextId += 1
  }
}

const out = {
  version: 1.2,
  levels: [...oldLevels, ...newLevels],
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')

console.log(`✓ 写入 ${path.relative(ROOT, OUT)}：共 ${out.levels.length} 关（新增 ${newLevels.length} 关）`)
for (const l of newLevels) {
  console.log(
    `  L${String(l.id).padStart(2)} ${l.name.padEnd(6, '　')} 章${l.chapter} 板${l.board} ` +
    `源${l.sources.length} 残${(l.strays || []).length} 暗${(l.blocked || []).length} ` +
    `补${l.targetCount} 提交${l.moves} 提示${l.hints}${l.arrows ? ' 箭头' : ''}${l.showMismatch === false ? ' 盲判' : ''}`,
  )
}
