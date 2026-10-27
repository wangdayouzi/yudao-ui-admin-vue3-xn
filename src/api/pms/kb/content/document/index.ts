import request from '@/config/axios'

// PMS 知识库文档 VO
export interface PmsKnowledgeDocumentVO {
  id: number // 文档编号
  libraryId: number // 知识库编号
  permissionId: number // 协作权限编号
  currentUserLevel: number // 当前用户协作等级
  downloadStatus: boolean // 当前用户是否可下载
  folderId: number // 文件夹编号
  parentId: number // 父文档编号
  title: string // 文档标题
  documentCode?: string // 固定业务编号
  attributes?: Record<string, string> // 当前属性值
  carriedAttributes?: Array<{ fieldName: string; fieldCode: string; sourceLibraryId: number; value: string }>
  contentSummary?: string // 正文摘要
  content: string // 文档内容或文件地址
  previewUrl?: string // 文件预览地址
  type: number // 文档类型
  fileType?: string // 文件类型
  fileSize?: number // 文件大小，单位：字节
  versionNo?: number // 当前内容版本号
  status: number // 文档状态
  labelIds?: number[] // 标签编号列表
  creatorUserId?: number // 创建人用户编号
  creatorUserName?: string // 创建人姓名
  favoriteStatus: boolean // 当前用户是否已关注
  likeStatus: boolean // 当前用户是否已点赞
  likeUsers: Array<{
    id: number
    nickname?: string
    avatar?: string
  }> // 点赞用户列表
  createTime: number // 创建时间
  updateTime: number // 更新时间
}

// PMS 知识库文档新增 VO
export interface PmsKnowledgeDocumentCreateReqVO {
  libraryId: number // 知识库编号
  folderId: number // 文件夹编号，0 表示不在文件夹中
  parentId: number // 父文档编号，0 表示根文档
  title: string // 文档标题
  type: number // 文档类型，3 富文本，4 文件
  content?: string // 文档内容或文件地址
  fileType?: string // 文件类型
  fileSize?: number // 文件大小，单位：字节
  status?: number // 0 草稿、1 已发布
  attributes?: Record<string, string>
}

// PMS 知识库文档修改 VO
export interface PmsKnowledgeDocumentUpdateReqVO {
  id: number // 文档编号
  expectedVersionNo?: number // 编辑时读取的版本号
  title?: string // 文档标题
  content?: string // 文档内容或文件地址
  labelIds?: number[] // 标签编号列表，传空数组表示清空标签
  fileType?: string // 文件类型
  fileSize?: number // 文件大小，单位：字节
}

// PMS 知识库文档移动 VO
export interface PmsKnowledgeDocumentMoveReqVO {
  id: number // 文档编号
  targetLibraryId: number // 目标知识库编号
  targetFolderId: number // 目标文件夹编号，0 表示不在文件夹中
  targetParentId: number // 目标父文档编号，0 表示根文档
}

// PMS 知识库文档树节点 VO
export interface PmsKnowledgeDocumentTreeNode {
  id: number // 文档编号
  permissionId: number // 协作权限编号
  currentUserLevel: number // 当前用户协作等级
  parentId: number // 父文档编号
  title: string // 文档标题
  type: number // 文档类型
  fileType?: string // 文件类型
  children: PmsKnowledgeDocumentTreeNode[] // 子文档列表
}

// 查询知识库文档详情
export const getKnowledgeDocument = (id: number, view = false) => {
  return request.get<PmsKnowledgeDocumentVO>({
    url: '/pms/kb/document/get',
    params: { id, view }
  })
}

// 新增知识库文档
export const createKnowledgeDocument = (data: PmsKnowledgeDocumentCreateReqVO) => {
  return request.post<number>({ url: '/pms/kb/document/create', data })
}

export interface PmsKnowledgeDocumentDraftVO {
  documentId: number
  baseVersionNo: number
  title: string
  content?: string
  labelIds?: number[]
  updateTime?: number
}

export const getKnowledgeDocumentDraft = (documentId: number) =>
  request.get<PmsKnowledgeDocumentDraftVO | undefined>({
    url: '/pms/kb/document/draft-get', params: { documentId }
  })

export const saveKnowledgeDocumentDraft = (data: PmsKnowledgeDocumentDraftVO) =>
  request.put({ url: '/pms/kb/document/draft-save', data })

export const publishKnowledgeDocumentDraft = (documentId: number) =>
  request.put({ url: '/pms/kb/document/draft-publish', params: { documentId } })

// 修改知识库文档
export const updateKnowledgeDocument = (data: PmsKnowledgeDocumentUpdateReqVO) => {
  return request.put({ url: '/pms/kb/document/update', data })
}

export interface PmsKnowledgeDocumentVersionVO {
  versionNo: number
  title: string
  content?: string
  type: number
  fileType?: string
  fileSize?: number
  editorUserId?: number
  createTime: number
}

export const getKnowledgeDocumentVersionList = (documentId: number) =>
  request.get<PmsKnowledgeDocumentVersionVO[]>({
    url: '/pms/kb/document/version-list', params: { documentId }
  })

export const getKnowledgeDocumentVersion = (documentId: number, versionNo: number) =>
  request.get<PmsKnowledgeDocumentVersionVO>({
    url: '/pms/kb/document/version-get', params: { documentId, versionNo }
  })

export const getKnowledgeOfficePreviewConfig = (documentId: number) =>
  request.get<Record<string, any>>({
    url: '/pms/kb/document/office-preview-config', params: { documentId }
  })

export const getKnowledgeOfficeHistoryPreviewConfig = (documentId: number, versionNo: number) =>
  request.get<Record<string, any>>({
    url: '/pms/kb/document/office-history-preview-config', params: { documentId, versionNo }
  })

export const getKnowledgeHistoryPreviewUrl = (documentId: number, versionNo: number) =>
  request.get<string>({
    url: '/pms/kb/document/history-preview-url', params: { documentId, versionNo }
  })

export const restoreKnowledgeDocumentVersion = (
  documentId: number, versionNo: number, expectedVersionNo: number
) => request.put({
  url: '/pms/kb/document/version-restore',
  params: { documentId, versionNo, expectedVersionNo }
})

// 删除知识库文档
export const deleteKnowledgeDocument = (id: number) => {
  return request.delete({ url: '/pms/kb/document/delete', params: { id } })
}

// 移动知识库文档
export const moveKnowledgeDocument = (data: PmsKnowledgeDocumentMoveReqVO) => {
  return request.put({ url: '/pms/kb/document/move', data })
}

// 查询知识库文档搜索分页
export const getKnowledgeDocumentSearchPage = (params: PageParam) => {
  return request.get<PageResult<PmsKnowledgeDocumentVO[]>>({
    url: '/pms/kb/document/search-page',
    params
  })
}
