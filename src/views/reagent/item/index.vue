<template>
  <div class="reagent-item-container">
    <!-- ============ 搜索区域 ============ -->
    <ContentWrap>
      <el-form :inline="true" :model="queryParams" @submit.prevent="handleQuery">
        <el-form-item label="项目号" prop="baseId">
          <el-input
            v-model="queryParams.baseId"
            placeholder="模糊匹配"
            clearable
            class="!w-170px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="方案编号" prop="clinicalNumber">
          <el-input
            v-model="queryParams.clinicalNumber"
            placeholder="模糊匹配"
            clearable
            class="!w-180px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="方案名称" prop="clinicalName">
          <el-input
            v-model="queryParams.clinicalName"
            placeholder="模糊匹配"
            clearable
            class="!w-200px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="城市">
          <el-select v-model="queryParams.cityId" clearable class="!w-120px" @change="handleQuery">
            <el-option label="上海" :value="1" />
            <el-option label="宁波" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="复核状态">
          <el-select
            v-model="queryParams.reviewStatus"
            clearable
            class="!w-120px"
            @change="handleQuery"
          >
            <el-option label="未复核" :value="0" />
            <el-option label="已复核" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" clearable class="!w-120px" @change="handleQuery">
            <el-option label="正常" :value="0" />
            <el-option label="停用" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery"> <Icon icon="ep:search" />搜索 </el-button>
          <el-button @click="resetQuery"> <Icon icon="ep:refresh" />重置 </el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <!-- ============ 项目号列表（老样本系统同步） ============ -->
    <ContentWrap>
      <div class="mb-8px flex items-center justify-between gap-12px">
        <span class="text-12px" style="color: var(--el-text-color-secondary)">
          数据来自老样本系统 think_items（关联 think_clinical），每天 00:00 自动同步。
        </span>
        <el-button
          v-hasPermi="['reagent:basic-data:sync']"
          type="primary"
          plain
          size="small"
          :loading="syncLoading"
          @click="handleSync"
        >
          <Icon icon="ep:refresh" />立即同步
        </el-button>
      </div>

      <el-table v-loading="loading" :data="list">
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="城市" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.cityId === 1" size="small">上海</el-tag>
            <el-tag v-else-if="row.cityId === 2" type="warning" size="small">宁波</el-tag>
            <span v-else class="text-gray-400">—</span>
          </template>
        </el-table-column>
        <el-table-column label="项目号" prop="baseId" width="150" show-overflow-tooltip />
        <el-table-column
          label="临床方案编号"
          prop="clinicalNumber"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column
          label="临床方案名称"
          prop="clinicalName"
          min-width="280"
          show-overflow-tooltip
        />
        <el-table-column label="项目负责人ID" prop="personId" width="110" align="center" />
        <el-table-column label="样本类型ID" prop="typeId" width="100" align="center" />
        <el-table-column label="是否时效" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isAging === 1 ? 'warning' : 'info'" size="small">
              {{ row.isAging === 1 ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="复核状态" width="95" align="center">
          <template #default="{ row }">
            <el-tag :type="row.reviewStatus === 1 ? 'success' : 'info'" size="small">
              {{ row.reviewStatus === 1 ? '已复核' : '未复核' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="复核人ID" prop="reviewer" width="90" align="center" />
        <el-table-column label="附报告" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isReport === 1" type="success" size="small">是</el-tag>
            <span v-else class="text-gray-400">否</span>
          </template>
        </el-table-column>
        <el-table-column label="病原微生物" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isPm === 1" type="danger" size="small">是</el-tag>
            <span v-else class="text-gray-400">否</span>
          </template>
        </el-table-column>
        <el-table-column label="添加时间" width="165" align="center">
          <template #default="{ row }">{{ formatDate(row.srcCreateTime) || '—' }}</template>
        </el-table-column>
        <el-table-column label="编辑时间" width="165" align="center">
          <template #default="{ row }">{{ formatDate(row.srcUpdateTime) || '—' }}</template>
        </el-table-column>
        <el-table-column label="同步时间" width="165" align="center">
          <template #default="{ row }">{{ formatDate(row.syncTime) || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="info" size="small">已停用</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
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
  </div>
</template>

<script lang="ts" setup>
import * as BasicDataApi from '@/api/reagent/basicData'
import { formatDate } from '@/utils/formatTime'

defineOptions({ name: 'ReagentItem' })

const message = useMessage()

// ==================== 查询 ====================
const loading = ref(false)
const total = ref(0)
const list = ref<BasicDataApi.ReagentItemVO[]>([])
const queryParams = reactive({
  pageNo: 1,
  pageSize: 15,
  baseId: '',
  clinicalNumber: '',
  clinicalName: '',
  cityId: undefined as number | undefined,
  reviewStatus: undefined as number | undefined,
  status: undefined as number | undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await BasicDataApi.getItemPage(queryParams)
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
  queryParams.baseId = ''
  queryParams.clinicalNumber = ''
  queryParams.clinicalName = ''
  queryParams.cityId = undefined
  queryParams.reviewStatus = undefined
  queryParams.status = undefined
  handleQuery()
}

getList()

// ==================== 手动同步 ====================
const syncLoading = ref(false)

const handleSync = async () => {
  try {
    await message.confirm('将立即从老样本系统全量同步临床方案与项目号，是否继续？')
  } catch {
    return
  }
  syncLoading.value = true
  try {
    const res = await BasicDataApi.syncBasicData()
    message.success(typeof res === 'string' ? res : '同步完成')
    getList()
  } finally {
    syncLoading.value = false
  }
}
</script>
