<template>
  <!-- 知识库工作区 -->
  <div
    v-loading="loading"
    class="knowledge-library-workspace -mt-8px grid min-h-[calc(100vh-120px)] gap-8px max-[900px]:min-h-0"
    :class="
      sidebarVisible
        ? 'grid-cols-[210px_minmax(0,1fr)] max-[900px]:grid-cols-1'
        : 'grid-cols-[36px_minmax(0,1fr)]'
    "
  >
    <!-- 左侧导航与目录 -->
    <ContentWrap v-if="sidebarVisible" :body-style="{ padding: '0' }" class="!mb-0">
      <KnowledgeLibrarySidebar
        :active-view="activeView"
        :current-node-key="currentNodeKey"
        :tree-data="treeData"
        :write-status="Boolean(tree?.writeStatus)"
        @collapse="toggleSidebar"
        @create="handleCreateCommand"
        @home="handleHome"
        @node-click="handleNodeClick"
        @node-action="handleNodeAction"
        @recycle="handleRecycle"
      />
    </ContentWrap>

    <div v-else class="sticky top-8px flex h-40px justify-center pt-12px">
      <el-tooltip content="显示目录" placement="right">
        <el-button link aria-label="显示目录" @click="toggleSidebar">
          <Icon icon="ep:expand" />
        </el-button>
      </el-tooltip>
    </div>

    <!-- 右侧业务内容 -->
    <ContentWrap :body-style="{ padding: '16px 20px' }" class="knowledge-library-main !mb-0">
      <nav
        aria-label="知识库位置"
        class="mb-10px flex items-center gap-6px overflow-x-auto whitespace-nowrap text-12px text-[var(--el-text-color-secondary)]"
      >
        <el-button link :title="library?.name" @click="handleHome">{{
          library?.name || '知识库'
        }}</el-button>
        <template v-for="(node, index) in currentPath" :key="node.key">
          <Icon icon="ep:arrow-right" class="shrink-0 text-10px" />
          <span
            v-if="index === currentPath.length - 1"
            class="max-w-220px truncate"
            :title="node.label"
            aria-current="page"
            >{{ node.label }}</span
          >
          <el-button v-else link :title="node.label" @click="handleNodeClick(node)">{{
            node.label
          }}</el-button>
        </template>
        <template v-if="activeView === 'recycle'"
          ><Icon icon="ep:arrow-right" class="text-10px" /><span>最近删除</span></template
        >
      </nav>
      <KnowledgeRecyclePanel
        v-if="activeView === 'recycle'"
        :library-id="libraryId"
        @success="handleRecycleChanged"
      />
      <KnowledgeDocumentDetail
        v-else-if="activeView === 'document' && selectedDocument"
        :document="selectedDocument"
        :labels="selectedDocumentLabels"
        @collect="handleDocumentCollect"
        @delete="handleContentDeleted"
        @like="handleDocumentLike"
        @move="moveDialogRef?.open('document', selectedDocument)"
        @permission="permissionFormRef?.open(selectedDocument.permissionId)"
        @share="shareDialogRef?.open(selectedDocument.id)"
        @update="openDocumentUpdateForm"
        @restored="handleContentChanged"
      />
      <KnowledgeFolderDetail
        v-else-if="activeView === 'folder' && selectedFolder"
        :children="selectedFolderChildren"
        :folder="selectedFolder"
        @collect="handleFolderCollect"
        @delete="handleContentDeleted"
        @move="moveDialogRef?.open('folder', selectedFolder)"
        @node-click="handleNodeClick"
        @permission="permissionFormRef?.open(selectedFolder.permissionId)"
        @update="openFolderForm('update')"
        @create="handleFolderCreate"
      />
      <KnowledgeLibraryHome
        v-else
        :key="libraryId"
        :library="library"
        :tree-data="treeData"
        :favorite-items="favoriteItems"
        :favorite-loading="favoriteLoading"
        :write-status="Boolean(tree?.writeStatus)"
        :manage-status="Boolean(tree?.manageStatus)"
        @collect="handleLibraryCollect"
        @archive="archiveDialogRef?.open()"
        @attributes="attributeConfigRef?.open(libraryId)"
        @number-rule="numberRuleConfigRef?.open(libraryId)"
        @review="reviewConfigRef?.open(libraryId)"
        @exit="handleExitLibrary"
        @member="memberFormRef?.open(libraryId)"
        @node-click="handleNodeClick"
        @search="handleLibrarySearch"
        @tab-change="handleLibraryTabChange"
      />
    </ContentWrap>
  </div>

  <!-- 内容管理弹窗 -->
  <KnowledgeFolderForm ref="folderFormRef" @success="handleContentChanged" />
  <KnowledgeDocumentCreateForm ref="documentCreateFormRef" @success="handleCreatedDocument" />
  <KnowledgeFileUploadForm ref="fileUploadFormRef" @success="handleCreatedDocument" />
  <KnowledgeDocumentUpdateForm ref="documentUpdateFormRef" @success="handleContentChanged" />
  <KnowledgeMemberForm ref="memberFormRef" @success="getPageData" />
  <KnowledgeDocumentShareDialog ref="shareDialogRef" />
  <KnowledgeContentPermissionForm ref="permissionFormRef" @success="handleContentChanged" />
  <KnowledgeContentMoveDialog ref="moveDialogRef" @success="handleMoveChanged" />
  <KnowledgeArchiveDialog
    ref="archiveDialogRef"
    :library-id="libraryId"
    :documents="archiveDocuments"
    @success="handleContentChanged"
  />
  <KnowledgeAttributeConfigDialog ref="attributeConfigRef" />
  <KnowledgeNumberRuleConfigDialog ref="numberRuleConfigRef" @saved="getPageData" />
  <KnowledgeReviewConfigDialog
    ref="reviewConfigRef"
    :root-folders="treeData.filter((node) => node.kind === 'folder')"
  />
