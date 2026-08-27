<!-- 老ERP采购入库单明细（PM同步数据，替代出入库流水） -->
<template>
  <ContentWrap>
    <!-- 搜索工作栏 -->
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="单号" prop="basId">
        <el-input
          v-model="queryParams.basId"
          placeholder="BAS/入库单号"
          clearable
          @keyup.enter="handleQuery"
          class="!w-180px"
        />
      </el-form-item>
      <el-form-item label="物料" prop="itemName">
        <el-input
          v-model="queryParams.itemName"
          placeholder="物料编码/名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-200px"
        />
      </el-form-item>
      <el-form-item label="供应商" prop="vendorName">
        <el-input
          v-model="queryParams.vendorName"
          placeholder="供应商名称，模糊匹配"
          clearable
          @keyup.enter="handleQuery"
          class="!w-200px"
        />
      </el-form-item>
      <el-form-item label="仓库" prop="warehouseName">
        <el-input
          v-model="queryParams.warehouseName"
          placeholder="仓库名称，模糊匹配"
          clearable
          @keyup.enter="handleQuery"
          class="!w-180px"
        />
      </el-form-item>
      <el-form-item label="日期" prop="receiptDate">
        <el-date-picker
          v-model="queryParams.receiptDate"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!w-260px"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery">
          <Icon icon="ep:search" class="mr-5px" /> 搜索
        </el-button>
        <el-button @click="resetQuery">
          <Icon icon="ep:refresh" class="mr-5px" /> 重置
        </el-button>
        <el-button @click="showMore = !showMore">
          <Icon :icon="showMore ? 'ep:arrow-up' : 'ep:arrow-down'" class="mr-5px" /> 更多筛选
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['mes:pm-inbound:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
    <!-- 更多筛选 -->
    <el-form v-if="showMore" class="mt-10px" :inline="true" label-width="68px">
      <el-form-item label="分类" prop="itemCategory">
        <el-input
          v-model="queryParams.itemCategory"
          placeholder="物料分类，模糊匹配"
          clearable
          @keyup.enter="handleQuery"
          class="!w-200px"
        />
      </el-form-item>
      <el-form-item label="批号" prop="batchNo">
        <el-input
          v-model="queryParams.batchNo"
          placeholder="老ERP批号"
          clearable
          @keyup.enter="handleQuery"
          class="!w-180px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" plain @click="handleQuery">应用</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="操作" align="center" width="80" fixed="left">
        <template #default="scope">
          <el-button link type="primary" @click="openDetail(scope.row)">查看</el-button>
        </template>
      </el-table-column>
      <el-table-column label="接受日期" align="center" prop="receiptDate" width="110" />
      <el-table-column label="单号/BAS" align="center" prop="basId" width="150" />
      <el-table-column label="采购订单明细号" align="center" prop="srcPoLineId" width="160" />
      <el-table-column label="物料编码" align="center" prop="itemCode" width="150" />
      <el-table-column label="物料名称" prop="itemName" min-width="200" />
      <el-table-column label="品牌" prop="brand" width="120" />
      <el-table-column label="规格" prop="spec" width="140" />
      <el-table-column label="单位" align="center" prop="unitName" width="80" />
      <el-table-column label="分类" prop="itemCategory" width="140" />
      <el-table-column label="供应商" prop="vendorName" min-width="150" />
      <el-table-column label="仓库" prop="warehouseName" width="120" />
      <el-table-column label="批号" prop="batchNo" width="130" />
      <el-table-column label="过期日期" align="center" prop="expireDate" width="110" />
      <el-table-column label="存储位置" prop="storageLocation" width="130" />
      <el-table-column label="接收数量" align="right" prop="qty" width="110">
        <template #default="scope">
          {{ formatQty(scope.row) }}
        </template>
      </el-table-column>
      <el-table-column align="right" prop="qtyReceived" width="140">
        <template #header>
          <el-tooltip content="关联采购订单行累计已入库数量（pm01411，多张入库单合计；非本批接收数）" placement="top">
            <span>关联订单已入库<Icon icon="ep:question" class="ml-4px text-gray-400" /></span>
          </el-tooltip>
        </template>
        <template #default="scope">
          {{ fmtNum(scope.row.qtyReceived) }}
        </template>
      </el-table-column>
      <el-table-column label="领用数量" align="right" prop="qtyRequisition" width="100">
        <template #default="scope">
          {{ fmtNum(scope.row.qtyRequisition) }}
        </template>
      </el-table-column>
      <el-table-column label="剩余数量" align="right" prop="remainingQty" width="110">
        <template #default="scope">
          <span :class="scope.row.remainingQty > 0 ? 'text-success' : ''">{{ fmtNum(scope.row.remainingQty) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="含税金额" align="right" prop="amountTaxIn" width="120">
        <template #default="scope">
          {{ formatAmount(scope.row) }}
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- 详情弹窗 -->
  <el-dialog v-model="detailVisible" title="采购入库单明细" width="760px" destroy-on-close>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="单号/BAS">{{ detail.basId }}</el-descriptions-item>
      <el-descriptions-item label="接受日期">{{ detail.receiptDate }}</el-descriptions-item>
      <el-descriptions-item label="物料编码">{{ detail.itemCode }}</el-descriptions-item>
      <el-descriptions-item label="物料名称">{{ detail.itemName }}</el-descriptions-item>
      <el-descriptions-item label="品牌">{{ detail.brand }}</el-descriptions-item>
      <el-descriptions-item label="规格">{{ detail.spec }}</el-descriptions-item>
      <el-descriptions-item label="单位">{{ detail.unitName }}</el-descriptions-item>
      <el-descriptions-item label="分类">{{ detail.itemCategory }}</el-descriptions-item>
      <el-descriptions-item label="供应商">{{ detail.vendorName }}</el-descriptions-item>
      <el-descriptions-item label="仓库">{{ detail.warehouseName }}</el-descriptions-item>
      <el-descriptions-item label="采购订单号">{{ detail.poCode }}</el-descriptions-item>
      <el-descriptions-item label="项目">{{ detail.projectName }}</el-descriptions-item>
      <el-descriptions-item label="批号">{{ detail.batchNo }}</el-descriptions-item>
      <el-descriptions-item label="过期日期">{{ detail.expireDate }}</el-descriptions-item>
      <el-descriptions-item label="存储位置">{{ detail.storageLocation }}</el-descriptions-item>
      <el-descriptions-item label="行号">{{ detail.lineNo }}</el-descriptions-item>
      <el-descriptions-item label="来源行ID">{{ detail.srcLineId }}</el-descriptions-item>
      <el-descriptions-item label="采购订单明细号">{{ detail.srcPoLineId }}</el-descriptions-item>
      <el-descriptions-item label="接收数量">{{ formatQty(detail) }}</el-descriptions-item>
      <el-descriptions-item label="已入库数量">{{ fmtNum(detail.qtyReceived) }}</el-descriptions-item>
      <el-descriptions-item label="领用数量">{{ fmtNum(detail.qtyRequisition) }}</el-descriptions-item>
      <el-descriptions-item label="剩余数量">{{ fmtNum(detail.remainingQty) }}</el-descriptions-item>
      <el-descriptions-item label="含税金额">{{ formatAmount(detail) }}</el-descriptions-item>
      <el-descriptions-item label="含税单价">{{ detail.priceTaxIn }}</el-descriptions-item>
      <el-descriptions-item label="未税单价">{{ detail.priceExTax }}</el-descriptions-item>
      <el-descriptions-item label="未税金额">{{ detail.amountExTax }}</el-descriptions-item>
      <el-descriptions-item label="申请人">{{ detail.applicantName }}</el-descriptions-item>
      <el-descriptions-item label="审核人">{{ detail.auditorName }}</el-descriptions-item>
      <el-descriptions-item label="期间">{{ detail.period }}</el-descriptions-item>
      <el-descriptions-item label="同步时间">{{ formatDate(detail.syncTime, 'YYYY-MM-DD HH:mm:ss') }}</el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { PmInboundApi, PmInboundVO } from '@/api/mes/pm/inbound'
import { formatDate } from '@/utils/formatTime'

defineOptions({ name: 'MesPmInbound' })

const loading = ref(true) // 列表的加载中
const list = ref<PmInboundVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const showMore = ref(false) // 是否展开更多筛选
const exportLoading = ref(false)
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  basId: undefined,
  itemName: undefined,
  vendorName: undefined,
  warehouseName: undefined,
  itemCategory: undefined,
  batchNo: undefined,
  receiptDate: undefined
})

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const params = { ...queryParams }
    // receiptDate 数组 [start, end]
    if (params.receiptDate && params.receiptDate.length === 2) {
      params.receiptDate = [params.receiptDate[0], params.receiptDate[1]]
    }
    const data = await PmInboundApi.getPmInboundPage(params)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮 */
const resetQuery = () => {
  queryParams.basId = undefined
  queryParams.itemName = undefined
  queryParams.vendorName = undefined
  queryParams.warehouseName = undefined
  queryParams.itemCategory = undefined
  queryParams.batchNo = undefined
  queryParams.receiptDate = undefined
  handleQuery()
}

/** 导出 */
const handleExport = async () => {
  try {
    await PmInboundApi.exportPmInbound(queryParams)
  } catch (e) {
    // 失败不提示，由拦截器处理
  } finally {
    exportLoading.value = false
  }
}

/** 格式化数量：去尾 0 */
const formatQty = (row: PmInboundVO) => {
  if (row.qty == null) return '-'
  return Number(row.qty)
}

/** 格式化数值：null 显示 -，去尾 0 */
const fmtNum = (v: number | undefined | null) => {
  if (v == null) return '-'
  return Number(v)
}

/** 格式化金额 */
const formatAmount = (row: PmInboundVO) => {
  if (row.amountTaxIn == null) return '-'
  return Number(row.amountTaxIn).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** 详情 */
const detailVisible = ref(false)
const detail = ref<PmInboundVO>({} as PmInboundVO)
const openDetail = (row: PmInboundVO) => {
  detail.value = row
  detailVisible.value = true
}

/** 初始化 */
getList()
</script>
