<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="120px"
    >
      <el-form-item label="BAS编号" prop="basNo">
        <el-input v-model="formData.basNo" placeholder="请输入BAS编号" />
      </el-form-item>
      <el-form-item label="临床方案编号">
        <el-input v-model="formData.protocolNo" placeholder="请输入临床方案编号" />
      </el-form-item>
      <el-form-item label="申办方">
        <el-input v-model="formData.sponsor" placeholder="请输入申办方" />
      </el-form-item>
      <el-form-item label="分析方法">
        <el-input
          v-model="formData.analysisMethod"
          type="textarea"
          :rows="3"
          placeholder="请输入分析方法"
        />
      </el-form-item>
      <!-- 新增时可上传文件 -->
      <el-form-item v-if="formType === 'create'" label="上传文件">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :on-exceed="handleExceed"
          drag
          accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.odt,.ods,.odp,.csv,.rtf"
        >
          <Icon icon="ep:upload-filled" class="text-40px text-gray-400" />
          <div class="mt-10px text-gray-500">将文件拖到此处，或<em>点击选取</em></div>
          <template #tip>
            <div class="text-12px text-gray-400 mt-6px">
              支持 doc/docx/xls/xlsx/ppt/pptx/pdf/txt 等格式，最大 50MB
            </div>
          </template>
        </el-upload>
      </el-form-item>
      <el-form-item v-if="formType === 'create'" label="变更说明">
        <el-input
          v-model="formData.changeDescription"
          type="textarea"
          :rows="2"
          placeholder="请简要描述本次上传内容"
        />
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
import type { UploadInstance, UploadProps, UploadRawFile } from 'element-plus'
import { CommonStatusEnum } from '@/utils/constants'

defineOptions({ name: 'AmfBusinessForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const uploadRef = ref<UploadInstance>()
const selectedFile = ref<File>()

const formData = ref({
  id: undefined as number | undefined,
  basNo: '',
  protocolNo: '',
  sponsor: '',
  analysisMethod: '',
  changeDescription: ''
})

const formRules = reactive({
  basNo: [{ required: true, message: 'BAS编号不能为空', trigger: 'blur' }]
})

const formRef = ref()

const handleFileChange: UploadProps['onChange'] = (uploadFile) => {
  const file = uploadFile.raw as UploadRawFile
  const maxSize = 50 * 1024 * 1024
  const allowedExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt', 'odt', 'ods', 'odp', 'csv', 'rtf']
  const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase()
  if (!allowedExts.includes(ext)) {
    message.error(`不支持的文件格式: .${ext}`)
    uploadRef.value?.clearFiles()
    return
  }
  if (file.size > maxSize) {
    message.error('文件大小不能超过 50MB')
    uploadRef.value?.clearFiles()
    return
  }
  selectedFile.value = file
}

const handleFileRemove = () => { selectedFile.value = undefined }
const handleExceed: UploadProps['onExceed'] = () => { message.error('只能上传一个文件') }

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  if (id) {
    formLoading.value = true
    try {
      const data = await AmfApi.getBusiness(id)
      formData.value = { id: data.id, basNo: data.basNo, protocolNo: data.protocolNo || '', sponsor: data.sponsor || '', analysisMethod: data.analysisMethod || '', changeDescription: '' }
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
      if (selectedFile.value) {
        await AmfApi.uploadFile(businessId, selectedFile.value, formData.value.changeDescription)
      }
      message.success(t('common.createSuccess'))
    } else {
      await AmfApi.updateBusiness({ id: formData.value.id, basNo: formData.value.basNo, protocolNo: formData.value.protocolNo, sponsor: formData.value.sponsor, analysisMethod: formData.value.analysisMethod, status: CommonStatusEnum.ENABLE } as any)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally { formLoading.value = false }
}

const resetForm = () => {
  formData.value = { id: undefined, basNo: '', protocolNo: '', sponsor: '', analysisMethod: '', changeDescription: '' }
  selectedFile.value = undefined
  uploadRef.value?.clearFiles()
}
</script>
