// 关卡数据校验（CI / 编辑器保存后都跑）：返回错误清单，不抛异常。
// 规则来自需求文档 §6.4「关卡数据硬约束」。
import { hydrateLevel, CHAPTERS } from './levels.js'
import { DIR_KEYS } from './symmetry.js'

const VALID_BOARDS = [5, 7, 9]

export function validateAll(data) {
  const errors = []
  const out = []
  const levels = data?.levels
  if (!Array.isArray(levels) || levels.length === 0) {
    return { ok: false, errors: ['levels 不是非空数组'], levels: [] }
  }

  const ids = new Set()
  let prevChapter = 0
  for (const raw of levels) {
    const tag = `L${raw?.id}`
    try {
      if (ids.has(raw.id)) errors.push(`${tag}: id 重复`)
      ids.add(raw.id)

      if (!VALID_BOARDS.includes(raw.board)) errors.push(`${tag}: board=${raw.board} 非法`)
      if (!Number.isInteger(raw.chapter) || raw.chapter < 1 || raw.chapter > CHAPTERS.length) {
        errors.push(`${tag}: chapter=${raw.chapter} 非法`)
      }
      if (raw.chapter < prevChapter) errors.push(`${tag}: 章节倒序（${raw.chapter} < ${prevChapter}）`)
      prevChapter = raw.chapter

      if (raw.arrows) {
        for (const s of raw.sources || []) {
          if (!DIR_KEYS.includes(s[2])) errors.push(`${tag}: 箭头方向 ${s[2]} 非法`)
        }
      }
      if (!raw.arrows && (raw.sources || []).some((s) => s.length !== 2)) {
        errors.push(`${tag}: 非箭头关的源点必须是 [x,y]`)
      }
      if (raw.arrows && (raw.sources || []).some((s) => s.length !== 3)) {
        errors.push(`${tag}: 箭头关的源点必须是 [x,y,dir]`)
      }

      if (!Number.isInteger(raw.moves) || raw.moves < 1 || raw.moves > 99) {
        errors.push(`${tag}: moves=${raw.moves} 非法`)
      }
      if (!Number.isInteger(raw.hints) || raw.hints < 0 || raw.hints > 2) {
        errors.push(`${tag}: hints=${raw.hints} 非法`)
      }
      if ((raw.strays || []).length > 0 && raw.chapter < 6) {
        errors.push(`${tag}: 残星只允许出现在第六章及以后`)
      }
      if ((raw.strays || []).length > 3) errors.push(`${tag}: 残星最多 3 个`)

      const level = hydrateLevel(raw)
      const expect = level.sources.length * (level.sym.type === 'cross' ? 3 : 1)
      if (level.targetCount !== expect) {
        errors.push(`${tag}: 目标数 ${level.targetCount} ≠ 预期 ${expect}`)
      }
      const cells = level.board * level.board - level.axisCells.size
      if (level.sources.length + level.targetCount > cells) {
        errors.push(`${tag}: 源点+目标超出可用格点`)
      }
      out.push(level)
    } catch (e) {
      errors.push(`${tag}: ${e.message}`)
    }
  }

  // id 必须 1..N 连续
  const maxId = Math.max(...levels.map((l) => l.id))
  for (let i = 1; i <= maxId; i++) if (!ids.has(i)) errors.push(`缺号：第 ${i} 关不存在`)

  return { ok: errors.length === 0, errors, levels: out }
}
