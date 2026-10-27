<template>
  <ContentWrap>
    <div class="mb-16px flex flex-wrap items-center justify-between gap-12px">
      <div class="text-18px font-600">有效性审阅</div>
      <el-button @click="loadRows"><Icon icon="ep:refresh" />刷新</el-button>
    </div>
    <el-form inline>
      <el-form-item label="知识库">
        <el-select v-model="libraryId" class="!w-220px" clearable filterable placeholder="全部可读知识库" @change="loadRows">
          <el-option v-for="item in libraries" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="待审状态">
        <el-select v-model="stage" class="!w-170px" placeholder="全部状态">
          <el-option label="全部状态" value="all" />
          <el-option label="逾期待审" value="overdue" />
          <el-option label="临期待审" value="upcoming" />
          <el-option label="未到提醒期" value="normal" />
          <el-option label="未配置周期" value="no_rule" />
          <el-option label="已替代或作废" value="closed" />
        </el-select>
      </el-form-item>
      <el-form-item label="审阅结论">
        <el-select v-model="result" class="!w-150px" placeholder="全部结论">
          <el-option label="全部结论" value="all" />
          <el-option label="未审阅" value="unreviewed" />
          <el-option label="有效" value="valid" />
          <el-option label="待确认" value="pending" />
          <el-option label="已替代" value="replaced" />
          <el-option label="已作废" value="abolished" />
        </el-select>
      </el-form-item>
    </el-form>
    <el-table v-loading="loading" :data="pageRows" :show-overflow-tooltip="true">
      <el-table-column label="文件" min-width="250">
        <template #default="{ row }"><el-link type="primary" @click="openReview(row)">{{ row.title }}</el-link></template>
      </el-table-column>
      <el-table-column prop="documentCode" label="文档编号" min-width="160" />
      <el-table-column label="知识库" min-width="150"><template #default="{ row }">{{ libraryNames[row.libraryId] || row.libraryId }}</template></el-table-column>
      <el-table-column label="状态" width="130"><template #default="{ row }"><el-tag :type="stageTag(row.stage)">{{ stageName(row.stage) }}</el-tag></template></el-table-column>
      <el-table-column label="最近结论" width="110"><template #default="{ row }">{{ resultName(row.result) }}</template></el-table-column>
      <el-table-column prop="dueDate" label="应审日期" width="120" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openReview(row)">审阅记录</el-button>
          <el-button link @click="openDocument(row)">查看文档</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination v-model:page="pageNo" v-model:limit="pageSize" :total="filteredRows.length" />
  </ContentWrap>
  <el-drawer v-model="drawerVisible" :title="selected?.title || '审阅记录'" size="min(620px, 100%)">
    <div v-if="selected" class="mb-14px text-13px text-[var(--el-text-color-secondary)]">
      {{ selected.documentCode }} · {{ libraryNames[selected.libraryId] }} · 应审日期：{{ selected.dueDate || '未配置周期' }}
    </div>
    <el-table v-loading="historyLoading" :data="history" class="mb-20px">
      <el-table-column prop="reviewDate" label="日期" width="115" />
      <el-table-column label="结论" width="90"><template #default="{ row }">{{ resultName(row.result) }}</template></el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" />
      <el-table-column prop="reviewerId" label="审阅人 ID" width="105" />
    </el-table>
    <el-empty v-if="!historyLoading && !history.length" description="暂无审阅记录" />
    <template v-if="canSubmit">
      <el-divider content-position="left">提交审阅</el-divider>
      <el-form label-width="75px">
        <el-form-item label="结论"><el-select v-model="reviewResult" class="w-full">
          <el-option label="有效" value="valid" /><el-option label="待确认" value="pending" />
          <el-option label="已替代" value="replaced" /><el-option label="已作废" value="abolished" />
        </el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="remark" type="textarea" :rows="3" maxlength="2000" show-word-limit /></el-form-item>
      </el-form>
      <el-button v-hasPermi="['pms:kb:library:update']" type="primary" :loading="submitting" @click="saveReview">提交审阅</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import * as KnowledgeLibraryApi from '@/api/pms/kb/library'
