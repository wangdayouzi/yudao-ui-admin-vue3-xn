<template>
  <ContentWrap>
    <el-alert
      title="钉钉已受理表示发送接口受理成功，不代表员工已读。结果未知或长时间处理中时，请先核实收件情况再重新发送。"
      type="info"
      :closable="false"
      class="mb-16px"
    />
    <el-form :inline="true" :model="query" class="-mb-15px">
      <el-form-item label="模板编码"
        ><el-input v-model="query.templateCode" clearable @keyup.enter="search"
      /></el-form-item>
      <el-form-item label="请求标识"
        ><el-input v-model="query.requestId" clearable @keyup.enter="search"
      /></el-form-item>
      <el-form-item label="接收人"
        ><el-select v-model="query.userId" filterable clearable class="!w-180px"
          ><el-option
            v-for="user in users"
            :key="user.id"
            :value="user.id"
            :label="user.nickname" /></el-select
      ></el-form-item>
      <el-form-item label="状态"
        ><el-select v-model="query.sendStatus" clearable class="!w-160px"
          ><el-option
            v-for="(label, key) in Api.statusLabels"
            :key="key"
            :value="Number(key)"
            :label="label" /></el-select
      ></el-form-item>
      <el-form-item
        ><el-button @click="search">搜索</el-button
        ><el-button @click="reset">重置</el-button></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column prop="id" label="编号" width="90" />
      <el-table-column prop="templateName" label="模板" min-width="160" show-overflow-tooltip />
      <el-table-column prop="templateCode" label="模板编码" min-width="180" show-overflow-tooltip />
      <el-table-column prop="userName" label="接收人" width="120" />
      <el-table-column label="状态" width="140"
        ><template #default="scope"
          ><el-tag
            :type="Api.statusColors[scope.row.sendStatus as keyof typeof Api.statusColors]"
            >{{ Api.statusLabels[scope.row.sendStatus] }}</el-tag
          ></template
        ></el-table-column
      >
      <el-table-column prop="errorMessage" label="失败原因" min-width="240" show-overflow-tooltip />
      <el-table-column prop="createTime" label="创建时间" :formatter="dateFormatter" width="180" />
      <el-table-column label="操作" width="90" fixed="right"
        ><template #default="scope"
          ><el-button link type="primary" @click="detail(scope.row.id)">详情</el-button></template
        ></el-table-column
      >
    </el-table>
    <Pagination
      v-model:page="query.pageNo"
      v-model:limit="query.pageSize"
      :total="total"
      @pagination="load"
    />
  </ContentWrap>
  <Dialog
    v-model="visible"
    title="钉钉消息发送详情"
    width="min(850px, 95vw)"
    :scroll="true"
    max-height="65vh"
    top="5vh"
  >
    <template v-if="selected">
      <el-descriptions :column="2" border class="mb-20px">
        <el-descriptions-item label="模板">{{ selected.templateName }}</el-descriptions-item>
        <el-descriptions-item label="接收人"
          >{{ selected.userName }}（{{ selected.userId }}）</el-descriptions-item
        >
        <el-descriptions-item label="发送状态">{{
          Api.statusLabels[selected.sendStatus]
        }}</el-descriptions-item>
        <el-descriptions-item label="消息类型">{{ selected.messageType }}</el-descriptions-item>
        <el-descriptions-item label="请求标识" :span="2">{{
          selected.requestId
        }}</el-descriptions-item>
        <el-descriptions-item label="业务编号">{{
          selected.businessId || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="机器人编码">{{ selected.robotCode }}</el-descriptions-item>
        <el-descriptions-item label="钉钉受理编号" :span="2">{{
          selected.processQueryKey || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="错误码">{{ selected.errorCode || '—' }}</el-descriptions-item>
        <el-descriptions-item label="说明">{{ selected.errorMessage || '—' }}</el-descriptions-item>
      </el-descriptions>
      <MessagePreview :type="selected.messageType" :content="selected.content" />
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import * as Api from '@/api/system/dingtalk'
import * as UserApi from '@/api/system/user'
import { dateFormatter } from '@/utils/formatTime'
import MessagePreview from '../components/MessagePreview.vue'
defineOptions({ name: 'SystemDingTalkLog' })
const users = ref<UserApi.UserVO[]>([])
const list = ref<Api.MessageLog[]>([])
const total = ref(0)
const loading = ref(false)
const visible = ref(false)
const selected = ref<Api.MessageLog>()
const query = reactive({
  pageNo: 1,
  pageSize: 10,
  templateCode: '',
  requestId: '',
  userId: undefined as number | undefined,
  sendStatus: undefined as number | undefined
})
const load = async () => {
  loading.value = true
  try {
    const data = await Api.getLogPage(query)
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
  Object.assign(query, {
    pageNo: 1,
    templateCode: '',
    requestId: '',
    userId: undefined,
    sendStatus: undefined
  })
  load()
}
const detail = async (id: number) => {
  selected.value = await Api.getLog(id)
  visible.value = true
}
onMounted(async () => {
  await load()
  users.value = await UserApi.getSimpleUserList(true)
})
</script>
