import request from '@/config/axios'

// ==================== 业务单据 VO ====================

export interface AmfBusinessVO {
  id?: number
  methodNo: string
  methodVersion?: string
  methodName?: string
  testArticle?: string
  matrixType?: string
  sd?: string
  effectiveDate?: string
  fileName?: string
  fileUrl?: string
  fileVersion?: string
  status: number
  createTime?: Date
  updateTime?: Date
  creator?: string
}

// ==================== 文件版本记录 VO ====================

export interface AmfFileVersionVO {
  id?: number
  businessId: number
  versionNo: string
  fileName: string
  fileUrl: string
  fileSize?: number
  fileType?: string
  changeDescription?: string
  createTime?: Date
  creator?: string
}

// ==================== 业务单据 API ====================

// 创建分析方法文件
export const createBusiness = (data: AmfBusinessVO): Promise<number> => {
  return request.post({ url: '/amf/business/create', data })
}

// 更新分析方法文件
export const updateBusiness = (data: AmfBusinessVO) => {
  return request.put({ url: '/amf/business/update', data })
}

// 删除分析方法文件
export const deleteBusiness = (id: number) => {
  return request.delete({ url: '/amf/business/delete?id=' + id })
}

// 获取分析方法文件详情
export const getBusiness = (id: number): Promise<AmfBusinessVO> => {
  return request.get({ url: '/amf/business/get?id=' + id })
}

// 获取分析方法文件分页
export const getBusinessPage = (params: any) => {
  return request.get({ url: '/amf/business/page', params })
}

// ==================== 文件 VO ====================

export interface AmfFileVO {
  id?: number
  businessId: number
  fileName: string
  fileUrl?: string
  fileVersion?: string
  effectiveDate?: string
  createTime?: Date
}

// ==================== 文件管理 API ====================

// 获取文件列表
export const getFileList = (businessId: number): Promise<AmfFileVO[]> => {
  return request.get({ url: '/amf/business/file-list?businessId=' + businessId })
}

// 删除文件
export const deleteFile = (fileId: number) => {
  return request.delete({ url: '/amf/business/file-delete?fileId=' + fileId })
}

// ==================== 文件上传 API ====================

// 上传文件（新版本）
// fileId 可选：指定时为该文件记录追加版本；不指定时新建文件记录
export const uploadFile = (
  businessId: number,
  file: File,
  changeDescription?: string,
  fileId?: number,
  versionNo?: string,
  effectiveDate?: string
): Promise<AmfFileVersionVO> => {
  const formData = new FormData()
  formData.append('businessId', String(businessId))
  if (fileId) {
    formData.append('fileId', String(fileId))
  }
  formData.append('file', file)
  if (changeDescription) {
    formData.append('changeDescription', changeDescription)
  }
  if (versionNo) {
    formData.append('versionNo', versionNo)
  }
  if (effectiveDate) {
    formData.append('effectiveDate', effectiveDate)
  }
  return request.post({
    url: '/amf/business/upload',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ==================== 版本管理 API ====================

// 获取文件版本列表
export const getFileVersionList = (fileId: number): Promise<AmfFileVersionVO[]> => {
  return request.get({ url: '/amf/business/version-list?fileId=' + fileId })
}

// 删除文件版本
export const deleteFileVersion = (versionId: number) => {
  return request.delete({ url: '/amf/business/version-delete?versionId=' + versionId })
}

// ==================== OnlyOffice API ====================

// 获取 OnlyOffice 编辑器配置
export const getEditorConfig = (versionId: number): Promise<any> => {
  return request.get({ url: '/amf/business/editor-config?versionId=' + versionId })
}
