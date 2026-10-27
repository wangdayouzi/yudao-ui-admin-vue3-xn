<template>
  <doc-alert title="【PMS】文档与协作" url="https://doc.iocoder.cn/pms/kb/document/" />

  <!-- 搜索 -->
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" label-width="68px">
      <el-form-item label="关键字" prop="keyword">
        <el-input
          v-model="queryParams.keyword"
          class="!w-240px"
          clearable
          placeholder="搜索标题、正文或附件内容"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="知识库" prop="libraryId">
        <KnowledgeLibrarySelect
          v-model="queryParams.libraryId"
          class="!w-240px"
          placeholder="请选择知识库"
        />
      </el-form-item>
      <el-form-item label="创建人" prop="creatorUserId">
        <UserSelect
          v-model="queryParams.creatorUserId"
          class="!w-240px"
          placeholder="请选择创建人"
        />
      </el-form-item>
      <el-form-item label="更新时间" prop="updateTime">
        <el-date-picker
          v-model="queryParams.updateTime"
          class="!w-240px"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          end-placeholder="结束日期"
          :shortcuts="defaultShortcuts"
          start-placeholder="开始日期"
          type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" />重置</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <div class="mb-12px flex flex-wrap justify-end gap-8px">
      <el-button v-hasPermi="['pms:kb:library:update']" type="primary" @click="openCreate">
        <Icon icon="ep:plus" />新增知识
      </el-button>
      <el-button @click="router.push('/pms/kb/review-workbench')">有效性审阅</el-button>
    </div>
    <el-table v-loading="loading" :data="list" :show-overflow-tooltip="true">
      <el-table-column label="文档标题" min-width="280">
        <template #default="scope">
          <el-link type="primary" @click="openDocumentDetail(scope.row)">
            <span v-dompurify-html="highlightSummary(scope.row.title)" />
          </el-link>
          <span
            v-if="scope.row.fileSize !== undefined && scope.row.fileSize !== null"
            class="ml-4px text-12px text-[var(--el-text-color-secondary)]"
          >
            （{{ formatKnowledgeFileSize(scope.row.fileSize) }}）
          </span>
          <div
            v-if="scope.row.contentSummary"
            v-dompurify-html="highlightSummary(scope.row.contentSummary)"
            class="mt-4px truncate text-12px text-[var(--el-text-color-secondary)]"
          ></div>
        </template>
      </el-table-column>
      <el-table-column label="知识库" min-width="180" prop="libraryName" />
      <el-table-column align="center" label="类型" width="130">
        <template #default="scope">
          <DictTag :type="DICT_TYPE.PMS_KNOWLEDGE_DOCUMENT_TYPE" :value="scope.row.type" />
        </template>
      </el-table-column>
      <el-table-column label="创建人" prop="creatorUserName" width="130" />
      <el-table-column
        :formatter="dateFormatter"
        align="center"
        label="更新时间"
        prop="updateTime"
        width="180"
      />
    </el-table>
    <Pagination
      v-model:limit="queryParams.pageSize"
      v-model:page="queryParams.pageNo"
      :total="total"
      @pagination="getList"
    />
  </ContentWrap>
  <Dialog v-model="createVisible" title="新增知识" width="520px">
    <el-form label-width="90px">
      <el-form-item label="知识库" required>
        <el-select
          v-model="createLibraryId"
          class="w-full"
          filterable
          placeholder="选择知识库"
          @change="loadCreateTree"
        >
          <el-option
            v-for="library in writableLibraries"
            :key="library.id"
            :label="library.name"
            :value="library.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="目录">
        <el-tree-select
          v-model="createFolderId"
          :data="createFolderOptions"
          class="w-full"
          check-strictly
          node-key="value"
          placeholder="请选择目录"
          @change="loadRootRule"
        />
      </el-form-item>
      <el-form-item label="内容类型" required>
        <el-radio-group v-model="createType"
          ><el-radio value="document">新建文档</el-radio
          ><el-radio value="upload">上传文件</el-radio></el-radio-group
        >
      </el-form-item>
      <el-alert v-if="createRuleHint" :title="createRuleHint" type="warning" :closable="false" />
    </el-form>
    <template #footer
      ><el-button @click="createVisible = false">取消</el-button
      ><el-button type="primary" :disabled="!canStartCreate" @click="startCreate"
        >继续</el-button
      ></template
    >
  </Dialog>
  <KnowledgeDocumentCreateForm ref="createFormRef" @success="handleCreated" />
  <KnowledgeFileUploadForm ref="uploadFormRef" @success="handleCreated" />
