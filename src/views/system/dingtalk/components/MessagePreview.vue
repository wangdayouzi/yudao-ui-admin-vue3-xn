<template>
  <div class="preview-shell">
    <div class="preview-caption">钉钉消息预览 · 样式以钉钉客户端为准</div>
    <div class="message-card">
      <template v-if="type === 'TEXT'"
        ><div class="plain-text">{{ content.content || '消息内容' }}</div></template
      >
      <template v-else-if="type === 'IMAGE'">
        <el-image
          v-if="safeImage(content.photoURL)"
          :src="content.photoURL"
          fit="contain"
          referrerpolicy="no-referrer"
          ><template #error
            ><div class="image-placeholder">图片暂时无法加载</div></template
          ></el-image
        >
        <div v-else class="image-placeholder">填写图片地址后预览</div>
      </template>
      <template v-else>
        <el-image
          v-if="type === 'LINK' && safeImage(content.picUrl)"
          :src="content.picUrl"
          fit="cover"
          referrerpolicy="no-referrer"
        />
        <h3>{{ content.title || '消息标题' }}</h3>
        <div
          v-if="isMarkdown"
          v-dompurify-html="markdown"
          class="markdown-content"
          @click.prevent
        ></div>
        <div v-else class="plain-text">{{ content.text || '消息正文' }}</div>
        <div v-if="type === 'LINK'" class="preview-link">查看详情 ↗</div>
        <div v-if="type.startsWith('ACTION_CARD')" class="card-buttons">
          <div v-for="(button, index) in buttons" :key="index" class="card-button">{{
            button
          }}</div>
        </div>
      </template>
    </div>
    <div class="preview-hint">预览中的链接和按钮不会执行跳转。</div>
  </div>
</template>
<script setup lang="ts">
import MarkdownIt from 'markdown-it'
const props = defineProps<{ type: string; content: Record<string, string> }>()
const md = new MarkdownIt({ html: false, linkify: false, breaks: true })
// 预览不自动加载 Markdown 中的外部图片，独立图片类型可直接预览。
md.disable('image')
const isMarkdown = computed(() => props.type === 'MARKDOWN' || props.type.startsWith('ACTION_CARD'))
const markdown = computed(() => md.render(props.content.text || '消息正文'))
const buttons = computed(() => {
  if (props.type === 'ACTION_CARD') return [props.content.singleTitle || '查看详情']
  const count = props.type === 'ACTION_CARD3' ? 3 : 2
  return Array.from(
    { length: count },
    (_, i) => props.content[`actionTitle${i + 1}`] || `按钮 ${i + 1}`
  )
})
const safeImage = (value?: string) => !!value && /^https?:\/\//i.test(value) && !value.includes('{')
</script>
<style scoped lang="scss">
.preview-shell {
  padding: 20px;
  background: #f3f6fa;
  border-radius: 12px;
}

.preview-caption,
.preview-hint {
  font-size: 12px;
  line-height: 1.7;
  color: #6b7280;
}

.preview-caption {
  margin-bottom: 16px;
}

.preview-hint {
  margin-top: 14px;
}

.message-card {
  padding: 20px;
  overflow: hidden;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow-wrap: anywhere;
}

h3 {
  margin: 0 0 12px;
  font-size: 17px;
}

.plain-text {
  line-height: 1.8;
  white-space: pre-wrap;
}

.markdown-content {
  line-height: 1.8;
}

.markdown-content :deep(pre) {
  padding: 8px;
  overflow: auto;
  background: #f5f7fa;
}

.el-image {
  display: block;
  width: 100%;
  max-height: 220px;
  margin-bottom: 14px;
}

.image-placeholder {
  padding: 35px 10px;
  color: #909399;
  text-align: center;
  background: #f5f7fa;
}

.preview-link,
.card-button {
  padding-top: 14px;
  margin-top: 14px;
  color: #1677ff;
  text-align: center;
  border-top: 1px solid #ebeef5;
}
</style>
