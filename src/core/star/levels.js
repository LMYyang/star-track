// 关卡装配：原始 JSON → 运行期关卡对象（补轴格、推导目标集）
// 纯 JS，无 uni 依赖：测试、校验脚本、前端共用同一份实现。
import { normalizeSym, axisCells, groupOf, applyMat, applyDir, imageOf, keyOf } from './symmetry.js'

/** 七章元信息（与需求文档 §6.3 一致） */
export const CHAPTERS = [
  { no: 1, name: '启航', tag: '竖轴镜像', desc: '轴决定哪个坐标取反' },
  { no: 2, name: '地平', tag: '横轴镜像', desc: '翻转的只是 y' },
  { no: 3, name: '斜光', tag: '45° 斜轴', desc: '翻折会互换 x 与 y' },
  { no: 4, name: '星心', tag: '中心对称', desc: '左右与上下同时反' },
  { no: 5, name: '十字', tag: '双轴对称', desc: '一点补三点，按象限成组' },
  { no: 6, name: '残星', tag: '干扰点', desc: '有的星不该被镜像' },
  { no: 7, name: '星矢', tag: '方向翻转', desc: '位置对了，方向也要对' },
  { no: 8, name: '星旋', tag: '四重旋转', desc: '绕中心转 90°，一个点绕出三颗' },
  { no: 9, name: '暗域', tag: '禁落星格', desc: '暗斑处落不下星，只能绕开' },
  { no: 10, name: '织星', tag: '综合终章', desc: '旋转、残星、暗域与方向一起上' },
]

/**
 * 由源点推导目标集。
 * 返回 Map<key, { p, src }>，key 含方向（箭头关）。
 * 越界 / 落在轴格 / 镜像重复 都在这里抛错（关卡校验器提前暴露）。
 */
export function deriveTargets(level) {
  const { sym, board, axisCells: axis, sources, arrows } = level
  const blocked = level.blockedCells || new Set()
  const sourceXY = new Set(sources.map((s) => `${s[0]},${s[1]}`))
  const map = new Map()
  const group = groupOf(sym)
  for (const s of sources) {
    for (let i = 1; i < group.length; i++) {
      const q = applyMat(group[i], s)
      if (q[0] === s[0] && q[1] === s[1]) continue // 不动点（旋转中心格）本来就在源点上
      if (q[0] < 0 || q[0] >= board || q[1] < 0 || q[1] >= board) {
        throw new Error(`关卡 ${level.id}: 源点 ${keyOf(s)} 的像 ${keyOf(q)} 越界`)
      }
      if (axis.has(keyOf(q))) {
        throw new Error(`关卡 ${level.id}: 源点 ${keyOf(s)} 的像 ${keyOf(q)} 落在轴格`)
      }
      if (blocked.has(keyOf(q))) {
        throw new Error(`关卡 ${level.id}: 源点 ${keyOf(s)} 的像 ${keyOf(q)} 落在暗域`)
      }
      if (sourceXY.has(`${q[0]},${q[1]}`)) {
        throw new Error(`关卡 ${level.id}: 源点 ${keyOf(s)} 的像 ${keyOf(q)} 与源点重合`)
      }
      const p = arrows ? [q[0], q[1], applyDir(group[i], s[2])] : [q[0], q[1]]
      const k = keyOf(p)
      if (!map.has(k)) map.set(k, { p, src: s })
    }
  }
  return map
}

