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
  inboundSite?: 'SHANGHAI' | 'NINGBO'
  deadline: string
  expectedArrival?: string
  sampleReceivedTime?: string
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
  recurringPlanId?: number
  recurringDate?: string
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

export interface UrgentPlanSave {
  template: UrgentSave
  startDate: string
  endDate: string
  dailyTime: string
  weekdays: number[]
}
export interface UrgentPlan extends UrgentPlanSave {
  id: number
  revision: number
  requesterId: number
  requesterName: string
  status: number
  nextDate: string
  lastError: string
}
export const createPlan = (data: UrgentPlanSave) =>
  request.post<number>({ url: `${url}/plan/create`, data })
type UrgentPlanResponse = Omit<UrgentPlan, 'startDate' | 'endDate' | 'nextDate' | 'dailyTime'> & {
  startDate: string | number[]
  endDate: string | number[]
  nextDate: string | number[]
  dailyTime: string | number[]
}
const planDate = (value: string | number[]) =>
  Array.isArray(value)
    ? value.map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-')
    : value
const planTime = (value: string | number[]) => {
  const parts = Array.isArray(value) ? value : value.split(':')
  return [0, 1, 2].map((index) => String(parts[index] ?? 0).padStart(2, '0')).join(':')
}
export const getPlanPage = async (params: PageParam) => {
  const res = await request.get<{ list: UrgentPlanResponse[]; total: number }>({
    url: `${url}/plan/page`,
    params
  })
  return {
    ...res,
    list: res.list.map(
      (row): UrgentPlan => ({
        ...row,
        startDate: planDate(row.startDate),
        endDate: planDate(row.endDate),
        nextDate: planDate(row.nextDate),
        dailyTime: planTime(row.dailyTime)
      })
    )
  }
}
export const actPlan = (data: {
  id: number
  revision: number
  action: 'PAUSE' | 'RESUME' | 'END'
}) => request.put({ url: `${url}/plan/action`, data })
export const updatePlanSchedule = (data: {
  id: number
  revision: number
  endDate: string
  dailyTime: string
  weekdays: number[]
}) => request.put({ url: `${url}/plan/schedule`, data })
