import type { PmsKnowledgeDocumentDraftVO } from '@/api/pms/kb/content/document'

export function knowledgeDraftKey(draft: PmsKnowledgeDocumentDraftVO) {
  return JSON.stringify([draft.documentId, draft.baseVersionNo, draft.title, draft.content || '', draft.labelIds || []])
}

/** 每次打开文档独立持有队列，保存不可变快照，失败后下一次保存仍可重试。 */
export function createKnowledgeDraftSaver(
  save: (draft: PmsKnowledgeDocumentDraftVO) => Promise<unknown>,
  onState: (state: 'saving' | 'saved' | 'error', key: string) => void,
  initialDraft: PmsKnowledgeDocumentDraftVO
) {
  let tail: Promise<void> = Promise.resolve()
  let savedKey = knowledgeDraftKey(initialDraft)
  let disposed = false
  let pending = 0
  return {
    save(draft: PmsKnowledgeDocumentDraftVO, force = false) {
      const snapshot = { ...draft, labelIds: [...(draft.labelIds || [])] }
      const key = knowledgeDraftKey(snapshot)
      pending++
      tail = tail.catch(() => undefined).then(async () => {
        // 必须在前一个请求完成后去重，否则 A → B → A 会错误地漏掉最后的 A。
        if (!force && key === savedKey) return
        if (!disposed) onState('saving', key)
        try {
          await save(snapshot)
          savedKey = key
          if (!disposed) onState('saved', key)
        } catch (error) {
          if (!disposed) onState('error', key)
          throw error
        }
      }).finally(() => { pending-- })
      return tail
    },
    flush: () => tail,
    isSaved: (draft: PmsKnowledgeDocumentDraftVO) => pending === 0 && knowledgeDraftKey(draft) === savedKey,
    dispose: () => { disposed = true }
  }
}
