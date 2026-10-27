<template>
  <div
    class="relative w-full overflow-hidden border border-solid border-[var(--el-border-color-lighter)]"
    :style="{ height: expanded ? 'calc(100vh - 110px)' : 'max(650px, calc(100vh - 190px))' }"
  >
    <div v-if="loading" v-loading="true" class="h-full w-full"></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <div :id="containerId" class="h-full w-full" />
  </div>
</template>

<script lang="ts" setup>
import {
  getKnowledgeOfficePreviewConfig,
  getKnowledgeOfficeHistoryPreviewConfig
} from '@/api/pms/kb/content/document'
import { getPublicKnowledgeOfficePreviewConfig } from '@/api/pms/kb/interaction/share'

const props = defineProps<{
  documentId: number
  versionNo?: number
  historical?: boolean
  shareToken?: string
  shareCode?: string
  expanded?: boolean
}>()
const loading = ref(true)
const error = ref('')
const containerId = `pms-office-preview-${Math.random().toString(36).slice(2)}`
let editor: any
let loadRequest = 0
let disposed = false

function destroyEditor() {
  if (editor) {
    editor.destroyEditor()
    editor = undefined
  }
}

async function loadEditor() {
  const request = ++loadRequest
  destroyEditor()
  loading.value = true
  error.value = ''
  try {
    const config = props.shareToken
      ? await getPublicKnowledgeOfficePreviewConfig(props.shareToken, props.shareCode)
      : props.historical && props.versionNo
        ? await getKnowledgeOfficeHistoryPreviewConfig(props.documentId, props.versionNo)
        : await getKnowledgeOfficePreviewConfig(props.documentId)
    if (disposed || request !== loadRequest) return
    const scriptUrl = `${config.docServerUrl}/web-apps/apps/api/documents/api.js`
    if (!(window as any).DocsAPI) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = scriptUrl
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('OnlyOffice 服务暂不可用'))
        document.head.appendChild(script)
      })
    }
    if (disposed || request !== loadRequest) return
    await nextTick()
    editor = new (window as any).DocsAPI.DocEditor(containerId, config)
  } catch (e: any) {
    if (disposed || request !== loadRequest) return
    error.value = e?.message || 'Office 文件预览失败'
  } finally {
    if (!disposed && request === loadRequest) loading.value = false
  }
}

watch(
  () => [props.documentId, props.versionNo, props.historical, props.shareToken, props.shareCode],
  loadEditor,
  { immediate: true, flush: 'post' }
)
onBeforeUnmount(() => {
  disposed = true
  loadRequest++
  destroyEditor()
})
</script>
