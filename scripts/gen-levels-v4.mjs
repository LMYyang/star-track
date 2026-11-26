// 生成第 15–17 章（第 97–132 关）并合并出 src/data/levels.v4.json
// 用法：node scripts/gen-levels-v4.mjs
// 新元素：d4 八重星芒（旋转 × 过中心镜轴，8 阶群，一源补七点）、t 星阵平移（沿向量复制 1–3 步）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hydrateLevel } from '../src/core/star/levels.js'
import { normalizeSym, axisCells, groupOrder, imageOf } from '../src/core/star/symmetry.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src', 'data', 'levels.v3.json')
const OUT = path.join(ROOT, 'src', 'data', 'levels.v4.json')

const d1 = (c) => ({ type: 'd1', c })
const d2 = (c) => ({ type: 'd2', c })
const g = (a, b) => ({ type: 'g', a, b })
const v = (axis) => ({ type: 'v', axis })
const h = (axis) => ({ type: 'h', axis })
const cross = (ax, ay) => ({ type: 'cross', ax, ay })
const r = (cx, cy) => ({ type: 'r', cx, cy })
const d4 = (cx, cy, axis = 'v') => ({ type: 'd4', cx, cy, axis })
const t = (vx, vy, steps = 1) => ({ type: 't', vx, vy, steps })

/** 第 15 章「星芒」：八重对称，一个源点补七颗 */
const CH15 = [
  { name: '初芒', board: 7, sym: d4(3, 3), sources: 1, moves: 4, hints: 1 },
  { name: '横芒', board: 7, sym: d4(3, 3, 'h'), sources: 1, moves: 4, hints: 1 },
  { name: '斜芒', board: 7, sym: d4(3, 3, 'd1'), sources: 1, moves: 4, hints: 0 },
  { name: '双星芒', board: 9, sym: d4(4, 4), sources: 2, moves: 4, hints: 1 },
  { name: '横轴双芒', board: 9, sym: d4(4, 4, 'h'), sources: 2, moves: 4, hints: 0 },
  { name: '斜轴双芒', board: 9, sym: d4(4, 4, 'd2'), sources: 2, moves: 4, hints: 0 },
  { name: '芒中有暗', board: 9, sym: d4(4, 4), sources: 2, moves: 3, hints: 0, blocked: 2 },
  { name: '斜芒暗影', board: 9, sym: d4(4, 4, 'd1'), sources: 2, moves: 3, hints: 0, blocked: 2 },
  { name: '三芒环', board: 9, sym: d4(4, 4), sources: 3, moves: 3, hints: 0, blocked: 2 },
  { name: '三芒横环', board: 9, sym: d4(4, 4, 'h'), sources: 3, moves: 3, hints: 0, blocked: 4 },
  { name: '芒刺', board: 9, sym: d4(4, 4, 'd1'), sources: 3, moves: 2, hints: 0, blocked: 4 },
  { name: '满芒', board: 9, sym: d4(4, 4, 'd2'), sources: 3, moves: 2, hints: 0, blocked: 4, strays: 1 },
]

/** 第 16 章「星阵」：平移复制，注意向量与步数 */
const CH16 = [
  { name: '阵起', board: 7, sym: t(1, 0), sources: 3, moves: 4, hints: 1 },
  { name: '纵向阵', board: 7, sym: t(0, 1), sources: 3, moves: 4, hints: 1 },
  { name: '斜排阵', board: 7, sym: t(2, 1), sources: 3, moves: 4, hints: 1 },
  { name: '密阵', board: 7, sym: t(1, 2), sources: 4, moves: 4, hints: 1 },
  { name: '双步阵', board: 9, sym: t(2, 1, 2), sources: 3, moves: 4, hints: 1 },
  { name: '纵双步阵', board: 9, sym: t(1, 2, 2), sources: 3, moves: 4, hints: 0 },
  { name: '横三连', board: 9, sym: t(3, 0, 2), sources: 4, moves: 3, hints: 0 },
  { name: '暗阵', board: 9, sym: t(2, 2, 2), sources: 4, moves: 3, hints: 0, blocked: 2 },
  { name: '长阵', board: 9, sym: t(1, 0, 3), sources: 4, moves: 3, hints: 0, blocked: 2 },
  { name: '斜长阵', board: 9, sym: t(1, 3, 2), sources: 5, moves: 3, hints: 0, blocked: 3 },
  { name: '密织阵', board: 9, sym: t(2, 1, 2), sources: 5, moves: 2, hints: 0, blocked: 4 },
  { name: '星阵密布', board: 9, sym: t(1, 1, 3), sources: 5, moves: 2, hints: 0, blocked: 4, strays: 1 },
]

