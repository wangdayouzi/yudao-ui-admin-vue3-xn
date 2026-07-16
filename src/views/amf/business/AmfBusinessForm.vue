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
      <el-form-item label="版本号">
        <el-input v-model="formData.methodVersion" placeholder="请输入版本号" />
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
      <el-form-item label="签字生效日期">
        <el-date-picker
          v-model="formData.effectiveDate"
          type="date"
          placeholder="请选择签字生效日期"
          value-format="YYYY-MM-DD"
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
import UserSelectV2 from '@/views/system/user/components/UserSelectV2.vue'
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
  methodNo: '',
  methodVersion: '',
  methodName: '',
  testArticle: '',
  matrixType: '',
  sd: '',
  effectiveDate: '',
  changeDescription: ''
})

const formRules = reactive({
  methodNo: [{ required: true, message: '方法编号不能为空', trigger: 'blur' }]
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
      formData.value = { id: data.id, methodNo: data.methodNo, methodVersion: data.methodVersion || '', methodName: data.methodName || '', testArticle: data.testArticle || '', matrixType: data.matrixType || '', sd: data.sd || '', effectiveDate: data.effectiveDate || '', changeDescription: '' }
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
      await AmfApi.updateBusiness({ id: formData.value.id, methodNo: formData.value.methodNo, methodVersion: formData.value.methodVersion, methodName: formData.value.methodName, testArticle: formData.value.testArticle, matrixType: formData.value.matrixType, sd: formData.value.sd, effectiveDate: formData.value.effectiveDate, status: CommonStatusEnum.ENABLE } as any)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally { formLoading.value = false }
}

const resetForm = () => {
  formData.value = { id: undefined, methodNo: '', methodVersion: '', methodName: '', testArticle: '', matrixType: '', sd: '', effectiveDate: '', changeDescription: '' }
  selectedFile.value = undefined
  uploadRef.value?.clearFiles()
}
</script>
