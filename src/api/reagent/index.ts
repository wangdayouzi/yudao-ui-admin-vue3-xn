import request from '@/config/axios'

// ==================== TypeScript 类型定义 ====================

/** 试剂基础数据(扁平，老ERP同步，一行=一批) */
export interface ReagentBaseFlatVO {
  id?: number
  basId?: string
  reagentCode?: string
  reagentName?: string
  vendor?: string
  brand?: string
  warehouse?: string
  catNo?: string
  spec?: string
  lotNo?: string
  expireDate?: string
  amountLeft?: string
  storageLocation?: string
  storageTemp?: string
  itemCategory?: string
  categoryKey?: string
  srcLineId?: string
  srcReceiptId?: string
  status?: number
  syncTime?: string
}

/** 样品领用台账（独立于试剂库存和 LIMS） */
export interface SampleLoanVO {
  id: number
  basNo: string
  requesterId?: number
  requester: string
  submitterId?: number
  submitter?: string
  sampleInfo?: string
  remark?: string
  /** 1-领用中；2-已归还 */
  status: number
  createTime?: string
  returnTime?: string
}

/** 申请单 */
export interface ReagentApplyVO {
  id?: number
  applyNo?: string
  consignorUnit?: string
  consignorAddress?: string
  consignorName?: string
  consignorPhone?: string
  consignorEmail?: string // 发货方邮箱：发货任务通知的收件人（留空则不发送邮件）
  region?: string // 发货区域：上海/宁波
  receiverUnit: string
  receiverAddress: string
  receiverName: string
  receiverPhone: string
  status?: number
  processInstanceId?: string
  remark?: string
  createTime?: string
  creator?: string
  creatorName?: string // 创建人昵称（列表展示）
  freightSettlement?: string
  projectNo?: string
  transportTemp?: string
  hasTempLogger?: number
  plannedShipDate?: string // 计划运出日期
  note?: string // 备注
  items?: ReagentApplyItemVO[]
}

/** 申请明细 */
export interface ReagentApplyItemVO {
  id?: number
  basId: string
  basNo?: string // BAS号/采购入库单号 pm02603
  reagentName: string
  vendor?: string // 供应商
  brand?: string // 品牌
  catNo?: string
  content?: string
  lotNo?: string
  storageTemp?: string
  storageLocation?: string
  expirationDate?: number | '' // 过期日期（el-date-picker value-format=x，毫秒数或空）
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

// ==================== 试剂基础数据(扁平, 老ERP同步) API ====================

export const getBaseFlatPage = (params: any) => {
  return request.get({ url: '/reagent/base-flat/page', params })
}

export const updateBaseFlat = (data: ReagentBaseFlatVO) => {
  return request.put({ url: '/reagent/base-flat/update', data })
}

export const getBaseFlatSimpleList = (params: any) => {
  return request.get({ url: '/reagent/base-flat/simple-list', params })
}

export const deleteBaseFlat = (id: number) => {
  return request.delete({ url: '/reagent/base-flat/delete', params: { id } })
}

// 生成生物试剂接收单（docx）
export const generateBaseReceipt = (data: any) => {
  return request.postOriginal({
    url: '/reagent/base-flat/generate-receipt',
    data,
    responseType: 'blob'
  })
}

// 手动触发试剂全链路同步（erpSync + erpPush + 扁平；2 分钟内限一次）
export const syncReagentChain = (param?: string) => {
  return request.post({ url: '/mes/erp-reagent/sync', params: { param } })
}

// ==================== 样品领用台账 API ====================

export const getSampleLoanPage = (params: any): Promise<PageResult<SampleLoanVO[]>> => {
  return request.get({ url: '/reagent/sample-loan/page', params })
}

export const createSampleLoan = (
  data: Pick<
    SampleLoanVO,
    'basNo' | 'requesterId' | 'requester' | 'submitterId' | 'submitter' | 'sampleInfo' | 'remark'
  >
) => {
  return request.post({ url: '/reagent/sample-loan/create', data })
}

export const returnSampleLoan = (id: number) => {
  return request.put({ url: '/reagent/sample-loan/return', params: { id } })
}

/** 大屏仅显示仍在领用中的记录 */
export const getBorrowingSampleLoanList = (): Promise<SampleLoanVO[]> => {
  return request.get({
    url: '/reagent/sample-loan/screen-list',
    headers: { silentError: true }
  })
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

// ==================== 试剂标签打印 API ====================

/** 试剂标签打印查询结果（来源：只读 SQL Server PM 库） */
export interface ReagentLabelPrintVO {
  name?: string // 名称
  basId?: string // BASID
  batchNo?: string // 批号
  storageLocation?: string // 存储位置（SQL Server：sdpm027.pm02726）
  expireDate?: string // 过期日期
}

/** 根据 BASID 分页查询试剂标签信息（服务端每页固定 5 条） */
export const getLabelPrintByBasId = (params: {
  basId: string
  pageNo: number
}): Promise<PageResult<ReagentLabelPrintVO[]>> => {
  return request.get({ url: '/reagent/label-print/query', params })
}

/** 生成试剂标签打印 Excel（键值对表格），返回 Blob */
export const printLabelPrint = (data: any) => {
  return request.postOriginal({ url: '/reagent/label-print/print', data, responseType: 'blob' })
}

/** 逻辑标签打印机：用户只能选择后台已配置的打印机，不能传 Windows 队列名。 */
export interface ReagentLabelPrinterVO {
  id: number
  name: string
  model?: string
  tapeWidthMm?: number
  templateCode?: string
  /** 0 离线，1 在线，2 故障 */
  onlineStatus?: number
}

/** 用户可手动选择的固定标签模板，不做版本管理。 */
export interface ReagentLabelTemplateVO {
  id: number
  name: string
  code: string
}

export interface ReagentLabelPrintJobVO {
  id: number
  jobNo?: string
  printerId: number
  templateCode?: string
  copies: number
  printCutMode?: string
  printedCount?: number
  /** 0 排队，1 已领取，2 打印中，3 成功，4 失败，5 已取消 */
  status: number
  errorCode?: string
  errorMessage?: string
  createTime?: string
  completedTime?: string
}

export const getLabelPrinters = (): Promise<ReagentLabelPrinterVO[]> => {
  return request.get({ url: '/reagent/label-print/printers' })
}

export const getLabelTemplates = (): Promise<ReagentLabelTemplateVO[]> => {
  return request.get({ url: '/reagent/label-print/templates' })
}

export const createLabelPrintJob = (data: {
  printerId: number
  templateCode: string
  copies: number
  printCutMode: string
  label: Record<string, any>
}): Promise<number> => {
  return request.post({ url: '/reagent/label-print/jobs', data })
}

export const getLabelPrintJob = (id: number): Promise<ReagentLabelPrintJobVO> => {
  return request.get({ url: '/reagent/label-print/jobs/get', params: { id } })
}

/** 获得最近 20 条试剂标签打印历史 */
export const getRecentLabelPrintJobs = (): Promise<ReagentLabelPrintJobVO[]> => {
  return request.get({ url: '/reagent/label-print/jobs/recent' })
}
