<template>
  <view class="board-wrap" :style="{ width: size + 'px', height: size + 'px' }">
    <view class="board" id="star-board" :style="{ width: size + 'px', height: size + 'px' }" @tap="onTap">
      <!-- 星域底色与网格 -->
      <view
        v-for="d in dots"
        :key="'g' + d.key"
        class="grid-dot"
        :class="{ onaxis: d.axis }"
        :style="{ left: d.x + 'px', top: d.y + 'px' }"
      />

      <!-- 对称轴 -->
      <view
        v-for="(r, i) in rays"
        :key="'r' + i"
        class="axis-ray"
        :style="rayStyle(r)"
      />

      <!-- 旋转中心：虚线圆环 + 缓慢自转，提示「这里是转不是翻」 -->
      <view v-if="rotRing" class="rot-ring" :style="rotRing">
        <view class="rot-tick t1" />
        <view class="rot-tick t2" />
        <view class="rot-tick t3" />
      </view>

      <!-- 星阵平移：从首颗源星沿向量拉一条虚线箭头，提示复制方向与步数 -->
      <view v-if="shiftArrow" class="shift-arrow" :style="shiftArrow.style" />

      <!-- 暗域：落不下星的暗斑格 -->
      <view
        v-for="(b, i) in blocked"
        :key="'b' + i"
        class="blocked-cell"
        :style="blockedStyle(b)"
      >
        <view class="blocked-core" />
      </view>

      <!-- 残星（干扰点，永不参与对称） -->
      <view
        v-for="(s, i) in strays"
        :key="'s' + i"
        class="stray"
        :style="starStyle(s, 'drift' + (i % 3))"
      >
        <view class="stray-core" />
      </view>

      <!-- 源星（轴一侧已摆好的星） -->
      <view
        v-for="(s, i) in sources"
        :key="'src' + i"
        class="star source"
        :style="starStyle(s)"
      >
        <template v-if="level.arrows">
          <view class="arrow" :style="arrowStyle(s[2])" />
        </template>
        <template v-else>
          <view class="bar h" />
          <view class="bar v" />
          <view class="core" />
        </template>
      </view>

      <!-- 玩家补的星 -->
      <view
        v-for="(p, i) in placed"
        :key="'p' + i"
        class="star placed"
        :class="{ pop: keyOf(p) === lastKey }"
        :style="starStyle(p)"
      >
        <template v-if="level.arrows">
          <view class="arrow" :style="arrowStyle(p[2])" />
        </template>
        <template v-else>
          <view class="dot" />
          <view class="halo" />
        </template>
      </view>

      <!-- 提示光环 -->
      <view v-if="hintPoint" class="hint" :style="starStyle(hintPoint)">
        <view class="hint-ring" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue'
import { keyOf, groupOf, fixedPointOf } from '../../core/star/symmetry.js'

const props = defineProps({
  level: { type: Object, required: true },
  placed: { type: Array, default: () => [] },
  size: { type: Number, default: 600 },
  hintPoint: { type: Array, default: null },
  disabled: { type: Boolean, default: false },
  lastKey: { type: String, default: '' },
})
const emit = defineEmits(['point', 'reject'])

const instance = getCurrentInstance()
const pad = computed(() => props.size * 0.07)
const step = computed(() => (props.size - pad.value * 2) / (props.level.board - 1))
const n = computed(() => props.level.board)

/** 格坐标 → 像素中心 */
const px = (v) => pad.value + v * step.value

const dots = computed(() => {
  const out = []
  for (let x = 0; x < n.value; x++) {
    for (let y = 0; y < n.value; y++) {
      out.push({ key: `${x},${y}`, x: px(x), y: px(y), axis: props.level.axisCells.has(`${x},${y}`) })
    }
  }
  return out
})

const sources = computed(() => props.level.sources)
const strays = computed(() => props.level.strays)
const blocked = computed(() => props.level.blockedList || [])

/** 旋转中心环（r 与 d4 共用） */
const rotRing = computed(() => {
  const s = props.level.sym
  if (!s || (s.type !== 'r' && s.type !== 'd4')) return null
  const d = step.value * 1.15
  return {
    left: px(s.hx / 2) + 'px',
    top: px(s.hy / 2) + 'px',
    width: d + 'px',
    height: d + 'px',
  }
})

/** 对称轴线段（像素坐标），支持竖/横/两条斜轴/中心点/复合双镜 */
const rays = computed(() => raySegs(props.level.sym))

