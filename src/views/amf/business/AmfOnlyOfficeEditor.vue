<template>
  <div class="onlyoffice-editor-page">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <el-button @click="goBack">
        <Icon icon="ep:arrow-left" class="mr-4px" />
        返回
      </el-button>
      <span class="editor-title">
        {{ fileName }} - v{{ versionNo }}
      </span>
      <el-tag v-if="loading" type="warning" size="small">正在加载编辑器...</el-tag>
      <el-tag v-else-if="errorMsg" type="danger" size="small">加载失败</el-tag>
      <el-tag v-else type="success" size="small">编辑器已就绪</el-tag>
    </div>

    <!-- 编辑器容器 -->
    <div v-if="errorMsg" class="error-container">
      <el-result icon="error" title="编辑器加载失败" :sub-title="errorMsg">
        <template #extra>
          <el-button type="primary" @click="loadEditor">重新加载</el-button>
          <el-button @click="goBack">返回列表</el-button>
        </template>
      </el-result>
    </div>

    <div v-else class="editor-container">
      <!-- OnlyOffice 占位 -->
      <div
        v-if="loading || !editorConfig"
        class="editor-loading"
        v-loading="loading"
      >
        <span v-if="loading">正在初始化 OnlyOffice 编辑器...</span>
      </div>
      <!-- OnlyOffice 编辑器 iframe -->
      <iframe
        v-if="editorConfig && iframeUrl"
        :src="iframeUrl"
        class="editor-iframe"
        frameborder="0"
        @load="onEditorLoad"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import * as AmfApi from '@/api/amf/index'

defineOptions({ name: 'AmfOnlyOfficeEditor' })

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const errorMsg = ref('')
const editorConfig = ref<any>(null)
const fileName = ref('')
const versionNo = ref(0)

/** OnlyOffice iframe URL */
const iframeUrl = computed(() => {
  if (!editorConfig.value) return ''
  // 根据编辑器配置构建 iframe URL
  // 这里需要根据实际的 OnlyOffice Document Server 地址来构建
  const docServerUrl = editorConfig.value.docServerUrl || 'http://localhost:8088'
  // 将配置转为查询参数
  const configStr = encodeURIComponent(JSON.stringify(editorConfig.value))
  return `${docServerUrl}/web-apps/apps/api/documents/api.js?config=${configStr}`
})

/** 加载编辑器 */
const loadEditor = async () => {
  loading.value = true
  errorMsg.value = ''

  try {
    const versionId = Number(route.query.versionId)
    const config = await AmfApi.getEditorConfig(versionId)

    if (!config || !config.document) {
      errorMsg.value = '获取编辑器配置失败'
      return
    }

    editorConfig.value = config
    fileName.value = config.document?.title || '未知文件'
    versionNo.value = config.document?.key?.split('_v')[1] || 0

    // 动态加载 OnlyOffice API
    await loadOnlyOfficeScript(config)
  } catch (e: any) {
    console.error('加载编辑器失败:', e)
    errorMsg.value = e.message || '加载编辑器失败，请检查 OnlyOffice 服务是否启动'
  } finally {
    loading.value = false
  }
}

/** 动态加载 OnlyOffice JS API */
const loadOnlyOfficeScript = (config: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    const scriptId = 'onlyoffice-api-script'
    // 移除旧脚本
    const oldScript = document.getElementById(scriptId)
    if (oldScript) {
      oldScript.remove()
    }

    const script = document.createElement('script')
    script.id = scriptId
    const docServerUrl = config.docServerUrl || 'http://localhost:8088'
    script.src = `${docServerUrl}/web-apps/apps/api/documents/api.js`
    script.onload = () => {
      // 初始化 OnlyOffice 编辑器
      try {
        const docEditor = new (window as any).DocsAPI.DocEditor('editor-placeholder', {
          ...config,
          width: '100%',
          height: '100%'
        })
        resolve()
      } catch (e) {
        reject(e)
      }
    }
    script.onerror = () => reject(new Error('OnlyOffice API 脚本加载失败'))
    document.head.appendChild(script)
  })
}

/** 编辑器加载完成 */
const onEditorLoad = () => {
  // iframe 模式下，编辑器在 iframe 内自动初始化
}

/** 返回列表 */
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadEditor()
})
</script>

<style lang="scss" scoped>
.onlyoffice-editor-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
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

    .editor-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  }
}
</style>
