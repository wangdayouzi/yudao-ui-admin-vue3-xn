const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function loadTs(name) {
  const filename = path.resolve(__dirname, '../src/views/pms/kb/document', name)
  const instance = new Module(filename, module)
  instance.filename = filename
  instance.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = instance.require.bind(instance)
  instance.require = (id) => {
    if (id.startsWith('@/views/pms/kb/utils/')) return loadTs(path.resolve(__dirname, '../src/views/pms/kb/utils', id.split('/').pop() + '.ts'))
    if (id.startsWith('.')) {
      const local = path.resolve(path.dirname(filename), id + '.ts')
      if (fs.existsSync(local)) return loadTs(local)
    }
    return originalRequire(id)
  }
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  })
  instance._compile(compiled.outputText, filename)
  return instance.exports
}

const { createKnowledgeDraftSaver } = loadTs('knowledgeDraftSaver.ts')
const { renderKnowledgeMarkdown, isLegacyKnowledgeHtml } = loadTs('knowledgeMarkdown.ts')
const draft = (content, documentId = 1) => ({ documentId, baseVersionNo: 1, title: '标题', content, labelIds: [2] })

test('排队中的 B 完成后必须保存用户重新输入的 A', async () => {
  const saved = []
  let release
  const wait = new Promise(resolve => { release = resolve })
  const saver = createKnowledgeDraftSaver(async snapshot => {
    saved.push(snapshot.content)
    if (snapshot.content === 'B') await wait
  }, () => {}, draft('A'))
  const first = saver.save(draft('B'))
  const second = saver.save(draft('A'))
  assert.equal(saver.isSaved(draft('A')), false)
  release()
  await Promise.all([first, second])
  assert.deepEqual(saved, ['B', 'A'])
  assert.equal(saver.isSaved(draft('A')), true)
})

test('保存快照不受标签后续修改影响，失败后可重试', async () => {
  const saved = []
  const saver = createKnowledgeDraftSaver(async snapshot => {
    saved.push(snapshot)
    if (saved.length === 1) throw Error('offline')
  }, () => {}, draft('initial'))
  const snapshot = draft('new')
  const first = saver.save(snapshot)
  snapshot.labelIds.push(3)
  await assert.rejects(first, /offline/)
  await saver.save(draft('new'))
  assert.deepEqual(saved[0].labelIds, [2])
  assert.equal(saved.length, 2)
  await saver.flush()
})

test('关闭旧会话后其异步保存不得更新新文档的界面状态', async () => {
  const states = []
  let release
  const wait = new Promise(resolve => { release = resolve })
  const old = createKnowledgeDraftSaver(async () => wait, (state) => states.push(state), draft('old'))
  const request = old.save(draft('changed'))
  await Promise.resolve()
  old.dispose()
  const count = states.length
  const current = createKnowledgeDraftSaver(async () => {}, () => {}, draft('other', 9))
  release()
  await request
  assert.equal(states.length, count)
  assert.equal(current.isSaved(draft('other', 9)), true)
})

test('Markdown 预览支持清单、嵌套列表、表格、代码并阻止危险链接', () => {
  const output = renderKnowledgeMarkdown('- [x] 完成\n- [ ] 待办\n  - 子项\n\n[x] 普通段落\n\n|甲|乙|\n|--|--|\n|1|2|\n\n```html\n<script>alert(1)</script>\n```\n\n[不安全](javascript:alert(1))')
  assert.equal((output.match(/kb-task-checkbox/g) || []).length, 2)
  assert.match(output, /已完成/)
  assert.match(output, /未完成/)
  assert.match(output, /<table>/)
  assert.match(output, /&lt;script&gt;/)
  assert.doesNotMatch(output, /href="javascript:/)
  assert.match(renderKnowledgeMarkdown('[正常](https://example.com)'), /rel="noopener noreferrer"/)
})

test('旧富文本保留结构交由 DOMPurify 清洗，Markdown 代码块不误判为旧正文', () => {
  const html = '<p>旧正文<strong>加粗</strong></p>'
  assert.equal(isLegacyKnowledgeHtml(html), true)
  assert.equal(renderKnowledgeMarkdown(html), html)
  assert.equal(isLegacyKnowledgeHtml('```html\n<p>例子</p>\n```'), false)
  assert.match(renderKnowledgeMarkdown('   '), /暂无内容/)
})

const { confirmKnowledgeName } = loadTs('../utils/interaction.ts')
const { getKnowledgeNodeActions } = loadTs('knowledgeNodeActions.ts')

test('名称回车确认必须避开输入法选词、组合键和重复按键', () => {
  let submitted = 0
  let prevented = 0
  const event = { isComposing: false, keyCode: 13, repeat: false, preventDefault: () => prevented++ }
  for (const blocked of [{ isComposing: true }, { keyCode: 229 }, { repeat: true }, { shiftKey: true }, { ctrlKey: true }]) {
    confirmKnowledgeName({ ...event, ...blocked }, () => submitted++)
  }
  assert.equal(submitted, 0)
  assert.equal(prevented, 0)
  confirmKnowledgeName(event, () => submitted++)
  assert.equal(submitted, 1)
  assert.equal(prevented, 1)
})

const folderNode = { key: 'folder-1', entityId: 1, kind: 'folder', label: '文件夹', currentUserLevel: 1, children: [] }
test('右键菜单同时服从角色权限和协作等级', () => {
  assert.deepEqual(getKnowledgeNodeActions(folderNode, false, false).map(x => x.command), ['open'])
  assert.deepEqual(getKnowledgeNodeActions({ ...folderNode, currentUserLevel: 3 }, true, true).map(x => x.command), ['open'])
  const uploader = getKnowledgeNodeActions({ ...folderNode, currentUserLevel: 5 }, true, true).map(x => x.command)
  assert.ok(uploader.includes('create-document'))
  assert.ok(!uploader.includes('delete'))
  assert.ok(!uploader.includes('move'))
})

test('文件和文档菜单使用明确的编辑标签，保留独立重命名', () => {
  const file = getKnowledgeNodeActions({ ...folderNode, kind: 'document', type: 4 }, true, true)
  assert.equal(file.find(x => x.command === 'edit').label, '替换文件')
  assert.equal(file.find(x => x.command === 'rename').label, '重命名')
  const document = getKnowledgeNodeActions({ ...folderNode, kind: 'document', type: 3 }, true, true)
  assert.equal(document.find(x => x.command === 'edit').label, '编辑文档')
  assert.ok(document.some(x => x.command === 'create-child-document'))
})
