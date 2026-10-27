<template>
  <Dialog v-model="visible" title="知识库内容导入与导出" width="640px">
    <div v-loading="busy">
      <p class="mt-0 text-[var(--el-text-color-secondary)]">
        内容包用于迁移或留存当前知识库内容，不是系统数据库备份；恢复时会新增内容，不会覆盖现有文档。
      </p>
      <el-tabs v-model="tab">
        <el-tab-pane label="批量导入文件" name="files">
          <p>文件将导入当前知识库根目录。每批最多 20 个，总大小不超过 100 MB。</p>
          <input type="file" multiple @change="selectFiles" />
          <div class="mt-16px"
            ><el-button type="primary" :disabled="!files.length" @click="importFiles"
              >导入 {{ files.length }} 个文件</el-button
            ></div
          >
        </el-tab-pane>
        <el-tab-pane label="下载内容包" name="export">
          <p>ZIP 包含目录、文档正文、附件和历史版本。留空选择则导出整个知识库。</p>
          <el-select
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

function open() {
  visible.value = true
}
function selectFiles(event: Event) {
  files.value = Array.from((event.target as HTMLInputElement).files || [])
}
function selectArchive(event: Event) {
  archive.value = (event.target as HTMLInputElement).files?.[0]
}
async function importFiles() {
  if (
    files.value.length > 20 ||
    files.value.reduce((size, file) => size + file.size, 0) > 100 * 1024 * 1024
  ) {
    message.warning('每批最多 20 个文件，总大小不超过 100 MB')
    return
  }
  busy.value = true
  try {
    const ids = await ArchiveApi.batchImportKnowledgeFiles(props.libraryId, files.value)
    message.success(`已导入 ${ids.length} 个文件`)
    files.value = []
    emit('success')
  } finally {
    busy.value = false
  }
}
async function exportArchive() {
  busy.value = true
  try {
    const data = await ArchiveApi.exportKnowledgeArchive(props.libraryId, selectedIds.value)
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
    const count = await ArchiveApi.restoreKnowledgeArchive(props.libraryId, archive.value)
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
