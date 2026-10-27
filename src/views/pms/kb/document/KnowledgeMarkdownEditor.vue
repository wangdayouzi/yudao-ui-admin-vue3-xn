<template>
  <div ref="editorElement" class="w-full min-w-0"></div>
</template>

<script setup lang="ts">
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { useUpload } from '@/components/UploadFile/src/useUpload'
import { isLegacyKnowledgeHtml } from './knowledgeMarkdown'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  ready: []
  uploading: [value: boolean]
  converted: []
}>()
const editorElement = ref<HTMLElement>()
const { httpRequest } = useUpload('pms-knowledge-image')
const message = useMessage()
let editor: Vditor | undefined
let ready = false
let disposed = false
let activeUploads = 0

function setContent(value: string) {
  if (!ready || !editor) return
  const markdown = isLegacyKnowledgeHtml(value) ? editor.html2md(value) : value
  if (markdown !== editor.getValue()) editor.setValue(markdown || '')
  if (markdown !== value) {
    emit('update:modelValue', markdown)
    emit('converted')
  }
}

defineExpose({ getValue: () => ready && editor ? editor.getValue() : props.modelValue })

onMounted(() => {
  if (!editorElement.value) return
  editor = new Vditor(editorElement.value, {
    cdn: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/vditor`,
    height: 'max(360px, calc(100vh - 280px))',
    mode: 'wysiwyg',
    lang: 'zh_CN',
    value: props.modelValue,
    cache: { enable: false },
    toolbar: ['headings', 'bold', 'italic', 'strike', '|', 'list', 'ordered-list', 'check', 'quote', 'code', 'inline-code', '|', 'link', 'upload', 'table', '|', 'undo', 'redo', 'edit-mode', 'fullscreen'],
    after: () => {
      if (disposed) return
      ready = true
      // 初始化期间父组件可能才收到文档详情，使用最新值而不是构造时的空正文。
      setContent(props.modelValue)
      emit('ready')
    },
    input: (value) => { if (!disposed) emit('update:modelValue', value) },
    upload: {
      accept: 'image/*',
      max: 10 * 1024 * 1024,
      handler: (files) => {
        if (files.some((file) => !file.type.startsWith('image/'))) return '只能上传图片'
        return (async (): Promise<null> => {
          activeUploads++
          emit('uploading', true)
          try {
            for (const file of files) {
              const response = await httpRequest({
                file: file as any,
                onProgress: () => {},
                onSuccess: () => {},
                onError: () => {}
              } as any)
              const url = (response as any).data?.data || (response as any).data
              if (typeof url !== 'string' || !url) throw new Error('图片上传失败')
              if (disposed) return null
              const imageUrl = new URL(url, window.location.origin).href.replace(/[()]/g, (char) => encodeURIComponent(char))
              editor?.insertValue(`![${file.name.replace(/[\[\]\\\r\n]/g, '')}](${imageUrl})`)
              emit('update:modelValue', editor?.getValue() || '')
            }
          } catch {
            if (!disposed) message.error('图片上传失败')
          } finally {
            activeUploads--
            if (!disposed) emit('uploading', activeUploads > 0)
          }
          return null
        })()
      }
    }
  })
})

watch(() => props.modelValue, (value) => {
  setContent(value)
})

onBeforeUnmount(() => {
  disposed = true
  ready = false
  editor?.destroy()
})
</script>