function raySegs(sym) {
  if (!sym) return []
  const P = pad.value
  const S = step.value
  const N = n.value
  const seg = (x1, y1, x2, y2) => ({ x1, y1, x2, y2 })
  const cross = (cx, cy, L) => [seg(cx, cy - L, cx, cy + L), seg(cx - L, cy, cx + L, cy)]

  if (sym.type === 'g') {
    // 复合双镜：两条子轴各自成线，再加一个两轴交点处的准星（A·B 的不动点）
    const out = [...raySegs(sym.a), ...raySegs(sym.b)]
    const fp = fixedPointOf(groupOf(sym)[3])
    if (fp && fp[0] >= 0 && fp[0] < N && fp[1] >= 0 && fp[1] < N) {
      out.push(...cross(px(fp[0]), px(fp[1]), S * 0.34))
    }
    return out
  }
  if (sym.type === 'r') return [] // 旋转没有轴，只画中心环
  if (sym.type === 'd4') {
    // 八重星芒：旋转中心环 + 过中心的镜轴
    const cx = sym.hx / 2
    const cy = sym.hy / 2
    if (sym.axis === 'v') return [seg(px(cx), 0, px(cx), props.size)]
    if (sym.axis === 'h') return [seg(0, px(cy), props.size, px(cy))]
    if (sym.axis === 'd1') {
      const c = cy - cx
      const xa = Math.max(0, -c)
      const xb = Math.min(N - 1, N - 1 - c)
      return [seg(px(xa), px(xa + c), px(xb), px(xb + c))]
    }
    const c = cx + cy
    const xa = Math.max(0, c - (N - 1))
    const xb = Math.min(N - 1, c)
    return [seg(px(xa), px(c - xa), px(xb), px(c - xb))]
  }
  if (sym.type === 'v') return [seg(px(sym.hx / 2), 0, px(sym.hx / 2), props.size)]
  if (sym.type === 'h') return [seg(0, px(sym.hy / 2), props.size, px(sym.hy / 2))]
  if (sym.type === 'cross') {
    const out = []
    if (sym.hx % 2 === 0) out.push(seg(px(sym.hx / 2), 0, px(sym.hx / 2), props.size))
    if (sym.hy % 2 === 0) out.push(seg(0, px(sym.hy / 2), props.size, px(sym.hy / 2)))
    if (out.length === 0) out.push(seg(P, P, props.size - P, props.size - P))
    return out
  }
  if (sym.type === 'p') {
    // 中心对称没有线，画一个十字准星
    return cross(px(sym.hx / 2), px(sym.hy / 2), S * 0.3)
  }
  const c = sym.c
  if (sym.type === 'd1') {
    const xa = Math.max(0, -c)
    const xb = Math.min(N - 1, N - 1 - c)
    return [seg(px(xa), px(xa + c), px(xb), px(xb + c))]
  }
  // d2: x + y = c
  const xa = Math.max(0, c - (N - 1))
  const xb = Math.min(N - 1, c)
  return [seg(px(xa), px(c - xa), px(xb), px(c - xb))]
}
/** 星阵平移箭头：从首颗源星出发，沿 (vx, vy) 拉满 steps 的虚线 + 箭头 */
const shiftArrow = computed(() => {
  const s = props.level.sym
  if (!s || s.type !== 't') return null
  const src = props.level.sources && props.level.sources[0]
  if (!src) return null
  const S = step.value
  const x1 = px(src[0])
  const y1 = px(src[1])
  const x2 = x1 + s.vx * S * s.steps
  const y2 = y1 + s.vy * S * s.steps
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
  return {
    style: {
      left: `${x1}px`,
      top: `${y1 - 1}px`,
      width: `${len}px`,
      transform: `rotate(${angle}deg)`,
      transformOrigin: '0 50%',
    },
    head: { transform: `rotate(${angle}deg)` },
  }
})

function rayStyle(r) {  const dx = r.x2 - r.x1
  const dy = r.y2 - r.y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  return {
    left: `${(r.x1 + r.x2) / 2 - len / 2}px`,
    top: `${(r.y1 + r.y2) / 2 - 1}px`,
    width: `${len}px`,
    height: '2px',
    transform: `rotate(${angle}deg)`,
  }
}

function starStyle(p) {
  return { left: px(p[0]) + 'px', top: px(p[1]) + 'px' }
}

function blockedStyle(p) {
  const d = step.value * 0.92
  return {
    left: px(p[0]) + 'px',
    top: px(p[1]) + 'px',
    width: d + 'px',
    height: d + 'px',
  }
}

const DIR_ANGLE = { U: 0, R: 90, D: 180, L: 270 }
function arrowStyle(d) {
  return { transform: `translate(-50%, -50%) rotate(${DIR_ANGLE[d] || 0}deg)` }
}

// ---- 命中测试：点击坐标 → 最近格点（0.6 格距内才算命中） ----
const rect = ref(null)
let pending = null

