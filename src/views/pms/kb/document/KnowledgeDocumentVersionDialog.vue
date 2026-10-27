<template>
  <Dialog v-model="visible" title="历史版本" width="min(96vw, 1400px)">
    <div class="grid grid-cols-[230px_minmax(0,1fr)] gap-12px max-[700px]:grid-cols-1">
      <el-table
        v-loading="loading"
        :data="versions"
        height="560"
        highlight-current-row
        @row-click="selectVersion"
      >
        <el-table-column label="版本" width="75">
          <template #default="scope">v{{ scope.row.versionNo }}</template>
        </el-table-column>
        <el-table-column label="保存时间">
          <template #default="scope">{{ formatDate(scope.row.createTime) }}</template>
        </el-table-column>
      </el-table>
      <div v-loading="detailLoading" class="min-w-0">
        <template v-if="selected">
          <div class="mb-12px flex items-center justify-between gap-8px">
            <div class="min-w-0 truncate font-600"
              >v{{ selected.versionNo }} · {{ selected.title }}</div
            >
            <el-button
              v-if="canRestore && selected.versionNo !== currentVersionNo"
              type="primary"
              size="small"
              @click="restore"
              >恢复此版本</el-button
            >
          </div>
          <KnowledgeMarkdownPreview
            v-if="selected.type === PmsKnowledgeDocumentType.RICH_TEXT"
            :content="selected.content"
            class="max-h-400px overflow-auto"
          />
          <div v-else>
            <div class="mb-12px flex items-center justify-between gap-8px">
              <span>文件类型：{{ selected.fileType || '未知' }}</span>
              <el-button v-if="previewUrl" size="small" @click="previewExpanded = true">
                <Icon icon="ep:full-screen" class="mr-4px" />放大查看
              </el-button>
            </div>
            <KnowledgeOfficePreview
              v-if="!previewExpanded && previewUrl && isPmsKnowledgeOfficeFile(selected.fileType)"
              :document-id="documentId"
              :version-no="selected.versionNo"
              historical
            />
            <FilePreview
              v-else-if="!previewExpanded && previewUrl"
              :url="previewUrl"
              :file-name="selected.title"
              :file-type="selected.fileType"
              :downloadable="false"
            />
            <p v-else class="text-[var(--el-text-color-secondary)]">此版本暂无可预览文件。</p>
            <el-link v-if="selected.content" :href="selected.content" target="_blank" type="primary"
              >下载此版本文件</el-link
            >
          </div>
        </template>
        <el-empty v-else description="选择一个版本查看" />
      </div>
    </div>
  </Dialog>
  <el-dialog v-model="previewExpanded" :title="selected?.title || '历史文件预览'" fullscreen destroy-on-close append-to-body>
    <KnowledgeOfficePreview
      v-if="previewExpanded && selected && previewUrl && isPmsKnowledgeOfficeFile(selected.fileType)"
      :document-id="documentId"
      :version-no="selected.versionNo"
      historical
      expanded
    />
    <FilePreview
      v-else-if="previewExpanded && selected && previewUrl"
      :url="previewUrl"
      :file-name="selected.title"
      :file-type="selected.fileType"
      :downloadable="false"
      expanded
    />
  </el-dialog>
</template>

<script lang="ts" setup>
import * as DocumentApi from '@/api/pms/kb/content/document'
import { formatDate } from '@/utils/formatTime'
import { isPmsKnowledgeOfficeFile, PmsKnowledgeDocumentType } from '@/views/pms/kb/utils/constants'
import { FilePreview } from '@/components/FilePreview'
import KnowledgeOfficePreview from './KnowledgeOfficePreview.vue'
import KnowledgeMarkdownPreview from './KnowledgeMarkdownPreview.vue'

const props = defineProps<{
  documentId: number
  currentVersionNo?: number
  canRestore: boolean
}>()
const emit = defineEmits(['restored'])
const message = useMessage()
const visible = ref(false)
const loading = ref(false)
const detailLoading = ref(false)
const versions = ref<DocumentApi.PmsKnowledgeDocumentVersionVO[]>([])
const selected = ref<DocumentApi.PmsKnowledgeDocumentVersionVO>()
const previewUrl = ref('')
const previewExpanded = ref(false)
let selectionRequest = 0

async function open() {
  visible.value = true
  previewExpanded.value = false
  selectionRequest++
  selected.value = undefined
  previewUrl.value = ''
  loading.value = true
  try {
    versions.value = await DocumentApi.getKnowledgeDocumentVersionList(props.documentId)
  } finally {
    loading.value = false
  }
}

async function selectVersion(version: DocumentApi.PmsKnowledgeDocumentVersionVO) {
  const request = ++selectionRequest
  previewExpanded.value = false
  selected.value = undefined
  previewUrl.value = ''
  detailLoading.value = true
  try {
    const detail = await DocumentApi.getKnowledgeDocumentVersion(
      props.documentId,
      version.versionNo
    )
    const url =
      detail.type === PmsKnowledgeDocumentType.FILE
        ? await DocumentApi.getKnowledgeHistoryPreviewUrl(props.documentId, version.versionNo)
        : ''
    if (request !== selectionRequest) return
    selected.value = detail
    previewUrl.value = url
  } finally {
    if (request === selectionRequest) detailLoading.value = false
  }
}

async function restore() {
  if (!selected.value || props.currentVersionNo === undefined) return
  await message.confirm(`确认将文档恢复到 v${selected.value.versionNo} 吗？恢复后会生成新版本。`)
  await DocumentApi.restoreKnowledgeDocumentVersion(
    props.documentId,
    selected.value.versionNo,
    props.currentVersionNo
  )
  message.success('已恢复为新版本')
  visible.value = false
  emit('restored')
}

defineExpose({ open })
</script>