</template>

<script lang="ts" setup>
import * as KnowledgeDocumentApi from '@/api/pms/kb/content/document'
import KnowledgeArchiveDialog from './KnowledgeArchiveDialog.vue'
import KnowledgeAttributeConfigDialog from './KnowledgeAttributeConfigDialog.vue'
import KnowledgeNumberRuleConfigDialog from './KnowledgeNumberRuleConfigDialog.vue'
import KnowledgeReviewConfigDialog from './KnowledgeReviewConfigDialog.vue'
import * as KnowledgeDocumentLabelApi from '@/api/pms/kb/content/document/label'
import * as KnowledgeFolderApi from '@/api/pms/kb/content/folder'
import * as KnowledgeFavoriteApi from '@/api/pms/kb/interaction/favorite'
import * as KnowledgeDocumentLikeApi from '@/api/pms/kb/interaction/like'
import * as KnowledgeLibraryApi from '@/api/pms/kb/library'
import * as KnowledgeLibraryMemberApi from '@/api/pms/kb/library/member'
import KnowledgeContentMoveDialog from './KnowledgeContentMoveDialog.vue'
import KnowledgeContentPermissionForm from './KnowledgeContentPermissionForm.vue'
import KnowledgeDocumentCreateForm from './KnowledgeDocumentCreateForm.vue'
import KnowledgeFileUploadForm from './KnowledgeFileUploadForm.vue'
import KnowledgeDocumentShareDialog from './KnowledgeDocumentShareDialog.vue'
import KnowledgeDocumentUpdateForm from './KnowledgeDocumentUpdateForm.vue'
import KnowledgeFolderForm from './KnowledgeFolderForm.vue'
import KnowledgeMemberForm from '../library/KnowledgeMemberForm.vue'
import KnowledgeDocumentDetail from './KnowledgeDocumentDetail.vue'
import KnowledgeFolderDetail from './KnowledgeFolderDetail.vue'
import KnowledgeLibraryHome from './KnowledgeLibraryHome.vue'
import KnowledgeLibrarySidebar from './KnowledgeLibrarySidebar.vue'
import KnowledgeRecyclePanel from './KnowledgeRecyclePanel.vue'
import type { KnowledgeContentView, KnowledgeTreeNode } from './types'
import {
  PmsKnowledgeDocumentType,
  PmsKnowledgeObjectType,
  PmsKnowledgeRootId
} from '@/views/pms/kb/utils/constants'
import { ElMessageBox } from 'element-plus'
import { useTagsViewStore } from '@/store/modules/tagsView'

