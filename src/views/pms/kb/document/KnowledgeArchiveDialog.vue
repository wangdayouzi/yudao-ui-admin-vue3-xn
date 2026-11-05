<template>
  <Dialog v-model="visible" title="知识库内容导入与导出" width="640px">
    <div v-loading="busy">
      <p class="mt-0 text-[var(--el-text-color-secondary)]">
        内容包用于迁移或留存当前知识库内容，不是系统数据库备份；恢复时会新增内容，不会覆盖现有文档。
      </p>
      <el-form label-width="90px" v-if="tab === 'files' || tab === 'restore'">
        <el-form-item label="导入到目录">
          <el-tree-select
            v-model="targetFolderId"
            :data="folderOptions"
            check-strictly
            node-key="value"
            class="w-full"
          />
        </el-form-item>
      </el-form>
      <el-tabs v-model="tab">
        <el-tab-pane label="批量导入文件" name="files">
          <p
            >文件将导入上方选择的目录。支持选择整个文件夹并保留层级（含所选文件夹本身）；空文件夹不导入。同名内容新增，不覆盖。每批最多
            1000 个文件，总大小不超过 100 MB。</p
          >
          <div>选择文件：<input :key="inputKey" type="file" multiple @change="selectFiles" /></div>
          <div class="mt-12px"
            >选择文件夹：<input
              :key="`directory-${inputKey}`"
              type="file"
              webkitdirectory
              multiple
              @change="selectFiles"
          /></div>
          <div v-if="files.length" class="mt-12px max-h-160px overflow-auto">
            <div v-for="(file, index) in files" :key="index">{{
              file.webkitRelativePath || file.name
            }}</div>
          </div>
          <div class="mt-16px"
            ><el-button type="primary" :disabled="!files.length" @click="importFiles"
              >导入 {{ files.length }} 个文件</el-button
            ></div
          >
        </el-tab-pane>
        <el-tab-pane label="下载内容包" name="export">
          <p>ZIP 包含所选范围的目录、文档正文、附件和历史版本。请选择导出范围。</p>
          <el-radio-group v-model="exportScope" class="mb-12px">
            <el-radio value="folder">按目录</el-radio>
            <el-radio value="documents">指定文档</el-radio>
            <el-radio value="all">整个知识库</el-radio>
          </el-radio-group>
          <el-tree-select
            v-if="exportScope === 'folder'"
            v-model="exportFolderId"
            :data="folderOptions[0]?.children || []"
            check-strictly
            node-key="value"
            placeholder="请选择导出的目录（包含子目录）"
            class="w-full"
          />
          <el-select
            v-if="exportScope === 'documents'"
            v-model="selectedIds"
            multiple
            filterable
            placeholder="选择需要导出的文档"
            class="w-full"
          >
            <el-option
              v-for="item in documents"
              :key="item.id"
              :label="item.title"
              :value="item.id"
            />
          </el-select>
          <div class="mt-16px"
            ><el-button type="primary" @click="exportArchive">下载内容包</el-button></div
          >
        </el-tab-pane>
        <el-tab-pane label="导入内容包" name="restore">
          <p>将本功能导出的 ZIP 内容包导入当前知识库，新增目录和文档，并保留历史版本编号。</p>
          <p class="text-[var(--el-text-color-secondary)]"
            >恢复后的内容使用新建权限。成员、分享链接、评论、标签和个人编辑草稿不包含在内容包中。</p
          >
          <input type="file" accept=".zip" @change="selectArchive" />
          <div class="mt-16px"
            ><el-button type="primary" :disabled="!archive" @click="restoreArchive"
              >恢复为新增内容</el-button
            ></div
          >
        </el-tab-pane>
        <el-tab-pane label="正文检索" name="search">
          <p>为已有文档重新提取正文。支持文本型 Office、PDF 和文本附件；扫描图片暂不识别。</p>
          <p>单个附件最多处理 20 MB，正文最多索引 20 万字。超出范围或提取失败时仍可按标题搜索。</p>
          <el-button type="primary" @click="rebuildIndex">重建当前知识库检索索引</el-button>
        </el-tab-pane>
      </el-tabs>
    </div>
  </Dialog>
