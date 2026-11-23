import { groupOf, applyMat, applyDir, keyOf } from './symmetry.js'

export function deriveTargets(level, sym) {
  const map = new Map()
  const n = level.board
  const axis = level.axisCells
  for (const s of level.sources) {
    for (const m of groupOf(sym)) {
      const q = applyMat(m, s)
      if (q[0] === s[0] && q[1] === s[1]) continue
      if (q[0] < 0 || q[0] >= n || q[1] < 0 || q[1] >= n) {
        throw new Error(`关卡 ${level.id}: 源点 ${keyOf(s)} 的像越界 ${keyOf(q)}`)
      }
      if (axis.has(keyOf(q))) {
        throw new Error(`关卡 ${level.id}: 源点 ${keyOf(s)} 的像落在轴格 ${keyOf(q)}`)
      }
      const p = level.arrows ? [q[0], q[1], applyDir(m, s[2])] : [q[0], q[1]]
      const k = keyOf(p)
      if (!map.has(k)) map.set(k, { p, src: s })
    }
  }
  return map
}

export function judge(targets, placed) {
  const pl = new Map(placed.map((p) => [keyOf(p), p]))
  const missing = []
  const extra = []
  for (const [k, v] of targets) if (!pl.has(k)) missing.push(v)
  for (const [k, p] of pl) if (!targets.has(k)) extra.push(p)
  return {
    pass: missing.length === 0 && extra.length === 0,
    deviations: missing.length + extra.length,
    missing,
    extra,
  }
}

export function judgeForUi(targets, placed) {
  const r = judge(targets, placed)
  return { pass: r.pass, deviations: r.deviations }
}