defineOptions({ name: 'PmsKnowledgeLibraryDetail' })

const route = useRoute() // 当前路由
const router = useRouter() // 路由
const tagsViewStore = useTagsViewStore()
const message = useMessage() // 消息弹窗
const libraryId = computed(() => Number(route.params.libraryId)) // 知识库编号
const loading = ref(false) // 页面加载中
const activeView = ref<KnowledgeContentView>('home') // 当前右侧内容
const library = ref<KnowledgeLibraryApi.PmsKnowledgeLibraryVO>() // 知识库详情
const savedSidebarState = localStorage.getItem('pms-kb-sidebar-visible')
const sidebarVisible = ref(window.innerWidth > 900 && savedSidebarState !== 'false')
function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
  localStorage.setItem('pms-kb-sidebar-visible', String(sidebarVisible.value))
}
watch(activeView, (view) => {
  if (window.innerWidth <= 900 && (view === 'document' || view === 'folder'))
    sidebarVisible.value = false
})
const tree = ref<KnowledgeFolderApi.PmsKnowledgeTreeVO>() // 目录树
const selectedFolder = ref<KnowledgeFolderApi.PmsKnowledgeFolderVO>() // 当前文件夹
const selectedDocument = ref<KnowledgeDocumentApi.PmsKnowledgeDocumentVO>() // 当前文档
const labelList = ref<KnowledgeDocumentLabelApi.PmsKnowledgeDocumentLabelVO[]>([]) // 文档标签列表
const favoriteItems = ref<KnowledgeFavoriteApi.PmsKnowledgeInteractionItemVO[]>([]) // 当前知识库关注内容
const favoriteLoading = ref(false) // 关注内容加载中
const favoriteTabActive = ref(false) // 是否正在查看关注页签
const folderFormRef = ref<InstanceType<typeof KnowledgeFolderForm>>() // 文件夹表单 Ref
const documentCreateFormRef = ref<InstanceType<typeof KnowledgeDocumentCreateForm>>() // 文档新增表单 Ref
const fileUploadFormRef = ref<InstanceType<typeof KnowledgeFileUploadForm>>() // 文件上传表单 Ref
const documentUpdateFormRef = ref<InstanceType<typeof KnowledgeDocumentUpdateForm>>() // 文档编辑表单 Ref
const memberFormRef = ref<InstanceType<typeof KnowledgeMemberForm>>() // 成员表单 Ref
const shareDialogRef = ref<InstanceType<typeof KnowledgeDocumentShareDialog>>() // 文档分享 Ref
const permissionFormRef = ref<InstanceType<typeof KnowledgeContentPermissionForm>>() // 内容协作权限 Ref
const moveDialogRef = ref<InstanceType<typeof KnowledgeContentMoveDialog>>() // 内容移动弹窗 Ref
const archiveDialogRef = ref<InstanceType<typeof KnowledgeArchiveDialog>>()
const attributeConfigRef = ref<InstanceType<typeof KnowledgeAttributeConfigDialog>>()
const numberRuleConfigRef = ref<InstanceType<typeof KnowledgeNumberRuleConfigDialog>>()
const reviewConfigRef = ref<InstanceType<typeof KnowledgeReviewConfigDialog>>()
const archiveDocuments = computed(() => {
  const result: Array<{ id: number; title: string }> = []
  const visit = (nodes: KnowledgeTreeNode[]) =>
    nodes.forEach((node) => {
      if (node.kind === 'document') result.push({ id: node.entityId, title: node.label })
      visit(node.children || [])
    })
  visit(treeData.value)
  return result
})

