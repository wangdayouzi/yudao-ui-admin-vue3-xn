<template>
  <ContentWrap>
    <div class="intro"
      ><div
        ><h2>钉钉消息模板</h2><p>通过企业应用机器人发送消息，统一管理内容、参数和发送记录。</p></div
      ><el-button
        v-hasPermi="['system:dingtalk-template:create']"
        type="primary"
        @click="formRef?.open('create')"
        ><Icon icon="ep:plus" class="mr-5px" />新增模板</el-button
      ></div
    >
    <el-form :inline="true" :model="query" class="-mb-15px">
      <el-form-item label="模板名称"
        ><el-input v-model="query.name" clearable @keyup.enter="search"
      /></el-form-item>
      <el-form-item label="模板编码"
        ><el-input v-model="query.code" clearable @keyup.enter="search"
      /></el-form-item>
      <el-form-item label="消息类型"
        ><el-select v-model="query.messageType" clearable class="!w-160px"
          ><el-option
            v-for="type in types"
            :key="type.value"
            :label="type.label"
            :value="type.value" /></el-select
      ></el-form-item>
      <el-form-item label="状态"
        ><el-select v-model="query.status" clearable class="!w-120px"
          ><el-option label="启用" :value="0" /><el-option label="停用" :value="1" /></el-select
      ></el-form-item>
      <el-form-item
        ><el-button @click="search">搜索</el-button
        ><el-button @click="reset">重置</el-button></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="模板名称" prop="name" min-width="180" show-overflow-tooltip />
      <el-table-column label="模板编码" prop="code" min-width="200" show-overflow-tooltip />
      <el-table-column label="消息类型" width="145"
        ><template #default="scope"
          ><el-tag>{{
            types.find((type) => type.value === scope.row.messageType)?.label ||
            scope.row.messageType
          }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="模板参数" min-width="170"
        ><template #default="scope"
          ><el-tag
            v-for="key in scope.row.params"
            :key="key"
            size="small"
            class="mr-4px mb-4px"
            type="info"
            >{{ key }}</el-tag
          ><span v-if="!scope.row.params?.length">无参数</span></template
        ></el-table-column
      >
      <el-table-column label="默认接收范围" width="170">
        <template #default="{ row }">{{
          row.defaultUserIds?.length || row.defaultDeptIds?.length
            ? `${row.defaultDeptIds?.length || 0} 个部门 / ${row.defaultUserIds?.length || 0} 人`
            : '未配置'
        }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90"
        ><template #default="scope"
          ><el-tag :type="scope.row.status === 0 ? 'success' : 'info'">{{
            scope.row.status === 0 ? '启用' : '停用'
          }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="创建时间" prop="createTime" :formatter="dateFormatter" width="180" />
      <el-table-column label="操作" fixed="right" width="260"
        ><template #default="scope">
          <el-button
            v-hasPermi="['system:dingtalk-template:update']"
            link
            type="primary"
            @click="formRef?.open('update', scope.row.id)"
            >编辑</el-button
          >
          <el-button
            v-hasPermi="['system:dingtalk-template:create']"
            link
            type="primary"
            @click="formRef?.open('copy', scope.row.id)"
            >复制</el-button
          >
          <el-button
            v-hasPermi="['system:dingtalk-template:send']"
            link
            type="primary"
            :disabled="scope.row.status !== 0"
            @click="sendRef?.open(scope.row.id)"
            >测试发送</el-button
          >
          <el-button
            v-hasPermi="['system:dingtalk-template:delete']"
            link
            type="danger"
            @click="remove(scope.row.id)"
            >删除</el-button
          >
        </template></el-table-column
      >
    </el-table>
    <Pagination
      v-model:page="query.pageNo"
      v-model:limit="query.pageSize"
      :total="total"
      @pagination="load"
    />
  </ContentWrap>
  <TemplateForm ref="formRef" :types="types" @success="load" />
  <SendDialog ref="sendRef" />
</template>
<script setup lang="ts">
import * as Api from '@/api/system/dingtalk'
import { dateFormatter } from '@/utils/formatTime'
import TemplateForm from './TemplateForm.vue'
import SendDialog from './SendDialog.vue'
defineOptions({ name: 'SystemDingTalkTemplate' })
const message = useMessage()
const types = ref<Api.MessageType[]>([])
const loading = ref(false)
const list = ref<Api.MessageTemplate[]>([])
const total = ref(0)
const formRef = ref<InstanceType<typeof TemplateForm>>()
const sendRef = ref<InstanceType<typeof SendDialog>>()
const query = reactive({
  pageNo: 1,
  pageSize: 10,
  name: '',
  code: '',
  messageType: '',
  status: undefined as number | undefined
})
const load = async () => {
  loading.value = true
  try {
    const data = await Api.getTemplatePage(query)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}
const search = () => {
  query.pageNo = 1
  load()
}
const reset = () => {
  Object.assign(query, { pageNo: 1, name: '', code: '', messageType: '', status: undefined })
  load()
}
const remove = async (id: number) => {
  try {
    await message.delConfirm()
  } catch {
    return
  }
  await Api.deleteTemplate(id)
  message.success('删除成功')
  await load()
}
onMounted(async () => {
  types.value = await Api.getTypes()
  await load()
})
</script>
<style scoped lang="scss">
.intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

h2 {
  margin: 0 0 8px;
  font-size: 20px;
}

p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
</style>