/** 第 17 章「终局」：全部元素混排 + 箭头 + 盲判 */
const CH17 = [
  { name: '终局·双镜', board: 9, sym: g(d1(0), d2(8)), sources: 2, moves: 2, blocked: 4, strays: 1, arrows: true, hints: 0 },
  { name: '终局·星芒', board: 9, sym: d4(4, 4), sources: 1, moves: 2, blocked: 2, strays: 1, arrows: true, hints: 0 },
  { name: '终局·星阵', board: 9, sym: t(1, 1, 2), sources: 3, moves: 2, blocked: 3, strays: 1, arrows: true, hints: 0 },
  { name: '终局·旋', board: 9, sym: r(4, 4), sources: 2, moves: 2, blocked: 4, strays: 2, arrows: true, hints: 0 },
  { name: '终局·十字', board: 9, sym: cross(4, 4), sources: 3, moves: 2, blocked: 4, strays: 2, arrows: true, hints: 0 },
  { name: '终局·横芒', board: 9, sym: d4(4, 4, 'h'), sources: 2, moves: 2, blocked: 4, strays: 2, arrows: true, hints: 0 },
  { name: '终局·长阵', board: 9, sym: t(1, 0, 3), sources: 4, moves: 2, blocked: 4, strays: 2, arrows: true, hints: 0 },
  { name: '终局·双镜盲', board: 9, sym: g(d1(0), d2(8)), sources: 3, moves: 2, blocked: 5, strays: 3, arrows: true, hints: 0 },
  { name: '终局·斜芒盲', board: 9, sym: d4(4, 4, 'd1'), sources: 2, moves: 2, blocked: 5, strays: 3, arrows: true, hints: 0 },
  { name: '终局·密阵盲', board: 9, sym: t(2, 1, 2), sources: 4, moves: 2, blocked: 5, strays: 3, arrows: true, hints: 0 },
  { name: '终局·满芒', board: 9, sym: d4(4, 4), sources: 3, moves: 2, blocked: 6, strays: 3, arrows: true, hints: 0 },
  { name: '终局·万象', board: 9, sym: t(1, 1, 3), sources: 5, moves: 2, blocked: 6, strays: 3, arrows: true, hints: 0 },
]

const CHAPTER_SPECS = [
  { chapter: 15, specs: CH15 },
  { chapter: 16, specs: CH16 },
  { chapter: 17, specs: CH17 },
]

function rngOf(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t2 = a
    t2 = Math.imul(t2 ^ (t2 >>> 15), t2 | 1)
    t2 ^= t2 + Math.imul(t2 ^ (t2 >>> 7), t2 | 61)
    return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296
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

  const blocked = shuffle(free).slice(0, spec.blocked || 0).map((c) => c.slice())

  const sources = []
  for (let i = 0; i < spec.sources; i++) {
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
        if (lv.targetCount !== candidate.length * (groupOrder(sym) - 1)) continue
        sources.push(candidate[candidate.length - 1])
        placed = true
        break
      } catch { /* 换格位 */ }
    }
    if (!placed) throw new Error(`第 ${id} 关：源点 ${i + 1} 找不到合法格位`)
  }

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
    showMismatch: spec.chapter === 17 ? false : spec.showMismatch !== false,
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
    for (let reduce = 0; reduce <= 3 && !lv; reduce++) {
      const shrunk = { ...spec, chapter, sources: Math.max(1, spec.sources - reduce) }
      for (let attempt = 0; attempt < 12 && !lv; attempt++) {
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

const out = { version: 1.3, levels: [...oldLevels, ...newLevels] }
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')

console.log(`✓ 写入 ${path.relative(ROOT, OUT)}：共 ${out.levels.length} 关（新增 ${newLevels.length} 关）`)
for (const l of newLevels) {
  console.log(
    `  L${l.id} ${l.name.padEnd(6, '　')} 章${l.chapter} 板${l.board} ` +
    `源${l.sources.length} 残${(l.strays || []).length} 暗${(l.blocked || []).length} ` +
    `补${l.targetCount} 提交${l.moves} 提示${l.hints}${l.arrows ? ' 箭头' : ''}${l.showMismatch === false ? ' 盲判' : ''}`,
  )
}