const treeData = computed<KnowledgeTreeNode[]>(() => {
  if (!tree.value) return []
  return [
    ...tree.value.folders.map(buildFolderNode),
    ...tree.value.documents.map(buildDocumentNode)
  ]
}) // 目录树节点
const currentNodeKey = computed(() => {
  if (activeView.value === 'folder') return `folder-${selectedFolder.value?.id}`
  if (activeView.value === 'document') return `document-${selectedDocument.value?.id}`
  return undefined
}) // 当前目录节点标识
const currentPath = computed(() => {
  const findPath = (
    nodes: KnowledgeTreeNode[],
    path: KnowledgeTreeNode[]
  ): KnowledgeTreeNode[] | undefined => {
    for (const node of nodes) {
      const current = [...path, node]
      if (node.key === currentNodeKey.value) return current
      const found = findPath(node.children || [], current)
      if (found) return found
    }
  }
  return findPath(treeData.value, []) || []
})
const selectedDocumentLabels = computed(() => {
  const labelIds = new Set(selectedDocument.value?.labelIds ?? [])
  return labelList.value.filter((label) => labelIds.has(label.id))
}) // 当前文档标签
const selectedFolderChildren = computed(() => {
  if (!selectedFolder.value) return []
  return findTreeNode(treeData.value, `folder-${selectedFolder.value.id}`)?.children ?? []
}) // 当前文件夹的直属内容

/** 查询知识库页面数据 */
let pageRequest = 0
let contentRequest = 0
async function getPageData() {
  const request = ++pageRequest
  contentRequest++
  const targetLibraryId = libraryId.value
  loading.value = true
  try {
    // 并行加载页面所需数据
    const [libraryData, treeDataValue, fetchedLabels] = await Promise.all([
      KnowledgeLibraryApi.getKnowledgeLibrary(targetLibraryId),
      KnowledgeFolderApi.getKnowledgeTree(targetLibraryId),
      KnowledgeDocumentLabelApi.getKnowledgeDocumentLabelList()
    ])
    if (request !== pageRequest || targetLibraryId !== libraryId.value) return
    library.value = libraryData
    tree.value = treeDataValue
    labelList.value = fetchedLabels
    favoriteItems.value = []
    favoriteTabActive.value = false
    // 根据当前路由加载主页、文件夹或文档详情
    await getRouteContent()
  } finally {
    if (request === pageRequest) loading.value = false
  }
}

/** 根据路由加载知识库内容 */
async function getRouteContent() {
  const request = ++contentRequest
  const targetPath = route.path
  // 切换知识库时，由页面数据查询统一加载内容
  if (library.value?.id !== libraryId.value) return
  // 打开指定文档
  const documentId = Number(route.params.documentId)
  if (Number.isFinite(documentId) && documentId > 0) {
    const document = await KnowledgeDocumentApi.getKnowledgeDocument(documentId, true)
    if (request !== contentRequest) return
    selectedDocument.value = document
    selectedFolder.value = undefined
    activeView.value = 'document'
    if (route.query.edit === '1') {
      const query = { ...route.query }
      delete query.edit
      await router.replace({ path: route.path, query })
      if (document.type === PmsKnowledgeDocumentType.RICH_TEXT)
        documentUpdateFormRef.value?.open(document.id)
    }
    await updateContentTabTitle(targetPath, document.title)
    return
  }
  // 打开指定文件夹
  const folderId = Number(route.params.folderId)
  if (Number.isFinite(folderId) && folderId > 0) {
    const folder = await KnowledgeFolderApi.getKnowledgeFolder(folderId, true)
    if (request !== contentRequest) return
    selectedFolder.value = folder
    selectedDocument.value = undefined
    activeView.value = 'folder'
    await updateContentTabTitle(targetPath, folder.title)
    return
  }
  // 默认打开知识库主页
  activeView.value = 'home'
  selectedFolder.value = undefined
  selectedDocument.value = undefined
}

/** 每次打开内容后更新该路径的页签，避免修改共享路由元信息。 */
async function updateContentTabTitle(path: string, title: string) {
  await nextTick()
  for (const view of tagsViewStore.visitedViews) {
    if (view.path === path) {
      view.meta = { ...view.meta, title, titleSuffix: undefined }
    }
  }
}

