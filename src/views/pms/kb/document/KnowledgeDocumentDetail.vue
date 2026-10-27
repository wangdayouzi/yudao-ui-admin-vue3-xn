<template>
  <!-- 文档信息与快捷操作 -->
  <div
    class="mb-10px flex items-start justify-between gap-16px border-b border-[var(--el-border-color-lighter)] pb-10px max-[800px]:flex-col"
  >
    <div class="min-w-0">
      <div class="truncate text-20px font-600 leading-[1.4]">{{ document.title }}</div>
      <div
        class="mt-8px flex items-center gap-10px text-12px text-[var(--el-text-color-secondary)]"
      >
        <span v-if="document.creatorUserName">{{ document.creatorUserName }} 创建于</span>
        <span>{{ formatDate(document.createTime) }}</span>
        <el-tag size="small" :type="getKnowledgeDocumentStatusTagType(document.status)">
          {{ getKnowledgeDocumentStatusName(document.status) }}
        </el-tag>
      </div>
      <div v-if="labels.length" class="mt-10px flex flex-wrap items-center gap-8px">
        <span
          v-for="label in labels"
          :key="label.id"
          :style="{
            color: label.color,
            borderColor: label.color,
            backgroundColor: `${label.color}14`
          }"
          class="rounded border border-solid px-6px py-1px text-12px leading-18px"
        >
          {{ label.name }}
        </span>
      </div>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-8px">
      <el-button class="!ml-0" size="small" @click="versionDialogRef?.open()">
        <Icon icon="ep:clock" />历史版本
      </el-button>
      <el-button class="!ml-0" size="small" @click="openReview">有效性审阅</el-button>
      <el-button v-if="canEditKnowledgeContent(document.currentUserLevel)" v-hasPermi="['pms:kb:library:update']"
        class="!ml-0" size="small" @click="openAttributes">编辑属性</el-button>
      <el-button
        v-if="canEditKnowledgeContent(document.currentUserLevel)"
        v-hasPermi="['pms:kb:library:update']"
        class="!ml-0"
        size="small"
        @click="emit('update')"
      >
        <Icon icon="ep:edit" />{{
          document.type === PmsKnowledgeDocumentType.FILE ? '替换文件' : '编辑'
        }}
      </el-button>
      <el-button
        v-if="canManage"
        v-hasPermi="['pms:kb:library:update']"
        class="!ml-0"
        size="small"
        @click="emit('permission')"
      >
        <Icon icon="ep:user" />协作
      </el-button>
      <el-button class="!ml-0" size="small" @click="emit('collect')">
        <Icon :icon="document.favoriteStatus ? 'ep:star-filled' : 'ep:star'" />
        {{ document.favoriteStatus ? '已关注' : '关注' }}
      </el-button>
      <el-button
        v-if="canEditKnowledgeContent(document.currentUserLevel)"
        v-hasPermi="['pms:kb:library:update']"
        class="!ml-0"
        size="small"
        type="primary"
        @click="emit('share')"
      >
        <Icon icon="ep:share" />分享
      </el-button>
      <el-dropdown
        v-if="canEditKnowledgeContent(document.currentUserLevel)"
        @command="handleMoreCommand"
      >
        <el-button class="!ml-0" size="small"><Icon icon="ep:more-filled" /></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-if="(canManage) && checkPermi(['pms:kb:library:update'])"
              command="move"
            >
              移动
            </el-dropdown-item>
            <el-dropdown-item
              v-if="(canDeleteKnowledgeContent(document.currentUserLevel)) && checkPermi(['pms:kb:library:delete'])"
              command="delete"
              divided
            >
              删除
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>

  <!-- 文档正文或文件预览 -->
  <KnowledgeMarkdownPreview
    v-if="document.type === PmsKnowledgeDocumentType.RICH_TEXT"
    :content="document.content"
  />
  <div v-else>
    <template v-if="document.previewUrl || document.content">
      <div class="mb-8px flex items-center justify-end gap-8px">
        <el-tag type="info">{{ document.fileType || '文件' }}</el-tag>
        <span
          v-if="document.fileSize !== undefined"
          class="text-12px text-[var(--el-text-color-secondary)]"
        >
          {{ formatKnowledgeFileSize(document.fileSize) }}
        </span>
        <el-link
          v-if="document.downloadStatus"
          :href="document.content"
          target="_blank"
          type="primary"
        >
          下载文件
        </el-link>
        <span v-else class="text-12px text-[var(--el-text-color-secondary)]">
          当前角色仅可在线预览
        </span>
        <el-button v-if="document.previewUrl" size="small" @click="previewExpanded = true">
          <Icon icon="ep:full-screen" class="mr-4px" />放大查看
        </el-button>
      </div>
      <KnowledgeOfficePreview
        v-if="!previewExpanded && isOfficeFile && document.previewUrl"
        :document-id="document.id"
        :version-no="document.versionNo"
      />
      <FilePreview
        v-else-if="!previewExpanded"
        :downloadable="document.downloadStatus"
        :file-name="document.title"
        :file-type="document.fileType"
        :url="document.previewUrl || document.content"
      />
    </template>
    <el-empty v-else description="文件暂无可用预览，请核对原文件或重新上传" />
  </div>

  <!-- 仅富文本支持点赞和评论；文件类型不支持互动 -->
  <div
    v-if="document.type === PmsKnowledgeDocumentType.RICH_TEXT"
    class="mt-12px flex items-center gap-10px text-12px text-[var(--el-text-color-secondary)]"
  >
    <el-button link :type="document.likeStatus ? 'primary' : 'info'" @click="emit('like')">
      <Icon :icon="document.likeStatus ? 'ant-design:like-filled' : 'ant-design:like-outlined'" />
      {{ document.likeStatus ? '取消点赞' : '点赞' }}
    </el-button>
    <span v-if="likeSummary">{{ likeSummary }}</span>
    <el-avatar
      v-for="user in document.likeUsers.slice(0, 5)"
      :key="user.id"
      :size="22"
      :src="user.avatar"
    >
      {{ user.nickname?.slice(0, 1) }}
    </el-avatar>
  </div>

  <el-collapse v-model="infoPanels" class="mt-16px mb-16px">
    <el-collapse-item title="文件信息与有效性" name="info">
      <el-descriptions :column="2" border class="max-[800px]:hidden">
        <el-descriptions-item label="文档编号">{{ document.documentCode || '未编号' }}</el-descriptions-item>
        <el-descriptions-item label="有效性">
          {{ reviewSummary ? reviewResultName(reviewSummary.result) : '加载中' }}
          <el-tag v-if="reviewSummary?.overdue" class="ml-6px" type="warning" size="small">逾期待审</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="下次应审">{{ reviewSummary?.dueDate || '未配置周期' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(document.createTime) }}</el-descriptions-item>
        <el-descriptions-item v-for="(value, key) in document.attributes || {}" :key="String(key)" :label="attributeNames[String(key)] || String(key)">{{ value || '—' }}</el-descriptions-item>
        <el-descriptions-item v-for="field in document.carriedAttributes || []" :key="`${field.sourceLibraryId}-${field.fieldCode}`" :label="`${field.fieldName}（来源属性）`">{{ field.value || '—' }} <span class="text-12px text-[var(--el-text-color-secondary)]">只读</span></el-descriptions-item>
      </el-descriptions>
      <div class="min-[801px]:hidden text-13px leading-7">
        <div>文档编号：{{ document.documentCode || '未编号' }}</div>
        <div>有效性：{{ reviewSummary ? reviewResultName(reviewSummary.result) : '加载中' }}</div>
        <div>下次应审：{{ reviewSummary?.dueDate || '未配置周期' }}</div>
        <div>创建时间：{{ formatDate(document.createTime) }}</div>
        <div v-for="(value, key) in document.attributes || {}" :key="String(key)">{{ attributeNames[String(key)] || key }}：{{ value || '—' }}</div>
        <div v-for="field in document.carriedAttributes || []" :key="`${field.sourceLibraryId}-${field.fieldCode}`">{{ field.fieldName }}（来源属性，只读）：{{ field.value || '—' }}</div>
      </div>
    </el-collapse-item>
  </el-collapse>

  <!-- 文档评论 -->
  <KnowledgeDocumentComment
    v-if="document.type === PmsKnowledgeDocumentType.RICH_TEXT"
    :document-id="document.id"
  />
  <KnowledgeDocumentVersionDialog
    ref="versionDialogRef"
    :document-id="document.id"
    :current-version-no="document.versionNo"
    :can-restore="canEditKnowledgeContent(document.currentUserLevel)"
    @restored="emit('restored')"
  />
  <el-dialog v-model="attributesVisible" title="当前文档属性" width="560px" append-to-body>
    <el-form label-width="110px"><KnowledgeAttributeFields ref="attributeFieldsRef" v-model="attributeValues" :library-id="document.libraryId" /></el-form>
    <template #footer><el-button @click="attributesVisible = false">取消</el-button><el-button type="primary" @click="saveAttributes">保存</el-button></template>
  </el-dialog>
  <el-dialog v-model="reviewVisible" title="有效性审阅" width="660px" append-to-body>
    <el-table :data="reviewHistory" class="mb-16px">
      <el-table-column prop="reviewDate" label="日期" width="120" />
      <el-table-column label="结论" width="100"><template #default="{ row }">{{ reviewResultName(row.result) }}</template></el-table-column>
      <el-table-column prop="remark" label="备注" />
      <el-table-column prop="reviewerId" label="审阅人 ID" width="110" />
    </el-table>
    <template v-if="canEditKnowledgeContent(document.currentUserLevel)">
      <el-form label-width="80px">
        <el-form-item label="结论"><el-select v-model="reviewForm.result" class="w-full">
          <el-option label="有效" value="valid" /><el-option label="待确认" value="pending" />
          <el-option label="已替代" value="replaced" /><el-option label="已作废" value="abolished" />
        </el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="reviewForm.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <el-button v-hasPermi="['pms:kb:library:update']" :loading="reviewSaving" type="primary" @click="saveReview">提交审阅</el-button>
    </template>
  </el-dialog>
  <el-dialog
    v-model="previewExpanded"
    :title="document.title"
    fullscreen
    destroy-on-close
    append-to-body
    class="pms-knowledge-expanded-preview"
  >
    <KnowledgeOfficePreview
      v-if="previewExpanded && isOfficeFile && document.previewUrl"
      :document-id="document.id"
      :version-no="document.versionNo"
      expanded
    />
    <FilePreview
      v-else-if="previewExpanded"
      :downloadable="document.downloadStatus"
      :file-name="document.title"
      :file-type="document.fileType"
      :url="document.previewUrl || document.content"
      expanded
    />
  </el-dialog>
