<template>
  <Dialog v-model="visible" title="知识库自定义属性" width="760px">
    <el-table :data="fields" class="mb-16px">
      <el-table-column prop="fieldName" label="名称" />
      <el-table-column prop="fieldCode" label="编码" />
      <el-table-column prop="fieldType" label="类型" />
      <el-table-column label="必填" width="70"><template #default="{ row }">{{ row.required ? '是' : '否' }}</template></el-table-column>
      <el-table-column label="启用" width="70"><template #default="{ row }">{{ row.enabled ? '是' : '否' }}</template></el-table-column>
      <el-table-column label="操作" width="80"><template #default="{ row }"><el-button link type="primary" @click="edit(row)">编辑</el-button></template></el-table-column>
    </el-table>
    <el-button @click="edit()">新增属性</el-button>
    <el-dialog v-model="editing" title="属性配置" width="520px" append-to-body>
      <el-form :model="form" label-width="90px">
        <el-form-item label="编码"><el-input v-model="form.fieldCode" :disabled="Boolean(form.id)" placeholder="例如 source_no" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="form.fieldName" /></el-form-item>
        <el-form-item label="类型"><el-select v-model="form.fieldType" :disabled="Boolean(form.id)" class="w-full">
          <el-option v-for="type in types" :key="type.value" :label="type.label" :value="type.value" />
        </el-select></el-form-item>
        <el-form-item v-if="['select', 'multiselect'].includes(form.fieldType)" label="选项"><el-input v-model="optionText" type="textarea" :rows="3" placeholder="每行一个选项" /></el-form-item>
        <el-form-item label="必填"><el-switch v-model="form.required" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="editing = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </Dialog>
</template>
<script setup lang="ts">
import { getKnowledgeAttributes, saveKnowledgeAttribute, type KnowledgeAttributeVO } from '@/api/pms/kb/attribute'
const message = useMessage()
const visible = ref(false)
const editing = ref(false)
const libraryId = ref(0)
const fields = ref<KnowledgeAttributeVO[]>([])
const form = ref<KnowledgeAttributeVO>({ libraryId: 0, fieldCode: '', fieldName: '', fieldType: 'text', required: false, enabled: true, sort: 0 })
const optionText = ref('')
const types = [
  { value: 'text', label: '单行文本' }, { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' }, { value: 'date', label: '日期' },
  { value: 'select', label: '单选' }, { value: 'multiselect', label: '多选' },
  { value: 'user', label: '用户 ID' }
]
async function open(id: number) { libraryId.value = id; visible.value = true; await reload() }
async function reload() { fields.value = await getKnowledgeAttributes(libraryId.value) }
function edit(row?: KnowledgeAttributeVO) {
  form.value = row ? { ...row } : { libraryId: libraryId.value, fieldCode: '', fieldName: '', fieldType: 'text', required: false, enabled: true, sort: fields.value.length }
  try { optionText.value = JSON.parse(form.value.optionsJson || '[]').join('\n') } catch { optionText.value = '' }
  editing.value = true
}
async function save() {
  if (['select', 'multiselect'].includes(form.value.fieldType)) {
    form.value.optionsJson = JSON.stringify(optionText.value.split('\n').map(x => x.trim()).filter(Boolean))
  }
  await saveKnowledgeAttribute(form.value)
  message.success('属性已保存')
  editing.value = false
  await reload()
}
defineExpose({ open })
</script>
