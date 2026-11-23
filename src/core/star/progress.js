// 进度持久化：只依赖注入的 storage（默认 uni storage），便于 node 单测。
// 单存档 JSON，键 startrack_progress_v1。
const KEY = 'startrack_progress_v1'

export function emptyProgress() {
  return { v: 1, cleared: 0, stars: {}, totalStars: 0, plays: 0, updatedAt: 0 }
}

function uniStorage() {
  return {
    get(k) {
      try { return uni.getStorageSync(k) } catch { return null }
    },
    set(k, v) {
      try { uni.setStorageSync(k, v) } catch { /* 存储不可用：静默，进度退化为仅本局 */ }
    },
    remove(k) {
      try { uni.removeStorageSync(k) } catch { /* 静默 */ }
    },
  }
}

/** 读取并修复存档（字段缺省、脏数据类型都兜住） */
export function loadProgress(storage = uniStorage()) {
  const raw = storage.get(KEY)
  const p = emptyProgress()
  if (!raw || typeof raw !== 'object') return p
  if (Number.isInteger(raw.cleared) && raw.cleared >= 0) p.cleared = raw.cleared
  if (raw.stars && typeof raw.stars === 'object') {
    for (const [k, v] of Object.entries(raw.stars)) {
      const no = Number(k)
      const star = Number(v)
      if (Number.isInteger(no) && no > 0 && star >= 1 && star <= 3) p.stars[no] = star
    }
  }
  p.totalStars = Object.values(p.stars).reduce((s, v) => s + v, 0)
  p.plays = Number.isInteger(raw.plays) ? raw.plays : 0
  p.updatedAt = Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0
  return p
}

export function saveProgress(p, storage = uniStorage()) {
  storage.set(KEY, p)
  return p
}

/** 通关记账：解锁推进 + 星级取历史最高（不降级） */
export function recordWin(p, { levelNo, star }) {
  const next = { ...p, stars: { ...p.stars } }
  if (levelNo > next.cleared) next.cleared = levelNo
  const old = next.stars[levelNo] || 0
  if (star > old) next.stars[levelNo] = star
  next.totalStars = Object.values(next.stars).reduce((s, v) => s + v, 0)
  next.updatedAt = Date.now()
  return next
}

export function recordAttempt(p) {
  return { ...p, plays: (p.plays || 0) + 1, updatedAt: Date.now() }
}

/** 解锁：第 1 关永远可玩，其余要求上一关已通关 */
export function isUnlocked(p, levelNo) {
  return levelNo === 1 || p.cleared >= levelNo - 1
}

export function starOf(p, levelNo) {
  return p.stars[levelNo] || 0
}

export function chapterStars(p, levels) {
  return levels.reduce((s, l) => s + starOf(p, l.id), 0)
}

export function resetProgress(storage = uniStorage()) {
  storage.remove(KEY)
  return emptyProgress()
}
