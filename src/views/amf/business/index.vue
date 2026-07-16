<template>
  <div class="amf-business-container">
    <ContentWrap>
      <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="100px">
        <el-form-item label="方法编号" prop="methodNo">
          <el-input v-model="queryParams.methodNo" class="!w-200px" clearable placeholder="请输入方法编号" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="基质类型" prop="matrixType">
          <el-input v-model="queryParams.matrixType" class="!w-200px" clearable placeholder="请输入基质类型" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="方法名称" prop="methodName">
          <el-input v-model="queryParams.methodName" class="!w-200px" clearable placeholder="请输入方法名称" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="测试物" prop="testArticle">
          <el-input v-model="queryParams.testArticle" class="!w-200px" clearable placeholder="请输入测试物" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button @click="handleQuery"><Icon class="mr-5px" icon="ep:search" />搜索</el-button>
          <el-button @click="resetQuery"><Icon class="mr-5px" icon="ep:refresh" />重置</el-button>
          <el-button v-hasPermi="['amf:business:create']" plain type="primary" @click="openForm('create')"><Icon class="mr-5px" icon="ep:plus" />新增</el-button>
          <el-button @click="collapseAll"><Icon class="mr-5px" icon="ep:fold" />全部收起</el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <ContentWrap>
      <el-table ref="tableRef" v-loading="loading" :data="list" row-key="id" @expand-change="onExpand" >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div v-loading="row._fileLoading" class="file-expand p-8px bg-gray-50">
              <div class="flex items-center gap-8px mb-8px">
                <span class="text-13px font-500 text-gray-700">文件列表</span>
                <el-button size="small" type="primary" @click="openUpload(row)">上传文件</el-button>
              </div>
              <el-table v-if="row._files?.length" :data="row._files" size="small" row-key="id" @expand-change="onFileExpand" border >
                <el-table-column type="expand">
                  <template #default="{ row: f }">
                    <div v-loading="f._verLoading" class="p-4px pl-12px bg-blue-50 rounded">
                      <el-table :data="f._versions" size="small" class="ver-table" border >
                        <el-table-column label="版本" width="60" align="center">
                          <template #default="{ row: v }"><el-tag size="small" :type="v.versionNo === f.fileVersion ? 'success' : undefined">v{{ v.versionNo }}</el-tag></template>
                        </el-table-column>
                        <el-table-column label="大小" width="80" align="center">
                          <template #default="{ row: v }">{{ formatSize(v.fileSize) }}</template>
                        </el-table-column>
                        <el-table-column label="变更说明" show-overflow-tooltip min-width="120">
                          <template #default="{ row: v }">{{ v.changeDescription || '-' }}</template>
                        </el-table-column>
                        <el-table-column :formatter="dateFormatter" label="上传时间" prop="createTime" width="150" align="center" />
                        <el-table-column label="操作" width="160" align="center">
                          <template #default="{ row: v }">
                            <el-button link size="small" type="primary" @click="previewVersion(v)">预览</el-button>
                            <el-button link size="small" type="success" @click="downloadVersion(v)">下载</el-button>
                            <el-button link size="small" type="danger" @click="deleteVersion(row, row._files!, f, v)">删除</el-button>
                          </template>
                        </el-table-column>
                      </el-table>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="文件名" prop="fileName" show-overflow-tooltip min-width="160" />
                <el-table-column label="版本" width="70" align="center">
                  <template #default="{ row: f }"><el-tag v-if="f.fileVersion" size="small" type="success">v{{ f.fileVersion }}</el-tag></template>
                </el-table-column>
                <el-table-column label="操作" width="340" align="center">
                  <template #default="{ row: f }">
                    <el-button link size="small" type="primary" @click="uploadNewFileVersion(row, f)">上传新版本</el-button>
                    <el-button link size="small" type="warning" @click="previewFile(row, f)">预览</el-button>
                    <el-button link size="small" type="success" @click="downloadFile(f)">下载</el-button>
                    <el-button link size="small" type="danger" @click="deleteFileRow(row, f)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div v-else class="text-center py-12px text-gray-400 text-12px">暂无文件，请上传</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column align="center" label="编号" prop="id" width="80" />
        <el-table-column align="center" label="方法编号" prop="methodNo" show-overflow-tooltip />
        <el-table-column align="center" label="版本号" prop="methodVersion" show-overflow-tooltip />
        <el-table-column align="center" label="方法名称" prop="methodName" show-overflow-tooltip min-width="130" />
        <el-table-column align="center" label="测试物" prop="testArticle" show-overflow-tooltip />
        <el-table-column align="center" label="基质类型" prop="matrixType" show-overflow-tooltip />
        <el-table-column align="center" label="SD" prop="sd" show-overflow-tooltip width="80" />
        <el-table-column :formatter="dateFormatter2" align="center" label="签字生效日期" prop="effectiveDate" width="120" />
        <el-table-column :formatter="dateFormatter" align="center" label="创建时间" prop="createTime" width="170" />
        <el-table-column align="center" label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button v-hasPermi="['amf:business:update']" link type="primary" @click="openForm('update', scope.row.id)">修改</el-button>
            <el-button link type="success" @click="toggleRowExpand(scope.row)">文件列表</el-button>
            <el-button v-hasPermi="['amf:business:delete']" link type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pagination v-model:limit="queryParams.pageSize" v-model:page="queryParams.pageNo" :total="total" @pagination="getList" />
    </ContentWrap>

    <AmfBusinessForm ref="formRef" @success="getList" />

    <el-dialog v-model="uploadVisible" :title="uploadTargetFile ? '上传新版本' : '上传文件'" width="450px" :close-on-click-modal="false">
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="选择文件" required>
          <el-upload ref="uploadElRef" :auto-upload="false" :limit="1" :on-change="onUploadFileChange" :on-exceed="() => message.error('只能选择一个文件')" drag accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.odt,.ods,.odp,.csv,.rtf">
            <Icon icon="ep:upload-filled" class="text-32px text-gray-400" />
            <div class="mt-6px text-gray-500 text-13px">拖拽或点击选取（最大50MB）</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="变更说明">
          <el-input v-model="uploadForm.desc" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="uploadLoading" type="primary" @click="doUploadFile">确定上传</el-button>
        <el-button @click="uploadVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { dateFormatter, dateFormatter2 } from '@/utils/formatTime'
