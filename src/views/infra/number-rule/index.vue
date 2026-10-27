<template>
  <ContentWrap>
    <div class="mb-16px flex items-center justify-between">
      <div>
        <div class="text-18px font-600">流水号规则</div>
        <div class="mt-4px text-12px text-[var(--el-text-color-secondary)]">
          在这里定义通用编号格式；到知识库的“文档编号规则”中选择应用范围。新文档保存时自动取号。
        </div>
      </div>
      <el-button type="primary" v-hasPermi="['infra:number-rule:update']" @click="open()">新增规则</el-button>
    </div>
    <el-table v-loading="loading" :data="rules">
      <el-table-column prop="code" label="规则编码" min-width="140" />
      <el-table-column prop="name" label="规则名称" min-width="150" />
      <el-table-column label="格式预览" min-width="180">
        <template #default="{ row }">{{ preview(row) }}</template>
      </el-table-column>
      <el-table-column prop="lastNo" label="已发流水" width="110" />
      <el-table-column label="状态" width="95">
        <template #default="{ row }">{{ row.status === 0 ? '启用' : '停用' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="primary" v-hasPermi="['infra:number-rule:update']" @click="open(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
  <Dialog v-model="visible" :title="form.id ? '编辑规则' : '新增规则'" width="560px">
    <el-form :model="form" label-width="105px">
      <el-form-item label="规则编码" required>
        <el-input v-model="form.code" :disabled="!!form.id && !!form.lastNo" placeholder="如 EXTERNAL_DOC" />
      </el-form-item>
      <el-form-item label="规则名称" required><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="固定前缀"><el-input v-model="form.prefix" :disabled="!!form.id && !!form.lastNo" placeholder="如 Q200-" /></el-form-item>
      <el-form-item label="流水号位数" required>
        <el-input-number v-model="form.digits" :min="1" :max="16" :disabled="!!form.id && !!form.lastNo" />
      </el-form-item>
      <el-form-item label="起始值" required>
        <el-input-number v-model="form.startNo" :min="1" :disabled="!!form.id && !!form.lastNo" />
      </el-form-item>
      <el-form-item label="每年重置">
        <el-switch v-model="form.yearlyReset" :disabled="!!form.id && !!form.lastNo" />
        <span class="ml-8px text-12px text-[var(--el-text-color-secondary)]">启用时自动在前缀后加入年份</span>
      </el-form-item>
      <el-form-item label="状态"><el-switch :model-value="form.status === 0" @update:model-value="form.status = $event ? 0 : 1" /></el-form-item>
      <el-form-item label="格式预览">{{ preview(form) }}</el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { getNumberRules, saveNumberRule, type NumberRuleVO } from '@/api/infra/number-rule'

defineOptions({ name: 'InfraNumberRule' })
const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const visible = ref(false)
const rules = ref<NumberRuleVO[]>([])
const empty = (): NumberRuleVO => ({ code: '', name: '', prefix: '', digits: 4, startNo: 1, yearlyReset: false, status: 0 })
const form = ref<NumberRuleVO>(empty())

function preview(rule: NumberRuleVO) {
  return `${rule.prefix || ''}${rule.yearlyReset ? new Date().getFullYear() : ''}${String(rule.startNo || 1).padStart(rule.digits || 1, '0')}`
}
function open(rule?: NumberRuleVO) {
  form.value = rule ? { ...rule } : empty()
  visible.value = true
}
async function load() {
  loading.value = true
  try { rules.value = await getNumberRules() } finally { loading.value = false }
}
async function save() {
  if (!form.value.code || !form.value.name) return message.warning('请填写规则编码和名称')
  saving.value = true
  try {
    await saveNumberRule(form.value)
    visible.value = false
    message.success('保存成功')
    await load()
  } finally { saving.value = false }
}
onMounted(load)
</script>
