<template>
  <Dialog
    v-model="visible"
    :title="mode === 'update' ? '修改钉钉消息模板' : '新增钉钉消息模板'"
    width="min(1120px, 95vw)"
    :scroll="true"
    max-height="65vh"
    top="5vh"
  >
    <div v-loading="loading" class="template-layout">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="two-columns">
          <el-form-item label="模板名称" prop="name"
            ><el-input v-model="form.name" maxlength="100" placeholder="例如：任务分配提醒"
          /></el-form-item>
          <el-form-item label="模板编码" prop="code"
            ><el-input v-model="form.code" maxlength="100" placeholder="例如：pms_task_assigned"
          /></el-form-item>
        </div>
        <el-form-item label="消息类型" prop="messageType">
          <el-select v-model="form.messageType" @change="changeType"
            ><el-option
              v-for="item in types"
              :key="item.value"
              :value="item.value"
              :label="item.label"
          /></el-select>
          <div class="field-help">通过当前企业应用机器人发送给员工；按钮卡片支持链接跳转。</div>
        </el-form-item>
        <el-button class="example-button" size="small" @click="fillExample"
          >填入当前类型示例</el-button
        >
        <el-form-item
          v-for="field in currentType?.fields || []"
          :key="field.key"
          :label="field.label"
          :prop="`content.${field.key}`"
          :rules="[
            { required: true, whitespace: true, message: `请填写${field.label}`, trigger: 'blur' }
          ]"
        >
          <el-input
            v-model="form.content[field.key]"
            :type="field.editor === 'textarea' ? 'textarea' : 'text'"
            :rows="field.editor === 'textarea' ? 6 : undefined"
            :maxlength="field.maxLength"
            show-word-limit
            :placeholder="
              field.editor === 'url'
                ? 'https://… 或 dingtalk://…，支持 {变量名}'
                : '支持 {变量名}；Markdown 可使用标题、列表、加粗等语法'
            "
          />
        </el-form-item>
        <el-form-item label="默认接收部门">
          <el-tree-select
            v-model="form.defaultDeptIds"
            :data="departmentTree"
            :props="{ label: 'name', children: 'children' }"
            node-key="id"
            multiple
            show-checkbox
            check-strictly
            filterable
            clearable
            class="!w-full"
            placeholder="选择接收部门"
          />
          <el-checkbox v-model="form.includeChildDepts" class="mt-8px">包含子部门</el-checkbox>
        </el-form-item>
        <el-form-item label="指定接收人员（可选，最多20人）">
          <el-select
            v-model="form.defaultUserIds"
            multiple
            filterable
            clearable
            :multiple-limit="20"
            class="!w-full"
            placeholder="选择接收业务提醒的员工"
          >
            <el-option
              v-for="user in receivers"
              :key="user.id"
              :value="user.id"
              :disabled="!user.dingTalkBound"
              :label="`${formatReceiverLabel(user)}${user.dingTalkBound ? '' : ' · 未关联钉钉'}`"
            />
          </el-select>
          <div class="field-help"
            >部门成员在生成通知时与指定人员合并去重。业务已指定接收范围时，以业务范围为准。</div
          >
        </el-form-item>
        <div class="two-columns">
          <el-form-item label="启用状态"
            ><el-radio-group v-model="form.status"
              ><el-radio :value="0">启用</el-radio
              ><el-radio :value="1">停用</el-radio></el-radio-group
            ></el-form-item
          >
          <el-form-item label="备注"
            ><el-input v-model="form.remark" maxlength="500"
          /></el-form-item>
        </div>
      </el-form>
      <aside>
        <MessagePreview :type="form.messageType" :content="rendered" />
        <div class="parameter-panel">
          <div class="parameter-title"
            >模板参数 <el-tag size="small">{{ variables.length }} 个</el-tag></div
          >
          <div class="field-help">只展示该接口声明的业务字段。此处填写预览值，不随模板保存。</div>
          <template v-if="parameterDefinitions.length">
            <div class="parameter-title mt-12px">可用业务字段（点击复制占位符）</div>
            <div class="flex flex-wrap gap-8px mb-12px max-h-220px overflow-auto">
              <el-button
                v-for="parameter in parameterDefinitions"
                :key="parameter.key"
                size="small"
                @click="copyParameter(parameter.key)"
                :title="parameter.example"
              >
                {{ parameter.label }} {{ '{' + parameter.key + '}' }}
              </el-button>
            </div>
          </template>
          <el-alert
            v-if="unsupportedVariables.length"
            :title="`接口未提供：${unsupportedVariables.join('、')}，请从模板正文中移除`"
            type="error"
            :closable="false"
            class="mb-12px"
          />
          <el-empty v-if="!variables.length" description="当前模板没有参数" :image-size="45" />
          <el-form label-position="top"
            ><el-form-item v-for="key in variables" :key="key" :label="parameterLabel(key)"
              ><el-input
                v-model="samples[key]"
                :placeholder="`输入 ${key} 的示例值`" /></el-form-item
          ></el-form>
          <el-button :loading="checking" @click="checkPreview">校验参数并预览</el-button>
        </div>
      </aside>
    </div>
    <template #footer
      ><el-button @click="visible = false">取消</el-button
      ><el-button type="primary" :loading="loading" @click="save">保存模板</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import * as Api from '@/api/system/dingtalk'
