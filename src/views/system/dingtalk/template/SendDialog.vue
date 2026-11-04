<template>
  <Dialog
    v-model="visible"
    title="测试发送钉钉消息"
    width="min(880px, 95vw)"
    :scroll="true"
    max-height="65vh"
    top="5vh"
  >
    <el-alert
      title="将真实发送给所选员工。钉钉已受理不代表送达或已读。"
      type="warning"
      :closable="false"
      class="mb-16px"
    />
    <div v-loading="loading" class="send-layout">
      <el-form label-position="top">
        <el-form-item label="模板">{{ template?.name }}（{{ template?.code }}）</el-form-item>
        <el-form-item label="接收员工（最多 20 人）">
          <el-select
            v-model="userIds"
            multiple
            filterable
            :multiple-limit="20"
            placeholder="选择已关联钉钉的员工"
            class="!w-full"
            :disabled="sending || !!results.length"
            ><el-option
              v-for="user in users"
              :key="user.id"
              :label="formatReceiverLabel(user)"
              :disabled="!user.dingTalkBound"
              :value="user.id"
          /></el-select>
        </el-form-item>
        <el-form-item v-for="key in availableParams" :key="key" :label="parameterLabel(key)"
          ><el-input
            v-model="params[key]"
            :disabled="sending || !!results.length"
            :placeholder="`填写 ${key}`"
        /></el-form-item>
        <el-alert
          v-if="unsupportedParams.length"
          :title="`接口未提供：${unsupportedParams.join('、')}，请先修改模板`"
          type="error"
          :closable="false"
        />
        <div class="hint"
          >已绑定钉钉账号或已同步通讯录的员工可发送。失败时可在发送记录中查看原因。</div
        >
      </el-form>
      <MessagePreview v-if="template" :type="template.messageType" :content="rendered" />
    </div>
    <el-table v-if="results.length" :data="results" class="mt-16px">
      <el-table-column label="员工"
        ><template #default="scope">{{
          users.find((user) => user.id === scope.row.userId)?.nickname || scope.row.userId
        }}</template></el-table-column
      >
      <el-table-column label="状态" width="140"
        ><template #default="scope"
          ><el-tag :type="Api.statusColors[scope.row.status as keyof typeof Api.statusColors]">{{
            Api.statusLabels[scope.row.status]
          }}</el-tag></template
        ></el-table-column
      >
      <el-table-column prop="logId" label="记录编号" width="100" />
      <el-table-column prop="errorMessage" label="说明" min-width="180" />
    </el-table>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button v-if="results.length" @click="newRound">新一轮测试</el-button>
      <el-button
        v-else
        type="primary"
        :disabled="loading || !template || !userIds.length || !!unsupportedParams.length"
        :loading="sending"
        @click="send"
        >发送测试</el-button
      >
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import * as Api from '@/api/system/dingtalk'
import { formatReceiverLabel } from '../receiverLabel'
import MessagePreview from '../components/MessagePreview.vue'
const message = useMessage()
const visible = ref(false)
const loading = ref(false)
const sending = ref(false)
const template = ref<Api.MessageTemplate>()
const parameterDefinitions = ref<Api.TemplateParameter[]>([])
const parameterLabel = (key: string) => {
  const field = parameterDefinitions.value.find((item) => item.key === key)
  return field ? `${field.label}（${key}）` : key
}
const unsupportedParams = computed(() =>
  parameterDefinitions.value.length
    ? (template.value?.params || []).filter(
        (key) => !parameterDefinitions.value.some((field) => field.key === key)
      )
    : []
)
const availableParams = computed(() =>
  (template.value?.params || []).filter((key) => !unsupportedParams.value.includes(key))
)
const users = ref<Api.ReceiverOption[]>([])
const userIds = ref<number[]>([])
const params = reactive<Record<string, string>>({})
const results = ref<Api.SendResult[]>([])
const makeId = () =>
  globalThis.crypto?.randomUUID?.() || `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
const requestId = ref(makeId())
const rendered = computed(() =>
  Object.fromEntries(
    Object.entries(template.value?.content || {}).map(([key, value]) => [
      key,
      value.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)}/g, (original, name) => params[name] || original)
    ])
  )
)
watch(
  [userIds, params],
  () => {
    requestId.value = makeId()
  },
  { deep: true }
)
const open = async (id: number) => {
  visible.value = true
  loading.value = true
  template.value = undefined
  parameterDefinitions.value = []
  results.value = []
  userIds.value = []
  Object.keys(params).forEach((key) => delete params[key])
  requestId.value = makeId()
  try {
    const [data, people] = await Promise.all([Api.getTemplate(id), Api.getReceiverOptions()])
    template.value = data
    users.value = people
    parameterDefinitions.value = await Api.getTemplateParameters(data.code)
  } finally {
    loading.value = false
  }
}
defineExpose({ open })
const newRound = async () => {
  if (results.value.some((item) => item.status === 0 || item.status === 3)) {
    try {
      await message.confirm(
        '上一次发送仍在处理或结果未知，重新发送可能重复。请先核实员工收件情况，是否继续？'
      )
    } catch {
      return
    }
  }
  results.value = []
  requestId.value = makeId()
}
const send = async () => {
  if (!template.value || !userIds.value.length) return
  if (unsupportedParams.value.length)
    return message.warning('模板引用了接口未提供的变量，请先修改模板')
  for (const key of template.value.params || []) {
    if (!params[key]?.trim()) {
      message.warning(`请填写参数：${key}`)
      return
    }
  }
  sending.value = true
  let submitted = false
  try {
    await Api.previewTemplate(template.value, params)
    submitted = true
    results.value = await Api.sendMessage({
      requestId: requestId.value,
      templateCode: template.value.code,
      userIds: userIds.value,
      params: { ...params }
    })
  } catch {
    if (submitted) {
      message.warning(
        '未确认发送结果时，请先查看发送记录。保持收件人与参数不变重试，将复用同一请求标识。'
      )
    }
  } finally {
    sending.value = false
  }
}
</script>
<style scoped lang="scss">
.send-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.hint {
  font-size: 12px;
  line-height: 1.8;
  color: #909399;
}

@media (width <= 700px) {
  .send-layout {
    grid-template-columns: 1fr;
  }
}
</style>
