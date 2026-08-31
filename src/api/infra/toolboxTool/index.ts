import request from '@/config/axios'

export interface ToolboxToolVO {
  id?: number
  name: string
  category: string
  icon: string
  description: string
  version: string
  fileUrl: string
  fileSize: number
  platform: string
  sort: number
  status: number
  downloadCount: number
  createTime?: Date
}

// 查询工具箱工具分页
export const getToolboxToolPage = (params: PageParam) => {
  return request.get({ url: '/infra/toolbox-tool/page', params })
}

// 查询工具箱工具详情
export const getToolboxTool = (id: number) => {
  return request.get({ url: '/infra/toolbox-tool/get?id=' + id })
}

// 新增工具箱工具
export const createToolboxTool = (data: ToolboxToolVO) => {
  return request.post({ url: '/infra/toolbox-tool/create', data })
}

// 修改工具箱工具
export const updateToolboxTool = (data: ToolboxToolVO) => {
  return request.put({ url: '/infra/toolbox-tool/update', data })
}

// 删除工具箱工具
export const deleteToolboxTool = (id: number) => {
  return request.delete({ url: '/infra/toolbox-tool/delete?id=' + id })
}

// 获得启用中的工具列表（首页展示用）
export const getEnabledToolboxToolList = () => {
  return request.get({ url: '/infra/toolbox-tool/list-enabled' })
}

// 记录下载次数 +1
export const recordToolboxToolDownload = (id: number) => {
  return request.post({ url: '/infra/toolbox-tool/record-download?id=' + id })
}