import * as AmfApi from '@/api/amf/index'
import AmfBusinessForm from './AmfBusinessForm.vue'
import { useRouter } from 'vue-router'
import type { UploadRawFile, UploadProps } from 'element-plus'

defineOptions({ name: 'AmfBusiness' })

const message = useMessage()
const { t } = useI18n()
const router = useRouter()

const loading = ref(true)
const total = ref(0)
const list = ref<(AmfApi.AmfBusinessVO & { _fileLoading?: boolean; _files?: (AmfApi.AmfFileVO & { _verLoading?: boolean; _versions?: AmfApi.AmfFileVersionVO[] })[] })[]>([])

const queryParams = reactive({ pageNo: 1, pageSize: 10, methodNo: '', methodVersion: '', methodName: '', testArticle: '', matrixType: '', sd: '', effectiveDate: '' })
const queryFormRef = ref()
const tableRef = ref()

// ---- upload ----
const uploadVisible = ref(false)
const uploadLoading = ref(false)
const uploadTargetBusiness = ref<AmfApi.AmfBusinessVO | null>(null)
const uploadTargetFile = ref<AmfApi.AmfFileVO | null>(null)
const uploadElRef = ref()
const uploadForm = reactive({ desc: '', file: undefined as File | undefined })

const getList = async () => {
  loading.value = true
  try {
    const data = await AmfApi.getBusinessPage(queryParams)
    list.value = data.list.map(b => ({ ...b, _fileLoading: false, _files: [] }))
    total.value = data.total
  } finally { loading.value = false }
}

const handleQuery = () => getList()
const resetQuery = () => { queryFormRef.value.resetFields(); handleQuery() }

const toggleRowExpand = (row: any) => tableRef.value?.toggleRowExpansion(row)
const collapseAll = () => list.value.forEach(row => tableRef.value?.toggleRowExpansion(row, false))

const onExpand = async (row: any, expandedRows: any[]) => {
  if (expandedRows.includes(row) && (!row._files || row._files.length === 0)) {
    row._fileLoading = true
    try { row._files = (await AmfApi.getFileList(row.id!)).map((f: any) => ({ ...f, _verLoading: false, _versions: [] })) }
    finally { row._fileLoading = false }
  }
}

const onFileExpand = async (fileRow: any, expandedRows: any[]) => {
  if (expandedRows.includes(fileRow) && (!fileRow._versions || fileRow._versions.length === 0)) {
    fileRow._verLoading = true
    try { fileRow._versions = await AmfApi.getFileVersionList(fileRow.id) }
    finally { fileRow._verLoading = false }
  }
}

