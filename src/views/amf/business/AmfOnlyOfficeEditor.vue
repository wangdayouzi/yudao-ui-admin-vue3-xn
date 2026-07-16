<template>
  <div class="onlyoffice-editor-page">
    <div class="editor-toolbar">
      <el-button @click="goBack"><Icon icon="ep:arrow-left" class="mr-4px" />返回</el-button>
      <span class="editor-title">{{ fileName }} - v{{ versionNo }}</span>
      <el-tag v-if="loading" type="warning" size="small">正在加载编辑器...</el-tag>
      <el-tag v-else-if="errorMsg" type="danger" size="small">加载失败</el-tag>
      <el-tag v-else type="success" size="small">编辑器已就绪</el-tag>
    </div>
    <div v-if="errorMsg" class="error-container">
      <el-result icon="error" title="编辑器加载失败" :sub-title="errorMsg">
        <template #extra>
          <el-button type="primary" @click="loadEditor">重新加载</el-button>
          <el-button @click="goBack">返回列表</el-button>
        </template>
      </el-result>
    </div>
    <div v-else class="editor-container">
      <div v-show="loading" class="editor-loading" v-loading="loading">
        <span>正在初始化 OnlyOffice 编辑器...</span>
      </div>
      <div id="editor-placeholder" class="editor-placeholder" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { useTagsView } from '@/hooks/web/useTagsView'
import * as AmfApi from '@/api/amf/index'

defineOptions({ name: 'AmfOnlyOfficeEditor' })

const route = useRoute()
const router = useRouter()
const { setTitle } = useTagsView()

const loading = ref(true)
const errorMsg = ref('')
const editorConfig = ref<any>(null)
const fileName = ref('未知文件')
const versionNo = ref(0)
let docEditor: any = null

const loadEditor = async () => {
  loading.value = true; errorMsg.value = ''
  try {
    const versionId = Number(route.query.versionId)
    if (!versionId) { errorMsg.value = '缺少版本ID参数'; return }
    const config = await AmfApi.getEditorConfig(versionId)
    if (!config || !config.document) { errorMsg.value = '获取编辑器配置失败'; return }
    editorConfig.value = config
    fileName.value = config.document?.title || '未知文件'
    versionNo.value = config.document?.key?.split('_v')[1] || 0
    setTitle(`${fileName.value} - v${versionNo.value}`, route.fullPath)
    await nextTick()
    await loadOnlyOfficeScript(config)
  } catch (e: any) {
    console.error('加载编辑器失败:', e)
    errorMsg.value = e.message || '加载编辑器失败，请检查 OnlyOffice 服务是否启动'
  } finally { loading.value = false }
}

const loadOnlyOfficeScript = (config: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    const scriptId = 'onlyoffice-api-script'
    const oldScript = document.getElementById(scriptId)
    if (oldScript) oldScript.remove()
    if (docEditor) { docEditor.destroyEditor(); docEditor = null }
    const script = document.createElement('script')
    script.id = scriptId
    script.src = `${config.docServerUrl || 'http://localhost:8088'}/web-apps/apps/api/documents/api.js`
    script.onload = () => {
      try {
        docEditor = new (window as any).DocsAPI.DocEditor('editor-placeholder', {
          ...config,
          events: { onRequestClose: () => router.back() }
        })
        resolve()
      } catch (e) { reject(e) }
    }
    script.onerror = () => reject(new Error('OnlyOffice API 脚本加载失败，请确认 Document Server 已启动'))
    document.head.appendChild(script)
  })
}

const goBack = () => { destroyEditor(); router.back() }
const destroyEditor = () => { if (docEditor) { try { docEditor.destroyEditor() } catch (e) {}; docEditor = null } }
onBeforeUnmount(() => { destroyEditor(); document.title = '芋道快速开发平台' })
onDeactivated(() => { destroyEditor(); document.title = '芋道快速开发平台' })
onMounted(() => loadEditor())
</script>

<style lang="scss" scoped>
.onlyoffice-editor-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 84px);
  overflow: hidden;
  background: #f0f2f5;

  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 20px;
    background: #fff;
    border-bottom: 1px solid #e4e7ed;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    z-index: 10;

    .editor-title {
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
  }

  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
  }

  .editor-container {
    flex: 1;
    display: flex;
    position: relative;

    .editor-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 16px;
      color: #909399;
    }

    .editor-placeholder {
      width: 100%;
      height: 100%;
    }
  }
}
</style>