function measure() {
  uni.createSelectorQuery()
    .in(instance.proxy)
    .select('.board')
    .boundingClientRect((r) => {
      if (r) rect.value = r
      if (pending) {
        const p = pending
        pending = null
        handle(p)
      }
    })
    .exec()
}

onMounted(measure)

// 窗口尺寸变化（桌面缩放、平板旋转）后，缓存 rect 会失效，点击会全部落到界外。
// 这里跟随 size 变化与窗口 resize 重新测量，保证点击始终按最新几何命中。
watch(() => props.size, () => measure())
const onResize = () => measure()
uni.onWindowResize?.(onResize)
onUnmounted(() => uni.offWindowResize?.(onResize))

function onTap(e) {
  if (props.disabled) return
  const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || {}
  const cx = t.clientX != null ? t.clientX : e.detail?.x
  const cy = t.clientY != null ? t.clientY : e.detail?.y
  if (cx == null || cy == null) return
  if (!rect.value) {
    pending = { cx, cy }
    measure()
    return
  }
  handle({ cx, cy })
}

function handle({ cx, cy }) {
  const lx = cx - rect.value.left
  const ly = cy - rect.value.top
  const fx = (lx - pad.value) / step.value
  const fy = (ly - pad.value) / step.value
  const x = Math.round(fx)
  const y = Math.round(fy)
  if (x < 0 || x >= n.value || y < 0 || y >= n.value) return
  const dist = Math.hypot(fx - x, fy - y)
  if (dist > 0.6) return // 离最近格点太远：忽略，避免误落
  if (props.level.axisCells.has(`${x},${y}`)) {
    emit('reject', { x, y, reason: 'AXIS_CELL' })
    return
  }
  if (props.level.blockedCells && props.level.blockedCells.has(`${x},${y}`)) {
    emit('reject', { x, y, reason: 'BLOCKED' })
    return
  }
  emit('point', { x, y })
}
</script>

<style scoped>
.board-wrap {
  position: relative;
  margin: 0 auto;
}
.board {
  position: relative;
  border-radius: 24rpx;
  background:
    radial-gradient(circle at 22% 16%, rgba(94, 118, 214, 0.16), transparent 55%),
    radial-gradient(circle at 78% 82%, rgba(124, 107, 224, 0.14), transparent 58%),
    #0a1020;
  border: 2rpx solid #1d2540;
  box-shadow: inset 0 0 48rpx rgba(38, 54, 104, 0.6), 0 10rpx 40rpx rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.grid-dot {
  position: absolute;
  width: 10rpx;
  height: 10rpx;
  margin-left: -5rpx;
  margin-top: -5rpx;
  border-radius: 50%;
  background: #3a4769;
  box-shadow: 0 0 6rpx rgba(90, 116, 178, 0.35);
}
.grid-dot.onaxis {
  background: rgba(227, 192, 122, 0.55);
  width: 12rpx;
  height: 12rpx;
  margin-left: -6rpx;
  margin-top: -6rpx;
  box-shadow: 0 0 12rpx rgba(227, 192, 122, 0.45);
}

.axis-ray {
  position: absolute;
  background: linear-gradient(90deg, rgba(227, 192, 122, 0.15), rgba(227, 192, 122, 0.75), rgba(227, 192, 122, 0.15));
  box-shadow: 0 0 18rpx rgba(227, 192, 122, 0.45);
  transform-origin: 50% 50%;
  pointer-events: none;
}

/* 星阵平移参考箭头：金色虚线 + 末端三角，提示复制方向 */
.shift-arrow {
  position: absolute;
  height: 0;
  border-top: 3rpx dashed rgba(227, 192, 122, 0.5);
  pointer-events: none;
  z-index: 2;
}
.shift-arrow::after {
  content: '';
  position: absolute;
  right: -10rpx;
  top: -9rpx;
  width: 0;
  height: 0;
  border-left: 14rpx solid rgba(227, 192, 122, 0.62);
  border-top: 7rpx solid transparent;
  border-bottom: 7rpx solid transparent;
}

/* 源星：四芒星 */
.star {
  position: absolute;
  width: 0;
  height: 0;
}
.star .bar {
  position: absolute;
  background: #f6dca6;
  box-shadow: 0 0 14rpx rgba(246, 220, 166, 0.75);
  border-radius: 4rpx;
}
.star .bar.h {
  width: 30rpx;
  height: 5rpx;
  left: -15rpx;
  top: -2.5rpx;
}
.star .bar.v {
  width: 5rpx;
  height: 30rpx;
  left: -2.5rpx;
  top: -15rpx;
}
.star .core {
  position: absolute;
  width: 10rpx;
  height: 10rpx;
  left: -5rpx;
  top: -5rpx;
  border-radius: 50%;
  background: #fff4d6;
  box-shadow: 0 0 18rpx rgba(255, 236, 190, 0.9);
}

/* 玩家点：冷白圆点 + 外环，和源星形状不同，色盲也能区分 */
.star.placed .dot {
  position: absolute;
  width: 16rpx;
  height: 16rpx;
  left: -8rpx;
  top: -8rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #dbe9ff, #7fa6f2);
  box-shadow: 0 0 16rpx rgba(127, 166, 242, 0.85);
}
.star.placed .halo {
  position: absolute;
  width: 34rpx;
  height: 34rpx;
  left: -17rpx;
  top: -17rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(127, 166, 242, 0.35);
}
.star.placed.pop {
  animation: pop 0.32s ease-out;
}
@keyframes pop {
  0% { transform: scale(0.2); opacity: 0; }
  70% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); }
}

