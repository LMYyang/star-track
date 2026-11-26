<template>
  <view class="page">
    <TopHud
      :level-id="level.id"
      :level-name="level.name"
      :chapter-name="chapterName"
      :sym-text="symText"
      :time-text="timeText"
      :best-star="bestStar"
      :difficulty="diff"
      @back="onBack"
    />

    <view v-if="flashMsg" class="flash">{{ flashMsg }}</view>

    <view class="stage">
      <StarBoard
        :level="level"
        :placed="state.placed"
        :size="boardSize"
        :hint-point="state.hintPoint"
        :last-key="state.lastKey"
        :disabled="state.phase !== 'PLAYING'"
        @point="onPoint"
        @reject="onReject"
      />
    </view>

    <DirectionPad v-if="level.arrows" :dir="state.dir" @change="setDir" />

    <BottomBar
      :placed-count="placedCount"
      :target-count="level.targetCount"
      :moves-left="state.movesLeft"
      :moves-max="level.moves"
      :hints-left="state.hintsLeft"
      :can-undo="state.placed.length > 0 && state.phase === 'PLAYING'"
      :disabled="state.phase !== 'PLAYING'"
      @undo="undo"
      @clear="clear"
      @hint="onHint"
      @submit="onSubmit"
    />

    <ResultSheet
      :visible="sheetVisible"
      :pass="state.phase === 'WON'"
      :star="state.result ? state.result.star : 0"
      :deviations="state.result ? state.result.deviations : 0"
      :show-mismatch="level.showMismatch"
      :exhausted="state.phase === 'FAILED'"
      :level-id="level.id"
      :next-id="nextId"
      @retry="onRetry"
      @next="onNext"
      @home="goHome"
    />

    <GuideOverlay
      :visible="guideVisible"
      :title="guide.title"
      :lines="guide.lines"
      @close="closeGuide"
    />
  </view>
</template>

<script setup>
import { computed, onUnmounted, ref, shallowRef } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StarBoard from '../../components/star/StarBoard.vue'
import TopHud from '../../components/star/TopHud.vue'
import BottomBar from '../../components/star/BottomBar.vue'
import DirectionPad from '../../components/star/DirectionPad.vue'
import ResultSheet from '../../components/star/ResultSheet.vue'
import GuideOverlay from '../../components/star/GuideOverlay.vue'
import { useStar } from '../../composables/useStar.js'
import { LEVEL_MAP, LEVELS, CHAPTERS } from '../../core/star/levelData.js'
import { difficultyOf } from '../../core/star/levels.js'
import { starOf } from '../../core/star/progress.js'

const GUIDE_KEY = 'startrack_guide_seen_v1'

const level = shallowRef(LEVEL_MAP.get(1))
let session = shallowRef(useStar(level.value))
const state = computed(() => session.value.state)
const placedCount = computed(() => session.value.placedCount.value)
const progress = computed(() => session.value.progress.value)

// ---- 选关：?id= 非法时退回第 1 关 ----
onLoad((opt) => {
  const id = Number(opt?.id)
  const lv = LEVEL_MAP.has(id) ? LEVEL_MAP.get(id) : LEVEL_MAP.get(1)
  if (lv.id === level.value.id) {
    session.value.markEntered()
    startTimer()
    prepareGuide(lv)
    return
  }
  loadForLevel(lv)
})

function loadForLevel(lv) {
  level.value = lv
  session.value = useStar(lv)
  session.value.markEntered()
  startTimer()
  prepareGuide(lv)
}

const chapterName = computed(() => {
  const c = CHAPTERS.find((x) => x.no === level.value.chapter)
  return c ? `第 ${c.no} 章 ${c.name}` : ''
})

const symText = computed(() => {
  const s = level.value.sym
  if (s.type === 'v') return `竖轴 x=${s.hx / 2}`
  if (s.type === 'h') return `横轴 y=${s.hy / 2}`
  if (s.type === 'p') return `中心 (${s.hx / 2}, ${s.hy / 2})`
  if (s.type === 'cross') return `十字 (${s.hx / 2}, ${s.hy / 2})`
  if (s.type === 'r') return `旋转 90° (${s.hx / 2}, ${s.hy / 2})`
  if (s.type === 'g') {
    const a = s.a.type === 'd1' ? `╱${s.a.c}` : s.a.type === 'd2' ? `╲${s.a.c}` : s.a.type
    const b = s.b.type === 'd1' ? `╱${s.b.c}` : s.b.type === 'd2' ? `╲${s.b.c}` : s.b.type
    return `双镜 ${a} + ${b}`
  }
  if (s.type === 'd1') return `斜轴 y = x + ${s.c}`
  if (s.type === 'd4') {
    const ax = { v: '竖轴', h: '横轴', d1: '╱', d2: '╲' }[s.axis]
    return `八重 (${s.hx / 2}, ${s.hy / 2}) · ${ax}`
  }
  if (s.type === 't') {
    const sx = s.vx === 0 ? '' : s.vx > 0 ? '→' : '←'
    const sy = s.vy === 0 ? '' : s.vy > 0 ? '↓' : '↑'
    return `平移 ${sy}${sx}(${s.vx}, ${s.vy})×${s.steps}`
  }
  return `斜轴 x + y = ${s.c}`
})