</template>

<script lang="ts" setup>
import { checkPermi } from '@/utils/permission'
import * as KnowledgeDocumentApi from '@/api/pms/kb/content/document'
import { getKnowledgeAttributes, saveKnowledgeAttributeValues } from '@/api/pms/kb/attribute'
import { getReviewHistory, getReviewSummary, submitReview, type KnowledgeReviewRecordVO, type KnowledgeReviewSummaryVO } from '@/api/pms/kb/review'
import type { PmsKnowledgeDocumentLabelVO } from '@/api/pms/kb/content/document/label'
import { FilePreview } from '@/components/FilePreview'
import { useUserStore } from '@/store/modules/user'
import { formatDate } from '@/utils/formatTime'
import KnowledgeDocumentComment from './KnowledgeDocumentComment.vue'
import KnowledgeDocumentVersionDialog from './KnowledgeDocumentVersionDialog.vue'
import KnowledgeAttributeFields from './KnowledgeAttributeFields.vue'
import KnowledgeOfficePreview from './KnowledgeOfficePreview.vue'
import KnowledgeMarkdownPreview from './KnowledgeMarkdownPreview.vue'
import {
  isPmsKnowledgeOfficeFile,
  PmsKnowledgeContentLevel,
  PmsKnowledgeDocumentType
} from '@/views/pms/kb/utils/constants'
import { canDeleteKnowledgeContent, canEditKnowledgeContent } from '@/views/pms/kb/utils/permission'
import {
  getKnowledgeDocumentStatusName,
  getKnowledgeDocumentStatusTagType,
  formatKnowledgeFileSize
} from '@/views/pms/kb/utils/format'

