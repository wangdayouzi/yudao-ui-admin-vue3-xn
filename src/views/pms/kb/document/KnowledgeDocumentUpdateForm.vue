<template>
  <Dialog
    :before-close="beforeCloseEditor"
    v-model="dialogVisible"
    default-fullscreen
    fullscreen
    :close-on-click-modal="false"
    :title="formData.type === PmsKnowledgeDocumentType.FILE ? '替换文件' : '编辑文档'"
  >
    <template #title>
      <div class="flex w-full min-w-0 flex-wrap items-center justify-between gap-12px pr-48px">
        <div class="flex min-w-0 items-center gap-12px">
          <span class="shrink-0 font-600">{{
            formData.type === PmsKnowledgeDocumentType.FILE ? '替换文件' : '编辑文档'
          }}</span>
          <span
            v-if="formData.type === PmsKnowledgeDocumentType.RICH_TEXT"
            class="truncate text-12px text-[var(--el-text-color-secondary)]"
          >
            {{ draftSaveState }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-8px">
          <el-button
            v-if="formData.type === PmsKnowledgeDocumentType.RICH_TEXT"
            class="!ml-0"
            :disabled="formLoading || imageUploading || (!previewing && !editorReady)"
            @click="togglePreview"
          >
            {{ previewing ? '返回编辑' : '预览正文' }}
          </el-button>
          <el-button
            v-if="formData.type === PmsKnowledgeDocumentType.RICH_TEXT"
            class="!ml-0"
            :loading="formLoading"
            :disabled="!!staleDraft || imageUploading || (!previewing && !editorReady)"
            @click="saveDraftManually"
            >保存草稿</el-button
          >
          <el-button
            class="!ml-0"
            :loading="formLoading"
            :disabled="
              !!staleDraft ||
              imageUploading ||
              (formData.type === PmsKnowledgeDocumentType.RICH_TEXT && !previewing && !editorReady)
            "
            type="primary"
            @click="submitForm"
          >
            {{ formData.type === PmsKnowledgeDocumentType.RICH_TEXT ? '发布' : '保存' }}
          </el-button>
          <el-button class="!ml-0" :disabled="formLoading || imageUploading" @click="closeEditor"
            >关闭</el-button
          >
        </div>
      </div>
    </template>
    <el-alert
      v-if="staleDraft"
      type="warning"
      :closable="false"
      class="mb-12px"
      :title="`发现基于 v${staleDraft.baseVersionNo} 的旧草稿；当前文档是 v${formData.expectedVersionNo}。请选择要编辑的内容。`"
    >
      <div class="mt-8px flex gap-8px">
        <el-button size="small" @click="loadStaleDraft">载入旧草稿</el-button>
        <el-button size="small" @click="continueCurrentVersion">沿当前版本编辑</el-button>
      </div>
    </el-alert>
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="0px"
      class="pms-knowledge-editor-form mx-auto w-full max-w-1500px"
    >
      <div
        class="mb-20px grid grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] gap-16px max-[800px]:grid-cols-1"
      >
        <div class="min-w-0">
          <div class="mb-8px text-13px text-[var(--el-text-color-secondary)]">文档标题</div>
          <el-form-item class="!mb-0" prop="title">
            <el-input
              v-model="formData.title"
              maxlength="255"
              placeholder="请输入文档标题"
              size="large"
            />
          </el-form-item>
        </div>
        <div class="min-w-0">
          <div class="mb-8px text-13px text-[var(--el-text-color-secondary)]">标签</div>
          <el-form-item class="!mb-0">
            <KnowledgeDocumentLabelSelect v-model="formData.labelIds" />
          </el-form-item>
        </div>
      </div>
      <div
        v-if="formData.type === PmsKnowledgeDocumentType.RICH_TEXT"
        class="mb-8px text-13px text-[var(--el-text-color-secondary)]"
      >
        正文内容
      </div>
      <el-form-item
        v-if="formData.type === PmsKnowledgeDocumentType.RICH_TEXT"
        class="!mb-0"
        prop="content"
      >
        <KnowledgeMarkdownPreview
          v-if="previewing"
          :content="formData.content"
          class="min-h-400px w-full rounded border border-solid border-[var(--el-border-color-lighter)] p-20px"
        />
        <div v-else class="w-full min-w-0">
          <KnowledgeMarkdownEditor
            ref="markdownEditorRef"
            v-model="formData.content"
            @ready="editorReady = true"
            @uploading="imageUploading = $event"
            @converted="draftSaveState = '旧版正文已转换为 Markdown，请预览核对后发布'"
          />
        </div>
      </el-form-item>
      <el-form-item v-else class="!mb-0" prop="content">
        <div class="w-full">
          <UploadFile
            v-model="formData.content"
            :file-size="PmsKnowledgeUploadFileSize"
            :file-type="[...PmsKnowledgeUploadFileTypes]"
            :limit="1"
            @update:model-value="handleFileChange"
            @update:file-size="handleFileSizeChange"
          />
          <div class="mt-8px text-12px text-[var(--el-text-color-secondary)]">
            上传新文件并保存后会生成历史版本；在线预览为只读。
          </div>
        </div>
      </el-form-item>
    </el-form>
  </Dialog>
</template>

<script lang="ts" setup>
import * as KnowledgeDocumentApi from '@/api/pms/kb/content/document'
import {
  PmsKnowledgeDocumentType,
  PmsKnowledgeUploadFileSize,
  PmsKnowledgeUploadFileTypes
} from '@/views/pms/kb/utils/constants'
import KnowledgeDocumentLabelSelect from './components/KnowledgeDocumentLabelSelect.vue'
import KnowledgeMarkdownEditor from './KnowledgeMarkdownEditor.vue'
import KnowledgeMarkdownPreview from './KnowledgeMarkdownPreview.vue'
import { createKnowledgeDraftSaver, knowledgeDraftKey } from './knowledgeDraftSaver'

defineOptions({ name: 'PmsKnowledgeDocumentUpdateForm' })

const message = useMessage() // 消息弹窗
const dialogVisible = ref(false) // 弹窗是否显示
const formLoading = ref(false) // 表单提交中
const previewing = ref(false) // 富文本只读预览
const draftSaveState = ref('')
const draftReady = ref(false)
const staleDraft = ref<KnowledgeDocumentApi.PmsKnowledgeDocumentDraftVO>()
let draftTimer: ReturnType<typeof setTimeout> | undefined
let draftSaver: ReturnType<typeof createKnowledgeDraftSaver> | undefined
const markdownEditorRef = ref<InstanceType<typeof KnowledgeMarkdownEditor>>()
const editorReady = ref(false)
const imageUploading = ref(false)
let originalFileKey = ''
const formData = ref(getDefaultFormData()) // 表单数据
const formRules = reactive({
  title: [{ required: true, whitespace: true, message: '请输入文档标题', trigger: 'blur' }],
  content: [{ required: true, whitespace: true, message: '请输入文档内容', trigger: 'blur' }]
}) // 表单校验规则
const formRef = ref() // 表单 Ref
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调

/** 打开弹窗 */
async function open(id: number) {
  if (dialogVisible.value) return
  draftSaver?.dispose()
  draftSaver = undefined
  dialogVisible.value = true
  editorReady.value = false
  imageUploading.value = false
  previewing.value = false
  formData.value = getDefaultFormData()
  formRef.value?.resetFields()
  formLoading.value = true
  draftReady.value = false
  staleDraft.value = undefined
  if (draftTimer) clearTimeout(draftTimer)
  try {
    // 1. 查询文档详情
    const document = await KnowledgeDocumentApi.getKnowledgeDocument(id)
    // 2. 初始化文档表单
    formData.value = {
      id: document.id,
      expectedVersionNo: document.versionNo,
      title: document.title,
      content: document.content || '',
      type: document.type,
      labelIds: document.labelIds ?? [],
      fileType: document.fileType,
      fileSize: document.fileSize,
      status: document.status
    }
    if (document.type === PmsKnowledgeDocumentType.RICH_TEXT) {
      const draft = await KnowledgeDocumentApi.getKnowledgeDocumentDraft(id)
      if (draft && draft.baseVersionNo === document.versionNo) {
        formData.value.title = draft.title
        formData.value.content = draft.content || ''
        formData.value.labelIds = draft.labelIds || []
        draftSaveState.value = '已恢复自动保存的草稿'
      } else {
        draftSaveState.value = draft ? '等待处理旧草稿' : '自动保存已开启'
        if (draft) staleDraft.value = draft
      }
      draftSaver = createKnowledgeDraftSaver(
        KnowledgeDocumentApi.saveKnowledgeDocumentDraft,
        (state, key) => {
          if (!dialogVisible.value) return
          draftSaveState.value =
            state === 'error'
              ? '自动保存失败，请手动重试'
              : state === 'saving'
                ? '正在保存草稿…'
                : key === knowledgeDraftKey(draftPayload())
                  ? '草稿已保存'
                  : '有修改待保存'
        },
        draftPayload()
      )
      draftReady.value = !staleDraft.value
    }
    originalFileKey = JSON.stringify(formData.value)
  } catch {
    dialogVisible.value = false
  } finally {
    formLoading.value = false
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

function loadStaleDraft() {
  if (!staleDraft.value) return
  formData.value.title = staleDraft.value.title
  formData.value.content = staleDraft.value.content || ''
  formData.value.labelIds = staleDraft.value.labelIds || []
  staleDraft.value = undefined
  draftReady.value = true
  draftSaveState.value = '旧草稿已载入，请核对后发布'
}

function continueCurrentVersion() {
  staleDraft.value = undefined
  draftReady.value = true
  draftSaveState.value = '自动保存已开启'
  saveDraft(true).catch(() => {
    draftSaveState.value = '自动保存失败，请手动重试'
  })
}

/** 提交表单 */
async function submitForm() {
  if (formLoading.value || imageUploading.value || staleDraft.value) return
  syncEditorContent()
  // 校验表单
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  // 提交请求
  formLoading.value = true
  try {
    if (formData.value.type === PmsKnowledgeDocumentType.RICH_TEXT) {
      if (draftTimer) clearTimeout(draftTimer)
      await saveDraft(true)
      await draftSaver?.flush()
      draftReady.value = false
      await KnowledgeDocumentApi.publishKnowledgeDocumentDraft(formData.value.id!)
      draftSaver?.dispose()
      message.success('已发布')
      dialogVisible.value = false
      emit('success')
      return
    }
    await KnowledgeDocumentApi.updateKnowledgeDocument({
      id: formData.value.id!,
      expectedVersionNo: formData.value.expectedVersionNo,
      title: formData.value.title,
      content: formData.value.content,
      labelIds: formData.value.labelIds,
      fileType: formData.value.fileType,
      fileSize: formData.value.fileSize
    })
    message.success('更新成功')
    dialogVisible.value = false
    emit('success')
  } catch {
    draftReady.value = formData.value.type === PmsKnowledgeDocumentType.RICH_TEXT
  } finally {
    formLoading.value = false
  }
}

/** 获得表单默认数据 */
function getDefaultFormData() {
  return {
    id: undefined as number | undefined,
    expectedVersionNo: undefined as number | undefined,
    title: '',
    content: '',
    type: PmsKnowledgeDocumentType.RICH_TEXT as number,
    labelIds: [] as number[],
    fileType: undefined as string | undefined,
    fileSize: undefined as number | undefined,
    status: 1
  }
}

function syncEditorContent() {
  if (
    !previewing.value &&
    formData.value.type === PmsKnowledgeDocumentType.RICH_TEXT &&
    editorReady.value
  ) {
    formData.value.content = markdownEditorRef.value?.getValue() ?? formData.value.content
  }
}

function togglePreview() {
  syncEditorContent()
  if (previewing.value) editorReady.value = false
  previewing.value = !previewing.value
}

function draftPayload(): KnowledgeDocumentApi.PmsKnowledgeDocumentDraftVO {
  return {
    documentId: formData.value.id!,
    baseVersionNo: formData.value.expectedVersionNo!,
    title: formData.value.title,
    content: formData.value.content,
    labelIds: [...formData.value.labelIds]
  }
}

async function saveDraft(force = false) {
  if (
    !draftReady.value ||
    !formData.value.id ||
    formData.value.type !== PmsKnowledgeDocumentType.RICH_TEXT
  )
    return
  if (!formData.value.title.trim()) {
    draftSaveState.value = '请填写标题后保存草稿'
    if (force) throw new Error('请填写文档标题')
    return
  }
  await draftSaver?.save(draftPayload(), force)
}

async function saveDraftManually() {
  if (formLoading.value || imageUploading.value || staleDraft.value) return
  syncEditorContent()
  if (
    !(await formRef.value
      ?.validateField('title')
      .then(() => true)
      .catch(() => false))
  )
    return
  formLoading.value = true
  if (draftTimer) clearTimeout(draftTimer)
  try {
    await saveDraft(true)
    message.success('草稿已保存')
  } catch {
    draftSaveState.value = '草稿保存失败，请重试'
  } finally {
    formLoading.value = false
  }
}

async function beforeCloseEditor(done: () => void) {
  if (await closeEditor()) done()
}

async function closeEditor() {
  if (formLoading.value || imageUploading.value) return false
  syncEditorContent()
  if (draftTimer) clearTimeout(draftTimer)
  if (
    formData.value.type === PmsKnowledgeDocumentType.FILE &&
    JSON.stringify(formData.value) !== originalFileKey
  ) {
    try {
      await message.confirm('文件修改尚未保存，确认放弃修改并关闭吗？')
    } catch {
      return false
    }
  }
  formLoading.value = true
  try {
    if (draftReady.value) {
      if (!formData.value.title.trim()) throw new Error('请填写文档标题')
      await saveDraft()
      await draftSaver?.flush()
    }
  } catch {
    try {
      await message.confirm('草稿尚未保存成功，确认放弃未保存的修改并关闭吗？')
    } catch {
      return false
    }
  } finally {
    formLoading.value = false
  }
  draftReady.value = false
  draftSaver?.dispose()
  dialogVisible.value = false
  return true
}

watch(
  formData,
  () => {
    if (
      !draftReady.value ||
      formLoading.value ||
      !dialogVisible.value ||
      formData.value.type !== PmsKnowledgeDocumentType.RICH_TEXT
    )
      return
    if (draftTimer) clearTimeout(draftTimer)
    draftTimer = setTimeout(() => {
      saveDraft().catch(() => {
        draftSaveState.value = '自动保存失败，请手动重试'
      })
    }, 1500)
  },
  { deep: true }
)

onBeforeUnmount(() => {
  if (draftTimer) clearTimeout(draftTimer)
  draftSaver?.dispose()
  window.removeEventListener('beforeunload', warnUnsavedChanges)
  window.removeEventListener('keydown', saveShortcut)
})

function warnUnsavedChanges(event: BeforeUnloadEvent) {
  if (!dialogVisible.value) return
  syncEditorContent()
  const unsaved =
    formData.value.type === PmsKnowledgeDocumentType.RICH_TEXT
      ? draftReady.value && !draftSaver?.isSaved(draftPayload())
      : JSON.stringify(formData.value) !== originalFileKey
  if (unsaved || imageUploading.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
function saveShortcut(event: KeyboardEvent) {
  if (
    !dialogVisible.value ||
    event.isComposing ||
    !(event.ctrlKey || event.metaKey) ||
    event.key.toLowerCase() !== 's'
  )
    return
  event.preventDefault()
  if (formData.value.type === PmsKnowledgeDocumentType.RICH_TEXT) saveDraftManually()
  else submitForm()
}
onMounted(() => {
  window.addEventListener('beforeunload', warnUnsavedChanges)
  window.addEventListener('keydown', saveShortcut)
})
onBeforeRouteLeave(async () => !dialogVisible.value || (await closeEditor()))
onBeforeRouteUpdate(async () => !dialogVisible.value || (await closeEditor()))

/** 文件重新上传后更新文件大小元数据 */
function handleFileSizeChange(value?: number) {
  formData.value.fileSize = value
}

/** 文件替换后同步扩展名元数据 */
function handleFileChange(value: string) {
  if (!value) return
  const fileName = decodeURIComponent(value.split('?')[0].split('/').pop() || '')
  formData.value.fileType = fileName.includes('.')
    ? fileName.split('.').pop()?.toLowerCase()
    : undefined
}
</script>

<style lang="scss" scoped>
.pms-knowledge-editor-form :deep(.el-form-item__content) {
  min-width: 0;
  width: 100%;
}
</style>
