import request from '@/config/axios'

export interface UrgentSave {
  id?: number
  revision?: number
  projectNo: string
  /** 临床方案ID（老样本系统 reagent_clinical.id） */
  clinicalId?: number
  newProject: boolean
  basNos: string
  sampleScope: string
  deadline: string
  expectedArrival?: string
  plannedTestTime?: string
  appointmentUserIds: number[]
  noticeUserIds: number[]
  noticeDeptIds: number[]
  contacts: string
  reason: string
  logisticsNo: string
  remark: string
  changeReason?: string
}
export interface UrgentRecord extends UrgentSave {
  legacyContacts?: string
  noticeNames?: string
  urgentNo: string
  id: number
  revision: number
  requesterId: number
  requesterName: string
  handlerId?: number
  handlerName?: string
  status: number
  exceptionType: string
  exceptionNote?: string
  completedScope?: string
  remainingScope?: string
  completedTime?: string
  createTime: string
  updateTime: string
}
export interface UrgentAction {
  id: number
  revision: number
  action: 'CLAIM' | 'PROGRESS' | 'CANCEL' | 'COMMENT'
  status?: number
  exceptionType?: string
  exceptionNote?: string
  completedScope?: string
  remainingScope?: string
  completedTime?: string
  content?: string
}
export interface UrgentLog {
  id: number
  operatorName: string
  action: string
  content: string
  createTime: string
}
const url = '/reagent/sample-urgent'
export const getPage = (params: PageParam & Record<string, unknown>) =>
  request.get<{ list: UrgentRecord[]; total: number }>({ url: `${url}/page`, params })
export const getRecord = (id: number) =>
  request.get<UrgentRecord>({ url: `${url}/get`, params: { id } })
export const getLogs = (id: number) =>
  request.get<UrgentLog[]>({ url: `${url}/logs`, params: { id } })
export const saveRecord = (data: UrgentSave) =>
  data.id
    ? request.put({ url: `${url}/update`, data })
    : request.post({ url: `${url}/create`, data })
export const act = (data: UrgentAction) => request.put({ url: `${url}/action`, data })
export const deleteRecord = (id: number, revision: number) =>
  request.delete({ url: `${url}/delete`, params: { id, revision } })

export interface UrgentPerson {
  id: number
  name: string
}
export interface UrgentDepartment {
  id: number
  parentId: number
  name: string
  children?: UrgentDepartment[]
}
export interface UrgentOptions {
  appointmentUsers: UrgentPerson[]
  administrators: UrgentPerson[]
  departments: UrgentDepartment[]
}
export const getSelectionOptions = (): Promise<UrgentOptions> =>
  request.get({ url: `${url}/selection-options` })