defineOptions({ name: 'PmsKnowledgeDocumentDetail' })

const props = defineProps<{
  document: KnowledgeDocumentApi.PmsKnowledgeDocumentVO
  labels: PmsKnowledgeDocumentLabelVO[]
}>() // 组件参数
const emit = defineEmits([
  'collect',
  'like',
  'permission',
  'share',
  'update',
  'move',
  'delete',
  'restored'
]) // 组件事件
const versionDialogRef = ref<InstanceType<typeof KnowledgeDocumentVersionDialog>>()
const attributeFieldsRef = ref<InstanceType<typeof KnowledgeAttributeFields>>()
const attributesVisible = ref(false)
const attributeValues = ref<Record<string, string>>({})
const attributeNames = ref<Record<string, string>>({})
const reviewVisible = ref(false)
const infoPanels = ref(['info'])
const reviewHistory = ref<KnowledgeReviewRecordVO[]>([])
const reviewSummary = ref<KnowledgeReviewSummaryVO>()
const reviewForm = ref({ result: 'valid', remark: '' })
const reviewSaving = ref(false)
function openAttributes() { attributeValues.value = { ...props.document.attributes }; attributesVisible.value = true; nextTick(() => attributeFieldsRef.value?.reload()) }
async function saveAttributes() {
  const missing = attributeFieldsRef.value?.requiredMissing()
  if (missing) { message.warning(`请填写属性：${missing}`); return }
  await saveKnowledgeAttributeValues(props.document.id, attributeValues.value)
  message.success('属性已保存')
  attributesVisible.value = false
  emit('restored')
}
async function openReview() {
  const documentId = props.document.id
  reviewForm.value = { result: 'valid', remark: '' }
  reviewHistory.value = []
  reviewVisible.value = true
  const history = await getReviewHistory(documentId)
  if (props.document.id === documentId) reviewHistory.value = history
}
function reviewResultName(result: string) { return ({ valid: '有效', pending: '待确认', replaced: '已替代', abolished: '已作废', unreviewed: '未审阅' } as Record<string, string>)[result] || result }
async function saveReview() {
  if (reviewSaving.value) return
  if (['replaced', 'abolished'].includes(reviewForm.value.result) && !reviewForm.value.remark.trim()) {
    message.warning('替代或作废需要填写原因')
    return
  }
  const documentId = props.document.id
  reviewSaving.value = true
  try {
    await submitReview({ documentId, ...reviewForm.value })
    message.success('审阅记录已保存')
    const [history, summary] = await Promise.all([getReviewHistory(documentId), getReviewSummary(documentId)])
    if (props.document.id === documentId) {
      reviewHistory.value = history
      reviewSummary.value = summary
      reviewForm.value.remark = ''
    }
  } finally { reviewSaving.value = false }
}
watch(() => props.document.id, async (id, _, onCleanup) => {
  let active = true
  onCleanup(() => { active = false })
  reviewSummary.value = undefined
  reviewVisible.value = false
  attributesVisible.value = false
  const summary = await getReviewSummary(id)
  if (active) reviewSummary.value = summary
}, { immediate: true })
watch(() => props.document.libraryId, async (libraryId, _, onCleanup) => {
  let active = true
  onCleanup(() => { active = false })
  attributeNames.value = {}
  const fields = await getKnowledgeAttributes(libraryId)
  if (active) attributeNames.value = Object.fromEntries(fields.map(field => [field.fieldCode, field.fieldName]))
}, { immediate: true })
const previewExpanded = ref(false)
const isOfficeFile = computed(() => isPmsKnowledgeOfficeFile(props.document.fileType))
const message = useMessage() // 消息弹窗

