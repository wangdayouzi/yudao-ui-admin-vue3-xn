import MarkdownIt from 'markdown-it'

export function isLegacyKnowledgeHtml(content: string) {
  return /^\s*<(?:p|div|h[1-6]|ul|ol|table|blockquote|pre|img)(?:\s|>)/i.test(content)
}

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })
markdown.core.ruler.after('inline', 'knowledge-task-list', (state) => {
  state.tokens.forEach((token, index) => {
    if (token.type !== 'inline' || state.tokens[index - 2]?.type !== 'list_item_open') return
    const first = token.children?.[0]
    if (first?.type !== 'text') return
    const match = /^\[([ xX])\]\s+/.exec(first.content)
    if (!match) return
    first.content = first.content.slice(match[0].length)
    const checkbox = new state.Token('html_inline', '', 0)
    checkbox.content = `<span class="kb-task-checkbox" role="img" aria-label="${match[1] === ' ' ? '未完成' : '已完成'}">${match[1] === ' ' ? '☐' : '☑'}</span> `
    token.children!.unshift(checkbox)
    state.tokens[index - 2].attrJoin('class', 'kb-task-item')
  })
})
const linkOpen = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  tokens[index].attrSet('target', '_blank')
  tokens[index].attrSet('rel', 'noopener noreferrer')
  return linkOpen ? linkOpen(tokens, index, options, env, renderer) : renderer.renderToken(tokens, index, options)
}

/** 返回内容仍须经 DOMPurify 后才允许插入页面，旧富文本也遵守此边界。 */
export function renderKnowledgeMarkdown(content?: string) {
  if (!content?.trim()) return '<p>暂无内容</p>'
  return isLegacyKnowledgeHtml(content) ? content : markdown.render(content)
}