/** 查询目录树 */
async function getTree() {
  const targetLibraryId = libraryId.value
  const result = await KnowledgeFolderApi.getKnowledgeTree(targetLibraryId)
  if (targetLibraryId === libraryId.value) tree.value = result
}

/** 查询当前知识库的关注内容 */
async function getFavoriteItems() {
  const targetLibraryId = libraryId.value
  favoriteLoading.value = true
  try {
    const result = await KnowledgeFavoriteApi.getKnowledgeFavoriteList(targetLibraryId)
    if (targetLibraryId === libraryId.value) favoriteItems.value = result
  } finally {
    if (targetLibraryId === libraryId.value) favoriteLoading.value = false
  }
}

/** 切换知识库主页内容页签 */
async function handleLibraryTabChange(tab: 'all' | 'favorite') {
  favoriteTabActive.value = tab === 'favorite'
  if (favoriteTabActive.value) {
    await getFavoriteItems()
  }
}

/** 构建文件夹树节点 */
function buildFolderNode(folder: KnowledgeFolderApi.PmsKnowledgeFolderTreeNode): KnowledgeTreeNode {
  return {
    key: `folder-${folder.id}`,
    entityId: folder.id,
    kind: 'folder',
    label: folder.title,
    currentUserLevel: folder.currentUserLevel,
    children: [...folder.children.map(buildFolderNode), ...folder.documents.map(buildDocumentNode)]
  }
}

/** 构建文档树节点 */
function buildDocumentNode(
  document: KnowledgeDocumentApi.PmsKnowledgeDocumentTreeNode
): KnowledgeTreeNode {
  return {
    key: `document-${document.id}`,
    entityId: document.id,
    kind: 'document',
    label: document.title,
    currentUserLevel: document.currentUserLevel,
    type: document.type,
    children: document.children.map(buildDocumentNode)
  }
}

/** 打开目录节点 */
async function handleNodeClick(node: KnowledgeTreeNode) {
  if (node.kind === 'folder') {
    await router.push(`/pms/kb/library/${libraryId.value}/folder/${node.entityId}`)
    return
  }
  await router.push(`/pms/kb/library/${libraryId.value}/document/${node.entityId}`)
}

/** 处理目录树节点快捷操作 */
function handleFolderCreate(command: string) {
  const folder = selectedFolder.value
  if (!folder) return
  handleNodeAction(
    {
      key: `folder-${folder.id}`,
      entityId: folder.id,
      kind: 'folder',
      label: folder.title,
      currentUserLevel: folder.currentUserLevel,
      children: []
    },
    command
  )
}

async function handleNodeAction(node: KnowledgeTreeNode, command: string) {
  if (command === 'create-document' || command === 'create-folder' || command === 'upload') {
    if (command === 'create-document') {
      documentCreateFormRef.value?.open(libraryId.value, node.entityId, PmsKnowledgeRootId)
    } else if (command === 'create-folder') {
      folderFormRef.value?.open('create', libraryId.value, node.entityId)
    } else {
      fileUploadFormRef.value?.open(libraryId.value, node.entityId, PmsKnowledgeRootId)
    }
    return
  }
  if (node.kind === 'folder') {
    const folder = await KnowledgeFolderApi.getKnowledgeFolder(node.entityId)
    if (command === 'rename') {
      const title = await promptName(folder.title, '文件夹')
      if (!title || title === folder.title) return
      await KnowledgeFolderApi.updateKnowledgeFolder({ ...folder, title })
      message.success('已重命名')
      await handleContentChanged()
    } else if (command === 'move') {
      moveDialogRef.value?.open('folder', folder)
    } else if (command === 'delete') {
      await deleteFolder(folder)
    }
    return
  }
  const document = await KnowledgeDocumentApi.getKnowledgeDocument(node.entityId)
  if (command === 'create-child-document' || command === 'upload-child') {
    if (document.status !== 1) {
      message.warning('请先发布当前文档，再创建子文档或上传子文件')
      return
    }
    if (command === 'create-child-document')
      documentCreateFormRef.value?.open(libraryId.value, PmsKnowledgeRootId, document.id)
    else fileUploadFormRef.value?.open(libraryId.value, PmsKnowledgeRootId, document.id)
    return
  }
  if (command === 'rename') {
    const title = await promptName(document.title, document.type === 4 ? '文件' : '文档')
    if (!title || title === document.title) return
    await KnowledgeDocumentApi.updateKnowledgeDocument({
      id: document.id,
      title,
      expectedVersionNo: document.versionNo
    })
    message.success('已重命名')
    await handleContentChanged()
  } else if (command === 'edit') documentUpdateFormRef.value?.open(document.id)
  else if (command === 'move') moveDialogRef.value?.open('document', document)
  else if (command === 'delete') await deleteDocument(document)
}

