<template>
  <ContentWrap>
    <el-form :model="query" inline @submit.prevent="search">
      <el-form-item label="业务编号">
        <el-input v-model="query.businessId" clearable placeholder="如 sample-urgent:8" />
      </el-form-item>
      <el-form-item label="模板编码">
        <el-input v-model="query.templateCode" clearable />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable class="!w-160px" @change="search">
          <el-option
            v-for="(label, key) in Api.notificationStatus"
            :key="key"
            :value="Number(key)"
            :label="label"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">搜索</el-button>
        <el-button @click="reset">重置</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <el-alert
      v-if="loadFailed"
      title="通知加载失败，请重试"
      type="error"
      :closable="false"
      class="mb-12px"
    />
    <el-table v-loading="loading" :data="list" row-key="id">
      <el-table-column prop="id" label="编号" width="90" />
      <el-table-column prop="businessId" label="业务编号" min-width="170" show-overflow-tooltip />
      <el-table-column prop="templateCode" label="模板编码" min-width="190" show-overflow-tooltip />
      <el-table-column prop="userName" label="接收人" width="120" />
      <el-table-column label="状态" width="130">
        <template #default="{ row }"
          ><el-tag :type="statusColor(row.status)">{{
            Api.notificationStatus[row.status]
          }}</el-tag></template
        >
      </el-table-column>
      <el-table-column
        prop="sendAfter"
        label="计划发送时间"
        :formatter="dateFormatter"
        width="180"
      />
      <el-table-column prop="errorMessage" label="说明" min-width="220" show-overflow-tooltip />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="detail(row.id)">详情</el-button>
          <el-button
            v-if="row.status === 0"
            v-hasPermi="['system:dingtalk-notification:manage']"
            link
            type="danger"
            @click="openOperation(row, 'cancel')"
            >取消</el-button
          >
          <el-button
            v-if="row.status === 3 || row.status === 4"
            v-hasPermi="['system:dingtalk-notification:manage']"
            link
            type="primary"
            @click="openOperation(row, 'resend')"
            >重发</el-button
          >
        </template>
      </el-table-column>
    </el-table>
    <Pagination
      v-model:page="query.pageNo"
      v-model:limit="query.pageSize"
      :total="total"
      @pagination="load"
    />
  </ContentWrap>
  <el-drawer v-model="detailVisible" title="通知详情" size="min(760px, 95vw)">
    <el-descriptions v-if="selected" :column="1" border>
      <el-descriptions-item label="业务编号">{{ selected.businessId || '—' }}</el-descriptions-item>
      <el-descriptions-item label="接收人">{{ selected.userName }}</el-descriptions-item>
      <el-descriptions-item label="模板编码">{{ selected.templateCode }}</el-descriptions-item>
      <el-descriptions-item label="请求标识">{{ selected.requestId }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{
        Api.notificationStatus[selected.status]
      }}</el-descriptions-item>
      <el-descriptions-item label="计划发送">{{
        formatDate(selected.sendAfter)
      }}</el-descriptions-item>
      <el-descriptions-item label="有效期至">{{
        selected.expiresAt ? formatDate(selected.expiresAt) : '不限'
      }}</el-descriptions-item>
      <el-descriptions-item label="说明">{{ selected.errorMessage || '—' }}</el-descriptions-item>
      <el-descriptions-item label="原始通知">{{
        selected.retryOf || selected.id
      }}</el-descriptions-item>
      <el-descriptions-item label="重发次数">{{ selected.retryNo }}</el-descriptions-item>
      <el-descriptions-item label="操作人编号">{{
        selected.operatorId || '—'
      }}</el-descriptions-item>
      <el-descriptions-item label="操作原因">{{
        selected.operationReason || '—'
      }}</el-descriptions-item>
      <el-descriptions-item
        v-for="(value, key) in selected.params"
        :key="key"
        :label="paramLabels[key] || key"
      >
        <div class="whitespace-pre-wrap break-words">{{ value }}</div>
      </el-descriptions-item>
    </el-descriptions>
  </el-drawer>
  <el-dialog
    v-model="operationVisible"
    :title="operation === 'cancel' ? '取消通知' : '重新发送通知'"
    width="min(520px, 95vw)"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
  >
    <el-alert
      v-if="operation === 'resend'"
      title="重发会创建一条新通知，原发送结果保留。钉钉已受理不代表员工已读。"
      type="info"
      :closable="false"
      class="mb-16px"
    />
    <el-form ref="operationForm" :model="operationData" label-position="top" :disabled="saving">
      <el-form-item
        label="操作原因"
        prop="reason"
        :rules="[{ required: true, whitespace: true, message: '请填写操作原因', trigger: 'blur' }]"
      >
        <el-input
          v-model="operationData.reason"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      <el-form-item v-if="operation === 'resend' && operationStatus === 3">
        <el-checkbox v-model="operationData.confirmedNotReceived"
          >已核实接收人尚未收到该消息</el-checkbox
        >
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="operationVisible = false">返回</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="
          operation === 'resend' && operationStatus === 3 && !operationData.confirmedNotReceived
        "
        @click="submitOperation"
        >确认{{ operation === 'cancel' ? '取消' : '重发' }}</el-button
      >
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import * as Api from '@/api/system/dingtalk'
import { dateFormatter, formatDate } from '@/utils/formatTime'
import type { FormInstance } from 'element-plus'

