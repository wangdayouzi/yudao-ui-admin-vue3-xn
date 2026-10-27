<template>
  <Dialog v-model="visible" title="文档编号规则" width="760px">
    <div v-loading="loading">
      <p class="mt-0 text-13px text-[var(--el-text-color-secondary)]">
        文档保存时自动按当前位置的规则取号。一级目录可覆盖知识库默认规则，子目录继承一级目录；已有编号不会变化。
      </p>
      <el-form label-width="115px" class="mb-16px">
        <el-form-item label="知识库默认规则">
          <el-select v-model="libraryRuleId" class="w-full" clearable placeholder="请选择规则" @clear="libraryRuleId = undefined">
            <el-option v-for="rule in rules" :key="rule.id" :label="ruleLabel(rule)" :value="rule.id!" />
          </el-select>
        </el-form-item>
        <div class="flex justify-end"><el-button type="primary" :loading="savingLibrary" @click="saveLibraryRule">保存默认规则</el-button></div>
      </el-form>
      <div class="mb-8px font-600">一级目录覆盖</div>
      <el-table :data="folders" empty-text="暂无一级目录">
        <el-table-column prop="title" label="一级目录" min-width="180" />
        <el-table-column label="编号规则" min-width="260">
          <template #default="{ row }">
            <el-select v-model="row.numberRuleId" class="w-full" clearable placeholder="继承知识库默认规则" @clear="row.numberRuleId = undefined">
              <el-option v-for="rule in rules" :key="rule.id" :label="ruleLabel(rule)" :value="rule.id!" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }"><el-button link type="primary" :loading="savingFolderId === row.id" @click="saveFolderRule(row)">保存</el-button></template>
        </el-table-column>
      </el-table>
      <p class="mb-0 text-12px text-[var(--el-text-color-secondary)]">规则格式在“基础设施 → 流水号规则”维护。未配置生效规则的位置不能新建文档。</p>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import * as KnowledgeLibraryApi from '@/api/pms/kb/library'
import * as KnowledgeFolderApi from '@/api/pms/kb/content/folder'
import { getEnabledNumberRules, type NumberRuleVO } from '@/api/infra/number-rule'

const message = useMessage()
const visible = ref(false)
const loading = ref(false)
const savingLibrary = ref(false)
const savingFolderId = ref<number>()
const library = ref<KnowledgeLibraryApi.PmsKnowledgeLibraryVO>()
const libraryRuleId = ref<number>()
const folders = ref<KnowledgeFolderApi.PmsKnowledgeFolderVO[]>([])
const rules = ref<NumberRuleVO[]>([])
const emit = defineEmits<{ (event: 'saved'): void }>()
function ruleLabel(rule: NumberRuleVO) { return `${rule.name}（${rule.prefix || ''}${rule.yearlyReset ? '年份' : ''} + ${rule.digits} 位流水）` }
async function open(libraryId: number) {
  visible.value = true
  loading.value = true
  try {
    const [libraryData, tree, enabledRules] = await Promise.all([
      KnowledgeLibraryApi.getKnowledgeLibrary(libraryId),
      KnowledgeFolderApi.getKnowledgeTree(libraryId),
      getEnabledNumberRules()
    ])
    library.value = libraryData
    libraryRuleId.value = libraryData.numberRuleId
    rules.value = enabledRules
    folders.value = await Promise.all(tree.folders.map(folder => KnowledgeFolderApi.getKnowledgeFolder(folder.id)))
  } finally { loading.value = false }
}
async function saveLibraryRule() {
  if (!library.value) return
  savingLibrary.value = true
  try {
    await KnowledgeLibraryApi.updateKnowledgeLibrary({ ...library.value, numberRuleId: libraryRuleId.value })
    library.value.numberRuleId = libraryRuleId.value
    message.success('知识库默认编号规则已保存')
    emit('saved')
  } finally { savingLibrary.value = false }
}
async function saveFolderRule(folder: KnowledgeFolderApi.PmsKnowledgeFolderVO) {
  savingFolderId.value = folder.id
  try {
    await KnowledgeFolderApi.updateKnowledgeFolder(folder)
    message.success('一级目录编号规则已保存')
    emit('saved')
  } finally { savingFolderId.value = undefined }
}
defineExpose({ open })
</script>