async function promptName(currentName: string, kind: string) {
  try {
    const result = await ElMessageBox.prompt(`请输入${kind}名称`, '重命名', {
      inputValue: currentName,
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValidator: (value) =>
        (Boolean(value?.trim()) && value.trim().length <= 255) || '请输入 1 至 255 个字符',
      closeOnClickModal: false
    })
    return result.value.trim()
  } catch {
    return undefined
  }
}

/** 删除文件夹并刷新目录树 */
async function deleteFolder(folder: KnowledgeFolderApi.PmsKnowledgeFolderVO) {
  try {
    await message.delConfirm(
      `确认将文件夹“${folder.title}”及其内容移入回收站吗？可在“最近删除”中恢复。`
    )
    await KnowledgeFolderApi.deleteKnowledgeFolder(folder.id)
    message.success('删除成功')
    await getTree()
    if (currentNodeKey.value && !currentPath.value.length) await handleHome()
  } catch {}
}

/** 删除文档并刷新目录树 */
async function deleteDocument(document: KnowledgeDocumentApi.PmsKnowledgeDocumentVO) {
  try {
    await message.delConfirm(
      `确认将“${document.title}”及其子文档移入回收站吗？可在“最近删除”中恢复。`
    )
    await KnowledgeDocumentApi.deleteKnowledgeDocument(document.id)
    message.success('删除成功')
    await getTree()
    if (currentNodeKey.value && !currentPath.value.length) await handleHome()
  } catch {}
}

/** 从知识库主页进入限定当前知识库的搜索 */
function handleLibrarySearch() {
  router.push({ path: '/pms/kb/search', query: { libraryId: String(libraryId.value) } })
}

/** 打开知识库主页 */
async function handleHome() {
  activeView.value = 'home'
  selectedFolder.value = undefined
  selectedDocument.value = undefined
  await router.push(`/pms/kb/library/${libraryId.value}`)
  if (favoriteTabActive.value) {
    await getFavoriteItems()
  }
}

/** 打开最近删除 */
function handleRecycle() {
  activeView.value = 'recycle'
  selectedFolder.value = undefined
  selectedDocument.value = undefined
}

/** 处理目录新建命令 */
function handleCreateCommand(command: 'document' | 'folder' | 'upload') {
  if (command === 'folder') {
    folderFormRef.value?.open('create', libraryId.value, PmsKnowledgeRootId)
    return
  }
  if (command === 'upload') {
    openFileUploadForm()
    return
  }
  openDocumentCreateForm()
}

/** 打开文件夹表单 */
function openFolderForm(type: string) {
  folderFormRef.value?.open(
    type,
    libraryId.value,
    type === 'create' ? selectedFolder.value?.id || PmsKnowledgeRootId : PmsKnowledgeRootId,
    type === 'update' ? selectedFolder.value?.id : undefined
  )
}

/** 打开文档新增表单 */
function openDocumentCreateForm() {
  documentCreateFormRef.value?.open(libraryId.value, PmsKnowledgeRootId, PmsKnowledgeRootId)
}

/** 打开文件上传表单 */
function openFileUploadForm() {
  fileUploadFormRef.value?.open(libraryId.value, PmsKnowledgeRootId, PmsKnowledgeRootId)
}

/** 打开文档编辑表单 */
function openDocumentUpdateForm() {
  if (!selectedDocument.value) return
  documentUpdateFormRef.value?.open(selectedDocument.value.id)
}