/* 箭头变体 */
.arrow {
  position: absolute;
  width: 0;
  height: 0;
  left: 0;
  top: 0;
  border-left: 11rpx solid transparent;
  border-right: 11rpx solid transparent;
  border-bottom: 24rpx solid #f6dca6;
  filter: drop-shadow(0 0 10rpx rgba(246, 220, 166, 0.7));
  transform-origin: 50% 50%;
}
.star.placed .arrow {
  border-bottom-color: #a9c4ff;
  filter: drop-shadow(0 0 10rpx rgba(127, 166, 242, 0.8));
}

/* 残星：实线冷青细环（与暗域的紫色虚线暗斑区分开）+ 缓慢漂移 */
.stray {
  position: absolute;
  width: 34rpx;
  height: 34rpx;
  margin-left: -17rpx;
  margin-top: -17rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(139, 219, 224, 0.62);
  opacity: 0.95;
  box-shadow: 0 0 14rpx rgba(108, 196, 204, 0.3);
  animation: drift 5.5s ease-in-out infinite;
}
.stray-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8rpx;
  height: 8rpx;
  margin-left: -4rpx;
  margin-top: -4rpx;
  border-radius: 50%;
  background: rgba(139, 219, 224, 0.5);
}
@keyframes drift {
  0% { transform: translate(0, 0); }
  50% { transform: translate(6rpx, -6rpx); }
  100% { transform: translate(0, 0); }
}

/* 旋转中心：虚线圆环 + 三枚曳光点缓慢自转 */
.rot-ring {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2rpx dashed rgba(227, 192, 122, 0.62);
  box-shadow: 0 0 18rpx rgba(227, 192, 122, 0.24), inset 0 0 14rpx rgba(227, 192, 122, 0.12);
  pointer-events: none;
  animation: spin 14s linear infinite;
}
.rot-tick {
  position: absolute;
  width: 7rpx;
  height: 7rpx;
  margin: -3.5rpx 0 0 -3.5rpx;
  border-radius: 50%;
  background: rgba(246, 220, 166, 0.85);
  box-shadow: 0 0 10rpx rgba(246, 220, 166, 0.7);
}
.rot-tick.t1 { left: 50%; top: 0; }
.rot-tick.t2 { left: 100%; top: 50%; }
.rot-tick.t3 { left: 50%; top: 100%; }
@keyframes spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* 暗域格：吞光的暗斑 + 紫色虚线边框（虚线专属于暗域）+ 中间的暗核 */
.blocked-cell {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 14rpx;
  background: radial-gradient(circle at 50% 46%, rgba(4, 5, 10, 0.98), rgba(34, 20, 54, 0.86) 58%, rgba(58, 34, 82, 0.42));
  border: 3rpx dashed rgba(138, 98, 184, 0.86);
  box-shadow: inset 0 0 24rpx rgba(0, 0, 0, 0.92), 0 0 16rpx rgba(112, 70, 150, 0.34);
  pointer-events: none;
}
.blocked-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10rpx;
  height: 10rpx;
  margin: -5rpx 0 0 -5rpx;
  border-radius: 50%;
  background: rgba(178, 132, 220, 0.46);
  box-shadow: 0 0 12rpx rgba(150, 104, 196, 0.6);
}

/* 提示光环 */
.hint {
  position: absolute;
  width: 0;
  height: 0;
}
.hint-ring {
  position: absolute;
  width: 56rpx;
  height: 56rpx;
  left: -28rpx;
  top: -28rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(124, 224, 214, 0.9);
  box-shadow: 0 0 24rpx rgba(124, 224, 214, 0.55);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0% { transform: scale(0.75); opacity: 0.55; }
  50% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(0.75); opacity: 0.55; }
}
</style>
