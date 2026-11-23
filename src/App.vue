<script>
export default {
  onLaunch() {
    // 只在 H5 生效：音频 play() 被 stop/切页打断会产生 AbortError 噪音，屏蔽这一类无害拒绝
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('unhandledrejection', (e) => {
        const r = e && e.reason
        if (r && (r.name === 'AbortError' || /play\(\) request was interrupted/.test(String(r.message || '')))) {
          e.preventDefault()
        }
      })
    }
  },
}
</script>

<style>
/* 全局深空主题：近黑蓝底 + 暖白星芒 + 淡金轴线 */
page,
body {
  background-color: #070a14;
  color: #e8ecf6;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  /* 防止系统深色模式把界面反色 */
  color-scheme: light only;
}

/* 通用按钮 */
.btn-primary {
  background: linear-gradient(180deg, #7c6be0, #5646b8);
  color: #f4f2ff;
  border-radius: 24rpx;
  font-size: 32rpx;
  padding: 18rpx 64rpx;
  border: none;
  box-shadow: 0 6rpx 18rpx rgba(76, 60, 160, 0.45);
}
.btn-primary[disabled] {
  opacity: 0.45;
}
.btn-secondary {
  background: rgba(124, 107, 224, 0.12);
  color: #d8d2f6;
  border: 2rpx solid rgba(124, 107, 224, 0.5);
  border-radius: 24rpx;
  font-size: 30rpx;
  padding: 16rpx 56rpx;
}
.btn-ghost {
  background: transparent;
  color: #9aa3bb;
  border: 2rpx solid #26304a;
  border-radius: 20rpx;
  font-size: 26rpx;
  padding: 12rpx 32rpx;
}

/* 通用文字 */
.text-dim {
  color: #8d97b0;
}
.text-gold {
  color: #e3c07a;
}
</style>
