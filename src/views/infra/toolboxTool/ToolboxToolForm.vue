<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="90px"
    >
      <el-form-item label="工具名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入工具名称" />
      </el-form-item>
      <el-form-item label="分类" prop="category">
        <el-select v-model="formData.category" placeholder="请选择分类" clearable class="!w-100%">
          <el-option
            v-for="dict in getDictOptions(DICT_TYPE.INFRA_TOOLBOX_TOOL_CATEGORY)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="工具说明" prop="description">
        <el-input
          v-model="formData.description"
          placeholder="请输入工具说明"
          type="textarea"
          :rows="2"
        />
      </el-form-item>
      <el-form-item label="版本号" prop="version">
        <el-input v-model="formData.version" placeholder="请输入版本号，如 v1.0.0" />
      </el-form-item>
      <el-form-item label="图标" prop="icon">
        <el-input v-model="formData.icon" placeholder="请输入图标，如 ep:box / fa:tools，或图片 URL" />
      </el-form-item>
      <el-form-item label="平台" prop="platform">
        <el-input v-model="formData.platform" placeholder="请输入支持平台，如 Windows" />
      </el-form-item>
      <el-form-item label="安装包" prop="fileUrl">
        <UploadFile
          v-model="formData.fileUrl"
          :file-type="['exe', 'zip', 'rar', '7z', 'msi', 'tar', 'gz']"
          :file-size="100"
          :limit="1"
          :is-show-tip="false"
        />
      </el-form-item>
      <el-form-item label="大小(MB)" prop="fileSize">
        <el-input-number v-model="formData.fileSize" :min="0" :precision="0" placeholder="可选" />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="formData.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio :value="0">开启</el-radio>
          <el-radio :value="1">关闭</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as ToolboxToolApi from '@/api/infra/toolboxTool'
import { DICT_TYPE, getDictOptions } from '@/utils/dict'

defineOptions({ name: 'InfraToolboxToolForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  name: '',
  category: '',
  icon: '',
  description: '',
  version: '',
  fileUrl: '',
  fileSize: undefined,
  platform: '',
  sort: 0,
  status: 0
})
const formRules = reactive({
  name: [{ required: true, message: '工具名称不能为空', trigger: 'blur' }],
  fileUrl: [{ required: true, message: '安装包不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await ToolboxToolApi.getToolboxTool(id)
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  if (!formRef) return
  const valid = await formRef.value.validate()
  if (!valid) return
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as ToolboxToolApi.ToolboxToolVO
    if (formType.value === 'create') {
      await ToolboxToolApi.createToolboxTool(data)
      message.success(t('common.createSuccess'))
    } else {
      await ToolboxToolApi.updateToolboxTool(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: undefined,
    name: '',
    category: '',
    icon: '',
    description: '',
    version: '',
    fileUrl: '',
    fileSize: undefined,
    platform: '',
    sort: 0,
    status: 0
  }
  formRef.value?.resetFields()
}
</script>
