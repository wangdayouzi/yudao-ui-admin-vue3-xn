<template>
  <Dialog
    :close-on-click-modal="false"
    :before-close="beforeClose"
    @opened="focusName"
    v-model="dialogVisible"
    title="新建文档"
    width="520px"
  >
    <el-form
      @submit.prevent
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="80px"
    >
      <el-form-item label="文档名称" prop="title">
        <el-input
          ref="nameInputRef"
          @keydown.enter="confirmKnowledgeName($event, submitForm)"
          v-model="formData.title"
          maxlength="255"
          placeholder="请输入文档名称"
        />
      </el-form-item>
      <el-alert
        v-if="ruleHint"
        class="mb-16px"
        type="warning"
        :closable="false"
        :title="ruleHint"
        show-icon
      />
      <KnowledgeAttributeFields
        ref="attributeRef"
        v-model="formData.attributes"
        :library-id="formData.libraryId"
      />
    </el-form>
    <template #footer>
      <el-button
        :loading="formLoading"
        :disabled="ruleChecking || Boolean(ruleHint)"
        type="primary"
        @click="submitForm"
        >创建并编辑</el-button
      >
      <el-button :disabled="formLoading" @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { confirmKnowledgeName } from '@/views/pms/kb/utils/interaction'
import type { InputInstance } from 'element-plus'
import * as KnowledgeDocumentApi from '@/api/pms/kb/content/document'
import KnowledgeAttributeFields from './KnowledgeAttributeFields.vue'
import { getMissingNumberRuleHint } from './knowledgeNumberRuleGuard'
import { PmsKnowledgeDocumentType, PmsKnowledgeRootId } from '@/views/pms/kb/utils/constants'

defineOptions({ name: 'PmsKnowledgeDocumentCreateForm' })

const message = useMessage() // 消息弹窗
const dialogVisible = ref(false) // 弹窗是否显示
const formLoading = ref(false) // 表单提交中
const ruleChecking = ref(false)
const ruleHint = ref('')
let ruleCheckVersion = 0
const formData = ref(getDefaultFormData()) // 表单数据
const formRules = reactive({
  title: [{ required: true, whitespace: true, message: '请输入文档名称', trigger: 'blur' }]
}) // 表单校验规则
const nameInputRef = ref<InputInstance>()
function focusName() {
  nameInputRef.value?.focus()
}
function beforeClose(done: () => void) {
  if (!formLoading.value) done()
}
const formRef = ref() // 表单 Ref
const attributeRef = ref<InstanceType<typeof KnowledgeAttributeFields>>()
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调

/** 打开弹窗 */
function open(libraryId: number, folderId = PmsKnowledgeRootId, parentId = PmsKnowledgeRootId) {
  dialogVisible.value = true
  formData.value = {
    ...getDefaultFormData(),
    libraryId,
    folderId,
    parentId
  }
  formRef.value?.resetFields()
  nextTick(() => attributeRef.value?.reload())
  const checkVersion = ++ruleCheckVersion
  ruleChecking.value = true
  ruleHint.value = ''
  getMissingNumberRuleHint(libraryId, folderId, parentId)
    .then((hint) => {
      if (checkVersion === ruleCheckVersion) ruleHint.value = hint
    })
    .catch(() => {
      if (checkVersion === ruleCheckVersion) ruleHint.value = '编号规则核对失败，请稍后重试'
    })
    .finally(() => {
      if (checkVersion === ruleCheckVersion) ruleChecking.value = false
    })
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
async function submitForm() {
  if (formLoading.value || !formRef.value) return
  if (ruleChecking.value || ruleHint.value) return
  formLoading.value = true
  try {
    formData.value.title = formData.value.title.trim()
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
    const missing = attributeRef.value?.requiredMissing()
    if (missing) {
      message.warning(`请填写属性：${missing}`)
      return
    }
    // 2. 创建文档
    const documentId = await KnowledgeDocumentApi.createKnowledgeDocument(formData.value)
    message.success('文档草稿已创建')
    // 3. 关闭弹窗并通知父组件刷新
    dialogVisible.value = false
    emit('success', documentId)
  } catch {
    // 接口错误由统一拦截器提示，保留表单以便修改或重试。
  } finally {
    formLoading.value = false
  }
}

/** 获得表单默认数据 */
function getDefaultFormData() {
  return {
    libraryId: 0,
    folderId: PmsKnowledgeRootId,
    parentId: PmsKnowledgeRootId,
    title: '',
    type: PmsKnowledgeDocumentType.RICH_TEXT as number,
    status: 0,
    attributes: {} as Record<string, string>
  }
}
</script>
