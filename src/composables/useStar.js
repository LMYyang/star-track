// 单局状态机：落点 / 撤销 / 清空 / 提示 / 提交 / 重开
// 只依赖纯逻辑模块 + uni storage；页面只负责渲染与转发交互。
import { reactive, computed, ref } from 'vue'
import { judgeForUi } from '../core/star/judge.js'
import { nextHint } from '../core/star/hint.js'
import { rateStar } from '../core/star/levels.js'
import { loadProgress, recordWin, recordAttempt, saveProgress } from '../core/star/progress.js'
import { useSound } from './useSound.js'

export function pointKey(p) {
  return p.length === 3 ? `${p[0]},${p[1]},${p[2]}` : `${p[0]},${p[1]}`
}

/** 星级：由 mistakes / hintsUsed 决定，见需求文档 §3.6 */
export function starOfResult({ mistakes, hintsUsed }) {
  return rateStar({ pass: true, mistakes, hintsUsed })
}

export function useStar(level) {
  const sound = useSound()
  const progress = ref(loadProgress())

  const state = reactive({
    phase: 'PLAYING', // PLAYING | WON | FAILED
    placed: [],
    dir: 'U',
    mistakes: 0,
    movesLeft: level.moves,
    hintsLeft: level.hints,
    hintsUsed: 0,
    startedAt: Date.now(),
    elapsedMs: 0,
    hintPoint: null,
    result: null, // { pass, deviations, star }
    lastKey: null,
  })

  const placedCount = computed(() => state.placed.length)
  const targetCount = level.targetCount
  const isArrowLevel = !!level.arrows

  /** 找该坐标上已有的玩家点 */
  function indexAt(x, y) {
    return state.placed.findIndex((p) => p[0] === x && p[1] === y)
  }

  /** 点击格点：有则移除，无则落点（箭头关带当前方向） */
  function tap({ x, y }, dirOverride) {
    if (state.phase !== 'PLAYING') return { ok: false, reason: 'LOCKED' }
    const i = indexAt(x, y)
    if (i >= 0) {
      state.placed.splice(i, 1)
      state.hintPoint = null
      sound.play('remove')
      return { ok: true, action: 'remove' }
    }
    const p = isArrowLevel ? [x, y, dirOverride || state.dir] : [x, y]
    state.placed.push(p)
    state.lastKey = pointKey(p)
    state.hintPoint = null
    sound.play('place')
    return { ok: true, action: 'place', point: p }
  }

  function setDir(d) {
    state.dir = d
    sound.play('tap')
  }

  /** 撤销最后落下的点（按下标栈序，稳定可预期） */
  function undo() {
    if (state.phase !== 'PLAYING' || state.placed.length === 0) return false
    state.placed.pop()
    state.hintPoint = null
    sound.play('remove')
    return true
  }

  function clear() {
    if (state.phase !== 'PLAYING' || state.placed.length === 0) return false
    state.placed = []
    state.hintPoint = null
    sound.play('clear')
    return true
  }

  /** 提示：扣一次用量，返回待揭示的点（null 表示没有可提示项） */
  function hint() {
    if (state.phase !== 'PLAYING' || state.hintsLeft <= 0) return null
    const h = nextHint(level, state.placed)
    if (!h) return null
    state.hintsLeft -= 1
    state.hintsUsed += 1
    state.hintPoint = h.point
    if (isArrowLevel) state.dir = h.point[2]
    sound.play('hint')
    return h
  }

  /** 提交：唯一判定入口；对外只拿 pass / deviations */
  function submit() {
    if (state.phase !== 'PLAYING') return null
    const ui = judgeForUi(level.targets, state.placed)
    state.movesLeft -= 1

    if (ui.pass) {
      const star = starOfResult({ mistakes: state.mistakes, hintsUsed: state.hintsUsed })
      state.phase = 'WON'
      state.result = { pass: true, deviations: 0, star }
      progress.value = saveProgress(recordWin(progress.value, { levelNo: level.id, star }))
      sound.play('win')
      return state.result
    }

    state.mistakes += 1
    state.result = {
      pass: false,
      deviations: ui.deviations,
      star: 0,
      exhausted: state.movesLeft <= 0,
    }
    if (state.movesLeft <= 0) {
      state.phase = 'FAILED'
      sound.play('fail')
    } else {
      sound.play('pass')
    }
    return state.result
  }

  /** 重开：清空玩家点、失误数、提示用量与计时，关卡布局不变 */
  function retry() {
    state.phase = 'PLAYING'
    state.placed = []
    state.dir = 'U'
    state.mistakes = 0
    state.movesLeft = level.moves
    state.hintsLeft = level.hints
    state.hintsUsed = 0
    state.startedAt = Date.now()
    state.elapsedMs = 0
    state.hintPoint = null
    state.result = null
    state.lastKey = null
    sound.play('clear')
  }

  /** 进入关卡时记一次尝试（用于统计，不影响星级） */
  function markEntered() {
    progress.value = saveProgress(recordAttempt(progress.value))
  }

  function tick(now = Date.now()) {
    if (state.phase !== 'PLAYING') return
    state.elapsedMs = now - state.startedAt
  }

  return {
    state, progress, placedCount, targetCount, isArrowLevel,
    tap, setDir, undo, clear, hint, submit, retry, markEntered, tick,
  }
}
