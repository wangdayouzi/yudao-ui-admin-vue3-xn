<template>
  <Dialog v-model="dialogVisible" title="上传文件（新版本）">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <el-form-item label="业务编号">
        <el-tag>{{ currentBusiness?.basNo || '-' }}</el-tag>
      </el-form-item>
      <el-form-item label="当前版本">
        <el-tag v-if="currentBusiness?.fileVersion" type="success">
          v{{ currentBusiness?.fileVersion }}
        </el-tag>
        <el-tag v-else type="info">尚无版本</el-tag>
      </el-form-item>
      <el-form-item label="选择文件" prop="file">
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
          <div class="mt-10px text-gray-500">
            将文件拖到此处，或<em>点击选取</em>
          </div>
          <template #tip>
            <div class="text-12px text-gray-400 mt-6px">
              支持 doc/docx/xls/xlsx/ppt/pptx/pdf/txt 等格式，最大 50MB
            </div>
          </template>
        </el-upload>
      </el-form-item>
      <el-form-item label="变更说明" prop="changeDescription">
        <el-input
          v-model="formData.changeDescription"
          type="textarea"
          :rows="3"
          placeholder="请简要描述本次变更内容"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitUpload">确 定 上 传</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import * as AmfApi from '@/api/amf/index'
import type { UploadInstance, UploadProps, UploadRawFile } from 'element-plus'

defineOptions({ name: 'AmfFileUploadDialog' })

const message = useMessage()

const dialogVisible = ref(false)
const formLoading = ref(false)
const currentBusiness = ref<AmfApi.AmfBusinessVO | null>(null)
const uploadRef = ref<UploadInstance>()

const formData = reactive({
  businessId: 0,
  file: undefined as File | undefined,
  changeDescription: ''
})

const formRules = reactive({
  file: [{ required: true, message: '请选择文件', trigger: 'change' }]
})

const formRef = ref()

// 文件校验
const handleFileChange: UploadProps['onChange'] = (uploadFile) => {
  const file = uploadFile.raw as UploadRawFile
  const maxSize = 50 * 1024 * 1024 // 50MB

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
  formData.file = file
}

const handleFileRemove = () => {
  formData.file = undefined
}

const handleExceed: UploadProps['onExceed'] = () => {
  message.error('只能上传一个文件')
}

/** 打开弹窗 */
const open = (row: AmfApi.AmfBusinessVO) => {
  dialogVisible.value = true
  currentBusiness.value = row
  formData.businessId = row.id!
  formData.file = undefined
  formData.changeDescription = ''
  uploadRef.value?.clearFiles()
}
defineExpose({ open })

/** 提交上传 */
const emit = defineEmits(['success'])
const submitUpload = async () => {
  if (!formData.file) {
    message.warning('请先选择文件')
    return
  }

  formLoading.value = true
  try {
    await AmfApi.uploadFile(formData.businessId, formData.file, formData.changeDescription)
    message.success('文件上传成功，新版本为 v' + ((currentBusiness.value?.fileVersion || 0) + 1))
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
