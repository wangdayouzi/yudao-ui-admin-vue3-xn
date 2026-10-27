<template>
  <Dialog
    :close-on-click-modal="false"
    :before-close="beforeClose"
    @opened="focusName"
    v-model="dialogVisible"
    :title="dialogTitle"
    width="520px"
  >
    <el-form
      @submit.prevent
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <el-form-item label="文件夹名称" prop="title">
        <el-input
          ref="nameInputRef"
          @keydown.enter="confirmKnowledgeName($event, submitForm)"
          v-model="formData.title"
          maxlength="255"
          placeholder="请输入文件夹名称"
        />
      </el-form-item>
      <el-form-item v-if="formData.parentId === PmsKnowledgeRootId" label="编号规则">
        <el-select
          v-model="formData.numberRuleId"
          clearable
          placeholder="继承知识库规则"
          class="w-full"
        >
          <el-option
            v-for="rule in numberRules"
            :key="rule.id"
            :value="rule.id!"
            :label="`${rule.name}（${rule.prefix} + ${rule.digits} 位流水）`"
          />
        </el-select>
        <div class="text-12px text-[var(--el-text-color-secondary)]"
          >此目录及子目录新建文档时自动使用该规则；留空则使用知识库默认规则。</div
        >
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :loading="formLoading" type="primary" @click="submitForm">{{
        formType === 'create' ? '创建' : '保存'
      }}</el-button>
      <el-button :disabled="formLoading" @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { confirmKnowledgeName } from '@/views/pms/kb/utils/interaction'
import type { InputInstance } from 'element-plus'
import * as KnowledgeFolderApi from '@/api/pms/kb/content/folder'
import { getEnabledNumberRules, type NumberRuleVO } from '@/api/infra/number-rule'
import { PmsKnowledgeRootId } from '@/views/pms/kb/utils/constants'

defineOptions({ name: 'PmsKnowledgeFolderForm' })

const message = useMessage() // 消息弹窗
const dialogVisible = ref(false) // 弹窗是否显示
const dialogTitle = ref('') // 弹窗标题
const formLoading = ref(false) // 表单提交中
const formType = ref('') // 表单类型：create - 新增；update - 修改
const formData = ref(getDefaultFormData()) // 表单数据
const numberRules = ref<NumberRuleVO[]>([])
const formRules = reactive({
  title: [{ required: true, whitespace: true, message: '请输入文件夹名称', trigger: 'blur' }]
}) // 表单校验规则
const nameInputRef = ref<InputInstance>()
function focusName() {
  nameInputRef.value?.focus()
}
function beforeClose(done: () => void) {
  if (!formLoading.value) done()
}
const formRef = ref() // 表单 Ref
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调

/** 打开弹窗 */
async function open(type: string, libraryId: number, parentId = 0, id?: number) {
  dialogVisible.value = true
  formLoading.value = true
  dialogTitle.value = type === 'create' ? '新建文件夹' : '编辑文件夹'
  formType.value = type
  resetForm()
  formData.value.libraryId = libraryId
  formData.value.parentId = parentId
  try {
    const [rules, folder] = await Promise.all([
      getEnabledNumberRules(),
      id ? KnowledgeFolderApi.getKnowledgeFolder(id) : Promise.resolve(undefined)
    ])
    numberRules.value = rules
    if (folder) {
      formData.value = {
        id: folder.id,
        libraryId: folder.libraryId,
        parentId: folder.parentId,
        title: folder.title,
        numberRuleId: folder.numberRuleId
      }
    }
  } catch {
    dialogVisible.value = false
  } finally {
    formLoading.value = false
    await nextTick()
    focusName()
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
async function submitForm() {
  if (formLoading.value || !formRef.value) return
  formLoading.value = true
  try {
    formData.value.title = formData.value.title.trim()
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
    // 提交请求
    if (formType.value === 'create') {
      await KnowledgeFolderApi.createKnowledgeFolder(
        formData.value as KnowledgeFolderApi.PmsKnowledgeFolderVO
      )
      message.success('创建成功')
    } else {
      await KnowledgeFolderApi.updateKnowledgeFolder(
        formData.value as KnowledgeFolderApi.PmsKnowledgeFolderVO
      )
      message.success('更新成功')
    }
    dialogVisible.value = false
    emit('success')
  } catch {
    // 接口错误由统一拦截器提示，保留表单以便修改或重试。
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
function resetForm() {
  formData.value = getDefaultFormData()
  formRef.value?.resetFields()
}

/** 获得默认表单数据 */
function getDefaultFormData() {
  return {
    id: undefined as number | undefined,
    libraryId: 0,
    parentId: PmsKnowledgeRootId,
    title: '',
    numberRuleId: undefined as number | undefined
  }
}
</script>
