<template>
  <el-drawer v-model="visible" :title="'文件管理 - ' + business?.methodNo" size="850px" direction="rtl">
    <div class="upload-area mb-16px p-12px bg-gray-50 rounded">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        multiple
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
        drag
        accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.odt,.ods,.odp,.csv,.rtf"
      >
        <Icon icon="ep:upload-filled" class="text-28px text-gray-400" />
        <div class="mt-4px text-gray-500 text-13px">拖拽文件上传（支持多选，每个文件独立版本管理）</div>
      </el-upload>
      <div v-if="selectedFiles.length" class="mt-10px">
        <el-tag v-for="f in selectedFiles" :key="f.uid" closable size="small" class="mr-6px mb-4px" @close="removeSelected(f.uid!)">
          {{ f.name }}
        </el-tag>
      </div>
      <div v-if="selectedFiles.length" class="flex mt-6px gap-8px items-center">
        <el-input v-model="changeDesc" placeholder="变更说明（可选）" size="small" class="flex-1" />
        <el-button type="primary" size="small" @click="doUpload">全部上传</el-button>
        <el-button size="small" @click="cancelUpload">取消</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="fileList" row-key="id" @expand-change="onExpand">
      <el-table-column type="expand">
        <template #default="{ row }">
          <div v-loading="row._loading" class="p-8px pl-20px bg-blue-50 rounded border border-blue-100">
            <div class="text-13px font-500 text-blue-700 mb-8px">版本历史</div>
            <el-table :data="row._versions" size="small">
              <el-table-column label="版本" width="70" align="center">
                <template #default="{ row: v }">
                  <el-tag size="small" :type="v.versionNo === row.fileVersion ? 'success' : undefined">v{{ v.versionNo }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="大小" width="80" align="center">
                <template #default="{ row: v }">{{ formatSize(v.fileSize) }}</template>
              </el-table-column>
              <el-table-column label="变更说明" show-overflow-tooltip min-width="100">
                <template #default="{ row: v }">{{ v.changeDescription || '-' }}</template>
              </el-table-column>
              <el-table-column :formatter="dateFormatter" label="上传时间" width="160" />
              <el-table-column label="操作" width="110" align="center">
                <template #default="{ row: v }">
                  <el-button link type="primary" size="small" @click="openVersionEditor(v)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="deleteVersion(v.id, row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="!row._versions?.length" class="text-center py-20px text-gray-400 text-12px">暂无版本记录</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="文件名" prop="fileName" show-overflow-tooltip min-width="160" />
      <el-table-column label="版本" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.fileVersion" type="success" size="small">v{{ row.fileVersion }}</el-tag>
          <span v-else class="text-gray-400 text-12px">-</span>
        </template>
      </el-table-column>
      <el-table-column :formatter="dateFormatter" label="创建时间" width="160" align="center" />
      <el-table-column label="操作" width="240" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="scrollToUpload">上传新版本</el-button>
          <el-button v-if="row.fileVersion" link type="warning" size="small" @click="openLatestVersion(row)">在线编辑</el-button>
          <el-button link type="danger" size="small" @click="deleteFile(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="fileList.length === 0 && !loading" class="text-center py-60px text-gray-400 text-14px">
      暂无文件，请拖拽上传
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import { useRouter } from 'vue-router'
import * as AmfApi from '@/api/amf/index'
import type { UploadProps, UploadRawFile, UploadUserFile } from 'element-plus'

defineOptions({ name: 'AmfFileManager' })

const message = useMessage()
const router = useRouter()

const visible = ref(false)
const loading = ref(false)
const business = ref<AmfApi.AmfBusinessVO | null>(null)
const fileList = ref<(AmfApi.AmfFileVO & { _loading?: boolean; _versions?: AmfApi.AmfFileVersionVO[] })[]>([])

const uploadRef = ref()
const selectedFiles = ref<UploadUserFile[]>([])
const changeDesc = ref('')

const open = (row: AmfApi.AmfBusinessVO) => {
  visible.value = true
  business.value = row
  loadFiles()
}
defineExpose({ open })

const loadFiles = async () => {
  loading.value = true
  try {
    const files = await AmfApi.getFileList(business.value!.id!)
    fileList.value = files.map(f => ({ ...f, _loading: false, _versions: [] }))
  } finally { loading.value = false }
}

// load versions on expand
const onExpand = async (row: any, expandedRows: any[]) => {
  if (expandedRows.includes(row) && !row._versions?.length) {
    row._loading = true
    try { row._versions = await AmfApi.getFileVersionList(row.id) }
    finally { row._loading = false }
  }
}

// upload - multi file support
const handleFileChange: UploadProps['onChange'] = (f, files) => {
  const file = f.raw as UploadRawFile
  const allowed = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt', 'odt', 'ods', 'odp', 'csv', 'rtf']
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!allowed.includes(ext)) { message.error('不支持: .' + ext); return }
  if (file.size > 50 * 1024 * 1024) { message.error(file.name + ' 超过50MB'); return }
  selectedFiles.value = files as UploadUserFile[]
}
const handleFileRemove = (_f: any, files: any[]) => { selectedFiles.value = files as UploadUserFile[] }
const removeSelected = (uid: number) => {
  selectedFiles.value = selectedFiles.value.filter(f => f.uid !== uid)
}
const cancelUpload = () => { selectedFiles.value = []; changeDesc.value = ''; uploadRef.value?.clearFiles() }

const doUpload = async () => {
  if (!selectedFiles.value.length) return
  loading.value = true
  try {
    for (const f of selectedFiles.value) {
      await AmfApi.uploadFile(business.value!.id!, f.raw as File, changeDesc.value)
    }
    message.success(`成功上传 ${selectedFiles.value.length} 个文件`)
    cancelUpload()
    await loadFiles()
  } finally { loading.value = false }
}

const scrollToUpload = () => {
  uploadRef.value?.$el?.querySelector('input[type="file"]')?.click()
}

const openLatestVersion = async (row: AmfApi.AmfFileVO) => {
  const versions = await AmfApi.getFileVersionList(row.id!)
  if (!versions.length) { message.warning('暂无版本，请先上传'); return }
  router.push({ path: '/amf/editor', query: { versionId: versions[0].id, businessId: business.value?.id } })
}

const openVersionEditor = (v: AmfApi.AmfFileVersionVO) => {
  router.push({ path: '/amf/editor', query: { versionId: v.id, businessId: business.value?.id } })
}

const deleteFile = async (id: number) => {
  try {
    await message.delConfirm()
    await AmfApi.deleteFile(id)
    message.success('文件已删除')
    await loadFiles()
  } catch {}
}

const deleteVersion = async (versionId: number, fileRow: any) => {
  try {
    await message.delConfirm()
    await AmfApi.deleteFileVersion(versionId)
    message.success('版本已删除')
    fileRow._versions = await AmfApi.getFileVersionList(fileRow.id)
    await loadFiles()
  } catch {}
}

const formatSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024) return size + 'B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + 'KB'
  return (size / (1024 * 1024)).toFixed(1) + 'MB'
}
</script>
