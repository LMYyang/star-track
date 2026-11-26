<template>
  <view class="hud">
    <view class="hud-side">
      <view class="icon-btn" @tap="$emit('back')">
        <text class="icon">‹</text>
      </view>
    </view>
    <view class="hud-center">
      <text class="hud-title">第 {{ levelId }} 关 · {{ levelName }}</text>
      <text class="hud-sub">{{ chapterName }} · {{ symText }}<text v-if="difficulty" class="diff"> · 难度 {{ difficulty }}/5</text></text>
    </view>
    <view class="hud-right">
      <text class="time">{{ timeText }}</text>
      <view class="stars">
        <text v-for="i in 3" :key="i" class="s" :class="{ lit: i <= bestStar }">★</text>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  levelId: { type: Number, default: 1 },
  levelName: { type: String, default: '' },
  chapterName: { type: String, default: '' },
  symText: { type: String, default: '' },
  timeText: { type: String, default: '00:00' },
  bestStar: { type: Number, default: 0 },
  difficulty: { type: Number, default: 0 },
})
defineEmits(['back'])
</script>

<style scoped>
.hud {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: calc(env(safe-area-inset-top) + 16rpx) 24rpx 12rpx;
}
.hud-side { width: 72rpx; }
.icon-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(124, 107, 224, 0.12);
  border: 2rpx solid rgba(124, 107, 224, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon { font-size: 44rpx; color: #d8d2f6; line-height: 1; margin-top: -6rpx; }
.hud-center { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.hud-title { font-size: 30rpx; color: #ece9ff; font-weight: 600; }
.hud-sub { font-size: 22rpx; color: #7d87a3; }
.diff { color: #e3c07a; }
.hud-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6rpx; }
.time { font-size: 24rpx; color: #9aa3bb; font-variant-numeric: tabular-nums; }
.stars { display: flex; gap: 4rpx; }
.s { font-size: 22rpx; color: #3a4360; }
.s.lit { color: #e3c07a; text-shadow: 0 0 10rpx rgba(227, 192, 122, 0.7); }
</style>
