<template>
  <!-- 搜索 -->
  <ContentWrap>
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="工具名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入工具名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="分类" prop="category">
        <el-select
          v-model="queryParams.category"
          placeholder="请选择分类"
          clearable
          class="!w-240px"
        >
          <el-option
            v-for="dict in getDictOptions(DICT_TYPE.INFRA_TOOLBOX_TOOL_CATEGORY)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select
          v-model="queryParams.status"
          placeholder="请选择状态"
          clearable
          class="!w-240px"
        >
          <el-option label="开启" :value="0" />
          <el-option label="关闭" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['infra:toolbox-tool:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="工具名称" align="center" prop="name" :show-overflow-tooltip="true" />
      <el-table-column label="分类" align="center" prop="category" width="100" />
      <el-table-column label="图标" align="center" width="70">
        <template #default="scope">
          <el-image
            v-if="isIconUrl(scope.row.icon)"
            :src="scope.row.icon"
            class="h-24px w-24px"
            fit="contain"
          />
          <Icon v-else-if="scope.row.icon" :icon="scope.row.icon" :size="22" />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="版本" align="center" prop="version" width="100" />
      <el-table-column
        label="工具说明"
        align="center"
        prop="description"
        :show-overflow-tooltip="true"
      />
      <el-table-column label="平台" align="center" prop="platform" width="100" />
      <el-table-column label="状态" align="center" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : 'info'">
            {{ scope.row.status === 0 ? '开启' : '关闭' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="下载次数" align="center" prop="downloadCount" width="90" />
      <el-table-column label="排序" align="center" prop="sort" width="70" />
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        width="180"
        :formatter="dateFormatter"
      />
      <el-table-column label="操作" align="center" width="150">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['infra:toolbox-tool:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['infra:toolbox-tool:delete']"
          >
            删除
          </el-button>
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

  <!-- 表单弹窗：添加/修改 -->
  <ToolboxToolForm ref="formRef" @success="getList" />
</template>
<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import { DICT_TYPE, getDictOptions } from '@/utils/dict'
import * as ToolboxToolApi from '@/api/infra/toolboxTool'
import ToolboxToolForm from './ToolboxToolForm.vue'

defineOptions({ name: 'InfraToolboxTool' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref([]) // 列表的数据
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  category: undefined,
  status: undefined
})
const queryFormRef = ref() // 搜索的表单

/** 判断图标是否是 URL（用于区分 Element Plus 图标名 与 图片地址） */
const isIconUrl = (icon: string) => {
  return !!icon && (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/'))
}

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ToolboxToolApi.getToolboxToolPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await ToolboxToolApi.deleteToolboxTool(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>
