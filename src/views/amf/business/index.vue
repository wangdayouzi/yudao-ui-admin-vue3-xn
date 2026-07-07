<template>
  <div class="amf-business-container">
    <!-- 搜索工作栏 -->
    <ContentWrap>
      <el-form
        ref="queryFormRef"
        :inline="true"
        :model="queryParams"
        class="-mb-15px"
        label-width="90px"
      >
        <el-form-item label="BAS编号" prop="basNo">
          <el-input
            v-model="queryParams.basNo"
            class="!w-200px"
            clearable
            placeholder="请输入BAS编号"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="临床方案编号" prop="protocolNo">
          <el-input
            v-model="queryParams.protocolNo"
            class="!w-200px"
            clearable
            placeholder="请输入临床方案编号"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="申办方" prop="sponsor">
          <el-input
            v-model="queryParams.sponsor"
            class="!w-200px"
            clearable
            placeholder="请输入申办方"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="分析方法" prop="analysisMethod">
          <el-input
            v-model="queryParams.analysisMethod"
            class="!w-200px"
            clearable
            placeholder="请输入分析方法"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="handleQuery">
            <Icon class="mr-5px" icon="ep:search" />
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <Icon class="mr-5px" icon="ep:refresh" />
            重置
          </el-button>
          <el-button
            v-hasPermi="['amf:business:create']"
            plain
            type="primary"
            @click="openForm('create')"
          >
            <Icon class="mr-5px" icon="ep:plus" />
            新增
          </el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <!-- 列表 -->
    <ContentWrap>
      <el-table v-loading="loading" :data="list">
        <el-table-column align="center" label="编号" prop="id" width="80" />
        <el-table-column align="center" label="BAS编号" prop="basNo" show-overflow-tooltip />
        <el-table-column align="center" label="临床方案编号" prop="protocolNo" show-overflow-tooltip />
        <el-table-column align="center" label="申办方" prop="sponsor" show-overflow-tooltip />
        <el-table-column align="center" label="分析方法" prop="analysisMethod" show-overflow-tooltip min-width="180" />
        <el-table-column
          :formatter="dateFormatter"
          align="center"
          label="创建时间"
          prop="createTime"
          width="160"
        />
        <el-table-column align="center" label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button
              v-hasPermi="['amf:business:update']"
              link
              type="primary"
              @click="openForm('update', scope.row.id)"
            >
              修改
            </el-button>
            <el-button
              v-hasPermi="['amf:business:query']"
              link
              type="success"
              @click="openFileManager(scope.row)"
            >
              文件管理
            </el-button>
            <el-button
              v-hasPermi="['amf:business:delete']"
              link
              type="danger"
              @click="handleDelete(scope.row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <!-- 分页 -->
      <Pagination
        v-model:limit="queryParams.pageSize"
        v-model:page="queryParams.pageNo"
        :total="total"
        @pagination="getList"
      />
    </ContentWrap>

    <!-- 表单弹窗：添加/修改 -->
    <AmfBusinessForm ref="formRef" @success="getList" />

    <!-- 文件管理抽屉 -->
    <AmfFileManager ref="fileManagerRef" />
  </div>
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import * as AmfApi from '@/api/amf/index'
import AmfBusinessForm from './AmfBusinessForm.vue'
import AmfFileManager from './AmfFileManager.vue'

defineOptions({ name: 'AmfBusiness' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<AmfApi.AmfBusinessVO[]>([])
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  basNo: '',
  protocolNo: '',
  sponsor: '',
  analysisMethod: ''
})
const queryFormRef = ref()

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await AmfApi.getBusinessPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索 */
const handleQuery = () => {
  getList()
}

/** 重置 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 文件管理 */
const fileManagerRef = ref()
const openFileManager = (row: AmfApi.AmfBusinessVO) => {
  fileManagerRef.value.open(row)
}

/** 删除 */
const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await AmfApi.deleteBusiness(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

/** 初始化 */
onMounted(() => {
  getList()
})
</script>

<style lang="scss" scoped>
.amf-business-container {
  :deep(.el-table) {
    .el-button + .el-button {
      margin-left: 0;
    }
  }
}
</style>