const canManage = computed(
  () => props.document.currentUserLevel === PmsKnowledgeContentLevel.MANAGE
) // 是否可管理文档协作权限
const loginUserId = computed(() => useUserStore().getUser.id) // 当前登录用户编号
const likeSummary = computed(() => {
  // 优先表达“您”和其他点赞人数
  const likeUsers = props.document.likeUsers.filter((user) => user.nickname)
  if (props.document.likeStatus) {
    const otherCount = likeUsers.filter((user) => user.id !== loginUserId.value).length
    return otherCount > 0 ? `您和其他 ${otherCount} 人` : '您赞了该文档'
  }
  return likeUsers.length > 0 ? `${likeUsers.length} 人赞了该文档` : ''
}) // 点赞摘要文案

/** 处理更多操作 */
async function handleMoreCommand(command: string) {
  if (command === 'delete') {
    await handleDelete()
    return
  }
  if (command === 'move') emit('move')
}

/** 删除文档 */
async function handleDelete() {
  try {
    // 删除的二次确认
    await message.delConfirm(`确认删除文档“${props.document.title}”及其子文档吗？`)
    // 发起删除
    await KnowledgeDocumentApi.deleteKnowledgeDocument(props.document.id)
    message.success('删除成功')
    // 通知父组件刷新目录树
    emit('delete')
  } catch {}
}
</script>
