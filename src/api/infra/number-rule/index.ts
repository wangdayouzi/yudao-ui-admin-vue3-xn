import request from '@/config/axios'

export interface NumberRuleVO {
  id?: number
  code: string
  name: string
  prefix: string
  digits: number
  startNo: number
  yearlyReset: boolean
  status: number
  lastNo?: number
  lastYear?: number
}

export const getNumberRules = () => request.get<NumberRuleVO[]>({ url: '/infra/number-rule/list' })
export const getEnabledNumberRules = () => request.get<NumberRuleVO[]>({ url: '/infra/number-rule/enabled-list' })
export const saveNumberRule = (data: NumberRuleVO) => request.post<number>({ url: '/infra/number-rule/save', data })