const bestStar = computed(() => starOf(progress.value, level.value.id))
const diff = computed(() => difficultyOf(level.value))
const nextId = computed(() => (level.value.id < LEVELS.length ? level.value.id + 1 : 0))

// ---- 尺寸：正方形星域，按窗口与剩余高度取小 ----
const boardSize = ref(320)
function fitBoard() {
  const info = uni.getSystemInfoSync()
  const w = info.windowWidth || 375
  const h = info.windowHeight || 667
  boardSize.value = Math.max(240, Math.min(w - 40, h - 330, 620))
}
fitBoard()
uni.onWindowResize?.(fitBoard)
// ---- 计时 ----
let timer = null
function startTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    session.value.tick()
  }, 500)
}
onUnmounted(() => {
  if (timer) clearInterval(timer)
  uni.offWindowResize?.(fitBoard)
})

const timeText = computed(() => {
  const s = Math.floor(state.value.elapsedMs / 1000)
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${m}:${ss}`
})

// ---- 提交结果 ----
const sheetVisible = computed(() => state.value.phase !== 'PLAYING')
const flashMsg = ref('')
let flashTimer = null
function flash(text) {
  flashMsg.value = text
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flashMsg.value = '' }, 1800)
}

function onPoint(p) {
  session.value.tap(p)
}
function setDir(d) {
  session.value.setDir(d)
}
function undo() {
  session.value.undo()
}
function clear() {
  session.value.clear()
}
function onReject(e) {
  const reason = typeof e === 'string' ? e : e && e.reason
  flash(reason === 'BLOCKED' ? '暗域里落不下星' : '轴上的格点不能落星')
}
function onSubmit() {
  if (state.value.phase !== 'PLAYING') return
  if (placedCount.value === 0) {
    flash('至少先补一颗星')
    return
  }
  const r = session.value.submit()
  if (r && !r.pass && !r.exhausted) {
    flash(level.value.showMismatch ? `偏差 ${r.deviations} 处` : '还没对齐，再看看')
  }
}
function onHint() {
  const h = session.value.hint()
  if (!h) {
    flash(state.value.hintsLeft <= 0 ? '本关提示已用完' : '已经没有可提示的点了')
  }
}
function onRetry() {
  session.value.retry()
  startTimer()
}
function onNext() {
  if (!nextId.value) return
  uni.redirectTo({ url: `/pages/star/game?id=${nextId.value}` })
}
function goHome() {
  uni.navigateBack({
    fail: () => uni.reLaunch({ url: '/pages/star/index' }),
  })
}
function onBack() {
  if (state.value.phase === 'PLAYING' && state.value.placed.length > 0) {
    uni.showModal({
      title: '退出本关？',
      content: '已摆放的星点不会保存，进度也不记录。',
      confirmText: '退出',
      cancelText: '继续',
      success: (res) => { if (res.confirm) goHome() },
    })
    return
  }
  goHome()
}

// ---- 教学浮层 ----
const guideVisible = ref(false)
const guide = ref({ title: '', lines: [] })
const GUIDE_TEXT = {
  1: {
    title: '沿轴翻折',
    lines: [
      '实心四芒星是源点，用鼠标或手指在另一侧点出它的镜像位置。',
      '镜像就是「离轴一样远、方向相反」：轴在中间，两点连线的中点就落在轴上。',
      '补完后点「提交」，先不用怕错，前 3 关不限提交次数。',
    ],
  },
  2: {
    title: '轴是镜子',
    lines: [
      '这次每颗星都要在轴的另一侧找到对称位置。',
      '提示：先数它离轴几格，再在对面数同样的格数。',
      '落点会轻微吸附到最近的格点，点偏一点也能放下。',
    ],
  },
  3: {
    title: '多补几颗',
    lines: [
      '源点变多了，但每个点仍然各自独立镜像。',
      '可以先从最靠近轴的星开始，逐步往外。',
      '点错了就再点一次那颗星，它会消失。',
    ],
  },
  31: {
    title: '空心环不是源点',
    lines: [
      '虚线空心环是残星：它故意不对称，永远不需要被镜像。',
      '只补实心四芒星的镜像；把残星也镜像过去就会多点一处。',
      '形状不同而不是只靠颜色区分，色觉差异也能分辨。',
    ],
  },
  37: {
    title: '方向也要翻',
    lines: [
      '箭头星的镜像不只是位置，箭头方向也要跟着翻。',
      '先在下方选择方向，再点格点落星。',
      '斜轴上「上」会变成「左」，这是最容易翻错的地方。',
    ],
  },
  41: {
    title: '这次是「转」不是「翻」',
    lines: [
      '金色虚线圆环是旋转中心：整张星图绕它顺时针转 90° 后必须和原来一样。',
      '一颗星会绕着中心转出三颗，分别落在右、下、左三个方向，连起来正好一个方环。',
      '中心落在格点上时那一格是死点，不能落星；落在格心时没有死点。',
    ],
  },
  48: {
    title: '暗斑不能落星',
    lines: [
      '带虚线边框的暗斑是暗域：那里落不下星，点上去只会被弹回。',
      '暗域永远不是答案的一部分，它只负责挡住路，让你绕开它数格子。',
      '把暗域当成星图上的缺口，先把明处的镜像补齐。',
    ],
  },
  56: {
    title: '旋转 + 方向',
    lines: [
      '箭头星在旋转关里，方向会跟着一起转 90°：上→右→下→左。',
      '一颗源星的三个像，方向各不相同，不能只按一个方向补。',
      '先在下方选定方向，再落点，逐颗核对。',
    ],
  },
  65: {
    title: '双镜：两道斜轴',
    lines: [
      '这次是两条斜轴交叉成 X：「╱」翻一次、「╲」翻一次，第三次是绕交点转 180°。',
      '一个源点要补三颗，分别落在斜轴分出的另外三个角区里。',
      '两轴的交点是死点，不能落星；沿轴数格比在心里硬翻更稳。',
    ],
  },
  73: {
    title: '深井：暗域密集',
    lines: [
      '九宫大板上出现了成片暗域——那里点不进去，星也落不下。',
      '暗域会把目标点位挤到板边，先找到离轴最近的空位再往外补。',
      '若把自己补进暗域，会直接被弹回，不消耗失误。',
    ],
  },
  81: {
    title: '星锁：限次提交',
    lines: [
      '从这章起提交次数只剩 2–3 次，用完就失败，别再「试一下看看」。',
      '补完整张图、逐颗核对过再点提交；错了就撤销重补，不浪费提交。',
      '提示也只剩 0–1 次，留在最没把握的那颗星上。',
    ],
  },
  89: {
    title: '万象：盲判',
    lines: [
      '最后一章只会告诉你「通过 / 还没对齐」，不再报偏差几处。',
      '双镜、暗域、残星、箭头会同时出现，先补源点的三种像，再核对残星有没有被误镜像。',
      '只有两次提交机会，全部核对完再提交。',
    ],
  },
  97: {
    title: '星芒：一源七像',
    lines: [
      '圆环是旋转中心，十字线是过中心的镜轴——两者合起来是一个 8 阶的对称群。',
      '一个源点要补七颗：先转 90°/180°/270° 得三颗，再把这四颗各自照镜子又得四颗。',
      '镜轴整条都不能落星，圆心也在轴上；先数清环上的位置再落子。',
    ],
  },
  109: {
    title: '星阵：平移复制',
    lines: [
      '这次不是翻转，而是复制：每颗源星都要沿箭头方向平移 (vx, vy) 复制出后续几颗。',
      '箭头末端有几段就复制几次，每隔一整格都算一颗，方向、距离都要数准。',
      '复制不能越板边，靠边的星只能往板内方向放源点；虚线只提示方向，不告诉你具体补几颗。',
    ],
  },
  121: {
    title: '终局·二：全元素',
    lines: [
      '星芒、星阵、双镜、旋转、暗域、残星、箭头全混在一起，而且全部盲判。',
      '先按「一个源点补几颗」判断是哪套对称，再逐个格位核对。',
      '提交只有两次，宁可撤销重补也不要盲交。',
    ],
  },
}
function prepareGuide(lv) {
  const item = GUIDE_TEXT[lv.id]
  if (!item) {
    guideVisible.value = false
    return
  }
  let seen = {}
  try { seen = uni.getStorageSync(GUIDE_KEY) || {} } catch { seen = {} }
  if (seen[lv.id]) {
    guideVisible.value = false
    return
  }
  guide.value = { id: lv.id, ...item }
  guideVisible.value = true
}
function closeGuide() {
  guideVisible.value = false
  try {
    const seen = uni.getStorageSync(GUIDE_KEY) || {}
    seen[guide.value.id] = true
    uni.setStorageSync(GUIDE_KEY, seen)
  } catch { /* 存储不可用：下次仍然显示，不影响游戏 */ }
}
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 34%, rgba(84, 106, 190, 0.14), transparent 55%),
    #070a14;
}
.stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20rpx;
}
.flash {
  position: absolute;
  left: 50%;
  top: 150rpx;
  transform: translateX(-50%);
  z-index: 90;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: rgba(20, 27, 48, 0.92);
  border: 2rpx solid #2b3559;
  color: #d8d2f6;
  font-size: 24rpx;
  white-space: nowrap;
}
</style>
