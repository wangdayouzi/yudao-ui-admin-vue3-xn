<template>
  <template v-for="field in enabledFields" :key="field.id">
    <el-form-item :label="field.fieldName" :required="field.required">
      <el-input v-if="field.fieldType === 'text' || field.fieldType === 'textarea'"
        :model-value="modelValue[field.fieldCode] || ''"
        :type="field.fieldType === 'textarea' ? 'textarea' : 'text'"
        @update:model-value="setValue(field.fieldCode, $event)" />
      <el-input-number v-else-if="field.fieldType === 'number'" class="w-full"
        :model-value="modelValue[field.fieldCode] ? Number(modelValue[field.fieldCode]) : undefined"
        @update:model-value="setValue(field.fieldCode, $event == null ? '' : String($event))" />
      <el-date-picker v-else-if="field.fieldType === 'date'" class="!w-full" type="date"
        value-format="YYYY-MM-DD" :model-value="modelValue[field.fieldCode] || ''"
        @update:model-value="setValue(field.fieldCode, String($event || ''))" />
      <el-select v-else-if="field.fieldType === 'select'" class="w-full" clearable
        :model-value="modelValue[field.fieldCode] || ''" @update:model-value="setValue(field.fieldCode, String($event || ''))">
        <el-option v-for="option in options(field.optionsJson)" :key="option" :value="option" :label="option" />
      </el-select>
      <el-select v-else-if="field.fieldType === 'multiselect'" class="w-full" multiple
        :model-value="selectedValues(modelValue[field.fieldCode])"
        @update:model-value="setValue(field.fieldCode, JSON.stringify($event))">
        <el-option v-for="option in options(field.optionsJson)" :key="option" :value="option" :label="option" />
      </el-select>
      <el-input v-else :model-value="modelValue[field.fieldCode] || ''" placeholder="请输入用户 ID"
        @update:model-value="setValue(field.fieldCode, $event)" />
    </el-form-item>
  </template>
</template>

<script setup lang="ts">
import { getKnowledgeAttributes, type KnowledgeAttributeVO } from '@/api/pms/kb/attribute'

const props = defineProps<{ libraryId: number; modelValue: Record<string, string> }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: Record<string, string>): void }>()
const fields = ref<KnowledgeAttributeVO[]>([])
const enabledFields = computed(() => fields.value.filter((field) => field.enabled))
function options(json?: string): string[] {
  try {
    const value: unknown = json ? JSON.parse(json) : []
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch { return [] }
}
function selectedValues(json?: string): string[] { return options(json) }
function setValue(code: string, value: string) { emit('update:modelValue', { ...props.modelValue, [code]: value }) }
let requestVersion = 0
async function reload() {
  const version = ++requestVersion
  fields.value = []
  const loaded = props.libraryId ? await getKnowledgeAttributes(props.libraryId) : []
  if (version === requestVersion) fields.value = loaded
}
watch(() => props.libraryId, reload, { immediate: true })
defineExpose({ reload, requiredMissing: () => enabledFields.value.find((field) => field.required &&
  (!props.modelValue[field.fieldCode]?.trim() || field.fieldType === 'multiselect' && !selectedValues(props.modelValue[field.fieldCode]).length))?.fieldName })
</script>
