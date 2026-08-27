import request from '@/config/axios'

// 老ERP采购入库单明细 VO
export interface PmInboundVO {
  id: number
  inboundId: number
  srcReceiptId: string // 入库单ID pm02601
  basId: string // 单号/BAS pm02603
  receiptDate: string // 接受日期 pm02602
  period: string // 期间
  docType: number // 单据类型
  vendorName: string // 供应商
  warehouseName: string // 仓库
  poCode: string // 采购订单号
  projectName: string // 项目
  applicantName: string // 申请人
  auditorName: string // 审核人
  lineNo: number // 行号
  srcLineId: string // 明细行ID pm02702
  srcPoLineId: string // 采购订单明细行ID pm02712
  itemCode: string // 物料编码
  itemName: string // 物料名称
  brand: string // 品牌
  spec: string // 规格
  unitName: string // 单位
  itemCategory: string // 物料分类
  batchNo: string // 批号 pm02631
  expireDate: string // 过期日期 pm02725
  storageLocation: string // 存储位置 pm02726
  qty: number // 接收数量
  qtyReceived: number // 关联采购订单-已入库数量
  qtyRequisition: number // 关联采购订单-领用数量
  remainingQty: number // 关联采购订单-剩余数量
  priceTaxIn: number // 含税单价
  amountTaxIn: number // 含税金额
  priceExTax: number // 未税单价
  amountExTax: number // 未税金额
  syncTime: string // 同步时间
}

// 老ERP采购入库单明细 API
export const PmInboundApi = {
  // 查询采购入库单明细分页
  getPmInboundPage: (params: any) => request.get({ url: '/mes/pm-inbound/page', params }),
  // 导出采购入库单明细 Excel
  exportPmInbound: (params: any) => request.download({ url: '/mes/pm-inbound/export-excel', params })
}
