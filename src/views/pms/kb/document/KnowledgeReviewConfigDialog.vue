<template>
  <Dialog v-model="visible" title="周期审阅规则" width="860px">
    <div>
        <el-table :data="rules" class="mb-12px">
          <el-table-column label="适用范围"><template #default="{ row }">{{ scopeName(row.folderId) }}</template></el-table-column>
          <el-table-column prop="intervalMonths" label="周期（月）" width="110" />
          <el-table-column prop="remindDays" label="提前提醒（天）" width="140" />
          <el-table-column label="启用" width="70"><template #default="{ row }">{{ row.enabled ? '是' : '否' }}</template></el-table-column>
          <el-table-column label="操作" width="80"><template #default="{ row }"><el-button link type="primary" @click="edit(row)">编辑</el-button></template></el-table-column>
        </el-table>
        <el-button @click="edit()">添加规则</el-button>
        <p class="text-12px text-[var(--el-text-color-secondary)]">一级文件夹规则覆盖知识库默认规则；停用文件夹规则可暂停该范围的周期审阅。</p>
    </div>
    <el-dialog v-model="editing" title="审阅规则" width="500px" append-to-body>
      <el-form :model="form" label-width="120px">
        <el-form-item label="适用范围"><el-select v-model="form.folderId" :disabled="Boolean(form.id)" class="w-full">
          <el-option label="知识库默认" :value="0" />
          <el-option v-for="folder in rootFolders" :key="folder.entityId" :label="folder.label" :value="folder.entityId" />
        </el-select></el-form-item>
        <el-form-item label="审阅周期（月）"><el-input-number v-model="form.intervalMonths" :min="1" :max="120" /></el-form-item>
        <el-form-item label="提前提醒（天）"><el-input-number v-model="form.remindDays" :min="0" :max="365" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="editing = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </Dialog>
</template>
<script setup lang="ts">
import { getReviewRules, saveReviewRule, type KnowledgeReviewRuleVO } from '@/api/pms/kb/review'
import type { KnowledgeTreeNode } from './types'
const props = defineProps<{ rootFolders: KnowledgeTreeNode[] }>()
const message = useMessage()
const visible = ref(false)
const editing = ref(false)
const libraryId = ref(0)
const rules = ref<KnowledgeReviewRuleVO[]>([])
const form = ref<KnowledgeReviewRuleVO>({ libraryId: 0, folderId: 0, intervalMonths: 12, remindDays: 30, enabled: true })
function scopeName(folderId: number) { return folderId === 0 ? '知识库默认' : props.rootFolders.find(x => x.entityId === folderId)?.label || `文件夹 ${folderId}` }
async function open(id: number) { libraryId.value = id; visible.value = true; await reload() }
async function reload() { rules.value = await getReviewRules(libraryId.value) }
function edit(row?: KnowledgeReviewRuleVO) {
  form.value = row ? { ...row } : { libraryId: libraryId.value, folderId: 0, intervalMonths: 12, remindDays: 30, enabled: true }
  editing.value = true
}
async function save() {
  await saveReviewRule(form.value)
  message.success('审阅规则已保存')
  editing.value = false
  await reload()
}
defineExpose({ open })
</script>
