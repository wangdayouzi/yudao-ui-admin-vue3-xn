/** PMS 知识库文档类型 */
export const PmsKnowledgeDocumentType = {
  RICH_TEXT: 3,
  FILE: 4
} as const

/** PMS 知识库允许上传的文件扩展名 */
export const PmsKnowledgeUploadFileTypes = [
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'pdf',
  'rar',
  'zip',
  'png',
  'jpg',
  'jpeg'
] as const

/** PMS 知识库单文件上传上限，单位：MB */
export const PmsKnowledgeUploadFileSize = 100

/** 同时兼容扩展名和已有文件记录中的 MIME 类型 */
export function isPmsKnowledgeOfficeFile(fileType?: string): boolean {
  return [
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ].includes(fileType?.trim().toLowerCase() || '')
}

/** PMS 知识对象类型 */
export const PmsKnowledgeObjectType = {
  LIBRARY: 1,
  FOLDER: 2,
  DOCUMENT: 3,
  FILE: 4
} as const

/** PMS 知识内容根节点编号 */
export const PmsKnowledgeRootId = 0

/** PMS 知识库文档状态 */
export const PmsKnowledgeDocumentStatus = {
  DRAFT: 0,
  NORMAL: 1,
  TEMPLATE: 2
} as const

/** PMS 知识内容协作等级 */
export const PmsKnowledgeContentLevel = {
  MANAGE: 1,
  EDIT: 2,
  PREVIEW: 3,
  DOWNLOAD: 4,
  UPLOAD_DOWNLOAD: 5
} as const

/** PMS 知识内容协作者身份类型 */
export const PmsKnowledgeContentIdentityType = {
  USER: 'user',
  DEPT: 'dept'
} as const

export type PmsKnowledgeContentIdentityType =
  (typeof PmsKnowledgeContentIdentityType)[keyof typeof PmsKnowledgeContentIdentityType]

/** PMS 知识库分组类型 */
export const PmsKnowledgeGroupType = {
  ALL: 1,
  UNGROUPED: 2,
  CUSTOM: 3
} as const

/** PMS 知识库成员等级 */
export const PmsKnowledgeLibraryMemberLevel = {
  CREATOR: 1,
  ADMIN: 2,
  MEMBER: 3
} as const
