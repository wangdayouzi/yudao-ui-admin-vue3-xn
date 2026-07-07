<template>
  <Dialog v-model="dialogVisible" :title="'版本管理 - ' + (currentBusiness?.basNo || '')" width="1000px">
    <!-- 基本信息 -->
    <el-descriptions :column="3" border class="mb-20px">
      <el-descriptions-item label="BAS编号">{{ currentBusiness?.basNo }}</el-descriptions-item>
      <el-descriptions-item label="临床方案编号">{{ currentBusiness?.protocolNo || '-' }}</el-descriptions-item>
      <el-descriptions-item label="申办方">{{ currentBusiness?.sponsor || '-' }}</el-descriptions-item>
    </el-descriptions>

    <!-- 文件列表 -->
    <el-table v-loading="loading" :data="fileList" max-height="200" @row-click="selectFile" highlight-current-row>
      <el-table-column align="center" label="文件名" prop="fileName" show-overflow-tooltip />
      <el-table-column align="center" label="当前版本" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.fileVersion" type="success" size="small">v{{ scope.row.fileVersion }}</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column :formatter="dateFormatter" align="center" label="创建时间" prop="createTime" width="160" />
    </el-table>
    <div v-if="fileList.length === 0 && !loading" class="text-center py-20px text-gray-400">暂无文件</div>

    <!-- 版本记录 -->
    <div v-if="selectedFileId" class="mt-20px">
      <el-divider>版本记录</el-divider>
      <el-table v-loading="versionLoading" :data="versionList" max-height="300">
        <el-table-column align="center" label="版本号" prop="versionNo" width="80">
          <template #default="scope">
            <el-tag size="small">v{{ scope.row.versionNo }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column align="center" label="文件名" prop="fileName" show-overflow-tooltip min-width="150" />
        <el-table-column align="center" label="大小" prop="fileSize" width="90">
          <template #default="scope">{{ formatFileSize(scope.row.fileSize) }}</template>
        </el-table-column>
        <el-table-column align="center" label="变更说明" prop="changeDescription" show-overflow-tooltip min-width="120" />
        <el-table-column :formatter="dateFormatter" align="center" label="上传时间" prop="createTime" width="160" />
        <el-table-column align="center" label="操作" width="180">
          <template #default="scope">
            <el-button link type="primary" @click="openEditor(scope.row)">在线编辑</el-button>
            <el-button link type="danger" @click="handleDeleteVersion(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </Dialog>
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import { useRouter } from 'vue-router'
import * as AmfApi from '@/api/amf/index'

defineOptions({ name: 'AmfFileVersionDialog' })

const message = useMessage()
const router = useRouter()

const dialogVisible = ref(false)
const loading = ref(false)
const versionLoading = ref(false)
const currentBusiness = ref<AmfApi.AmfBusinessVO | null>(null)
const fileList = ref<AmfApi.AmfFileVO[]>([])
const versionList = ref<AmfApi.AmfFileVersionVO[]>([])
const selectedFileId = ref<number>(0)

const open = (row: AmfApi.AmfBusinessVO) => {
  dialogVisible.value = true
  currentBusiness.value = row
  selectedFileId.value = 0
  versionList.value = []
  loadFileList()
}
defineExpose({ open })

const loadFileList = async () => {
  loading.value = true
  try {
    fileList.value = await AmfApi.getFileList(currentBusiness.value!.id!)
  } finally { loading.value = false }
}

const selectFile = (row: AmfApi.AmfFileVO) => {
  selectedFileId.value = row.id!
  loadVersionList()
}

const loadVersionList = async () => {
  versionLoading.value = true
  try {
    versionList.value = await AmfApi.getFileVersionList(selectedFileId.value)
  } finally { versionLoading.value = false }
}

const formatFileSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

const openEditor = (version: AmfApi.AmfFileVersionVO) => {
  router.push({ path: '/amf/editor', query: { versionId: version.id, businessId: currentBusiness.value?.id } })
}

const handleDeleteVersion = async (versionId: number) => {
  try {
    await message.delConfirm()
    await AmfApi.deleteFileVersion(versionId)
    message.success('删除成功')
    await loadFileList()
    if (selectedFileId.value) await loadVersionList()
  } catch {}
}
</script>
