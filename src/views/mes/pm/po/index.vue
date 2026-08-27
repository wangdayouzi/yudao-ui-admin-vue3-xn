<!-- 老ERP采购订单数据（PM同步数据，字段参考原出入库流水） -->
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
      <el-form-item label="单号" prop="poCode">
        <el-input
          v-model="queryParams.poCode"
          placeholder="采购订单号"
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
      <el-form-item label="日期" prop="orderDate">
        <el-date-picker
          v-model="queryParams.orderDate"
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
          v-hasPermi="['mes:pm-po:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
    <!-- 更多筛选：分类 -->
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
      <el-table-column label="订单日期" align="center" prop="orderDate" width="110" />
      <el-table-column label="采购订单号" align="center" prop="poCode" width="150" />
      <el-table-column label="物料编码" align="center" prop="itemCode" width="150" />
      <el-table-column label="物料名称" prop="itemName" min-width="200" />
      <el-table-column label="品牌" prop="brand" width="120" />
      <el-table-column label="规格" prop="spec" width="140" />
      <el-table-column label="单位" align="center" prop="unitName" width="80" />
      <el-table-column label="分类" prop="itemCategory" width="140" />
      <el-table-column label="供应商" prop="vendorName" min-width="150" />
      <el-table-column label="采购数量" align="right" prop="qtyOrdered" width="110">
        <template #default="scope">
          {{ formatNum(scope.row.qtyOrdered) }}
        </template>
      </el-table-column>
      <el-table-column label="已入库数量" align="right" prop="qtyReceived" width="110">
        <template #default="scope">
          {{ formatNum(scope.row.qtyReceived) }}
        </template>
      </el-table-column>
      <el-table-column label="领用数量" align="right" prop="qtyRequisition" width="100">
        <template #default="scope">
          {{ formatNum(scope.row.qtyRequisition) }}
        </template>
      </el-table-column>
      <el-table-column label="退料数量" align="right" prop="qtyReturn" width="100">
        <template #default="scope">
          {{ formatNum(scope.row.qtyReturn) }}
        </template>
      </el-table-column>
      <el-table-column label="采购退货" align="right" prop="qtyReturnOut" width="100">
        <template #default="scope">
          {{ formatNum(scope.row.qtyReturnOut) }}
        </template>
      </el-table-column>
      <el-table-column label="剩余数量" align="right" prop="remainingQty" width="110">
        <template #default="scope">
          <span :class="scope.row.remainingQty > 0 ? 'text-success' : 'text-gray-500'">
            {{ formatNum(scope.row.remainingQty) }}
          </span>
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
  <el-dialog v-model="detailVisible" title="采购订单数据" width="680px" destroy-on-close>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="订单日期">{{ detail.orderDate }}</el-descriptions-item>
      <el-descriptions-item label="采购订单号">{{ detail.poCode }}</el-descriptions-item>
      <el-descriptions-item label="物料编码">{{ detail.itemCode }}</el-descriptions-item>
      <el-descriptions-item label="物料名称">{{ detail.itemName }}</el-descriptions-item>
      <el-descriptions-item label="品牌">{{ detail.brand }}</el-descriptions-item>
      <el-descriptions-item label="规格">{{ detail.spec }}</el-descriptions-item>
      <el-descriptions-item label="单位">{{ detail.unitName }}</el-descriptions-item>
      <el-descriptions-item label="分类">{{ detail.itemCategory }}</el-descriptions-item>
      <el-descriptions-item label="供应商">{{ detail.vendorName }}</el-descriptions-item>
      <el-descriptions-item label="行号">{{ detail.lineId }}</el-descriptions-item>
      <el-descriptions-item label="采购数量">{{ formatNum(detail.qtyOrdered) }}</el-descriptions-item>
      <el-descriptions-item label="已入库数量">{{ formatNum(detail.qtyReceived) }}</el-descriptions-item>
      <el-descriptions-item label="领用数量">{{ formatNum(detail.qtyRequisition) }}</el-descriptions-item>
      <el-descriptions-item label="退料数量">{{ formatNum(detail.qtyReturn) }}</el-descriptions-item>
      <el-descriptions-item label="采购退货">{{ formatNum(detail.qtyReturnOut) }}</el-descriptions-item>
      <el-descriptions-item label="剩余数量">{{ formatNum(detail.remainingQty) }}</el-descriptions-item>
      <el-descriptions-item label="订单主ID">{{ detail.poId }}</el-descriptions-item>
      <el-descriptions-item label="物料ID">{{ detail.srcItemId }}</el-descriptions-item>
      <el-descriptions-item label="同步时间">{{ formatDate(detail.syncTime, 'YYYY-MM-DD HH:mm:ss') }}</el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { PmPoApi, PmPoVO } from '@/api/mes/pm/po'
import { formatDate } from '@/utils/formatTime'

defineOptions({ name: 'MesPmPo' })

const loading = ref(true) // 列表的加载中
const list = ref<PmPoVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const showMore = ref(false) // 是否展开更多筛选
const exportLoading = ref(false)
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  poCode: undefined,
  itemName: undefined,
  vendorName: undefined,
  itemCategory: undefined,
  orderDate: undefined
})

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await PmPoApi.getPmPoPage(queryParams)
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
  queryParams.poCode = undefined
  queryParams.itemName = undefined
  queryParams.vendorName = undefined
  queryParams.itemCategory = undefined
  queryParams.orderDate = undefined
  handleQuery()
}

/** 导出 */
const handleExport = async () => {
  exportLoading.value = true
  try {
    await PmPoApi.exportPmPo(queryParams)
  } catch (e) {
    // 失败由拦截器处理
  } finally {
    exportLoading.value = false
  }
}

/** 格式化数量：去尾 0，空显示 - */
const formatNum = (v: number) => {
  if (v == null) return '-'
  return Number(v)
}

/** 详情 */
const detailVisible = ref(false)
const detail = ref<PmPoVO>({} as PmPoVO)
const openDetail = (row: PmPoVO) => {
  detail.value = row
  detailVisible.value = true
}

/** 初始化 */
getList()
</script>
