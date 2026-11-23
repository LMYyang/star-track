// 关卡校验 CLI：node scripts/validate-levels.mjs
// 成功打印 40 关摘要表并以 0 退出；失败逐条打印错误并以 1 退出（可直接接 CI）。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateAll } from '../src/core/star/validate.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE = process.argv[2] || path.join(ROOT, 'src', 'data', 'levels.v1.json')

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
const { ok, errors, levels } = validateAll(data)

if (!ok) {
  console.error(`✗ 关卡数据校验失败（${errors.length} 处）`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}

const symLabel = (l) => {
  const s = l.sym
  if (s.type === 'v') return `v@${s.hx / 2}`
  if (s.type === 'h') return `h@${s.hy / 2}`
  if (s.type === 'p') return `p(${s.hx / 2},${s.hy / 2})`
  if (s.type === 'cross') return `cross(${s.hx / 2},${s.hy / 2})`
  return `${s.type} c=${s.c}`
}

console.log(`✓ 关卡数据校验通过：${levels.length} 关，文件 ${path.basename(FILE)}（${fs.statSync(FILE).size} bytes）\n`)
console.log('  id  名称      章  板  对称          源  残星  需补  提交  提示  偏差量')
for (const l of levels) {
  console.log(
    [
      String(l.id).padStart(4),
      l.name.padEnd(6, '　'),
      String(l.chapter).padStart(2),
      String(l.board).padStart(3),
      symLabel(l).padEnd(13),
      String(l.sources.length).padStart(3),
      String(l.strays.length).padStart(4),
      String(l.targetCount).padStart(5),
      String(l.moves).padStart(4),
      String(l.hints).padStart(4),
      l.showMismatch ? '   显示' : '   隐藏',
    l.arrows ? ' 箭头关' : '',
    ].join(' ')
  )
}
