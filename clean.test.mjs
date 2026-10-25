// 纯函数单测：cleanAnswer / isEchoOfQuestion
import { cleanAnswer, isEchoOfQuestion } from '../impl.mjs'

let pass = 0
let fail = 0
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) { pass++; console.log('  ok  ' + name) } else { fail++; console.log('  FAIL ' + name + '\n    got:  ' + JSON.stringify(got) + '\n    want: ' + JSON.stringify(want)) }
}
const ok = (name, cond) => eq(name, !!cond, true)

console.log('isEchoOfQuestion')
ok('完全相同', isEchoOfQuestion('用一句话说明什么是向量数据库', '用一句话说明什么是向量数据库'))
ok('只差标点空白', isEchoOfQuestion('用一句话说明，什么是向量数据库？', '用一句话说明什么是向量数据库'))
ok('被截断的问句', isEchoOfQuestion('用一句话说明什么', '用一句话说明什么是向量数据库'))
ok('正常回答不算回声', !isEchoOfQuestion('向量数据库是专门存储向量的数据库。', '用一句话说明什么是向量数据库'))
ok('以问句开头的回答不算回声（内容足够长）', !isEchoOfQuestion('用一句话说明什么是向量数据库：它是专门存储向量的数据库。', '用一句话说明什么是向量数据库'))
ok('空文本算回声', isEchoOfQuestion('', '任意问题'))

console.log('cleanAnswer')
eq('去掉结尾追问', cleanAnswer('答案是 A。\n要不要我再展开讲讲？', '问', 1000), '答案是 A。')
eq('去掉下载横幅', cleanAnswer('答案是 A。\n下载豆包电脑版，体验更强大的 AI 能力', '问', 1000), '答案是 A。')
eq('去掉 AI 提示', cleanAnswer('答案是 A。\n内容由 AI 生成，请仔细甄别', '问', 1000), '答案是 A。')
eq('去掉按钮行', cleanAnswer('答案是 A。\n复制\n重新生成\n点赞', '问', 1000), '答案是 A。')
eq('多行正文保留', cleanAnswer('第一行\n第二行\n第三行', '问', 1000), '第一行\n第二行\n第三行')
eq('问句回声被切掉', cleanAnswer('我的问题\n真正的回答', '我的问题', 1000), '真正的回答')
eq('正常问号结尾不误删', cleanAnswer('这就是答案，有什么问题吗？', '问', 1000), '这就是答案，有什么问题吗？')
eq('截断', cleanAnswer('x'.repeat(50), '问', 10).startsWith('x'.repeat(10) + '\n…（回答过长'), true)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
