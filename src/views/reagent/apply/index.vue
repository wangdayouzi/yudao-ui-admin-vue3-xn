<template>
  <div class="reagent-apply-container">
    <!-- ============ 搜索区域 ============ -->
    <ContentWrap>
      <el-form ref="queryFormRef" :inline="true" :model="queryParams">
        <el-form-item label="申请单号" prop="applyNo">
          <el-input v-model="queryParams.applyNo" placeholder="请输入申请单号" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="接收单位" prop="receiverUnit">
          <el-input v-model="queryParams.receiverUnit" placeholder="请输入接收单位" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-150px">
            <el-option label="草稿" :value="0" />
            <el-option label="待发货" :value="1" />
            <el-option label="部分发货" :value="2" />
            <el-option label="已完成" :value="3" />
            <el-option label="已拒单退回" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <Icon icon="ep:search" />搜索
          </el-button>
          <el-button @click="resetQuery">
            <Icon icon="ep:refresh" />重置
          </el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <!-- ============ 表格 ============ -->
    <ContentWrap>
      <el-button v-hasPermi="['reagent:apply:create']" type="primary" @click="openDeliveryForm('create')">
        <Icon icon="ep:plus" />新增申请单
      </el-button>

      <el-table v-loading="loading || submitLoading" :data="list" style="margin-top: 12px">
        <el-table-column label="申请单号" prop="applyNo" width="180" />
        <el-table-column label="接收单位" prop="receiverUnit" min-width="180" show-overflow-tooltip />
        <el-table-column label="接收联系人" prop="receiverName" width="100" />
        <el-table-column label="接收电话" prop="receiverPhone" width="130" />
        <el-table-column label="状态" prop="status" width="100">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)">
              {{ statusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="退回理由" prop="remark" min-width="150" show-overflow-tooltip>
          <template #default="scope">
            <span v-if="scope.row.status === 4">{{ scope.row.remark || '-' }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :formatter="dateFormatter" align="center" label="创建时间" prop="createTime" width="170" />
        <el-table-column label="创建人" prop="creator" width="100" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <!-- 草稿/退回：可编辑、提交、删除 -->
            <template v-if="scope.row.status === 0 || scope.row.status === 4">
              <el-button v-hasPermi="['reagent:apply:update']" link type="primary" @click="openDeliveryForm('edit', scope.row.id)">
                编辑
              </el-button>
              <el-button v-hasPermi="['reagent:apply:update']" link type="success" @click="handleSubmit(scope.row.id)">
                提交
              </el-button>
              <el-button v-hasPermi="['reagent:apply:delete']" link type="danger" @click="handleDelete(scope.row.id)">
                删除
              </el-button>
            </template>
            <!-- 待发货/部分发货：样品组处理（发货/拒单） -->
            <template v-if="scope.row.status === 1 || scope.row.status === 2">
              <el-button v-hasPermi="['reagent:shipment:create']" link type="primary" @click="openDeliveryForm('ship', scope.row.id)">
                处理发货
              </el-button>
            </template>
            <!-- 全部：查看详情 -->
            <el-button link type="info" @click="openDeliveryForm('view', scope.row.id)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination
        v-model:limit="queryParams.pageSize"
        v-model:page="queryParams.pageNo"
        :total="total"
        @pagination="getList"
      />
    </ContentWrap>

    <!-- ============ 发货履约表单（弹窗） ============ -->
    <DeliveryForm ref="deliveryFormRef" @success="getList" />
  </div>
</template>

<script lang="ts" setup>
import * as ReagentApi from '@/api/reagent/index'
import { dateFormatter } from '@/utils/formatTime'
import DeliveryForm from './DeliveryForm.vue'

defineOptions({ name: 'ReagentApply' })

const message = useMessage()

const loading = ref(true)
const total = ref(0)
const list = ref<ReagentApi.ReagentApplyVO[]>([])
const queryParams = reactive({
  pageNo: 1,
  pageSize: 15,
  applyNo: '',
  receiverUnit: '',
  status: undefined as number | undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await ReagentApi.getApplyPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryParams.applyNo = ''
  queryParams.receiverUnit = ''
  queryParams.status = undefined
  handleQuery()
}

getList()

const statusText = (status: number) => {
  const map: Record<number, string> = { 0: '草稿', 1: '待发货', 2: '部分发货', 3: '已完成', 4: '已退回' }
  return map[status] || '未知'
}

const statusTagType = (status: number) => {
  const map: Record<number, string> = { 0: 'info', 1: 'warning', 2: '', 3: 'success', 4: 'danger' }
  return map[status] || 'info'
}

const handleDelete = async (id: number) => {
  try { await message.confirm('确认删除该申请单？') } catch { return }
  await ReagentApi.deleteApply(id)
  message.success('删除成功')
  getList()
}

const handleSubmit = async (id: number) => {
  try { await message.confirm('确认提交该申请单？提交后将进入审批流程。') } catch { return }
  submitLoading.value = true
  try {
    await ReagentApi.submitApply(id)
    message.success('提交成功')
    getList()
  } finally {
    submitLoading.value = false
  }
}

const submitLoading = ref(false)

// ==================== 打开发货履约表单 ====================
const deliveryFormRef = ref()

const openDeliveryForm = (mode: string, id?: number) => {
  deliveryFormRef.value?.open(mode, id)
}
</script>