const openUpload = (row: AmfApi.AmfBusinessVO) => {
  uploadTargetBusiness.value = row; uploadTargetFile.value = null
  uploadForm.desc = ''; uploadForm.file = undefined
  uploadElRef.value?.clearFiles(); uploadVisible.value = true
}

const uploadNewFileVersion = (biz: AmfApi.AmfBusinessVO, file: AmfApi.AmfFileVO) => {
  uploadTargetBusiness.value = biz; uploadTargetFile.value = file
  uploadForm.desc = ''; uploadForm.file = undefined
  uploadElRef.value?.clearFiles(); uploadVisible.value = true
}

const onUploadFileChange: UploadProps['onChange'] = (f) => {
  const file = f.raw as UploadRawFile
  if (file.size > 50 * 1024 * 1024) { message.error('文件超过50MB'); uploadElRef.value?.clearFiles(); return }
  uploadForm.file = file
}

const doUploadFile = async () => {
  if (!uploadForm.file) { message.warning('请选择文件'); return }
  if (!uploadTargetBusiness.value) return
  uploadLoading.value = true
  try {
    await AmfApi.uploadFile(uploadTargetBusiness.value.id!, uploadForm.file, uploadForm.desc, uploadTargetFile.value?.id)
    message.success('上传成功'); uploadVisible.value = false
    const biz = list.value.find(b => b.id === uploadTargetBusiness.value!.id)
    if (biz) {
      biz._fileLoading = true
      try { biz._files = (await AmfApi.getFileList(biz.id!)).map((f: any) => ({ ...f, _verLoading: false, _versions: [] })) }
      finally { biz._fileLoading = false }
    }
  } finally { uploadLoading.value = false }
}

const previewFile = async (_: AmfApi.AmfBusinessVO, f: any) => {
  const versions = await AmfApi.getFileVersionList(f.id!)
  if (!versions.length) { message.warning('暂无版本'); return }
  router.push({ path: '/amf/editor', query: { versionId: versions[0].id, businessId: _.id } })
}

const previewVersion = (v: AmfApi.AmfFileVersionVO) => {
  router.push({ path: '/amf/editor', query: { versionId: v.id, businessId: v.businessId } })
}

const downloadFile = async (f: AmfApi.AmfFileVO) => {
  const versions = await AmfApi.getFileVersionList(f.id!)
  if (!versions.length) { message.warning('暂无版本'); return }
  doDownload(versions[0].id!, versions[0].fileName)
}

const downloadVersion = (v: AmfApi.AmfFileVersionVO) => {
  doDownload(v.id!, v.fileName)
}

const doDownload = async (versionId: number, fileName: string) => {
  try {
    const resp = await fetch(`/admin-api/amf/onlyoffice/download?versionId=${versionId}`)
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    message.success('下载成功')
  } catch {
    message.error('下载失败')
  }
}

const deleteFileRow = async (biz: any, f: AmfApi.AmfFileVO) => {
  try { await message.delConfirm(); await AmfApi.deleteFile(f.id!); message.success('已删除'); biz._files = biz._files.filter((x: any) => x.id !== f.id) } catch {}
}

const deleteVersion = async (biz: any, _files: any[], f: any, v: AmfApi.AmfFileVersionVO) => {
  try {
    await message.delConfirm(); await AmfApi.deleteFileVersion(v.id!); message.success('已删除')
    f._versions = f._versions.filter((x: any) => x.id !== v.id)
    if (f._versions.length === 0) biz._files = biz._files.filter((x: any) => x.id !== f.id)
  } catch {}
}

const formatSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024) return size + 'B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + 'KB'
  return (size / (1024 * 1024)).toFixed(1) + 'MB'
}

const formRef = ref()
const openForm = (type: string, id?: number) => formRef.value.open(type, id)

const handleDelete = async (id: number) => {
  try { await message.delConfirm(); await AmfApi.deleteBusiness(id); message.success(t('common.delSuccess')); await getList() } catch {}
}

onMounted(() => getList())
</script>

<style lang="scss" scoped>
.amf-business-container {
  :deep(.el-table) {
    .el-button + .el-button { margin-left: 0; }
  }
  .file-expand {
    border-radius: 4px;
    :deep(.el-table) {
      .el-table__expanded-cell { padding: 4px 8px 4px 24px !important; }
    }
    :deep(.ver-table) {
      --el-table-bg-color: transparent;
      --el-table-tr-bg-color: transparent;
      --el-table-header-bg-color: transparent;
      .el-table__cell { background: transparent !important; }
      .el-table__body-wrapper .el-table__row:hover > td { background: rgba(64,158,255,0.1) !important; }
    }
  }
}
</style>