import * as KnowledgeDocumentApi from '@/api/pms/kb/content/document'
import { getReviewHistory, getReviewWorkbench, submitReview, type KnowledgeReviewRecordVO, type KnowledgeReviewWorkbenchVO } from '@/api/pms/kb/review'
import { getAllPageItems } from '@/utils/page'
import { canEditKnowledgeContent } from '@/views/pms/kb/utils/permission'

defineOptions({ name: 'PmsKnowledgeReviewWorkbench' })
const router = useRouter()
const route = useRoute()
const message = useMessage()
const loading = ref(false)
const historyLoading = ref(false)
const submitting = ref(false)
const libraries = ref<KnowledgeLibraryApi.PmsKnowledgeLibraryVO[]>([])
const libraryId = ref<number | undefined>(route.query.libraryId ? Number(route.query.libraryId) : undefined)
const stage = ref('all')
const result = ref('all')
const rows = ref<KnowledgeReviewWorkbenchVO[]>([])
const pageNo = ref(1)
const pageSize = ref(10)
const drawerVisible = ref(false)
const selected = ref<KnowledgeReviewWorkbenchVO>()
const history = ref<KnowledgeReviewRecordVO[]>([])
const canSubmit = ref(false)
const reviewResult = ref('valid')
const remark = ref('')
const libraryNames = computed(() => Object.fromEntries(libraries.value.map(item => [item.id, item.name])))
const filteredRows = computed(() => rows.value.filter(row =>
  (stage.value === 'all' || row.stage === stage.value) && (result.value === 'all' || row.result === result.value)))
const pageRows = computed(() => filteredRows.value.slice((pageNo.value - 1) * pageSize.value, pageNo.value * pageSize.value))
watch([stage, result], () => { pageNo.value = 1 })
function stageName(value: string) { return ({ overdue: '逾期待审', upcoming: '临期待审', normal: '未到提醒期', no_rule: '未配置周期', closed: '已终止' } as Record<string, string>)[value] || value }
function stageTag(value: string): 'danger' | 'warning' | 'info' | 'success' { return value === 'overdue' ? 'danger' : value === 'upcoming' ? 'warning' : value === 'normal' ? 'success' : 'info' }
function resultName(value: string) { return ({ unreviewed: '未审阅', valid: '有效', pending: '待确认', replaced: '已替代', abolished: '已作废' } as Record<string, string>)[value] || value }
async function loadRows() {
  loading.value = true
  try { rows.value = await getReviewWorkbench(libraryId.value); pageNo.value = 1 }
  finally { loading.value = false }
}
async function openReview(row: KnowledgeReviewWorkbenchVO) {
  selected.value = row
  drawerVisible.value = true
  historyLoading.value = true
  canSubmit.value = false
  reviewResult.value = 'valid'
  remark.value = ''
  try {
    const [records, document] = await Promise.all([getReviewHistory(row.documentId), KnowledgeDocumentApi.getKnowledgeDocument(row.documentId)])
    if (selected.value?.documentId !== row.documentId) return
    history.value = records
    canSubmit.value = canEditKnowledgeContent(document.currentUserLevel)
  } finally { historyLoading.value = false }
}
function openDocument(row: KnowledgeReviewWorkbenchVO) { router.push(`/pms/kb/library/${row.libraryId}/document/${row.documentId}`) }
async function saveReview() {
  if (!selected.value) return
  if (['replaced', 'abolished'].includes(reviewResult.value) && !remark.value.trim()) { message.warning('替代或作废需要填写原因'); return }
  submitting.value = true
  try {
    await submitReview({ documentId: selected.value.documentId, result: reviewResult.value, remark: remark.value })
    message.success('审阅记录已保存')
    history.value = await getReviewHistory(selected.value.documentId)
    await loadRows()
    selected.value = rows.value.find(row => row.documentId === selected.value?.documentId)
    remark.value = ''
  } finally { submitting.value = false }
}
onMounted(async () => {
  libraries.value = await getAllPageItems<KnowledgeLibraryApi.PmsKnowledgeLibraryVO>(
    (pageNo, pageSize) => KnowledgeLibraryApi.getKnowledgeLibraryPage({ pageNo, pageSize }))
  await loadRows()
})
</script>
