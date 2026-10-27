<template>
  <div v-loading="loading" class="min-h-100vh bg-[var(--el-bg-color-page)] px-24px py-24px">
    <el-card v-if="!document && !loading" class="mx-auto max-w-480px" shadow="never">
      <h3>查看分享文档</h3>
      <p class="text-[var(--el-text-color-secondary)]">{{ accessError || '请输入访问码' }}</p>
      <el-input
        v-model="accessCode"
        show-password
        placeholder="访问码"
        @keyup.enter="getDocument"
      />
      <el-button class="mt-12px" type="primary" @click="getDocument">查看文档</el-button>
    </el-card>
    <el-card
      v-if="document"
      :body-style="{ padding: '40px 48px' }"
      class="mx-auto min-h-[calc(100vh-48px)] max-w-960px"
      shadow="never"
    >
      <KnowledgeMarkdownPreview
        v-if="document.type === PmsKnowledgeDocumentType.RICH_TEXT"
        :content="document.content"
        class="knowledge-share-content"
      />
      <div v-else class="min-h-240px">
        <div class="mb-24px text-24px font-600 leading-[1.4]">{{ document.title }}</div>
        <div class="min-h-180px">
          <KnowledgeOfficePreview
            v-if="isOfficeFile && document.previewUrl"
            :document-id="document.id"
            :share-token="String(route.params.token)"
            :share-code="accessCode"
          />
          <FilePreview
            v-else-if="document.previewUrl"
            :downloadable="false"
            :file-name="document.title"
            :file-type="document.fileType"
            :url="document.previewUrl"
          />
          <el-empty v-else description="文件暂无可用预览，请联系文档管理员核对原文件" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import * as KnowledgeDocumentShareApi from '@/api/pms/kb/interaction/share'
import { FilePreview } from '@/components/FilePreview'
import KnowledgeOfficePreview from '../KnowledgeOfficePreview.vue'
import KnowledgeMarkdownPreview from '../KnowledgeMarkdownPreview.vue'
import { isPmsKnowledgeOfficeFile, PmsKnowledgeDocumentType } from '@/views/pms/kb/utils/constants'

defineOptions({ name: 'PmsKnowledgeDocumentShare' })

const route = useRoute() // 当前路由
const loading = ref(false) // 数据加载中
const document = ref<KnowledgeDocumentShareApi.PmsKnowledgeDocumentSharePublicVO>() // 共享文档详情
const accessCode = ref('')
const accessError = ref('')
const isOfficeFile = computed(() => isPmsKnowledgeOfficeFile(document.value?.fileType))

/** 获得共享文档详情 */
async function getDocument() {
  loading.value = true
  try {
    document.value = await KnowledgeDocumentShareApi.getPublicKnowledgeDocument(
      String(route.params.token),
      accessCode.value
    )
    accessError.value = ''
  } catch {
    document.value = undefined
    accessError.value = '链接已失效或访问码不正确'
  } finally {
    loading.value = false
  }
}

/** 初始化 */
onMounted(() => {
  getDocument()
})
</script>

<style lang="scss" scoped>
.knowledge-share-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;

  :deep(h1) {
    margin: 0 0 20px;
    font-size: 28px;
    line-height: 1.4;
  }

  :deep(h2) {
    margin: 24px 0 14px;
    font-size: 22px;
    line-height: 1.4;
  }

  :deep(h3) {
    margin: 20px 0 12px;
    font-size: 18px;
  }

  :deep(p) {
    margin: 0 0 14px;
  }

  :deep(img) {
    height: auto;
    max-width: 100%;
  }
}
</style>
