import request from '@/config/axios'

export interface MessageField {
  key: string
  label: string
  editor: string
  maxLength: number
}
export interface MessageType {
  value: string
  label: string
  msgKey: string
  fields: MessageField[]
}
export interface MessageTemplate {
  id?: number
  name: string
  code: string
  messageType: string
  content: Record<string, string>
  params?: string[]
  status: number
  defaultUserIds?: number[]
  defaultDeptIds?: number[]
  includeChildDepts?: boolean
  remark?: string
  createTime?: string
}
export interface SendResult {
  logId: number
  userId: number
  status: number
  errorMessage?: string
}
export interface MessageLog {
  id: number
  requestId: string
  businessId?: string
  templateCode: string
  templateName: string
  messageType: string
  robotCode: string
  userId: number
  userName: string
  dingTalkUserId: string
  content: Record<string, string>
  sendStatus: number
  sendTime?: string
  createTime: string
  processQueryKey?: string
  errorCode?: string
  errorMessage?: string
}
const base = '/system/dingtalk-template'
export interface ReceiverOption {
  id: number
  nickname: string
  username: string
  dingTalkBound: boolean
}
export interface DepartmentOption {
  id: number
  parentId: number
  name: string
  children?: DepartmentOption[]
}
export const getDepartmentOptions = (): Promise<DepartmentOption[]> =>
  request.get({ url: `${base}/department-options` })
export const getReceiverOptions = (): Promise<ReceiverOption[]> =>
  request.get({ url: `${base}/receiver-options` })
export const getTypes = (): Promise<MessageType[]> => request.get({ url: `${base}/types` })
export const getTemplatePage = (params: Record<string, unknown>) =>
  request.get({ url: `${base}/page`, params })
export const getTemplate = (id: number): Promise<MessageTemplate> =>
  request.get({ url: `${base}/get`, params: { id } })
export const createTemplate = (data: MessageTemplate) =>
  request.post({ url: `${base}/create`, data })
export const updateTemplate = (data: MessageTemplate) =>
  request.put({ url: `${base}/update`, data })
export const deleteTemplate = (id: number) =>
  request.delete({ url: `${base}/delete`, params: { id } })
export const previewTemplate = (
  template: MessageTemplate,
  params: Record<string, string>
): Promise<Record<string, string>> =>
  request.post({ url: `${base}/preview`, data: { template, params } })
export const sendMessage = (data: {
  requestId: string
  templateCode: string
  userIds: number[]
  params: Record<string, string>
  businessId?: string
}): Promise<SendResult[]> => request.post({ url: `${base}/send`, data, timeout: 30000 })
export const getLogPage = (params: Record<string, unknown>) =>
  request.get({ url: '/system/dingtalk-log/page', params })
export const getLog = (id: number): Promise<MessageLog> =>
  request.get({ url: '/system/dingtalk-log/get', params: { id } })
export const statusLabels: Record<number, string> = {
  0: '处理中',
  1: '钉钉已受理',
  2: '发送失败',
  3: '结果未知'
}
export const statusColors = { 0: 'info', 1: 'success', 2: 'danger', 3: 'warning' } as const

export interface Notification {
  id: number
  requestId: string
  businessId?: string
  userId: number
  userName: string
  templateCode: string
  status: number
  sendAfter: string
  expiresAt?: string
  errorMessage?: string
  createTime: string
  retryOf?: number
  retryNo: number
  operatorId?: number
  operationReason?: string
  params: Record<string, string>
}
const noticeBase = '/system/dingtalk-notification'
export const getNotificationPage = (params: Record<string, unknown>) =>
  request.get({ url: `${noticeBase}/page`, params })
export const getNotification = (id: number): Promise<Notification> =>
  request.get({ url: `${noticeBase}/get`, params: { id } })
export const getNotificationDetail = (
  id: number
): Promise<{
  notice: Notification
  message?: Pick<MessageLog, 'messageType' | 'content'>
  preview: boolean
  previewError?: string
}> =>
  request.get({ url: `${noticeBase}/detail`, params: { id } })
export const operateNotification = (
  action: 'cancel' | 'resend',
  data: { id: number; reason: string; confirmedNotReceived: boolean }
) => request.post({ url: `${noticeBase}/${action}`, data })
export const notificationStatus: Record<number, string> = {
  0: '待发送',
  1: '发送中',
  2: '钉钉已受理',
  3: '结果未知',
  4: '发送失败',
  5: '已取消',
  6: '已过期',
  7: '无有效接收人',
  8: '钉钉未配置'
}

export interface TemplateParameter {
  key: string
  label: string
  example: string
}
export const getTemplateParameters = (code: string): Promise<TemplateParameter[]> =>
  request.get({ url: `${base}/parameters`, params: { code } })
