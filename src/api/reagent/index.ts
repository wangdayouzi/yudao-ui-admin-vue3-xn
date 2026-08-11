import request from '@/config/axios'

// ==================== TypeScript 类型定义 ====================

/** 试剂主表 */
export interface ReagentBaseVO {
  id?: number
  basId: string
  reagentName: string
  vendor?: string
  catNo?: string
  storageTemp?: string
  storageLocation?: string
  status: number
  createTime?: string
}

/** 试剂批号 */
export interface ReagentBaseLotVO {
  id?: number
  baseId: number
  lotNo: string
  content?: string
  expirationDate?: string
  amountLeft?: string
  status?: number
}

/** 申请单 */
export interface ReagentApplyVO {
  id?: number
  applyNo?: string
  consignorUnit?: string
  consignorAddress?: string
  consignorName?: string
  consignorPhone?: string
  receiverUnit: string
  receiverAddress: string
  receiverName: string
  receiverPhone: string
  status?: number
  processInstanceId?: string
  remark?: string
  createTime?: string
  creator?: string
  freightSettlement?: string
  projectNo?: string
  transportTemp?: string
  hasTempLogger?: number
  items?: ReagentApplyItemVO[]
}

/** 申请明细 */
export interface ReagentApplyItemVO {
  id?: number
  basId: string
  reagentName: string
  catNo?: string
  content?: string
  lotNo?: string
  storageTemp?: string
  storageLocation?: string
  expirationDate?: string
  requestedQty: number
  shippedQtyTotal?: number
}

/** 发货单 */
export interface ReagentShipmentVO {
  id?: number
  shipmentNo?: string
  applyId: number
  trackingNumber?: string
  expressCompany?: string
  freightSettlement?: string
  projectNo?: string
  transportTemp?: string
  hasTempLogger?: number
  shipmentDate?: string
  createTime?: string
  items?: ReagentShipmentItemVO[]
}

/** 发货明细 */
export interface ReagentShipmentItemVO {
  applyItemId: number
  lotNo?: string
  quantityShipped: number
}

// ==================== 试剂基础数据 API ====================

export const getBasePage = (params: any) => {
  return request.get({ url: '/reagent/base/page', params })
}

export const getBaseSimpleList = () => {
  return request.get({ url: '/reagent/base/simple-list' })
}

export const getBaseDetail = (id: number) => {
  return request.get({ url: '/reagent/base/get', params: { id } })
}

export const createBase = (data: ReagentBaseVO) => {
  return request.post({ url: '/reagent/base/create', data })
}

export const updateBase = (data: ReagentBaseVO) => {
  return request.put({ url: '/reagent/base/update', data })
}

export const deleteBase = (id: number) => {
  return request.delete({ url: '/reagent/base/delete', params: { id } })
}

// ==================== 试剂批号 API ====================

export const getLotListByBaseId = (baseId: number) => {
  return request.get({ url: '/reagent/base/lot/list-by-base-id', params: { baseId } })
}

export const getLotListByBasId = (basId: string) => {
  return request.get({ url: '/reagent/base/lot/list-by-bas-id', params: { basId } })
}

export const createLot = (data: ReagentBaseLotVO) => {
  return request.post({ url: '/reagent/base/lot/create', data })
}

export const updateLot = (data: ReagentBaseLotVO) => {
  return request.put({ url: '/reagent/base/lot/update', data })
}

export const deleteLot = (id: number) => {
  return request.delete({ url: '/reagent/base/lot/delete', params: { id } })
}

// ==================== 申请单 API ====================

export const getApplyPage = (params: any) => {
  return request.get({ url: '/reagent/apply/page', params })
}

export const getApplyDetail = (id: number): Promise<ReagentApplyVO> => {
  return request.get({ url: '/reagent/apply/get', params: { id } })
}

export const createApply = (data: ReagentApplyVO) => {
  return request.post({ url: '/reagent/apply/create', data })
}

export const updateApply = (data: ReagentApplyVO) => {
  return request.put({ url: '/reagent/apply/update', data })
}

export const deleteApply = (id: number) => {
  return request.delete({ url: '/reagent/apply/delete', params: { id } })
}

export const submitApply = (id: number) => {
  return request.post({ url: '/reagent/apply/submit', params: { id } })
}

export const rejectApply = (data: { id: number; remark: string }) => {
  return request.post({ url: '/reagent/apply/reject', data })
}

// ==================== 发货单 API ====================

export const getShipmentPage = (params: any) => {
  return request.get({ url: '/reagent/shipment/page', params })
}

export const getShipmentDetail = (id: number) => {
  return request.get({ url: '/reagent/shipment/get', params: { id } })
}

export const getShipmentListByApplyId = (applyId: number) => {
  return request.get({ url: '/reagent/shipment/list-by-apply-id', params: { applyId } })
}

export const confirmShipment = (data: any) => {
  return request.post({ url: '/reagent/shipment/confirm', data })
}

// ==================== 打印 API ====================

/** 单个发货单打印（直接下载 Excel） */
export const printShipment = (id: number) => {
  return request.download({ url: '/reagent/print/shipment', params: { id } })
}

/** 批量发货单打印（多选 → 合并为一张交接单） */
export const printShipments = (ids: number[]) => {
  return request.postOriginal({ url: '/reagent/print/shipments', data: ids, responseType: 'blob' })
}

/** 撤回发货 */
export const revokeShipment = (id: number) => {
  return request.post({ url: '/reagent/shipment/revoke', params: { id } })
}

/** 更新发货物流信息（快递单号/物流公司） */
export const updateShipmentLogistics = (data: {
  id: number
  trackingNumber?: string
  expressCompany?: string
}) => {
  return request.post({ url: '/reagent/shipment/update-logistics', data })
}
