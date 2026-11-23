import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// 这一层是「模板事件必须真的接上脚本」的静态守卫。
// 起因：game.vue 曾把 @change="setDir" 写进模板但脚本里从未定义 setDir，
// 点击方向盘毫无反应，纯逻辑单测完全测不到。这里把所有 .vue 的事件绑定扫一遍。

const SRC = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (name.endsWith('.vue')) out.push(p)
  }
  return out
}

/** 拆出 <template> 与 <script setup> 两段 */
function splitSfc(text) {
  const tplStart = text.indexOf('<template>')
  const tplEnd = text.lastIndexOf('</template>')
  const scriptStart = text.indexOf('<script setup')
  const scriptEnd = text.lastIndexOf('</script>')
  return {
    template: tplStart >= 0 && tplEnd > tplStart ? text.slice(tplStart, tplEnd) : '',
    script: scriptStart >= 0 && scriptEnd > scriptStart ? text.slice(scriptStart, scriptEnd) : '',
  }
}

const BARE_IDENT = /^[A-Za-z_$][\w$]*$/

/** 取模板里所有事件绑定的处理函数名（跳过内联表达式、修饰符、v-on 对象） */
function handlerNames(template) {
  const names = new Set()
  const re = /@[a-zA-Z][\w:-]*(?:\.[a-zA-Z]+)*\s*=\s*"([^"]*)"/g
  for (const m of template.matchAll(re)) {
    const raw = m[1].trim()
    if (BARE_IDENT.test(raw)) names.add(raw)
  }
  return [...names]
}

/** 脚本里是否真的定义了这个名字（函数声明 / 变量声明 / 解构或默认导入） */
function isDefined(script, name) {
  const esc = name.replace(/[$]/g, '\\$')
  const patterns = [
    new RegExp(`function\\s+${esc}\\s*\\(`),
    new RegExp(`(?:const|let|var)\\s+${esc}\\s*=`),
    new RegExp(`import\\s*{[^}]*\\b${esc}\\b`, 's'),
    new RegExp(`import\\s+${esc}\\s+from`),
  ]
  return patterns.some((p) => p.test(script))
}

const files = walk(SRC).filter((f) => readFileSync(f, 'utf8').includes('<template>'))

describe('模板事件绑定 → 脚本定义', () => {
  it('扫到所有页面与组件', () => {
    expect(files.length).toBeGreaterThanOrEqual(10)
  })

  it.each(files.map((f) => [relative(SRC, f), f]))('%s 的每个事件处理函数都有定义', (_, path) => {
    const { template, script } = splitSfc(readFileSync(path, 'utf8'))
    expect(template.length).toBeGreaterThan(0)
    const missing = handlerNames(template).filter((n) => !isDefined(script, n))
    expect(missing, `未定义的处理函数：${missing.join(', ')}`).toEqual([])
  })

  it('守卫本身能识别缺失的函数（自检）', () => {
    const tpl = '<template><view @tap="ghostHandler" /></template>'
    const script = '<script setup>const ok = 1</script>'
    expect(handlerNames(tpl)).toEqual(['ghostHandler'])
    expect(isDefined(script, 'ghostHandler')).toBe(false)
  })
})
