import request from '@/config/axios'

// 老ERP采购订单数据 VO
export interface PmPoVO {
  id: number
  poId: string // 采购订单主ID pm01402
  poCode: string // 采购订单号 pm01303
  orderDate: string // 订单日期 pm01302
  vendorName: string // 供应商名称
  lineId: string // 明细行ID pm01401
  srcItemId: string // 物料ID
  itemCode: string // 物料编码
  itemName: string // 物料名称
  brand: string // 品牌
  spec: string // 规格
  unitCode: string // 单位编码
  unitName: string // 单位名称
  itemCategory: string // 物料分类
  qtyOrdered: number // 采购数量 pm01406
  qtyReceived: number // 已入库数量 pm01411
  qtyRequisition: number // 领用数量
  qtyReturn: number // 退料数量
  qtyReturnOut: number // 采购退货数量
  remainingQty: number // 剩余数量(已入库−领用+退料−采购退货)
  syncTime: string // 同步时间
}

// 老ERP采购订单数据 API
export const PmPoApi = {
  // 查询采购订单数据分页
  getPmPoPage: (params: any) => request.get({ url: '/mes/pm-po/page', params }),
  // 导出采购订单数据 Excel
  exportPmPo: (params: any) => request.download({ url: '/mes/pm-po/export-excel', params })
}
