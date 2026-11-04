import request from '@/config/axios'

// ==================== 类型定义 ====================

/** 临床方案（老样本系统 think_clinical 同步） */
export interface ReagentClinicalVO {
  id?: number
  name?: string
  number?: string
  sponsorId?: number
  /** 是否上传附件：0否 1是 */
  isUpload?: number
  effectiveDate?: string
  versionNumber?: string
  /** 是否自动发送寄送通知邮件：0否 1是（本地维护，同步不覆盖） */
  isAutoReceive?: number
  /** 源表添加时间 */
  srcCreateTime?: string
  /** 源表编辑时间 */
  srcUpdateTime?: string
  /** 状态：0正常 1停用 */
  status?: number
  syncTime?: string
}

/** 项目号（老样本系统 think_items 同步） */
export interface ReagentItemVO {
  id?: number
  /** 城市：1上海 2宁波 */
  cityId?: number
  /** 项目号 */
  baseId?: string
  clinicalId?: number
  clinicalName?: string
  clinicalNumber?: string
  personId?: number
  typeId?: number
  /** 是否时效：0否 1是 */
  isAging?: number
  /** 复核状态：0未复核 1已复核 */
  reviewStatus?: number
  reviewer?: number
  /** 是否附上报告作为附件：0否 1是 */
  isReport?: number
  /** 是否涉及病原微生物：0否 1是 */
  isPm?: number
  srcCreateTime?: string
  srcUpdateTime?: string
  /** 状态：0正常 1停用 */
  status?: number
  syncTime?: string
}

// ==================== 临床方案 API ====================

export const getClinicalPage = (params: any) => {
  return request.get({ url: '/reagent/clinical/page', params })
}

/** 仅修改本地字段：是否自动发送寄送通知邮件 */
export const updateClinicalLocalField = (data: { id: number; isAutoReceive: number }) => {
  return request.put({ url: '/reagent/clinical/update', data })
}

// ==================== 项目号 API ====================

export const getItemPage = (params: any) => {
  return request.get({ url: '/reagent/item/page', params })
}

// ==================== 下拉选项 ====================

/** 临床方案下拉选项 */
export interface ReagentClinicalOptionVO {
  id: number
  name: string
  number: string
}

/** 项目号 / BAS 下拉选项 */
export interface ReagentItemOptionVO {
  id: number
  baseId: string
  clinicalId?: number
  clinicalName?: string
  clinicalNumber?: string
  typeId?: number
}

/** 临床方案下拉：按名称/编号模糊搜索 */
export const getClinicalOptions = (keyword?: string): Promise<ReagentClinicalOptionVO[]> => {
  return request.get({ url: '/reagent/basic-data/clinical-options', params: { keyword } })
}

/** 项目号/BAS 下拉：按项目号/方案名称/方案编号模糊搜索，可按临床方案ID过滤 */
export const getItemOptions = (params: {
  clinicalId?: number
  keyword?: string
}): Promise<ReagentItemOptionVO[]> => {
  return request.get({ url: '/reagent/basic-data/item-options', params })
}

// ==================== 同步 API ====================

/** 手动触发临床方案 + 项目号全量同步（后端按 id 幂等 upsert） */
export const syncBasicData = () => {
  return request.post({ url: '/reagent/basic-data/sync' })
}