defineOptions({ name: 'SystemDingTalkNotification' })
const message = useMessage()
const query = reactive({
  pageNo: 1,
  pageSize: 10,
  businessId: '',
  templateCode: '',
  status: undefined as number | undefined
})
const list = ref<Api.Notification[]>([])
const total = ref(0)
const loading = ref(false)
const loadFailed = ref(false)
let loadVersion = 0
const load = async () => {
  const version = ++loadVersion
  loading.value = true
  try {
    const result = await Api.getNotificationPage({ ...query })
    if (version !== loadVersion) return
    list.value = result.list
    total.value = result.total
    loadFailed.value = false
  } catch {
    if (version === loadVersion) {
      loadFailed.value = true
      list.value = []
      total.value = 0
    }
  } finally {
    if (version === loadVersion) loading.value = false
  }
}
const search = () => {
  query.pageNo = 1
  load()
}
const reset = () => {
  Object.assign(query, { pageNo: 1, businessId: '', templateCode: '', status: undefined })
  load()
}
const statusColor = (status: number): 'success' | 'warning' | 'danger' | 'info' =>
  status === 2 ? 'success' : status === 3 ? 'warning' : status === 4 ? 'danger' : 'info'
const detailVisible = ref(false)
const selected = ref<Api.Notification>()
const detail = async (id: number) => {
  selected.value = await Api.getNotification(id)
  detailVisible.value = true
}
const paramLabels: Record<string, string> = {
  action: '本次事项',
  registrationNo: '登记编号',
  clinicalProtocolNo: '临床方案编号',
  testItems: '检测项',
  basNos: 'BAS号',
  reservationTime: '预约入库时间',
  appointmentNames: '预约人',
  submitterName: '提交人',
  noticeRecipients: '通知样品管理员',
  handlerName: '处理人',
  status: '入库状态',
  remark: '预约备注',
  completedScope: '已完成范围',
  remainingScope: '剩余范围',
  exceptionTypeName: '异常类型',
  exceptionNote: '异常说明',
  actualInboundTime: '实际入库时间',
  changeReason: '修改原因'
}
const operationVisible = ref(false)
const operation = ref<'cancel' | 'resend'>('cancel')
const operationStatus = ref(0)
const operationData = reactive({ id: 0, reason: '', confirmedNotReceived: false })
const operationForm = ref<FormInstance>()
const saving = ref(false)
const openOperation = async (row: Api.Notification, action: 'cancel' | 'resend') => {
  const current = await Api.getNotification(row.id)
  if (
    (action === 'cancel' && current.status !== 0) ||
    (action === 'resend' && ![3, 4].includes(current.status))
  ) {
    message.warning('通知状态已变化，请刷新后操作')
    await load()
    return
  }
  operation.value = action
  operationStatus.value = current.status
  Object.assign(operationData, { id: row.id, reason: '', confirmedNotReceived: false })
  operationVisible.value = true
  await nextTick()
  operationForm.value?.clearValidate()
}
const submitOperation = async () => {
  if (saving.value || !(await operationForm.value?.validate())) return
  saving.value = true
  try {
    await Api.operateNotification(operation.value, {
      ...operationData,
      reason: operationData.reason.trim()
    })
    message.success(operation.value === 'cancel' ? '通知已取消' : '已加入待发送通知')
    operationVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