</template>

<script lang="ts" setup>
import * as KnowledgeDocumentApi from '@/api/pms/kb/content/document'
import * as KnowledgeLibraryApi from '@/api/pms/kb/library'
import * as KnowledgeFolderApi from '@/api/pms/kb/content/folder'
import KnowledgeDocumentCreateForm from '../document/KnowledgeDocumentCreateForm.vue'
import KnowledgeFileUploadForm from '../document/KnowledgeFileUploadForm.vue'
import { PmsKnowledgeRootId } from '@/views/pms/kb/utils/constants'
import { canEditKnowledgeContent } from '@/views/pms/kb/utils/permission'
import { getAllPageItems } from '@/utils/page'
import { DICT_TYPE } from '@/utils/dict'
import { dateFormatter, defaultShortcuts } from '@/utils/formatTime'
import KnowledgeLibrarySelect from '@/views/pms/kb/library/components/KnowledgeLibrarySelect.vue'
import UserSelect from '@/views/system/user/components/UserSelect.vue'
import { formatKnowledgeFileSize } from '@/views/pms/kb/utils/format'

defineOptions({ name: 'PmsKnowledgeSearch' })

const route = useRoute() // 当前路由
const router = useRouter() // 路由对象
const loading = ref(true) // 列表加载中
const total = ref(0) // 列表总数
const list = ref<KnowledgeDocumentApi.PmsKnowledgeDocumentVO[]>([]) // 文档列表
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: String(route.query.keyword || ''),
  libraryId: route.query.libraryId ? Number(route.query.libraryId) : undefined,
  creatorUserId: route.query.creatorUserId ? Number(route.query.creatorUserId) : undefined,
  updateTime: route.query.updateTime ? String(route.query.updateTime).split(',') : ([] as string[])
}) // 查询参数
const queryFormRef = ref() // 查询表单 Ref
const createVisible = ref(false)
const createLibraryId = ref<number>()
const createFolderId = ref(PmsKnowledgeRootId)
const createType = ref<'document' | 'upload'>('document')
const writableLibraries = ref<KnowledgeLibraryApi.PmsKnowledgeLibraryVO[]>([])
const createTree = ref<KnowledgeFolderApi.PmsKnowledgeTreeVO>()
interface CreateFolderOption {
  value: number
  label: string
  disabled?: boolean
  children?: CreateFolderOption[]
}
const createFolderOptions = ref<CreateFolderOption[]>([])
const selectedRootRuleId = ref<number>()
const createFormRef = ref<InstanceType<typeof KnowledgeDocumentCreateForm>>()
const uploadFormRef = ref<InstanceType<typeof KnowledgeFileUploadForm>>()
const createLocationWritable = computed(() => {
  if (createFolderId.value === PmsKnowledgeRootId) return Boolean(createTree.value?.writeStatus)
  const findFolder = (
    nodes: KnowledgeFolderApi.PmsKnowledgeFolderTreeNode[]
  ): KnowledgeFolderApi.PmsKnowledgeFolderTreeNode | undefined => {
    for (const node of nodes) {
      if (node.id === createFolderId.value) return node
      const found = findFolder(node.children || [])
      if (found) return found
    }
  }
  return canEditKnowledgeContent(findFolder(createTree.value?.folders || [])?.currentUserLevel)
})
const createRuleHint = computed(() => {
  const library = writableLibraries.value.find((item) => item.id === createLibraryId.value)
  if (!library) return ''
  if (!createLocationWritable.value) return '当前位置没有新增权限，请选择可写目录'
  if (createFolderId.value === PmsKnowledgeRootId)
    return library.numberRuleId ? '' : '此知识库尚未配置文档编号规则'
  return selectedRootRuleId.value || library.numberRuleId
    ? ''
    : '此目录及知识库尚未配置文档编号规则'
})
const canStartCreate = computed(() => Boolean(createLibraryId.value && !createRuleHint.value))

