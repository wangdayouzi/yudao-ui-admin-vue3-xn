<template>
  <div class="px-4px pb-16px pl-16px pt-8px text-14px">
    <!-- 主页入口 -->
    <div
      class="h-40px flex cursor-pointer items-center gap-6px rounded-[var(--el-border-radius-base)] px-8px hover:bg-[var(--el-fill-color-light)]"
      :class="{
        'bg-[var(--el-fill-color-light)] text-[var(--el-color-primary)]': activeView === 'home'
      }"
      @click="emit('home')"
    >
      <Icon icon="ep:home-filled" />
      <span>主页</span>
      <el-tooltip content="收起目录" placement="right">
        <el-button link class="!ml-auto" aria-label="收起目录" @click.stop="emit('collapse')">
          <Icon icon="ep:fold" />
        </el-button>
      </el-tooltip>
    </div>

    <!-- 知识库目录 -->
    <div class="h-40px flex items-center justify-between px-8px">
      <div class="flex min-w-0 items-center gap-6px font-600">
        <span>目录</span>
      </div>
      <div>
        <el-dropdown
          v-if="writeStatus && checkPermi(['pms:kb:library:update'])"
          trigger="click"
          @command="emit('create', $event)"
        >
          <el-button link aria-label="在知识库根目录新建" title="在知识库根目录新建"
            ><Icon icon="ep:plus"
          /></el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="document"> 新建文档 </el-dropdown-item>
              <el-dropdown-item command="folder"> 新建文件夹 </el-dropdown-item>
              <el-dropdown-item command="upload"> 上传文件 </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <el-tree
      v-if="treeData.length"
      ref="treeRef"
      :current-node-key="currentNodeKey"
      :data="treeData"
      :default-expanded-keys="defaultExpandedNodeKeys"
      class="knowledge-sidebar-tree"
      highlight-current
      :expand-on-click-node="false"
      @node-contextmenu="openContextMenu"
      @keydown.capture="handleTreeKeydown"
      node-key="key"
      @node-click="emit('node-click', $event)"
    >
      <template #default="{ data }">
        <div
          class="knowledge-tree-row flex min-w-0 flex-1 items-center gap-6px"
          :class="{ 'is-context-target': contextNode?.key === data.key && contextVisible }"
        >
          <Icon :icon="getKnowledgeTreeNodeIcon(data)" class="shrink-0" />
          <span class="min-w-0 flex-1 truncate" :title="data.label">{{ data.label }}</span>
          <el-button
            class="knowledge-node-more !h-28px !w-28px shrink-0"
            link
            :aria-label="`${data.label}的操作`"
            title="更多操作（也可右键）"
            @click.stop="openMoreMenu($event, data)"
          >
            <Icon icon="ep:more-filled" />
          </el-button>
        </div>
      </template>
    </el-tree>
    <el-empty v-else :image-size="72" description="暂无目录或文档" />

    <el-dropdown
      ref="contextMenuRef"
      :virtual-ref="contextAnchor"
      virtual-triggering
      trigger="contextmenu"
      placement="bottom-start"
      :show-timeout="0"
      :hide-timeout="0"
      @command="handleContextCommand"
      @visible-change="contextVisible = $event"
    >
      <template #dropdown>
        <el-dropdown-menu class="knowledge-node-menu">
          <li
            class="px-12px py-6px text-12px text-[var(--el-text-color-secondary)] max-w-240px truncate"
            role="presentation"
            :title="contextNode?.label"
            >{{ contextNode?.label }}</li
          >
          <el-dropdown-item
            v-for="action in contextActions"
            :key="action.command"
            :command="action.command"
            :divided="action.divided"
            :class="{ 'text-[var(--el-color-danger)]': action.danger }"
          >
            <Icon :icon="action.icon" class="mr-8px" />{{ action.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 最近删除入口 -->
    <div v-if="writeStatus">
      <div
        v-hasPermi="['pms:kb:library:delete']"
        class="h-40px flex cursor-pointer items-center gap-6px rounded-[var(--el-border-radius-base)] px-8px hover:bg-[var(--el-fill-color-light)]"
        :class="{
          'bg-[var(--el-fill-color-light)] text-[var(--el-color-primary)]': activeView === 'recycle'
        }"
        @click="emit('recycle')"
      >
        <Icon icon="ep:delete" />
        最近删除
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { checkPermi } from '@/utils/permission'
import type { DropdownInstance } from 'element-plus'
import { getKnowledgeNodeActions } from './knowledgeNodeActions'
import {
  getKnowledgeTreeNodeIcon,
  type KnowledgeContentView,
  type KnowledgeTreeNode
} from './types'

defineOptions({ name: 'PmsKnowledgeLibrarySidebar' })

const props = defineProps<{
  treeData: KnowledgeTreeNode[]
  currentNodeKey?: string
  activeView: KnowledgeContentView
  writeStatus: boolean
}>() // 组件参数
const emit = defineEmits(['home', 'create', 'node-click', 'node-action', 'recycle', 'collapse']) // 组件事件
const treeRef = ref<InstanceType<typeof ElTree>>() // 目录树 Ref

const contextMenuRef = ref<DropdownInstance>()
const contextNode = shallowRef<KnowledgeTreeNode>()
const contextVisible = ref(false)
const contextPoint = ref({ x: 0, y: 0 })
const contextAnchor = {
  getBoundingClientRect: () => new DOMRect(contextPoint.value.x, contextPoint.value.y, 0, 0)
}
const contextActions = computed(() =>
  contextNode.value
    ? getKnowledgeNodeActions(
        contextNode.value,
        checkPermi(['pms:kb:library:update']),
        checkPermi(['pms:kb:library:delete'])
      )
    : []
)

async function showNodeMenu(data: KnowledgeTreeNode, x: number, y: number, keyboard = false) {
  contextMenuRef.value?.handleClose()
  contextNode.value = data
  contextPoint.value = { x, y }
  await nextTick()
  contextMenuRef.value?.handleOpen()
  if (keyboard) {
    await nextTick()
    document.querySelector<HTMLElement>('.knowledge-node-menu [role="menuitem"]')?.focus()
  }
}
function openContextMenu(event: MouseEvent, data: KnowledgeTreeNode) {
  event.preventDefault()
  event.stopPropagation()
  showNodeMenu(data, event.clientX, event.clientY)
}
function openMoreMenu(event: MouseEvent, data: KnowledgeTreeNode) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  showNodeMenu(data, rect.left, rect.bottom)
}
function handleContextCommand(command: string) {
  const node = contextNode.value
  contextMenuRef.value?.handleClose()
  if (!node) return
  if (command === 'open') emit('node-click', node)
  else emit('node-action', node, command)
}
function handleTreeKeydown(event: KeyboardEvent) {
  if (!(event.target instanceof HTMLElement) || event.target.closest('input, textarea, button'))
    return
  const key = event.target.closest('.el-tree-node')?.getAttribute('data-key')
  const node = key
    ? (treeRef.value?.getNode(key)?.data as KnowledgeTreeNode | undefined)
    : undefined
  if (!node) return
  const menuKey = event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
  const command = event.key === 'F2' ? 'rename' : event.key === 'Delete' ? 'delete' : undefined
  if (!menuKey && !command) return
  event.preventDefault()
  event.stopPropagation()
  if (menuKey) {
    const rect = event.target.getBoundingClientRect()
    showNodeMenu(node, rect.left + 28, rect.top + 28, true)
  } else if (
    getKnowledgeNodeActions(
      node,
      checkPermi(['pms:kb:library:update']),
      checkPermi(['pms:kb:library:delete'])
    ).some((action) => action.command === command)
  ) {
    emit('node-action', node, command)
  }
}
watch(
  () => props.treeData,
  () => contextMenuRef.value?.handleClose()
)

const defaultExpandedNodeKeys = computed(() => (props.currentNodeKey ? [props.currentNodeKey] : [])) // 默认展开当前内容的目录链路

/** 同步目录树的当前节点，并自动展开其全部父级目录 */
async function setCurrentNode() {
  await nextTick()
  treeRef.value?.setCurrentKey(props.currentNodeKey, true)
}

watch([() => props.currentNodeKey, () => props.treeData], () => {
  setCurrentNode()
})
</script>

<style lang="scss" scoped>
.knowledge-node-more {
  color: var(--el-text-color-secondary);
}
.knowledge-tree-row.is-context-target {
  color: var(--el-color-primary);
}
.knowledge-sidebar-tree {
  padding-right: 8px;
  background-color: transparent;
}

:deep(.el-tree-node__content) {
  height: 40px;
  padding-right: 4px;
  border-radius: var(--el-border-radius-base);
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  color: var(--el-color-primary);
  background-color: var(--el-fill-color-light);
}
</style>
