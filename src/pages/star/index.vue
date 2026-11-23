<template>
  <view class="page">
    <!-- 背景星点 -->
    <view class="sky">
      <view v-for="(st, i) in skyStars" :key="i" class="sky-dot" :style="st" />
    </view>

    <view class="top-space" />

    <view class="brand">
      <view class="emblem">
        <view class="orbit" />
        <view class="core-star">
          <view class="bar h" />
          <view class="bar v" />
        </view>
        <view class="mirror-star">
          <view class="ring" />
        </view>
      </view>
      <text class="title">星轨对位</text>
      <text class="subtitle">沿对称轴，把星点补成镜像</text>
    </view>

    <view class="menu">
      <button class="btn-primary main" @tap="start">
        {{ progress.cleared > 0 ? `继续 · 第 ${progress.cleared + 1} 关` : '开始观测' }}
      </button>
      <view class="row">
        <view class="btn-secondary half" @tap="openLevels">星图册</view>
        <view class="btn-secondary half" @tap="openHelp">规则</view>
      </view>
    </view>

    <view class="progress-card">
      <view class="pc-item">
        <text class="pc-num">{{ progress.cleared }}<text class="pc-total">/40</text></text>
        <text class="pc-label">已通关</text>
      </view>
      <view class="pc-divider" />
      <view class="pc-item">
        <text class="pc-num gold">{{ progress.totalStars }}<text class="pc-total">/120</text></text>
        <text class="pc-label">累计星数</text>
      </view>
      <view class="pc-divider" />
      <view class="pc-item">
        <text class="pc-num">{{ progress.plays }}</text>
        <text class="pc-label">观测次数</text>
      </view>
    </view>

    <view class="footer">
      <text class="mute" @tap="toggleMute">{{ muted ? '🔇 静音中' : '🔊 音效开' }}</text>
      <text class="ver">v0.1 · 40 关</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { loadProgress, emptyProgress, isUnlocked } from '../../core/star/progress.js'
import { LEVELS } from '../../core/star/levelData.js'
import { useSound } from '../../composables/useSound.js'

const progress = ref(emptyProgress())
const sound = useSound()
const muted = computed(() => sound.muted.value)

onShow(() => {
  progress.value = loadProgress()
})

/** 背景星点：确定性伪随机，避免每次进入都变样 */
const skyStars = computed(() => {
  const out = []
  let seed = 20261123
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  for (let i = 0; i < 46; i++) {
    const size = 1 + Math.round(rnd() * 2)
    out.push({
      left: `${rnd() * 100}%`,
      top: `${rnd() * 100}%`,
      width: size + 'px',
      height: size + 'px',
      opacity: 0.18 + rnd() * 0.5,
      animationDelay: `${rnd() * 4}s`,
    })
  }
  return out
})

function start() {
  const target = LEVELS.find((l) => isUnlocked(progress.value, l.id) && !progress.value.stars[l.id])
    || LEVELS[0]
  uni.navigateTo({ url: `/pages/star/game?id=${target.id}` })
}

function openLevels() {
  uni.navigateTo({ url: '/pages/star/levels' })
}

function openHelp() {
  uni.navigateTo({ url: '/pages/star/help' })
}

function toggleMute() {
  const m = sound.toggleMute()
  if (!m) sound.play('tap')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 56rpx calc(env(safe-area-inset-bottom) + 32rpx);
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 26% 12%, rgba(84, 106, 190, 0.22), transparent 46%),
    radial-gradient(circle at 78% 72%, rgba(118, 92, 200, 0.18), transparent 52%),
    #070a14;
}
.sky { position: absolute; inset: 0; pointer-events: none; }
.sky-dot {
  position: absolute;
  border-radius: 50%;
  background: #dfe7ff;
  animation: twinkle 4s ease-in-out infinite;
}
@keyframes twinkle {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.85; }
}
.top-space { height: 16vh; }

.brand { display: flex; flex-direction: column; align-items: center; gap: 18rpx; }
.emblem {
  position: relative;
  width: 260rpx;
  height: 180rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.orbit {
  position: absolute;
  width: 250rpx;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, rgba(227, 192, 122, 0.5), transparent);
  transform: rotate(-18deg);
}
.core-star { position: relative; left: -46rpx; width: 0; height: 0; }
.core-star .bar {
  position: absolute;
  background: #f6dca6;
  border-radius: 4rpx;
  box-shadow: 0 0 20rpx rgba(246, 220, 166, 0.75);
}
.core-star .bar.h { width: 46rpx; height: 7rpx; left: -23rpx; top: -3rpx; }
.core-star .bar.v { width: 7rpx; height: 46rpx; left: -3rpx; top: -23rpx; }
.mirror-star { position: relative; left: 46rpx; width: 0; height: 0; }
.mirror-star .ring {
  position: absolute;
  width: 40rpx;
  height: 40rpx;
  left: -20rpx;
  top: -20rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(169, 196, 255, 0.85);
  box-shadow: 0 0 24rpx rgba(127, 166, 242, 0.6);
}
.title { font-size: 68rpx; letter-spacing: 10rpx; font-weight: 700; color: #f2eeff; }
.subtitle { font-size: 24rpx; color: #8b95b0; letter-spacing: 2rpx; }

.menu { width: 100%; max-width: 680px; margin-top: 8vh; display: flex; flex-direction: column; gap: 22rpx; }
.main { width: 100%; }
.row { display: flex; gap: 22rpx; }
.half { flex: 1; display: flex; align-items: center; justify-content: center; }

.progress-card {
  margin-top: 48rpx;
  width: 100%;
  max-width: 680px;
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-radius: 20rpx;
  background: rgba(20, 27, 48, 0.6);
  border: 2rpx solid #1d2540;
}
.pc-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.pc-num { font-size: 40rpx; font-weight: 700; color: #dfe7ff; }
.pc-num.gold { color: #e3c07a; }
.pc-total { font-size: 22rpx; color: #5f6884; font-weight: 400; }
.pc-label { font-size: 20rpx; color: #7d87a3; }
.pc-divider { width: 2rpx; height: 56rpx; background: #1d2540; }

.footer {
  margin-top: auto;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding-top: 32rpx;
}
.mute { font-size: 22rpx; color: #7d87a3; }
.ver { font-size: 20rpx; color: #3f4864; }
</style>