</template>

<script lang="ts" setup>
import * as ArchiveApi from '@/api/pms/kb/archive'
import * as FolderApi from '@/api/pms/kb/content/folder'
import download from '@/utils/download'

const props = defineProps<{ libraryId: number; documents: Array<{ id: number; title: string }> }>()
const emit = defineEmits(['success'])
const message = useMessage()
const visible = ref(false)
const busy = ref(false)
const tab = ref('files')
const files = ref<File[]>([])
const archive = ref<File>()
const selectedIds = ref<number[]>([])

const targetFolderId = ref(0)
const exportFolderId = ref<number>()
const exportScope = ref('folder')
const inputKey = ref(0)
interface FolderOption {
  value: number
  label: string
  children: FolderOption[]
}
const folderOptions = ref<FolderOption[]>([])
async function open() {
  visible.value = true
  files.value = []
  archive.value = undefined
  selectedIds.value = []
  targetFolderId.value = 0
  exportFolderId.value = undefined
  inputKey.value++
  busy.value = true
  try {
    const tree = await FolderApi.getKnowledgeTree(props.libraryId)
    const convert = (folder: FolderApi.PmsKnowledgeFolderTreeNode): FolderOption => ({
      value: folder.id,
      label: folder.title,
      children: (folder.children || []).map(convert)
    })
    folderOptions.value = [{ value: 0, label: '知识库根目录', children: tree.folders.map(convert) }]
  } finally {
    busy.value = false
  }
}
function selectFiles(event: Event) {
  files.value = Array.from((event.target as HTMLInputElement).files || [])
}
function selectArchive(event: Event) {
  archive.value = (event.target as HTMLInputElement).files?.[0]
}
async function importFiles() {
  if (
    files.value.length > 1000 ||
    files.value.reduce((size, file) => size + file.size, 0) > 100 * 1024 * 1024
  ) {
    message.warning('每批最多 1000 个文件，总大小不超过 100 MB')
    return
  }
  busy.value = true
  try {
    const ids = await ArchiveApi.batchImportKnowledgeFiles(
      props.libraryId,
      files.value,
      targetFolderId.value
    )
    message.success(`已导入 ${ids.length} 个文件`)
    files.value = []
    inputKey.value++
    emit('success')
  } finally {
    busy.value = false
  }
}
async function exportArchive() {
  if (exportScope.value === 'folder' && !exportFolderId.value) {
    message.warning('请选择导出的目录')
    return
  }
  if (exportScope.value === 'documents' && !selectedIds.value.length) {
    message.warning('请选择导出的文档')
    return
  }
  busy.value = true
  try {
    const data = await ArchiveApi.exportKnowledgeArchive(
      props.libraryId,
      exportScope.value === 'documents' ? selectedIds.value : [],
      exportScope.value === 'folder' ? exportFolderId.value : undefined
    )
    download.zip(data, `knowledge-library-${props.libraryId}.zip`)
  } finally {
    busy.value = false
  }
}
async function restoreArchive() {
  if (!archive.value) return
  if (archive.value.size > 100 * 1024 * 1024) {
    message.warning('内容包不能超过 100 MB')
    return
  }
  busy.value = true
  try {
    const count = await ArchiveApi.restoreKnowledgeArchive(
      props.libraryId,
      archive.value,
      targetFolderId.value
    )
    message.success(`已恢复 ${count} 篇文档`)
    archive.value = undefined
    emit('success')
  } finally {
    busy.value = false
  }
}
async function rebuildIndex() {
  busy.value = true
  try {
    const count = await ArchiveApi.rebuildKnowledgeSearchIndex(props.libraryId)
    message.success(`已更新 ${count} 篇文档的检索索引`)
  } finally {
    busy.value = false
  }
}
defineExpose({ open })
</script>
