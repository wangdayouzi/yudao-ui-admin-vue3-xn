import type { KnowledgeTreeNode } from './types'
import { PmsKnowledgeDocumentType } from '@/views/pms/kb/utils/constants'
import {
  canDeleteKnowledgeContent,
  canEditKnowledgeContent,
  canManageKnowledgeContent
} from '@/views/pms/kb/utils/permission'

export interface KnowledgeNodeAction {
  command: string
  label: string
  icon: string
  divided?: boolean
  danger?: boolean
}

/** 右键与“更多”共用操作项，内容权限与角色权限同时生效。 */
export function getKnowledgeNodeActions(
  node: KnowledgeTreeNode,
  canUpdate: boolean,
  canDelete: boolean
) {
  const actions: KnowledgeNodeAction[] = [
    { command: 'open', label: '打开', icon: 'ep:folder-opened' }
  ]
  if (canUpdate && canEditKnowledgeContent(node.currentUserLevel)) {
    if (node.kind === 'folder') {
      actions.push(
        { command: 'create-document', label: '新建文档', icon: 'ep:document-add', divided: true },
        { command: 'create-folder', label: '新建子文件夹', icon: 'ep:folder-add' },
        { command: 'upload', label: '上传文件', icon: 'ep:upload' }
      )
    } else {
      actions.push({
        command: 'edit',
        label: node.type === PmsKnowledgeDocumentType.FILE ? '替换文件' : '编辑文档',
        icon: 'ep:edit',
        divided: true
      })
      actions.push(
        { command: 'create-child-document', label: '新建子文档', icon: 'ep:document-add' },
        { command: 'upload-child', label: '上传子文件', icon: 'ep:upload' }
      )
    }
    actions.push({ command: 'rename', label: '重命名', icon: 'ep:edit-pen', divided: true })
  }
  if (canUpdate && canManageKnowledgeContent(node.currentUserLevel)) {
    actions.push({ command: 'move', label: '移动', icon: 'ep:rank' })
  }
  if (canDelete && canDeleteKnowledgeContent(node.currentUserLevel)) {
    actions.push({
      command: 'delete',
      label: '移入回收站',
      icon: 'ep:delete',
      divided: true,
      danger: true
    })
  }
  return actions
}
