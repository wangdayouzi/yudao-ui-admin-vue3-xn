<template>
  <div class="reagent-clinical-container">
    <!-- ============ 搜索区域 ============ -->
    <ContentWrap>
      <el-form :inline="true" :model="queryParams" @submit.prevent="handleQuery">
        <el-form-item label="方案名称" prop="name">
          <el-input
            v-model="queryParams.name"
            placeholder="模糊匹配"
            clearable
            class="!w-220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="方案编号" prop="number">
          <el-input
            v-model="queryParams.number"
            placeholder="模糊匹配"
            clearable
            class="!w-190px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" clearable class="!w-130px" @change="handleQuery">
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

    <!-- ============ 临床方案列表（老样本系统同步） ============ -->
    <ContentWrap>
      <div class="mb-8px flex items-center justify-between gap-12px">
        <span class="text-12px" style="color: var(--el-text-color-secondary)">
          数据来自老样本系统 think_clinical，每天 00:00
          自动同步；「自动寄送通知」为本地配置，同步不会覆盖。
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
        <el-table-column label="临床方案名称" prop="name" min-width="320" show-overflow-tooltip />
        <el-table-column label="方案编号" prop="number" width="180" show-overflow-tooltip />
        <el-table-column label="申办方ID" prop="sponsorId" width="95" align="center" />
        <el-table-column label="上传附件" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isUpload === 1" type="success" size="small">是</el-tag>
            <span v-else class="text-gray-400">否</span>
          </template>
        </el-table-column>
        <el-table-column label="生效日期" prop="effectiveDate" width="120" show-overflow-tooltip />
        <el-table-column label="版本号" prop="versionNumber" width="80" align="center" />
        <el-table-column label="自动寄送通知" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isAutoReceive === 1 ? 'success' : 'info'" size="small">
              {{ row.isAutoReceive === 1 ? '开启' : '关闭' }}
            </el-tag>
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
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="info" size="small">已停用</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button
              v-hasPermi="['reagent:clinical:update']"
              link
              type="primary"
              @click="openEdit(row)"
            >
              编辑
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

    <!-- ============ 编辑弹窗：仅本地配置字段 ============ -->
    <el-dialog v-model="editVisible" title="维护临床方案本地配置" width="560px" destroy-on-close>
      <el-form label-width="170px">
        <el-form-item label="临床方案编号">
          <el-input :model-value="editRow.number" disabled />
        </el-form-item>
        <el-form-item label="临床方案名称">
          <el-input :model-value="editRow.name" type="textarea" :rows="2" disabled />
        </el-form-item>
        <el-form-item label="自动发送寄送通知邮件">
          <el-switch v-model="editIsAutoReceive" active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <div class="text-12px" style="color: var(--el-text-color-secondary); padding-left: 170px">
          该字段由本地维护，定时同步不会覆盖。
        </div>
      </el-form>
      <template #footer>
        <el-button :loading="editSaving" type="primary" @click="submitEdit">确 定</el-button>
        <el-button @click="editVisible = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import * as BasicDataApi from '@/api/reagent/basicData'
import { formatDate } from '@/utils/formatTime'

defineOptions({ name: 'ReagentClinical' })

const message = useMessage()

// ==================== 查询 ====================
const loading = ref(false)
const total = ref(0)
const list = ref<BasicDataApi.ReagentClinicalVO[]>([])
const queryParams = reactive({
  pageNo: 1,
  pageSize: 15,
  name: '',
  number: '',
  status: undefined as number | undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await BasicDataApi.getClinicalPage(queryParams)
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
  queryParams.name = ''
  queryParams.number = ''
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

// ==================== 编辑本地字段 ====================
const editVisible = ref(false)
const editSaving = ref(false)
const editRow = ref<BasicDataApi.ReagentClinicalVO>({})
const editIsAutoReceive = ref(false)

const openEdit = (row: BasicDataApi.ReagentClinicalVO) => {
  editRow.value = row
  editIsAutoReceive.value = row.isAutoReceive === 1
  editVisible.value = true
}

const submitEdit = async () => {
  if (!editRow.value.id) {
    return
  }
  editSaving.value = true
  try {
    await BasicDataApi.updateClinicalLocalField({
      id: editRow.value.id,
      isAutoReceive: editIsAutoReceive.value ? 1 : 0
    })
    message.success('保存成功')
    editVisible.value = false
    getList()
  } finally {
    editSaving.value = false
  }
}
</script>
