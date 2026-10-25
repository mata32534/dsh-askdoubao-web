// 设置 schema + relay/prompt 纯函数自测
import { Config, schemaStatus } from '../settings.mjs'
import { formatRelay, buildPromptHint, buildTurnReminder, resolveConfig } from '../impl.mjs'

let pass = 0
let fail = 0
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) { pass++; console.log('  ok  ' + name) } else { fail++; console.log('  FAIL ' + name + '\n    got:  ' + JSON.stringify(got) + '\n    want: ' + JSON.stringify(want)) }
}
const ok = (name, cond) => eq(name, !!cond, true)

console.log('settings schema:', schemaStatus)
ok('schemastery 加载成功', Config)

if (Config) {
  const dict = Config.dict || {}
  const metaOf = (k) => (dict[k] && dict[k].meta) || {}
  eq('enabled 默认 true', metaOf('enabled').default, true)
  eq('answerMode 默认 prefixed', metaOf('answerMode').default, 'prefixed')
  eq('confirmBeforeAct 默认 true', metaOf('confirmBeforeAct').default, true)
  eq('「每条消息都问」不再是一个字段（写死）', metaOf('askEveryMessage').default, undefined)
  eq('非法 answerMode 被拒', (() => { try { Config({ answerMode: 'nope' }); return 'accepted' } catch { return 'rejected' } })(), 'rejected')

  const volatile = Object.entries(dict).filter(([, v]) => v && v.meta && v.meta.volatile).map(([k]) => k)
  console.log('  volatile fields:', volatile.join(', ') || '(none)')
  ok('所有公开字段都是 volatile', volatile.length >= 8)
  // 这两个都必须消失：固定的「每条都问」不能被任何开关影响
  ok('字段里没有 askEveryMessage', !volatile.includes('askEveryMessage'))
  ok('autoAsk 回到了字段里（总闸必须能关）', volatile.includes('autoAsk'))
}

console.log('formatRelay')
eq('prefixed 前缀', formatRelay('答案A', 'prefixed'), '我刚问了一下豆包，豆包说：\n\n答案A')
eq('excuse 固定借口（seed=1 → 我懒得思考）', formatRelay('答案A', 'excuse', 1), '因为我懒得思考，所以我去查豆包，豆包说：\n\n答案A')
eq('excuse 第一个借口（seed=0）', formatRelay('答案A', 'excuse', 0), '因为我想光吃白饭不干活，所以我去查豆包，豆包说：\n\n答案A')
eq('旧值 direct 兼容成 excuse', formatRelay('答案A', 'direct', 2), '因为服务器连接失败，所以我去查豆包，豆包说：\n\n答案A')
ok('格式是「因为…，所以…」', formatRelay('x', 'excuse', 0).startsWith('因为') && formatRelay('x', 'excuse', 0).includes('，所以我去查豆包，豆包说：'))
ok('借口池都在', ['我想光吃白饭不干活', '我懒得思考', '服务器连接失败', '网络有波动，我思考不了', '用户没钱供我吃白饭了']
  .every((e, i) => formatRelay('x', 'excuse', i).startsWith('因为' + e + '，所以')))
eq('空回答', formatRelay('   ', 'prefixed'), '')

console.log('resolveConfig')
eq("answerMode 'direct' → 'excuse'", resolveConfig({ answerMode: 'direct' }).answerMode, 'excuse')
eq("answerMode 'excuse' 保留", resolveConfig({ answerMode: 'excuse' }).answerMode, 'excuse')
eq('未知值落回 prefixed', resolveConfig({ answerMode: 'xxx' }).answerMode, 'prefixed')
ok('askEveryMessage 已不是配置项', !('askEveryMessage' in resolveConfig({})))
ok('autoAsk 是配置项且默认开', resolveConfig({}).autoAsk === true)

console.log('buildPromptHint（固定档：每条消息都问，无开关）')
const every = buildPromptHint(resolveConfig({}))
ok('最高优先级段落', every.includes('【最高优先级 · 豆包代替思考】'))
ok('要求 question 照抄原话', every.includes('question 直接照抄用户原话'))
ok('要求原样粘贴 relay', every.includes('原样复制粘贴'))
ok('没调就不许答', every.includes('没有调用 doubao_ask 就不要输出答案'))
ok('电脑操作要真执行', every.includes('豆包给的步骤要真的执行'))
ok('确认格式含「老大，你看可以吗」', every.includes('老大，你看可以吗？'))
ok('NEED_LOGIN 引导', every.includes('doubao_login'))
// 把「检索档」「手动档」那些字眼彻底从提示里去掉，避免模型自己降级
ok('不再出现「只手动」话术', !every.includes('用户明确说'))
ok('不再出现「先调 doubao_ask」的弱化说法', !every.includes('先调 doubao_ask 把问题原样抛'))
// 就算把执行相关开关全关，核心规则也必须还在（写死的）
const minimal = buildPromptHint(resolveConfig({ promptHint: true, askForComputerOps: false, answerMode: 'prefixed' }))
ok('关掉其它开关后核心规则仍在', minimal.includes('【最高优先级 · 豆包代替思考】'))

console.log('buildTurnReminder（每轮固定注入）')
const reminder = buildTurnReminder(resolveConfig({}))
ok('含「本轮规则」', reminder.includes('本轮规则'))
ok('点名 doubao_ask', reminder.includes('doubao_ask'))
ok('要求粘贴 relay', reminder.includes('relay'))
ok('关掉自动询问后为空串', buildTurnReminder(resolveConfig({ autoAsk: false })) === '')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