/** 单关装配：合法性检查 + 目标集 */
export function hydrateLevel(raw) {
  if (!raw || typeof raw.id !== 'number') throw new Error('关卡缺少数字 id')
  if (![5, 7, 9].includes(raw.board)) throw new Error(`关卡 ${raw.id}: board 必须是 5/7/9`)
  if (!Array.isArray(raw.sources) || raw.sources.length === 0) throw new Error(`关卡 ${raw.id}: 没有源点`)

  const sym = normalizeSym(raw.sym)
  const axis = axisCells(sym, raw.board)
  const blockedList = (raw.blocked || []).map((s) => s.slice())
  const level = {
    id: raw.id,
    name: raw.name || `第 ${raw.id} 关`,
    chapter: raw.chapter,
    board: raw.board,
    sym,
    axisCells: axis,
    sources: raw.sources.map((s) => s.slice()),
    strays: (raw.strays || []).map((s) => s.slice()),
    blockedList,
    blockedCells: new Set(blockedList.map((b) => `${b[0]},${b[1]}`)),
    arrows: !!raw.arrows,
    moves: raw.moves == null ? 5 : raw.moves,
    hints: raw.hints == null ? 1 : raw.hints,
    showMismatch: raw.showMismatch !== false,
  }

  // 源点合法性
  const seen = new Set()
  for (const s of level.sources) {
    if (!Array.isArray(s) || s.length !== (level.arrows ? 3 : 2)) {
      throw new Error(`关卡 ${level.id}: 源点格式错误 ${JSON.stringify(s)}`)
    }
    if (s[0] < 0 || s[0] >= level.board || s[1] < 0 || s[1] >= level.board) {
      throw new Error(`关卡 ${level.id}: 源点 ${keyOf(s)} 越界`)
    }
    if (axis.has(keyOf(s))) throw new Error(`关卡 ${level.id}: 源点 ${keyOf(s)} 落在轴格`)
    if (seen.has(keyOf(s))) throw new Error(`关卡 ${level.id}: 源点重复 ${keyOf(s)}`)
    seen.add(keyOf(s))
  }

  // 暗域（禁落格）合法性
  for (const b of level.blockedList) {
    if (!Array.isArray(b) || b.length !== 2) throw new Error(`关卡 ${level.id}: 暗域格格式错误`)
    if (b[0] < 0 || b[0] >= level.board || b[1] < 0 || b[1] >= level.board) {
      throw new Error(`关卡 ${level.id}: 暗域格 ${keyOf(b)} 越界`)
    }
    if (axis.has(keyOf(b))) throw new Error(`关卡 ${level.id}: 暗域格 ${keyOf(b)} 落在轴格`)
    if (seen.has(keyOf(b))) throw new Error(`关卡 ${level.id}: 暗域格 ${keyOf(b)} 与源点重合`)
  }
  if (level.blockedCells.size !== level.blockedList.length) {
    throw new Error(`关卡 ${level.id}: 暗域格重复`)
  }

  level.targets = deriveTargets(level)
  level.targetCount = level.targets.size

  // 箭头关：一个格点只能落一颗星，若同一格需要两个方向，玩家永远补不出来
  if (level.arrows) {
    const pos = new Set()
    for (const { p } of level.targets.values()) {
      const k = `${p[0]},${p[1]}`
      if (pos.has(k)) throw new Error(`关卡 ${level.id}: 同一格点出现两个方向目标 ${k}`)
      pos.add(k)
    }
  }

  // 残星：不得与源点/目标/暗域重合；镜像必须在板内且不与目标重合（否则不是干扰星）
  const boardKeys = seen
  for (const d of level.strays) {
    if (d[0] < 0 || d[0] >= level.board || d[1] < 0 || d[1] >= level.board) {
      throw new Error(`关卡 ${level.id}: 残星 ${keyOf(d)} 越界`)
    }
    if (boardKeys.has(keyOf(d))) throw new Error(`关卡 ${level.id}: 残星与源点重合 ${keyOf(d)}`)
    if (level.targets.has(keyOf(d))) throw new Error(`关卡 ${level.id}: 残星与目标重合 ${keyOf(d)}`)
    if (level.blockedCells.has(keyOf(d))) throw new Error(`关卡 ${level.id}: 残星与暗域重合 ${keyOf(d)}`)
    // 干扰星只需「看起来可镜像」：镜像点留在板内、且不是合法目标
    const m = imageOf(level.sym, d)
    if (m[0] < 0 || m[0] >= level.board || m[1] < 0 || m[1] >= level.board) {
      throw new Error(`关卡 ${level.id}: 残星 ${keyOf(d)} 的镜像越界`)
    }
    if (level.targets.has(keyOf(m))) {
      throw new Error(`关卡 ${level.id}: 残星 ${keyOf(d)} 的镜像 ${keyOf(m)} 落在目标集`)
    }
  }

  // 可用格点必须装得下「源点 + 目标」
  const freeCells = level.board * level.board - axis.size - level.blockedCells.size
  if (level.sources.length + level.targetCount > freeCells) {
    throw new Error(`关卡 ${level.id}: 源点+目标 ${level.sources.length + level.targetCount} 超出可用格点 ${freeCells}`)
  }

  return level
}

/** 整包装配：保持 id 升序，附带索引与分章视图 */
export function hydrateLevels(data) {
  if (!data || !Array.isArray(data.levels)) throw new Error('关卡数据缺少 levels 数组')
  const levels = data.levels
    .map(hydrateLevel)
    .sort((a, b) => a.id - b.id)
  const byId = new Map(levels.map((l) => [l.id, l]))
  const chapters = CHAPTERS.map((c) => ({
    ...c,
    levels: levels.filter((l) => l.chapter === c.no),
  }))
  return { version: data.version || 1, levels, byId, chapters }
}

/** 星级规则（唯一口径）：零失误零提示 3★；失误≤2 且提示≤1 得 2★；其余 1★ */
export function rateStar({ pass, mistakes, hintsUsed }) {
  if (!pass) return 0
  if (mistakes === 0 && hintsUsed === 0) return 3
  if (mistakes <= 2 && hintsUsed <= 1) return 2
  return 1
}
