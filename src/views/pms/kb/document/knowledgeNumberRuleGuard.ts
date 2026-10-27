import * as KnowledgeDocumentApi from '@/api/pms/kb/content/document'
import * as KnowledgeFolderApi from '@/api/pms/kb/content/folder'
import * as KnowledgeLibraryApi from '@/api/pms/kb/library'
import { PmsKnowledgeRootId } from '@/views/pms/kb/utils/constants'
import { getEnabledNumberRules } from '@/api/infra/number-rule'

/** 按文档所在的一级目录覆盖规则、知识库默认规则依次判断。 */
export async function getMissingNumberRuleHint(libraryId: number, folderId: number, parentId: number) {
  let selectedRuleId: number | undefined
  let currentFolderId = folderId
  let currentParentId = parentId
  const visitedDocuments = new Set<number>()
  while (currentFolderId === PmsKnowledgeRootId && currentParentId !== PmsKnowledgeRootId && !visitedDocuments.has(currentParentId)) {
    visitedDocuments.add(currentParentId)
    const parent = await KnowledgeDocumentApi.getKnowledgeDocument(currentParentId)
    if (parent.libraryId !== libraryId) break
    currentFolderId = parent.folderId
    currentParentId = parent.parentId
  }

  const visitedFolders = new Set<number>()
  while (currentFolderId !== PmsKnowledgeRootId && !visitedFolders.has(currentFolderId)) {
    visitedFolders.add(currentFolderId)
    const folder = await KnowledgeFolderApi.getKnowledgeFolder(currentFolderId)
    if (folder.libraryId !== libraryId) break
    if (folder.parentId === PmsKnowledgeRootId) {
      selectedRuleId = folder.numberRuleId
      break
    }
    currentFolderId = folder.parentId
  }

  if (!selectedRuleId) {
    const library = await KnowledgeLibraryApi.getKnowledgeLibrary(libraryId)
    selectedRuleId = library.numberRuleId
  }
  if (!selectedRuleId) return '当前位置未配置文档编号规则，请在知识库主页“更多 → 文档编号规则”中设置'
  const enabledRules = await getEnabledNumberRules()
  return enabledRules.some((rule) => rule.id === selectedRuleId)
    ? '' : '当前位置的文档编号规则已停用或不存在，请在知识库主页“更多 → 文档编号规则”中重新设置'
}