async function openCreate() {
  writableLibraries.value = await getAllPageItems<KnowledgeLibraryApi.PmsKnowledgeLibraryVO>(
    (pageNo, pageSize) => KnowledgeLibraryApi.getKnowledgeLibraryPage({ pageNo, pageSize })
  )
  createVisible.value = true
  createLibraryId.value = writableLibraries.value.find(
    (library) => library.id === queryParams.libraryId
  )?.id
  createFolderId.value = PmsKnowledgeRootId
  createType.value = 'document'
  if (createLibraryId.value) await loadCreateTree()
}
async function loadCreateTree() {
  createFolderId.value = PmsKnowledgeRootId
  selectedRootRuleId.value = undefined
  createTree.value = createLibraryId.value
    ? await KnowledgeFolderApi.getKnowledgeTree(createLibraryId.value)
    : undefined
  const folderOption = (
    folder: KnowledgeFolderApi.PmsKnowledgeFolderTreeNode
  ): CreateFolderOption => ({
    value: folder.id,
    label: folder.title,
    disabled: !canEditKnowledgeContent(folder.currentUserLevel),
    children: (folder.children || []).map(folderOption)
  })
  createFolderOptions.value = [
    {
      value: PmsKnowledgeRootId,
      label: '知识库根目录',
      disabled: !createTree.value?.writeStatus,
      children: (createTree.value?.folders || []).map(folderOption)
    }
  ]
}
async function loadRootRule() {
  selectedRootRuleId.value = undefined
  if (!createFolderId.value) return
  const findRoot = (
    nodes: KnowledgeFolderApi.PmsKnowledgeFolderTreeNode[],
    rootId?: number
  ): number | undefined => {
    for (const node of nodes) {
      if (node.id === createFolderId.value) return rootId || node.id
      const found = findRoot(node.children || [], rootId || node.id)
      if (found) return found
    }
  }
  const rootId = findRoot(createTree.value?.folders || [])
  if (rootId)
    selectedRootRuleId.value = (await KnowledgeFolderApi.getKnowledgeFolder(rootId)).numberRuleId
}
function startCreate() {
  if (!createLibraryId.value || createRuleHint.value) return
  createVisible.value = false
  if (createType.value === 'upload')
    uploadFormRef.value?.open(createLibraryId.value, createFolderId.value)
  else createFormRef.value?.open(createLibraryId.value, createFolderId.value)
}
function handleCreated(documentId?: number) {
  if (documentId && createLibraryId.value)
    router.push({
      path: `/pms/kb/library/${createLibraryId.value}/document/${documentId}`,
      query: { edit: '1' }
    })
  else getList()
}

/** 查询文档列表 */
async function getList() {
  loading.value = true
  try {
    const data = await KnowledgeDocumentApi.getKnowledgeDocumentSearchPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  queryFormRef.value?.resetFields()
  handleQuery()
}

/** 打开文档详情 */
function openDocumentDetail(document: KnowledgeDocumentApi.PmsKnowledgeDocumentVO) {
  router.push(`/pms/kb/library/${document.libraryId}/document/${document.id}`)
}

/** 在摘要中高亮当前关键词，内容经过 DOMPurify 指令处理。 */
function highlightSummary(summary: string) {
  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  const keyword = queryParams.keyword.trim()
  if (!keyword) return escapeHtml(summary || '')
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (summary || '')
    .split(new RegExp(`(${escapedKeyword})`, 'gi'))
    .map((part, index) => (index % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
    .join('')
}

/** 初始化 */
onMounted(() => {
  getList()
})

watch(
  () => route.query,
  (query) => {
    queryParams.keyword = String(query.keyword || '')
    queryParams.libraryId = query.libraryId ? Number(query.libraryId) : undefined
    queryParams.creatorUserId = query.creatorUserId ? Number(query.creatorUserId) : undefined
    queryParams.updateTime = query.updateTime ? String(query.updateTime).split(',') : []
    queryParams.pageNo = 1
    getList()
  }
)
</script>