import { formatReceiverLabel } from '../receiverLabel'
import MessagePreview from '../components/MessagePreview.vue'
import { handleTree } from '@/utils/tree'
const props = defineProps<{ types: Api.MessageType[] }>()
const emit = defineEmits(['success'])
const message = useMessage()
const visible = ref(false)
const loading = ref(false)
const checking = ref(false)
const receivers = ref<Api.ReceiverOption[]>([])
const departmentTree = ref<Api.DepartmentOption[]>([])
const mode = ref('create')
const formRef = ref()
const empty = (): Api.MessageTemplate => ({
  name: '',
  code: '',
  messageType: 'MARKDOWN',
  content: {},
  status: 0,
  defaultUserIds: [],
  defaultDeptIds: [],
  includeChildDepts: true,
  remark: ''
})
const form = ref<Api.MessageTemplate>(empty())
const parameterDefinitions = ref<Api.TemplateParameter[]>([])
const parameterLoading = ref(false)
const parameterLoadFailed = ref(false)
const parameterLabel = (key: string) => {
  const field = parameterDefinitions.value.find((item) => item.key === key)
  return field ? `${field.label}（${key}）` : key
}
const copyParameter = async (key: string) => {
  try {
    await navigator.clipboard.writeText(`{${key}}`)
    message.success('占位符已复制，可粘贴到消息正文')
  } catch {
    message.warning(`请复制占位符：{${key}}`)
  }
}
const previousType = ref('MARKDOWN')
const samples = reactive<Record<string, string>>({})
const checkedContent = ref<Record<string, string>>()
const rules = {
  name: [{ required: true, whitespace: true, message: '请填写模板名称', trigger: 'blur' }],
  code: [
    {
      required: true,
      pattern: /^[a-zA-Z][a-zA-Z0-9_.-]*$/,
      message: '编码须以字母开头，只能包含字母、数字、下划线、点或横线',
      trigger: 'blur'
    }
  ]
}
const currentType = computed(() =>
  props.types.find((item) => item.value === form.value.messageType)
)
const rawVariables = computed(() => [
  ...new Set(
    (currentType.value?.fields || []).flatMap((field) =>
      [...(form.value.content[field.key] || '').matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)}/g)].map(
        (match) => match[1]
      )
    )
  )
])
const unsupportedVariables = computed(() =>
  parameterDefinitions.value.length
    ? rawVariables.value.filter(
        (key) => !parameterDefinitions.value.some((field) => field.key === key)
      )
    : []
)
const variables = computed(() =>
  parameterLoadFailed.value
    ? []
    : rawVariables.value.filter((key) => !unsupportedVariables.value.includes(key))
)
const interfaceReady = () => {
  if (parameterLoadFailed.value) {
    message.warning('接口字段加载失败，请重新打开模板')
    return false
  }
  if (parameterLoading.value) {
    message.warning('接口字段正在加载，请稍后')
    return false
  }
  if (unsupportedVariables.value.length) {
    message.warning(`接口未提供：${unsupportedVariables.value.join('、')}，请移除这些占位符`)
    return false
  }
  return true
}
const rendered = computed(
  () =>
    checkedContent.value ||
    Object.fromEntries(
      Object.entries(form.value.content).map(([key, value]) => [
        key,
        value.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)}/g, (original, name) => samples[name] || original)
      ])
    )
)
watch(
  () => [form.value.content, samples],
  () => {
    checkedContent.value = undefined
  },
  { deep: true }
)
let parameterToken = 0
watch(
  () => form.value.code,
  async (code) => {
    const token = ++parameterToken
    parameterDefinitions.value = []
    parameterLoadFailed.value = false
    checkedContent.value = undefined
    parameterLoading.value = Boolean(code?.trim())
    if (!code?.trim()) return
    try {
      const fields = await Api.getTemplateParameters(code.trim())
      if (token !== parameterToken) return
      parameterDefinitions.value = fields
      for (const field of fields)
        if (samples[field.key] === undefined) samples[field.key] = field.example
    } catch {
      if (token !== parameterToken) return
      parameterLoadFailed.value = true
      message.warning('接口字段加载失败，请稍后重新打开模板')
    } finally {
      if (token === parameterToken) parameterLoading.value = false
    }
  }
)
const open = async (type: string, id?: number) => {
  mode.value = type === 'update' ? 'update' : 'create'
  form.value = empty()
  Object.keys(samples).forEach((key) => delete samples[key])
  checkedContent.value = undefined
  visible.value = true
  loading.value = true
  try {
    const [people, departments] = await Promise.all([
      Api.getReceiverOptions(),
      Api.getDepartmentOptions()
    ])
    receivers.value = people
    departmentTree.value = handleTree(departments)
    if (id) {
      form.value = await Api.getTemplate(id)
      form.value.defaultUserIds ||= []
      form.value.defaultDeptIds ||= []
      form.value.includeChildDepts ??= true
      if (type === 'copy') {
        form.value.id = undefined
        form.value.code = ''
        form.value.name = `${form.value.name.slice(0, 90)}（副本）`
      }
    }
    previousType.value = form.value.messageType
    await nextTick()
    formRef.value?.clearValidate()
  } finally {
    loading.value = false
  }
}
defineExpose({ open })
const changeType = async (type: string) => {
  if (Object.values(form.value.content).some(Boolean)) {
    try {
      await message.confirm('切换消息类型会清空当前消息字段，是否继续？')
    } catch {
      form.value.messageType = previousType.value
      return
    }
  }
  form.value.content = {}
  previousType.value = type
  formRef.value?.clearValidate()
}
const fillExample = async () => {
  if (Object.values(form.value.content).some(Boolean)) {
    try {
      await message.confirm('使用示例替换当前消息内容？')
    } catch {
      return
    }
  }
  if (parameterDefinitions.value.length && ['TEXT', 'MARKDOWN'].includes(form.value.messageType)) {
    const fields = parameterDefinitions.value
    const plain = fields.map((field) => `${field.label}：{${field.key}}`).join('\n')
    const markdown = fields.map((field) => `- **${field.label}**：{${field.key}}`).join('\n')
    form.value.content =
      form.value.messageType === 'TEXT'
        ? { content: plain }
        : { title: form.value.name || '业务通知', text: markdown }
    for (const field of fields) samples[field.key] = field.example
    formRef.value?.clearValidate()
    return
  }
  const examples: Record<string, string> = {
    title: '业务通知',
    content: '请在此编辑通知正文。',
    text: '### 业务通知\n\n请在此编辑通知正文。',
    messageUrl: 'https://example.com/notice',
    picUrl: 'https://example.com/cover.png',
    photoURL: 'https://example.com/notice.png',
    singleTitle: '查看任务',
    singleURL: 'https://example.com/notice',
    actionTitle1: '查看任务',
    actionURL1: 'https://example.com/notice',
    actionTitle2: '查看项目',
    actionURL2: 'https://example.com/notice',
    actionTitle3: '打开工作台',
    actionURL3: 'https://example.com/workbench'
  }
  form.value.content = Object.fromEntries(
    (currentType.value?.fields || []).map((field) => [field.key, examples[field.key] || ''])
  )
  formRef.value?.clearValidate()
}
const checkPreview = async () => {
  if (!interfaceReady()) return
  if (!(await formRef.value?.validate())) return
  checking.value = true
  try {
    checkedContent.value = await Api.previewTemplate(
      form.value,
      Object.fromEntries(variables.value.map((key) => [key, samples[key] || '']))
    )
    message.success('消息字段与参数校验通过')
  } finally {
    checking.value = false
  }
}
const save = async () => {
  if (!interfaceReady()) return
  if (!(await formRef.value?.validate())) return
  loading.value = true
  try {
    if (mode.value === 'update') await Api.updateTemplate(form.value)
    else await Api.createTemplate(form.value)
    message.success('保存成功')
    visible.value = false
    emit('success')
  } finally {
    loading.value = false
  }
}
</script>
<style scoped lang="scss">
.template-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 28px;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field-help {
  margin-top: 7px;
  font-size: 12px;
  line-height: 1.7;
  color: #909399;
}

.example-button {
  margin-bottom: 16px;
}

.parameter-panel {
  padding: 18px;
  margin-top: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.parameter-title {
  font-weight: 600;
}

@media (width <= 850px) {
  .template-layout,
  .two-columns {
    grid-template-columns: 1fr;
  }
}
</style>
