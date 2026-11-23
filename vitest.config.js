import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// 纯逻辑测试用 node 环境；需要挂载组件的用例在文件顶部加 `// @vitest-environment jsdom`。
// 不加载 uni 插件（uni 插件在 VITEST 下会触发 vue 别名导致 plugin-vue 启动失败），
// 只加载 @vitejs/plugin-vue，并把 uni 的内置标签当作自定义元素，避免解析成未注册组件。
const UNI_TAGS = new Set(['view', 'text', 'image', 'scroll-view', 'swiper', 'swiper-item', 'button'])

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: { isCustomElement: (tag) => UNI_TAGS.has(tag) },
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})
