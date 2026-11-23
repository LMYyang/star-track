<template>
  <view class="bar">
    <view class="counts">
      <text class="count">已补 <text class="num">{{ placedCount }}</text> / 需 {{ targetCount }}</text>
      <text v-if="movesMax === 99" class="count">提交 <text class="num">{{ submitted }}</text> 次 · 不限</text>
      <text v-else class="count">提交 <text class="num">{{ submitted }}</text> / {{ movesMax }} 次</text>
      <text v-if="hintsLeft >= 0" class="count">提示 <text class="num">{{ hintsLeft }}</text></text>
    </view>
    <view class="actions">
      <view class="mini" :class="{ off: !canUndo }" @tap="emitIf(canUndo, 'undo')">
        <text>撤销</text>
      </view>
      <view class="mini" :class="{ off: !canUndo }" @tap="emitIf(canUndo, 'clear')">
        <text>清空</text>
      </view>
      <view class="mini" :class="{ off: hintsLeft <= 0 }" @tap="emitIf(hintsLeft > 0, 'hint')">
        <text>提示</text>
      </view>
      <button class="submit" :disabled="disabled" @tap="emitIf(!disabled, 'submit')">提交</button>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  placedCount: { type: Number, default: 0 },
  targetCount: { type: Number, default: 0 },
  movesLeft: { type: Number, default: 0 },
  movesMax: { type: Number, default: 5 },
  hintsLeft: { type: Number, default: 0 },
  canUndo: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['undo', 'clear', 'hint', 'submit'])
const submitted = computed(() => props.movesMax - props.movesLeft)
function emitIf(cond, name) {
  if (cond) emit(name)
}
</script>

<style scoped>
.bar {
  padding: 12rpx 28rpx calc(env(safe-area-inset-bottom) + 20rpx);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.counts { display: flex; gap: 28rpx; }
.count { font-size: 22rpx; color: #7d87a3; }
.num { font-size: 28rpx; color: #e8ecf6; font-weight: 600; }
.actions { display: flex; align-items: center; gap: 14rpx; }
.mini {
  flex: 1;
  height: 76rpx;
  border-radius: 16rpx;
  background: rgba(42, 52, 80, 0.55);
  border: 2rpx solid #26304a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mini.off { opacity: 0.35; }
.mini text { font-size: 24rpx; color: #b9c2d8; }
.submit {
  width: 240rpx;
  margin: 0;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 16rpx;
  border: none;
  color: #fff;
  font-size: 28rpx;
  background: linear-gradient(180deg, #7c6be0, #5646b8);
  box-shadow: 0 6rpx 18rpx rgba(76, 60, 160, 0.4);
}
.submit[disabled] { opacity: 0.45; }
</style>
