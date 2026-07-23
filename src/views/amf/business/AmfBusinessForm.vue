<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="120px"
    >
      <el-form-item label="方法编号" prop="methodNo">
        <el-input v-model="formData.methodNo" placeholder="请输入方法编号" />
      </el-form-item>
      <el-form-item label="方法名称">
        <el-input v-model="formData.methodName" placeholder="请输入方法名称" />
      </el-form-item>
      <el-form-item label="测试物">
        <el-input v-model="formData.testArticle" placeholder="请输入测试物" />
      </el-form-item>
      <el-form-item label="基质类型">
        <el-input v-model="formData.matrixType" placeholder="请输入基质类型" />
      </el-form-item>
      <el-form-item label="SD">
        <UserSelectV2 v-model="formData.sd" placeholder="请选择SD" />
      </el-form-item>
      <el-form-item v-if="formType === 'update'" label="签字生效日期">
        <el-date-picker
          v-model="formData.effectiveDate"
          type="date"
          placeholder="请选择签字生效日期"
          value-format="YYYY-MM-DD"
          :editable="false"
          :shortcuts="dateShortcuts"
        />
      </el-form-item>
      <!-- 新增时可上传文件 -->
      <el-form-item v-if="formType === 'create'" label="上传文件">
        <div class="w-full">
          <el-table :data="fileEntries" size="small" border>
            <el-table-column min-width="200">
              <template #header><span class="required-label">选择文件</span></template>
              <template #default="{ row, $index }">
                <el-upload
                  :ref="el => setUploadRef(el, $index)"
                  :auto-upload="false"
                  :limit="1"
                  :on-change="(f: any) => handleFileEntryChange(f, $index)"
                  :on-exceed="() => message.error('只能选一个')"
                  :show-file-list="false"
                  accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.odt,.ods,.odp,.csv,.rtf"
                  class="!w-full"
                >
                  <el-button size="small" class="file-name-btn">{{ row.file ? row.file.name : '点击选取文件' }}</el-button>
                </el-upload>
              </template>
            </el-table-column>
            <el-table-column width="140">
              <template #header><span class="required-label">版本号</span></template>
              <template #default="{ row }">
                <el-input v-model="row.versionNo" size="small" placeholder="如 V1.0" />
              </template>
            </el-table-column>
            <el-table-column width="170">
              <template #header><span class="required-label">签字生效日期</span></template>
              <template #default="{ row }">
                <el-date-picker
                  v-model="row.effectiveDate"
                  type="date"
                  placeholder="请选择"
                  value-format="YYYY-MM-DD"
                  size="small"
                  class="!w-full"
                  :editable="false"
                  :shortcuts="dateShortcuts"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60" align="center">
              <template #default="{ $index }">
                <el-button v-if="fileEntries.length > 1" link size="small" type="danger" @click="fileEntries.splice($index, 1)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button class="mt-8px" size="small" type="primary" plain @click="fileEntries.push({ file: undefined, versionNo: '', effectiveDate: '' })">+ 添加文件</el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import * as AmfApi from '@/api/amf/index'
import UserSelectV2 from '@/views/system/user/components/UserSelectV2.vue'
import type { UploadRawFile } from 'element-plus'
import { CommonStatusEnum } from '@/utils/constants'
import { dateShortcuts } from '@/utils/formatTime'

defineOptions({ name: 'AmfBusinessForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const uploadRefs = ref<any[]>([])
const setUploadRef = (el: any, index: number) => { if (el) uploadRefs.value[index] = el }

interface FileEntry {
  file?: File
  versionNo: string
  effectiveDate: string
}
const fileEntries = ref<FileEntry[]>([{ file: undefined, versionNo: '', effectiveDate: '' }])

const formData = ref({
  id: undefined as number | undefined,
  methodNo: '',
  methodVersion: '',
  methodName: '',
  testArticle: '',
  matrixType: '',
  sd: undefined,
  effectiveDate: '',
  changeDescription: ''
})

const formRules = reactive({
  methodNo: [{ required: true, message: '方法编号不能为空', trigger: 'blur' }]
})

const formRef = ref()

const handleFileEntryChange = (uploadFile: any, index: number) => {
  const file = uploadFile.raw as UploadRawFile
  const maxSize = 50 * 1024 * 1024
  const allowedExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt', 'odt', 'ods', 'odp', 'csv', 'rtf']
  const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase()
  if (!allowedExts.includes(ext)) { message.error(`不支持的文件格式: .${ext}`); return }
  if (file.size > maxSize) { message.error('文件大小不能超过 50MB'); return }
  fileEntries.value[index].file = file
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  if (id) {
    formLoading.value = true
    try {
      const data = await AmfApi.getBusiness(id)
      formData.value = { id: data.id, methodNo: data.methodNo, methodVersion: data.methodVersion || '', methodName: data.methodName || '', testArticle: data.testArticle || '', matrixType: data.matrixType || '', sd: data.sd || undefined, effectiveDate: data.effectiveDate || '', changeDescription: '' }
    } finally { formLoading.value = false }
  }
}
defineExpose({ open })

const emit = defineEmits(['success'])
const submitForm = async () => {
  if (!formRef) return
  const valid = await formRef.value.validate()
  if (!valid) return
  formLoading.value = true
  try {
    if (formType.value === 'create') {
      const businessId = await AmfApi.createBusiness({ ...formData.value, status: CommonStatusEnum.ENABLE } as any)
      // 上传所有文件
      const entries = fileEntries.value.filter(e => e.file)
      for (const entry of entries) {
        if (!entry.versionNo || !entry.versionNo.trim()) { message.warning('请输入版本号'); formLoading.value = false; return }
        await AmfApi.uploadFile(businessId, entry.file!, undefined, undefined, entry.versionNo, entry.effectiveDate)
      }
      message.success(t('common.createSuccess'))
    } else {
      await AmfApi.updateBusiness({ id: formData.value.id, methodNo: formData.value.methodNo, methodVersion: formData.value.methodVersion, methodName: formData.value.methodName, testArticle: formData.value.testArticle, matrixType: formData.value.matrixType, sd: formData.value.sd, effectiveDate: formData.value.effectiveDate, status: CommonStatusEnum.ENABLE } as any)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally { formLoading.value = false }
}

const resetForm = () => {
  formData.value = { id: undefined, methodNo: '', methodVersion: '', methodName: '', testArticle: '', matrixType: '', sd: undefined, effectiveDate: '', changeDescription: '' }
  // 清除 el-upload 内部文件状态，防止下次打开时误触 :limit 限制
  uploadRefs.value.forEach(ref => ref?.clearFiles())
  fileEntries.value = [{ file: undefined, versionNo: '', effectiveDate: '' }]
  uploadRefs.value = []
}
</script>

<style lang="scss" scoped>
.file-name-btn {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.required-label::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}
</style>