/** 处理内容删除成功 */
async function handleContentDeleted() {
  await handleHome()
  await getTree()
}

/** 关注或取消关注知识库 */
async function handleLibraryCollect() {
  if (!library.value) return
  library.value.favoriteStatus = await toggleFavorite(
    PmsKnowledgeObjectType.LIBRARY,
    library.value.id,
    Boolean(library.value.favoriteStatus)
  )
}

/** 关注或取消关注文件夹 */
async function handleFolderCollect() {
  if (!selectedFolder.value) return
  selectedFolder.value.favoriteStatus = await toggleFavorite(
    PmsKnowledgeObjectType.FOLDER,
    selectedFolder.value.id,
    selectedFolder.value.favoriteStatus
  )
}

/** 关注或取消关注文档 */
async function handleDocumentCollect() {
  if (!selectedDocument.value) return
  selectedDocument.value.favoriteStatus = await toggleFavorite(
    selectedDocument.value.type,
    selectedDocument.value.id,
    selectedDocument.value.favoriteStatus
  )
}

/** 切换关注状态 */
async function toggleFavorite(type: number, entityId: number, favoriteStatus: boolean) {
  if (favoriteStatus) {
    await KnowledgeFavoriteApi.deleteKnowledgeFavorite(type, entityId)
    message.success('已取消关注')
    return false
  }
  await KnowledgeFavoriteApi.createKnowledgeFavorite({ type, entityId })
  message.success('关注成功')
  return true
}

/** 点赞或取消点赞文档 */
async function handleDocumentLike() {
  if (!selectedDocument.value) return
  if (selectedDocument.value.likeStatus) {
    await KnowledgeDocumentLikeApi.deleteKnowledgeDocumentLike(selectedDocument.value.id)
  } else {
    await KnowledgeDocumentLikeApi.createKnowledgeDocumentLike(selectedDocument.value.id)
  }
  selectedDocument.value = await KnowledgeDocumentApi.getKnowledgeDocument(
    selectedDocument.value.id
  )
}

/** 退出知识库 */
async function handleExitLibrary() {
  try {
    // 退出的二次确认
    await message.confirm(`确认退出知识库“${library.value?.name}”吗？退出后将无法访问私有内容。`)
    // 发起退出
    await KnowledgeLibraryMemberApi.exitKnowledgeLibrary(libraryId.value)
    message.success('已退出知识库')
    await router.push('/pms/kb/library')
  } catch {}
}

/** 内容变化后刷新目录与选中内容 */
async function handleCreatedDocument(documentId?: number) {
  await getTree()
  if (documentId)
    await router.push({
      path: `/pms/kb/library/${libraryId.value}/document/${documentId}`,
      query: { edit: '1' }
    })
}

async function handleContentChanged() {
  await getTree()
  if (selectedDocument.value) {
    selectedDocument.value = await KnowledgeDocumentApi.getKnowledgeDocument(
      selectedDocument.value.id
    )
  } else if (selectedFolder.value) {
    selectedFolder.value = await KnowledgeFolderApi.getKnowledgeFolder(selectedFolder.value.id)
  }
}

/** 最近删除变化后刷新目录 */
async function handleRecycleChanged() {
  await getTree()
}

/** 内容移动后返回主页并刷新目录 */
async function handleMoveChanged() {
  await handleHome()
  await getTree()
}

/** 按节点标识查找目录树节点 */
function findTreeNode(nodes: KnowledgeTreeNode[], key: string): KnowledgeTreeNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node
    const child = findTreeNode(node.children, key)
    if (child) return child
  }
}

/** 初始化 */
onMounted(() => {
  getPageData()
})

watch(libraryId, () => {
  getPageData()
})
watch([() => route.params.folderId, () => route.params.documentId], () => {
  getRouteContent()
})
</script>

<style lang="scss" scoped>
.knowledge-library-workspace :deep(.el-card) {
  height: 100%;
}

@media (width <= 900px) {
  .knowledge-library-main :deep(.el-card__body) {
    padding-right: 12px !important;
    padding-left: 12px !important;
  }
}
</style>
