// 客户端半端冒烟：模块形状 + 槽位注册 + 样式注入 + 面板构造 + 关键文案
import fs from 'node:fs'
import vm from 'node:vm'

const src = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8')

let pass = 0
let fail = 0
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name) } else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')) }
}

// ── 最小 React 替身 ────────────────────────────────────────────────────────
const hookState = []
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  Component: class { constructor(p) { this.props = p; this.state = {} } },
  useState: (init) => {
    const i = hookState.length
    hookState.push(init)
    return [hookState[i], (v) => { hookState[i] = typeof v === 'function' ? v(hookState[i]) : v }]
  },
  useEffect: () => {},
  useCallback: (fn) => fn,
  useRef: (v) => ({ current: v }),
}

// ── 最小 window / document 替身 ────────────────────────────────────────────
let loaded = null
const appended = []
const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  fetch: async () => ({ ok: false, status: 503, text: async () => '{"ok":false}' }),
  location: { href: 'http://127.0.0.1:19387/' },
  document: {
    head: { appendChild: (el) => appended.push(el) },
    createElement: () => ({ setAttribute() {}, remove() {}, style: {}, textContent: '' }),
    visibilityState: 'visible',
  },
  window: {},
}
sandbox.window.__ModuleLoader__ = { load: (def) => { loaded = def } }
sandbox.window.document = sandbox.document
vm.createContext(sandbox)
vm.runInContext(src, sandbox, { filename: 'client.js' })

ok('__ModuleLoader__.load 被调用', !!loaded)
ok('id 是包名', loaded && loaded.id === 'dsh-doubao-web', loaded && loaded.id)
ok('factory 是函数', loaded && typeof loaded.factory === 'function')

const mod = loaded.factory((name) => {
  if (name === 'react') return React
  throw new Error('unexpected require: ' + name)
})
ok('模块导出 inject', Array.isArray(mod.inject) && mod.inject.includes('slots'), JSON.stringify(mod.inject))
ok('模块导出 apply', typeof mod.apply === 'function')

const registered = []
const slots = {
  inject: (slot, cb) => { ok('用 slots.inject 挂到 ' + slot, slot === 'settings.section'); cb() },
  register: (meta, render) => { registered.push({ meta, render }); return () => {} },
}
const effects = []
const ctx = { get: (n) => (n === 'slots' ? slots : undefined), slots, effect: (fn) => { effects.push(fn); return () => {} } }
mod.apply(ctx)

ok('注册了一个设置页', registered.length === 1, String(registered.length))
const reg = registered[0] || {}
ok('槽位名正确', reg.meta && reg.meta.name === 'settings.section')
ok('id 用 doubao-web', reg.meta && reg.meta.id === 'doubao-web')
ok('order 在 tieba(31) 之后', reg.meta && reg.meta.order > 31)
ok('label 是「豆包代替思考」', reg.meta && reg.meta.label === '豆包代替思考', reg.meta && reg.meta.label)
ok('注入了样式', appended.length === 1 && appended[0].textContent.includes('.dbw'))

let renderErr = null
try {
  const tree = reg.render()
  ok('面板能构造', !!tree)
  const inner = (tree.children || [])[0]
  const PanelFn = inner && inner.type
  ok('拿到 Panel 组件', typeof PanelFn === 'function')
  const view = typeof PanelFn === 'function' ? PanelFn() : null
  const labelText = JSON.stringify(view)
  ok('标题是「豆包代替思考」', labelText.includes('豆包代替思考'))
  ok('未拿到配置时显示读取态', labelText.includes('正在读取配置'))
} catch (e) {
  renderErr = e
  ok('面板能构造', false, String(e && e.stack || e))
}

// 文案/接线断言
for (const [name, needle] of [
  ['DS 回答方式', 'DS 回答方式'],
  ['prefixed 样例', '我刚问了一下豆包，豆包说：'],
  ['excuse 样例', '我懒得思考，所以我去查豆包，豆包说：'],
  ['在浏览器打开豆包按钮', '在浏览器打开豆包'],
  ['体检按钮', '体检（排障）'],
  ['登录说明', '豆包要在自动窗口里登录'],
  ['引擎选项 electron', "'electron'"],
  ['自动询问与执行卡片', '自动询问与执行'],
  ['自动询问总闸开关', 'save({ autoAsk: v })'],
  ['自动询问状态胶囊', '自动询问：关'],
  ['跟随标签（开）', '跟随开启'],
  ['跟随标签（关）', '跟随关闭'],
  ['电脑操作开关', '电脑操作 / 脚本类指令先问豆包怎么做'],
  ['确认开关', '每次动手前都先问我'],
  ['确认格式话术', '老大，你看可以吗？'],
  ['自动执行开关', '自动执行（总开关）'],
  ['插件名', '豆包代替思考'],
]) ok('源码含「' + name + '」', src.includes(needle))

// 用户要求：「每条指令都问豆包」不许再有自己的开关，必须跟自动询问绑在一起
const askSwitches = src.split('save({ autoAsk: v })').length - 1
ok('autoAsk 开关只有一个（页头总闸）', askSwitches === 1, 'count=' + askSwitches)
ok('「每条指令都先问豆包」变成了跟随状态而非开关', src.includes('跟随开启') && !src.includes("title: '用户的每一条指令都先问豆包'"))

// 被点名删掉的东西不能再出现
ok('没有「打开窗口登录」按钮', !src.includes('打开窗口登录'))
ok('没有「显示自动窗口」按钮', !src.includes('显示自动窗口'))
ok('没有「关闭窗口」按钮', !src.includes("'关闭窗口'"))
ok('没有「始终开启」这种写死文案', !src.includes('始终开启'))

// 顺序：登录与自检必须排在回答方式之前
const posActDef = src.indexOf("h('div', { key: 'act'")
const posMode = src.indexOf("h('div', { key: 'mode'")
const posConnUse = src.indexOf('connCard,')
ok('连接卡片定义在回答方式之前', posActDef > 0 && posActDef < posMode)
ok('连接卡片渲染位置在回答方式之前', posConnUse > 0 && posConnUse < posMode)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
