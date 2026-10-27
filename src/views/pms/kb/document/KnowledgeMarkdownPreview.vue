<template>
  <div class="pms-knowledge-rich-text" v-dompurify-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { renderKnowledgeMarkdown } from './knowledgeMarkdown'

const props = defineProps<{ content?: string }>()
const renderedContent = computed(() => renderKnowledgeMarkdown(props.content))
</script>

<style lang="scss">
.pms-knowledge-rich-text {
  display: flow-root;
  overflow-wrap: anywhere;
  color: var(--el-text-color-primary);
  font-size: 14px;

  h1, h2, h3, h4, h5, h6 { margin: 20px 0 12px; line-height: 1.4; font-weight: 600; }
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  h3 { font-size: 16px; }
  p, ul, ol, blockquote, pre, table { margin: 0 0 12px; line-height: 1.75; }
  ul { padding-left: 24px; list-style: disc; }
  ol { padding-left: 24px; list-style: decimal; }
  li > ul, li > ol { margin-bottom: 0; }
  .kb-task-item { list-style: none; }
  .kb-task-checkbox { display: inline-block; margin-left: -20px; width: 20px; }
  > :first-child { margin-top: 0; }
  img { max-width: 100%; height: auto; }
  a { color: var(--el-color-primary); }
  blockquote { border-left: 3px solid var(--el-border-color); padding-left: 14px; color: var(--el-text-color-secondary); }
  pre { overflow: auto; border-radius: 6px; background: var(--el-fill-color-light); padding: 12px 16px; }
  code { border-radius: 3px; background: var(--el-fill-color-light); padding: 2px 4px; }
  pre code { background: transparent; padding: 0; }
  table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
  th, td { border: 1px solid var(--el-border-color); padding: 6px 10px; }
  th { background: var(--el-fill-color-light); }
}
</style>
